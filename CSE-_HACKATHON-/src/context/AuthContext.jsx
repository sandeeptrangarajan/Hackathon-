
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const AuthContext = createContext(null);

/*
 * API configuration
 *
 * Local:
 *   VITE_API_URL=http://localhost:5000/api
 *
 * Vercel:
 *   VITE_API_URL=/api
 */

const API = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '');

const TOKEN = 'hackathon_auth_token';

const CURRENT_USER =
  'hackathon_current_user';

/* =========================================================
   API REQUEST HELPER
========================================================= */

const request = async (
  path,
  options = {}
) => {
  const token =
    localStorage.getItem(TOKEN);

  const response = await fetch(
    `${API}${path}`,
    {
      ...options,

      headers: {
        'Content-Type':
          'application/json',

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`
            }
          : {}),

        ...(options.headers || {})
      }
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
};

/* =========================================================
   ANNOUNCEMENT ID HELPER
========================================================= */

/*
 * MongoDB returns _id.
 *
 * Some frontend code may expect id.
 * This helper guarantees that both are handled.
 */

const getAnnouncementId = (
  announcement
) => {
  if (!announcement) {
    return null;
  }

  return (
    announcement._id ||
    announcement.id ||
    null
  );
};

/*
 * Normalize announcement objects so
 * the frontend always has an `id`.
 */

const normalizeAnnouncement = (
  announcement
) => {
  if (!announcement) {
    return announcement;
  }

  const id =
    getAnnouncementId(
      announcement
    );

  return {
    ...announcement,
    id: id ? String(id) : null
  };
};

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({
  children
}) {
  const [user, setUser] =
    useState(() => {
      try {
        const savedUser =
          localStorage.getItem(
            CURRENT_USER
          );

        return savedUser
          ? JSON.parse(savedUser)
          : null;
      } catch (error) {
        console.error(
          'Failed to load saved user:',
          error
        );

        return null;
      }
    });

  const [teams, setTeams] =
    useState([]);

  const [
    announcements,
    setAnnouncements
  ] = useState([]);

  /* =======================================================
     REFRESH DATA
  ======================================================= */

  const refresh = async (
    activeUser = user
  ) => {
    if (!activeUser) {
      return;
    }

    try {
      /*
       * Get announcements
       */

      const announcementData =
        await request(
          '/announcements'
        );

      /*
       * Normalize MongoDB _id -> id
       */

      const normalizedAnnouncements =
        Array.isArray(
          announcementData
        )
          ? announcementData.map(
              normalizeAnnouncement
            )
          : [];

      setAnnouncements(
        normalizedAnnouncements
      );

      /*
       * Get teams only for admin
       */

      if (
        activeUser.role === 'admin'
      ) {
        const teamData =
          await request(
            '/teams'
          );

        setTeams(
          Array.isArray(teamData)
            ? teamData
            : []
        );
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error(
        'Failed to refresh data:',
        error.message
      );

      throw error;
    }
  };

  /* =======================================================
     LOAD USER DATA
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    refresh(user).catch(
      (error) => {
        console.error(
          'Initial refresh failed:',
          error.message
        );
      }
    );
  }, [user]);

  /* =======================================================
     SAVE CURRENT USER
  ======================================================= */

  useEffect(() => {
    if (user) {
      localStorage.setItem(
        CURRENT_USER,
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem(
        CURRENT_USER
      );
    }
  }, [user]);

  /* =======================================================
     LOGIN
  ======================================================= */

  const login = async (
    credentials
  ) => {
    const response =
      await request(
        '/auth/login',
        {
          method: 'POST',

          body: JSON.stringify(
            credentials
          )
        }
      );

    if (!response.token) {
      throw new Error(
        'Login succeeded but no authentication token was returned.'
      );
    }

    localStorage.setItem(
      TOKEN,
      response.token
    );

    setUser(response.user);

    await refresh(
      response.user
    );

    return response.user;
  };

  /* =======================================================
     REGISTER
  ======================================================= */

  const register = async (
    payload
  ) => {
    const response =
      await request(
        '/auth/register',
        {
          method: 'POST',

          body: JSON.stringify(
            payload
          )
        }
      );

    if (!response.token) {
      throw new Error(
        'Registration succeeded but no authentication token was returned.'
      );
    }

    localStorage.setItem(
      TOKEN,
      response.token
    );

    setUser(response.user);

    await refresh(
      response.user
    );

    return response.user;
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    localStorage.removeItem(
      TOKEN
    );

    localStorage.removeItem(
      CURRENT_USER
    );

    setUser(null);
    setTeams([]);
    setAnnouncements([]);
  };

  /* =======================================================
     CREATE ANNOUNCEMENT
  ======================================================= */

  const postAnnouncement =
    async (payload) => {
      const item =
        await request(
          '/announcements',
          {
            method: 'POST',

            body: JSON.stringify(
              payload
            )
          }
        );

      const normalizedItem =
        normalizeAnnouncement(
          item
        );

      setAnnouncements(
        (items) => [
          normalizedItem,
          ...items
        ]
      );

      return normalizedItem;
    };

  /* =======================================================
     UPDATE ANNOUNCEMENT
  ======================================================= */

  const updateAnnouncement =
    async (
      id,
      changes
    ) => {
      /*
       * Prevent:
       *
       * PUT /api/announcements/undefined
       */

      if (!id) {
        throw new Error(
          'Announcement ID is missing. Cannot update announcement.'
        );
      }

      const item =
        await request(
          `/announcements/${encodeURIComponent(
            String(id)
          )}`,
          {
            method: 'PUT',

            body: JSON.stringify(
              changes
            )
          }
        );

      const normalizedItem =
        normalizeAnnouncement(
          item
        );

      /*
       * Update local state immediately.
       */

      setAnnouncements(
        (items) =>
          items.map(
            (announcement) => {
              const announcementId =
                getAnnouncementId(
                  announcement
                );

              if (
                String(
                  announcementId
                ) === String(id)
              ) {
                return normalizedItem;
              }

              return announcement;
            }
          )
      );

      return normalizedItem;
    };

  /* =======================================================
     DELETE ANNOUNCEMENT
  ======================================================= */

  const deleteAnnouncement =
    async (announcement) => {
      /*
       * Accept either:
       *
       * deleteAnnouncement(item)
       *
       * OR
       *
       * deleteAnnouncement(item._id)
       *
       * OR
       *
       * deleteAnnouncement(item.id)
       */

      const id =
        typeof announcement ===
        'object'
          ? getAnnouncementId(
              announcement
            )
          : announcement;

      /*
       * IMPORTANT:
       * Never send undefined to the API.
       */

      if (
        id === undefined ||
        id === null ||
        String(id).trim() === ''
      ) {
        console.error(
          'Cannot delete announcement: missing ID.',
          announcement
        );

        throw new Error(
          'Announcement ID is missing. Please refresh the page and try again.'
        );
      }

      const announcementId =
        String(id);

      console.log(
        'Deleting announcement:',
        announcementId
      );

      /*
       * DELETE:
       *
       * /api/announcements/<MongoDB _id>
       */

      await request(
        `/announcements/${encodeURIComponent(
          announcementId
        )}`,
        {
          method: 'DELETE'
        }
      );

      /*
       * Remove from frontend state.
       */

      setAnnouncements(
        (items) =>
          items.filter(
            (item) => {
              const itemId =
                getAnnouncementId(
                  item
                );

              return (
                String(itemId) !==
                announcementId
              );
            }
          )
      );
    };

  /* =======================================================
     DELETE TEAM
  ======================================================= */

  const deleteTeam =
    async (id) => {
      if (
        id === undefined ||
        id === null ||
        String(id).trim() === ''
      ) {
        throw new Error(
          'Team ID is missing. Cannot delete team.'
        );
      }

      await request(
        `/teams/${encodeURIComponent(
          String(id)
        )}`,
        {
          method: 'DELETE'
        }
      );

      setTeams(
        (items) =>
          items.filter(
            (item) =>
              String(
                item.teamId
              ) !== String(id)
          )
      );
    };

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value =
    useMemo(
      () => ({
        user,
        teams,
        announcements,

        login,
        logout,
        register,

        postAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        deleteTeam
      }),
      [
        user,
        teams,
        announcements
      ]
    );

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   USE AUTH HOOK
========================================================= */

export function useAuth() {
  return useContext(
    AuthContext
  );
}
