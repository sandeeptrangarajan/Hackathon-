import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const AuthContext = createContext(null);

const API = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '');

const TOKEN = 'hackathon_auth_token';
const CURRENT_USER = 'hackathon_current_user';

/* =========================================================
   API REQUEST HELPER
========================================================= */

const request = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN);

  const response = await fetch(`${API}${path}`, {
    ...options,

    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),

      ...(options.headers || {})
    }
  });

  const data = await response
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

const getAnnouncementId = (item) => {
  if (!item) {
    return null;
  }

  // MongoDB normally returns _id
  if (item._id) {
    return String(item._id);
  }

  // Frontend may already have id
  if (item.id) {
    return String(item.id);
  }

  return null;
};

/* =========================================================
   NORMALIZE ANNOUNCEMENT
========================================================= */

const normalizeAnnouncement = (item) => {
  if (!item) {
    return null;
  }

  const id = getAnnouncementId(item);

  return {
    ...item,

    // Always keep both forms available
    _id: id,
    id: id
  };
};

/* =========================================================
   TEAM ID HELPER
========================================================= */

const getTeamId = (team) => {
  if (!team) {
    return null;
  }

  if (typeof team === 'string') {
    return team;
  }

  return (
    team.teamId ||
    team._id ||
    team.id ||
    null
  );
};

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(CURRENT_USER);

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

  const [teams, setTeams] = useState([]);

  const [announcements, setAnnouncements] =
    useState([]);

/* =========================================================
   REFRESH DATA
========================================================= */

  const refresh = async (activeUser = user) => {
    if (!activeUser) {
      return;
    }

    try {
      /* -------------------------------
         LOAD ANNOUNCEMENTS
      -------------------------------- */

      const announcementData =
        await request('/announcements');

      const normalizedAnnouncements =
        Array.isArray(announcementData)
          ? announcementData
              .map(normalizeAnnouncement)
              .filter(Boolean)
          : [];

      setAnnouncements(
        normalizedAnnouncements
      );

      /* -------------------------------
         LOAD TEAMS FOR ADMIN
      -------------------------------- */

      if (activeUser.role === 'admin') {
        const teamData =
          await request('/teams');

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

/* =========================================================
   LOAD USER DATA
========================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    refresh(user).catch((error) => {
      console.error(
        'Initial refresh failed:',
        error.message
      );
    });
  }, [user]);

/* =========================================================
   SAVE CURRENT USER
========================================================= */

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

/* =========================================================
   LOGIN
========================================================= */

  const login = async (credentials) => {
    const response = await request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials)
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

    await refresh(response.user);

    return response.user;
  };

/* =========================================================
   REGISTER
========================================================= */

  const register = async (payload) => {
    const response = await request(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload)
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

    await refresh(response.user);

    return response.user;
  };

/* =========================================================
   LOGOUT
========================================================= */

  const logout = () => {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(CURRENT_USER);

    setUser(null);
    setTeams([]);
    setAnnouncements([]);
  };

/* =========================================================
   CREATE ANNOUNCEMENT
========================================================= */

  const postAnnouncement = async (payload) => {
    const item = await request(
      '/announcements',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );

    const normalizedItem =
      normalizeAnnouncement(item);

    if (!normalizedItem) {
      throw new Error(
        'Server returned an invalid announcement.'
      );
    }

    setAnnouncements((items) => [
      normalizedItem,
      ...items
    ]);

    return normalizedItem;
  };

/* =========================================================
   UPDATE ANNOUNCEMENT
========================================================= */

  const updateAnnouncement = async (
    itemOrId,
    changes
  ) => {
    const id =
      typeof itemOrId === 'object'
        ? getAnnouncementId(itemOrId)
        : itemOrId
          ? String(itemOrId)
          : null;

    console.log(
      'Updating announcement:',
      itemOrId
    );

    console.log(
      'Announcement ID:',
      id
    );

    if (!id) {
      throw new Error(
        'Announcement ID is missing. Cannot update announcement.'
      );
    }

    const updatedItem =
      await request(
        `/announcements/${encodeURIComponent(
          id
        )}`,
        {
          method: 'PUT',
          body: JSON.stringify(changes)
        }
      );

    const normalizedItem =
      normalizeAnnouncement(updatedItem);

    setAnnouncements((items) =>
      items.map((item) => {
        const currentId =
          getAnnouncementId(item);

        if (
          currentId &&
          String(currentId) === String(id)
        ) {
          return normalizedItem;
        }

        return item;
      })
    );

    return normalizedItem;
  };

/* =========================================================
   DELETE ANNOUNCEMENT
========================================================= */

  const deleteAnnouncement = async (
    itemOrId
  ) => {
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
      typeof itemOrId === 'object'
        ? getAnnouncementId(itemOrId)
        : itemOrId
          ? String(itemOrId)
          : null;

    console.log(
      'Deleting announcement:',
      itemOrId
    );

    console.log(
      'Resolved announcement ID:',
      id
    );

    /*
     * NEVER send:
     *
     * /announcements/undefined
     */

    if (!id || id === 'undefined' || id === 'null') {
      console.error(
        'Delete cancelled. Invalid announcement ID:',
        itemOrId
      );

      throw new Error(
        'Announcement ID is missing. Cannot delete announcement.'
      );
    }

    /*
     * DELETE request
     */

    await request(
      `/announcements/${encodeURIComponent(
        id
      )}`,
      {
        method: 'DELETE'
      }
    );

    /*
     * Remove from frontend immediately
     */

    setAnnouncements((items) =>
      items.filter((item) => {
        const currentId =
          getAnnouncementId(item);

        return (
          !currentId ||
          String(currentId) !== String(id)
        );
      })
    );

    console.log(
      'Announcement deleted successfully:',
      id
    );
  };

/* =========================================================
   DELETE TEAM
========================================================= */

  const deleteTeam = async (teamOrId) => {
    const id = getTeamId(teamOrId);

    console.log(
      'Deleting team:',
      teamOrId
    );

    console.log(
      'Resolved team ID:',
      id
    );

    if (!id || id === 'undefined' || id === 'null') {
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

    setTeams((items) =>
      items.filter((team) => {
        const currentId =
          getTeamId(team);

        return (
          !currentId ||
          String(currentId) !== String(id)
        );
      })
    );

    console.log(
      'Team deleted successfully:',
      id
    );
  };

/* =========================================================
   CONTEXT VALUE
========================================================= */

  const value = useMemo(
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
      deleteTeam,

      refresh
    }),
    [
      user,
      teams,
      announcements
    ]
  );

/* =========================================================
   PROVIDER
========================================================= */

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   USE AUTH
========================================================= */

export function useAuth() {
  return useContext(AuthContext);
}