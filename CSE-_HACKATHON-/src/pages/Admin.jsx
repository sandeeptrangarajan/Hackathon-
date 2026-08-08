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
     GET ANNOUNCEMENT ID
  ========================================================= */

  const getAnnouncementId = (item) => {
    if (!item) {
      return null;
    }

    let id =
      item._id ??
      item.id ??
      null;

    /*
     * Handle MongoDB ObjectId-style objects
     * in case the API returns:
     *
     * { $oid: "..." }
     */

    if (
      id &&
      typeof id === 'object' &&
      id.$oid
    ) {
      id = id.$oid;
    }

    if (
      id === undefined ||
      id === null ||
      id === '' ||
      id === 'undefined' ||
      id === 'null'
    ) {
      return null;
    }

    return String(id);
  };

  /* =========================================================
     GET TEAM ID
  ========================================================= */

  const getTeamId = (team) => {
    if (!team) {
      return null;
    }

    const id =
      team.teamId ??
      team._id ??
      team.id ??
      null;

    if (
      id === undefined ||
      id === null ||
      id === '' ||
      id === 'undefined' ||
      id === 'null'
    ) {
      return null;
    }

    return String(id);
  };

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
     CREATE ATTACHMENT
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

    reader.onerror = () => {
      alert('Failed to read the attachment.');
      setAttachment(null);
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     EDIT ATTACHMENT
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

    reader.onerror = () => {
      alert('Failed to read the attachment.');
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

      alert(
        'Announcement posted successfully.'
      );
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
     START EDIT
  ========================================================= */

  const startEdit = (item) => {
    const id =
      getAnnouncementId(item);

    console.log(
      'Starting announcement edit:',
      {
        item,
        id
      }
    );

    if (!id) {
      alert(
        'Cannot edit this announcement because its ID is missing.'
      );

      return;
    }

    setEditingId(id);

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

    const fileInput =
      document.getElementById(
        'edit-announcement-attachment'
      );

    if (fileInput) {
      fileInput.value = '';
    }
  };

  /* =========================================================
     UPDATE ANNOUNCEMENT
  ========================================================= */

  const handleUpdate = async (item) => {
    const id =
      getAnnouncementId(item);

    console.log(
      'Updating announcement:',
      {
        item,
        id
      }
    );

    if (!id) {
      alert(
        'Cannot update this announcement because its ID is missing.'
      );

      return;
    }

    if (
      !editText.trim() &&
      !editAttachment
    ) {
      alert(
        'Please enter announcement text or attach a file.'
      );

      return;
    }

    try {
      /*
       * Pass the WHOLE item.
       *
       * AuthContext will resolve _id/id.
       */

      await updateAnnouncement(item, {
        text: editText.trim(),
        attachment: editAttachment,
        status:
          item.status || 'active'
      });

      cancelEdit();

      alert(
        'Announcement updated successfully.'
      );
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
    const id =
      getAnnouncementId(item);

    console.log(
      'DELETE ANNOUNCEMENT',
      {
        item,
        id,
        _id: item?._id,
        itemId: item?.id
      }
    );

    /*
     * VERY IMPORTANT:
     *
     * Do not allow:
     *
     * /api/announcements/undefined
     */

    if (!id) {
      console.error(
        'Announcement ID missing:',
        item
      );

      alert(
        'Cannot delete this announcement because its ID is missing.'
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
      /*
       * Pass the WHOLE item to AuthContext.
       *
       * This prevents an accidental undefined ID.
       */

      await deleteAnnouncement(item);

      /*
       * If the item being edited was deleted,
       * clear edit mode.
       */

      if (
        editingId === id
      ) {
        cancelEdit();
      }

      alert(
        'Announcement deleted successfully.'
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

  const handleDeleteTeam = async (team) => {
    const teamId =
      getTeamId(team);

    console.log(
      'DELETE TEAM',
      {
        team,
        teamId
      }
    );

    if (!teamId) {
      alert(
        'Cannot delete this team because its Team ID is missing.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete the registration for "${team.teamName || teamId}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTeam(team);

      alert(
        'Team registration deleted successfully.'
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
      team.members?.forEach((member) => {
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
      });
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
              (item, index) => {
                const id =
                  getAnnouncementId(
                    item
                  );

                const isEditing =
                  editingId === id;

                return (
                  <div
                    key={
                      id ||
                      `announcement-${index}`
                    }
                    className="glass"
                    style={{
                      padding: '1rem'
                    }}
                  >

                    {/* =========================================
                        EDIT MODE
                    ========================================== */}

                    {isEditing ? (
                      <>
                        <h3>
                          Edit Announcement
                        </h3>

                        <textarea
                          value={
                            editText
                          }
                          onChange={(
                            event
                          ) =>
                            setEditText(
                              event
                                .target
                                .value
                            )
                          }
                          rows={5}
                          style={{
                            width:
                              '100%',
                            resize:
                              'vertical',
                            marginBottom:
                              '1rem'
                          }}
                        />

                        <input
                          id="edit-announcement-attachment"
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
                            Save Changes
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

                      /* =========================================
                         DISPLAY MODE
                      ========================================== */

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

                        {/* 
                          Keep this temporarily.
                          It lets you verify that MongoDB's ID
                          is actually reaching the frontend.
                        */}

                        <p
                          className="meta-text"
                          style={{
                            fontSize:
                              '0.8rem',
                            wordBreak:
                              'break-all'
                          }}
                        >
                          Announcement ID:{' '}
                          {id ||
                            'MISSING ID'}
                        </p>

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
                            className="secondary-btn"
                            onClick={() =>
                              startEdit(
                                item
                              )
                            }
                            disabled={!id}
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
                            disabled={!id}
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
            {teams.map((team, index) => {
              const teamId =
                getTeamId(team);

              return (
                <div
                  key={
                    teamId ||
                    `team-${index}`
                  }
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
                      (
                      {teamId ||
                        'No Team ID'}
                      )
                    </span>
                  </h3>

                  <p className="meta-text">
                    {team.college} ·{' '}
                    {team.status}
                  </p>

                  <ul>
                    {team.members?.map(
                      (member, memberIndex) => (
                        <li
                          key={
                            member.email ||
                            `member-${memberIndex}`
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
                    disabled={!teamId}
                  >
                    Delete Registration
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}