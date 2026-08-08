import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const {
    user,
    teams,
    announcements,
    postAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    deleteTeam
  } = useAuth();

  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editAttachment, setEditAttachment] = useState(null);

  const [status, setStatus] = useState('active');

  /* =========================================================
     ACCESS CONTROL
  ========================================================= */

  if (!user || user.role !== 'admin') {
    return (
      <main className="page">
        <section
          className="glass"
          style={{ padding: '2rem' }}
        >
          <h2>Access Denied</h2>

          <p className="meta-text">
            Administrator access is required.
          </p>
        </section>
      </main>
    );
  }

  /* =========================================================
     FILE ATTACHMENT
  ========================================================= */

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setAttachment(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        data: reader.result
      });
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     EDIT FILE ATTACHMENT
  ========================================================= */

  const handleEditAttachment = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setEditAttachment({
        name: file.name,
        type: file.type,
        data: reader.result
      });
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     CREATE ANNOUNCEMENT
  ========================================================= */

  const handlePost = async (event) => {
    event.preventDefault();

    if (!text.trim() && !attachment) {
      alert(
        'Please enter announcement text or attach a file.'
      );

      return;
    }

    try {
      await postAnnouncement({
        text: text.trim(),
        attachment,
        status
      });

      setText('');
      setAttachment(null);
      setStatus('active');

      const fileInput =
        document.getElementById(
          'announcement-attachment'
        );

      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error(
        'Failed to post announcement:',
        error
      );

      alert(
        error.message ||
          'Failed to post announcement.'
      );
    }
  };

  /* =========================================================
     GET ANNOUNCEMENT ID
     
     MongoDB normally returns `_id`.
     The fallback to `id` makes this compatible with
     normalized frontend data as well.
  ========================================================= */

  const getAnnouncementId = (item) => {
    if (!item) {
      return null;
    }

    return item._id || item.id || null;
  };

  /* =========================================================
     START EDIT
  ========================================================= */

  const startEdit = (item) => {
    const announcementId =
      getAnnouncementId(item);

    if (!announcementId) {
      console.error(
        'Cannot edit announcement: missing ID',
        item
      );

      alert(
        'Unable to edit this announcement because its ID is missing.'
      );

      return;
    }

    setEditingId(
      String(announcementId)
    );

    setEditText(
      item.text || ''
    );

    setEditAttachment(
      item.attachment || null
    );
  };

  /* =========================================================
     CANCEL EDIT
  ========================================================= */

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditAttachment(null);
  };

  /* =========================================================
     UPDATE ANNOUNCEMENT
  ========================================================= */

  const handleUpdate = async (item) => {
    const announcementId =
      getAnnouncementId(item);

    if (!announcementId) {
      console.error(
        'Cannot update announcement: missing ID',
        item
      );

      alert(
        'Unable to update this announcement because its ID is missing.'
      );

      return;
    }

    try {
      await updateAnnouncement(
        announcementId,
        {
          text: editText.trim(),
          attachment: editAttachment,
          status:
            item.status || 'active'
        }
      );

      cancelEdit();
    } catch (error) {
      console.error(
        'Failed to update announcement:',
        error
      );

      alert(
        error.message ||
          'Failed to update announcement.'
      );
    }
  };

  /* =========================================================
     DELETE ANNOUNCEMENT
  ========================================================= */

  const handleDelete = async (item) => {
    const announcementId =
      getAnnouncementId(item);

    console.log(
      'Deleting announcement:',
      {
        item,
        announcementId
      }
    );

    /*
     * IMPORTANT:
     *
     * Never send an undefined ID.
     *
     * Correct:
     *   /api/announcements/68xxxxxxxx
     *
     * Incorrect:
     *   /api/announcements/undefined
     */

    if (!announcementId) {
      console.error(
        'Cannot delete announcement: missing ID',
        item
      );

      alert(
        'Unable to delete this announcement because its ID is missing.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this announcement?'
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAnnouncement(
        announcementId
      );
    } catch (error) {
      console.error(
        'Failed to delete announcement:',
        error
      );

      alert(
        error.message ||
          'Failed to delete announcement.'
      );
    }
  };

  /* =========================================================
     DELETE TEAM
  ========================================================= */

  const handleDeleteTeam = async (
    team
  ) => {
    if (!team?.teamId) {
      console.error(
        'Cannot delete team: missing teamId',
        team
      );

      alert(
        'Unable to delete this team because its Team ID is missing.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete the registration for "${team.teamName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTeam(
        team.teamId
      );
    } catch (error) {
      console.error(
        'Failed to delete team:',
        error
      );

      alert(
        error.message ||
          'Failed to delete team.'
      );
    }
  };

  /* =========================================================
     EXPORT CSV
  ========================================================= */

  const exportCsv = () => {
    const rows = [
      [
        'Team ID',
        'Team Name',
        'College',
        'Status',
        'Member Name',
        'Email',
        'Phone',
        'Gender',
        'Section',
        'Laptop',
        'Team Head'
      ]
    ];

    teams.forEach((team) => {
      team.members?.forEach(
        (member) => {
          rows.push([
            team.teamId || '',
            team.teamName || '',
            team.college || '',
            team.status || '',
            member.name || '',
            member.email || '',
            member.phone || '',
            member.gender || '',
            member.section || '',
            member.laptop || '',
            member.isTeamHead
              ? 'Yes'
              : 'No'
          ]);
        }
      );
    });

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const stringValue =
              String(value ?? '');

            return `"${stringValue.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      'hackathon-team-registrations.csv';

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section
        className="glass"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <h1>
          Admin Dashboard
        </h1>

        <p className="meta-text">
          Manage announcements and
          registered hackathon teams.
        </p>
      </section>

      {/* =====================================================
          CREATE ANNOUNCEMENT
      ===================================================== */}

      <section
        className="glass"
        style={{
          padding: '1.5rem'
        }}
      >
        <h2>
          Create Announcement
        </h2>

        <form
          onSubmit={handlePost}
        >
          <div
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >

            <textarea
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              placeholder="Enter announcement..."
              rows={5}
              style={{
                width: '100%',
                resize: 'vertical'
              }}
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
            >
              <option value="active">
                Active
              </option>

              <option value="postponed">
                Postponed
              </option>
            </select>

            <input
              id="announcement-attachment"
              type="file"
              onChange={
                handleAttachment
              }
            />

            {attachment && (
              <p className="meta-text">
                Attached:{' '}
                {attachment.name}
              </p>
            )}

            <button
              type="submit"
              className="primary-btn"
            >
              Post Announcement
            </button>

          </div>
        </form>
      </section>

      {/* =====================================================
          ANNOUNCEMENTS
      ===================================================== */}

      <section
        style={{
          marginTop: '2rem'
        }}
      >
        <h2>
          Announcements
        </h2>

        {announcements.length === 0 ? (
          <p className="meta-text">
            No announcements yet.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >

            {announcements.map(
              (item) => {

                const announcementId =
                  getAnnouncementId(
                    item
                  );

                return (
                  <div
                    key={
                      announcementId ||
                      `announcement-${Math.random()}`
                    }
                    className="glass"
                    style={{
                      padding: '1rem'
                    }}
                  >

                    {/* =================================================
                        EDIT MODE
                    ================================================== */}

                    {editingId ===
                    String(
                      announcementId
                    ) ? (
                      <>
                        <textarea
                          value={
                            editText
                          }
                          onChange={(
                            event
                          ) =>
                            setEditText(
                              event.target
                                .value
                            )
                          }
                          rows={4}
                          style={{
                            width:
                              '100%',
                            marginBottom:
                              '1rem'
                          }}
                        />

                        <input
                          type="file"
                          onChange={
                            handleEditAttachment
                          }
                        />

                        {editAttachment && (
                          <p className="meta-text">
                            Attachment:{' '}
                            {
                              editAttachment.name
                            }
                          </p>
                        )}

                        <div
                          style={{
                            display:
                              'flex',
                            gap:
                              '0.5rem',
                            marginTop:
                              '1rem'
                          }}
                        >

                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() =>
                              handleUpdate(
                                item
                              )
                            }
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={
                              cancelEdit
                            }
                          >
                            Cancel
                          </button>

                        </div>
                      </>
                    ) : (

                      /* =================================================
                          DISPLAY MODE
                      ================================================== */

                      <>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700
                          }}
                        >
                          {item.text ||
                            'Attachment'}
                        </p>

                        {item.attachment && (
                          <p>
                            <a
                              href={
                                item
                                  .attachment
                                  .data
                              }
                              download={
                                item
                                  .attachment
                                  .name
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              View{' '}
                              {
                                item
                                  .attachment
                                  .name
                              }
                            </a>
                          </p>
                        )}

                        <p className="meta-text">
                          Posted by{' '}
                          {item.author ||
                            'Administrator'}{' '}
                          on{' '}
                          {item.date
                            ? new Date(
                                item.date
                              ).toLocaleString()
                            : 'Unknown date'}
                        </p>

                        <p className="meta-text">
                          Status:{' '}
                          {item.status ||
                            'active'}
                        </p>

                        <p className="meta-text">
                          ID:{' '}
                          {announcementId ||
                            'MISSING ID'}
                        </p>

                        <div
                          style={{
                            display:
                              'flex',
                            gap:
                              '0.5rem'
                          }}
                        >

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() =>
                              startEdit(
                                item
                              )
                            }
                            disabled={
                              item.status ===
                              'postponed' ||
                              !announcementId
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() =>
                              handleDelete(
                                item
                              )
                            }
                            disabled={
                              item.status ===
                                'postponed' ||
                              !announcementId
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </>
                    )}

                  </div>
                );
              }
            )}

          </div>
        )}
      </section>

      {/* =====================================================
          REGISTERED TEAMS
      ===================================================== */}

      <section
        style={{
          marginTop: '2rem'
        }}
      >

        <div className="section-title">

          <h2>
            Registered Teams (
            {teams.length}
            )
          </h2>

          <button
            type="button"
            className="primary-btn"
            onClick={exportCsv}
          >
            Download Excel-compatible CSV
          </button>

        </div>

        {teams.length === 0 ? (
          <p className="meta-text">
            No teams registered yet.
          </p>
        ) : (

          <div
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >

            {teams.map((team) => (

              <div
                key={team.teamId}
                className="glass"
                style={{
                  padding: '1rem'
                }}
              >

                <h3
                  style={{
                    marginTop: 0
                  }}
                >
                  {team.teamName}{' '}

                  <span className="meta-text">
                    ({team.teamId})
                  </span>
                </h3>

                <p className="meta-text">
                  {team.college} ·{' '}
                  {team.status}
                </p>

                <ul>
                  {team.members?.map(
                    (member) => (
                      <li
                        key={
                          member.email
                        }
                      >
                        {member.name} ·{' '}
                        {member.email} ·{' '}
                        {member.phone} ·{' '}
                        {member.gender} ·
                        Section{' '}
                        {member.section} ·
                        Laptop:{' '}
                        {member.laptop}

                        {member.isTeamHead
                          ? ' · Team Head'
                          : ''}
                      </li>
                    )
                  )}
                </ul>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    handleDeleteTeam(
                      team
                    )
                  }
                >
                  Delete Registration
                </button>

              </div>

            ))}

          </div>
        )}
      </section>

    </main>
  );
}