import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function Admin() {
  const { user, teams, announcements, postAnnouncement, updateAnnouncement, deleteAnnouncement, deleteTeam } = useAuth();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const fileRef = useRef(null);

  const submitAnnouncement = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        updateAnnouncement(editingId, { text: message.trim(), attachment });
        setStatus('Announcement updated.');
      } else {
        await postAnnouncement({ text: message, attachment });
        setStatus('Announcement posted.');
      }
      setMessage(''); setAttachment(null); setEditingId(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) { setStatus(error.message); }
  };

  const startEdit = (item) => { setEditingId(item.id); setMessage(item.text); setAttachment(item.attachment || null); };

  const exportCsv = () => {
    const headers = ['Team ID', 'Team Name', 'Team Head', 'Phone Number', 'Email', 'Laptop', 'Year', 'Section', 'Gender', 'College'];
    const rows = teams.flatMap((team) => team.members.map((member) => [
      team.teamId, team.teamName, member.isTeamHead ? 'Yes' : 'No', member.phone, member.email,
      member.laptop, member.year, member.section, member.gender, team.college
    ]));
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'hackathon-registrations.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  if (!user || user.role !== 'admin') return <main className="dashboard-page"><div className="dashboard-card glass"><h1>Admin Access Required</h1><p className="meta-text">Sign in with one of the two administrator email addresses to continue.</p><Link to="/login" className="secondary-btn">Go to Login</Link></div></main>;

  return (
    <main className="dashboard-page">
      <div className="dashboard-card glass">
        <h1>Admin Dashboard</h1>
        <p className="meta-text">Changes made here are saved and visible to participants using this portal.</p>

        <form onSubmit={submitAnnouncement} style={{ marginBottom: '2rem' }}>
          <div className="form-group"><label htmlFor="announcement" className="form-label required">{editingId ? 'Edit Announcement' : 'New Announcement'}</label><textarea id="announcement" rows="4" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type the announcement for all participants..." style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--line)' }} /></div>
          <div className="form-group"><label htmlFor="attachment" className="form-label">Attach PDF or image</label><input ref={fileRef} id="attachment" type="file" accept="application/pdf,image/*" onChange={async (e) => setAttachment(e.target.files?.[0] ? await readFile(e.target.files[0]) : null)} /></div>
          <button type="submit" className="primary-btn">{editingId ? 'Save Changes' : 'Post Announcement'}</button>{editingId && <button type="button" className="secondary-btn" onClick={() => { setEditingId(null); setMessage(''); setAttachment(null); }}>Cancel</button>}
          {status && <p className="meta-text">{status}</p>}
        </form>

        <section><h2>Announcements</h2>{announcements.length === 0 ? <p className="meta-text">No announcements yet.</p> : <div style={{ display: 'grid', gap: '1rem' }}>{announcements.map((item) => <div key={item.id} className="glass" style={{ padding: '1rem' }}><p style={{ margin: 0, fontWeight: 700 }}>{item.text || 'Attachment'}</p>{item.attachment && <a href={item.attachment.data} download={item.attachment.name} target="_blank" rel="noreferrer">View {item.attachment.name}</a>}<p className="meta-text">Posted by {item.author} on {new Date(item.date).toLocaleString()}</p><button type="button" className="secondary-btn" onClick={() => startEdit(item)}>Edit</button> <button type="button" className="secondary-btn" onClick={() => deleteAnnouncement(item.id)}>Delete</button></div>)}</div>}</section>

        <section style={{ marginTop: '2rem' }}><div className="section-title"><h2>Registered Teams ({teams.length})</h2><button type="button" className="primary-btn" onClick={exportCsv}>Download Excel-compatible CSV</button></div>{teams.length === 0 ? <p className="meta-text">No teams registered yet.</p> : <div style={{ display: 'grid', gap: '1rem' }}>{teams.map((team) => <div key={team.teamId} className="glass" style={{ padding: '1rem' }}><h3 style={{ marginTop: 0 }}>{team.teamName} <span className="meta-text">({team.teamId})</span></h3><p className="meta-text">{team.college} · {team.status}</p><ul>{team.members.map((member) => <li key={member.email}>{member.name} · {member.email} · {member.phone} · {member.gender} · Section {member.section} · Laptop: {member.laptop}{member.isTeamHead ? ' · Team Head' : ''}</li>)}</ul><button type="button" className="secondary-btn" onClick={() => deleteTeam(team.teamId)}>Delete Registration</button></div>)}</div>}</section>

        <div className="dashboard-actions" style={{ marginTop: '2rem' }}><Link to="/dashboard" className="secondary-btn">Participant View</Link><Link to="/" className="secondary-btn">Back to Home</Link></div>
      </div>
    </main>
  );
}
