import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, teams, announcements, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-card glass">
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p className="meta-text">
          {user ? 'Your signed-in dashboard shows the latest announcements for all members.' : 'Sign in to view announcements and event updates.'}
        </p>

        {user?.teamId && <div className="glass" style={{ padding: '1rem', marginTop: '1rem' }}><strong>Team ID:</strong> {user.teamId}<br /><span className="meta-text">Team: {user.teamName}</span></div>}

        {user && announcements.length > 0 && (
          <section style={{ marginTop: '1.5rem' }}>
            <h2>Latest Announcements</h2>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {announcements.map((item) => (
                <div key={item.id} className="glass" style={{ padding: '1rem' }}>
                  <p style={{ margin: 0 }}>{item.text}</p>
                  {item.attachment && <p><a href={item.attachment.data} download={item.attachment.name} target="_blank" rel="noreferrer">View attachment: {item.attachment.name}</a></p>}
                  <p style={{ margin: '0.75rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    Posted by {item.author} on {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {user && announcements.length === 0 && (
          <p style={{ marginTop: '1.5rem', color: 'var(--muted)' }}>
            No announcements have been posted yet.
          </p>
        )}

        <div className="dashboard-actions" style={{ marginTop: '2rem' }}>
          {user?.role === 'admin' && <Link to="/admin" className="secondary-btn">Open Admin Portal</Link>}
          <button type="button" className="secondary-btn" onClick={handleLogout}>Logout</button>
          <Link to="/" className="secondary-btn">Return to Home</Link>
        </div>
      </div>
    </main>
  );
}
