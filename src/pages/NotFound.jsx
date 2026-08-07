import { FiHome, FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'inherit'
    }}>
      <div style={{
        maxWidth: '500px'
      }}>
        {/* 404 Number */}
        <div style={{
          fontSize: '120px',
          fontWeight: 900,
          lineHeight: 1,
          backgroundImage: 'linear-gradient(135deg, var(--accent-primary), var(--accent-warm))',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          404
        </div>

        {/* Message */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          margin: '0 0 1rem',
          color: 'var(--ink)'
        }}>
          Page Not Found
        </h1>

        <p style={{
          color: 'var(--ink-secondary)',
          fontSize: '1.1rem',
          lineHeight: 1.6,
          margin: '0 0 2rem'
        }}>
          Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Helpful Suggestions */}
        <div className="glass" style={{
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--accent-primary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: '0 0 1rem'
          }}>
            What you can do:
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: '0.75rem',
            color: 'var(--muted)'
          }}>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--accent-secondary)' }}>→</span>
              <span>Check if the URL is correct</span>
            </li>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--accent-secondary)' }}>→</span>
              <span>Go back to the previous page</span>
            </li>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--accent-secondary)' }}>→</span>
              <span>Return to the home page</span>
            </li>
            <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--accent-secondary)' }}>→</span>
              <span>Contact support if you need help</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate(-1)}
            className="secondary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: '48px'
            }}
          >
            <FiArrowLeft size={18} />
            Go Back
          </button>

          <Link
            to="/"
            className="primary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: '48px'
            }}
          >
            <FiHome size={18} />
            Go Home
          </Link>
        </div>

        {/* Support */}
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--muted)',
          margin: 0
        }}>
          Still need help?{' '}
          <a href="mailto:support@csehackathon.com" style={{
            color: 'var(--accent-primary)',
            fontWeight: 600,
            textDecoration: 'none'
          }}>
            Contact our support team
          </a>
        </p>
      </div>
    </section>
  );
}
