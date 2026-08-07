import { useState } from 'react';
import { FiArrowRight, FiUsers, FiAward, FiCode, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Landing () {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      {/* Navigation */}
      <nav className="glass" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderRadius: 0,
        borderBottom: '1px solid var(--line)',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
          <span style={{ color: 'var(--accent-primary)' }}>CSE</span> Hackathon
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/login" className="secondary-btn" style={{ padding: '0.6rem 1.2rem' }}>
            Sign In
          </Link>
          <Link to="/register" className="primary-btn" style={{ padding: '0.6rem 1.2rem' }}>
            Register <FiArrowRight />
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '0 2rem' }}>
        {/* Hero Section */}
        <section style={{
          minHeight: '70vh',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: '2rem 0'
        }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>Welcome to</p>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: '0 0 1.5rem',
              backgroundImage: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%'
            }}>
              CLASS D Hackathon
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ink-secondary)',
              maxWidth: '600px',
              margin: '0 auto 2rem',
              lineHeight: 1.6
            }}>
              Join the CLASS D Hackathon for a fast-paced 6-hour challenge. First place receives a cash prize, and runners-up will receive exciting gift prizes.
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'var(--muted)',
              maxWidth: '600px',
              margin: '0 auto 1.5rem',
              lineHeight: 1.6
            }}>
              Final dates and full event details will be announced by the admin and shared with all registered members.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="primary-btn" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
                Register Your Team <FiArrowRight />
              </Link>
              <a href="#details" className="secondary-btn" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
                Learn More
              </a>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1.5rem',
              marginTop: '3rem',
              maxWidth: '600px',
              margin: '3rem auto 0'
            }}>
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                  100+
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Expected Teams
                </div>
              </div>
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                  Cash Prize
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  1st place prize
                </div>
              </div>
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-warm)' }}>
                  6hrs
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Hackathon Duration
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="details" style={{ padding: '3rem 0', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            Why Join CLASS D Hackathon?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Feature 1 */}
            <div className="glass" style={{
              padding: '2rem',
              borderRadius: '12px',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--line)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                <FiCode />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'var(--accent-primary)' }}>
                Learn & Build
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Work on real-world problems, learn from industry experts, and build impressive projects that make an impact.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass" style={{
              padding: '2rem',
              borderRadius: '12px',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--line)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                <FiUsers />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'var(--accent-secondary)' }}>
                Network & Connect
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Meet like-minded developers, collaborate with talented peers, and build lasting connections in the tech community.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass" style={{
              padding: '2rem',
              borderRadius: '12px',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--line)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                <FiAward />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'var(--accent-warm)' }}>
                Win Prizes
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Compete for the first-place cash prize and runner-up gift packages.
              </p>
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section style={{ padding: '3rem 0', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            Participation Requirements
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { title: 'Team Size', desc: 'Teams must have exactly 3 members (all CSE students)' },
              { title: 'Gender Composition', desc: '2 Male + 1 Female OR 2 Female + 1 Male' },
              { title: 'Registration', desc: 'Free registration for all eligible students' },
              { title: 'College ID', desc: 'Valid student ID from recognized college required' },
              { title: 'Eligibility', desc: 'Only CSE department students are eligible' },
              { title: 'Experience', desc: 'Open for students of all skill levels' }
            ].map((req, idx) => (
              <div key={idx} className="mini-card" style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  color: 'var(--accent-primary)',
                  flexShrink: 0,
                  marginTop: '0.25rem'
                }}>
                  <FiCheckCircle />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--ink)', fontWeight: 700 }}>
                    {req.title}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                    {req.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section style={{ padding: '3rem 0', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            Important Dates
          </h2>

          <div style={{
            display: 'grid',
            gap: '2rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {[
              { date: 'To be announced', title: 'Registration Opens', desc: 'Admin will announce the opening date to all members' },
              { date: 'To be announced', title: 'Registration Closes', desc: 'Closing date will be shared by admin' },
              { date: 'To be announced', title: 'Team Confirmation', desc: 'Confirmation and team details will be communicated by admin' },
              { date: 'To be announced', title: 'Hackathon Day', desc: '6-hour challenge; exact schedule shared by admin' }
            ].map((event, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: '2rem',
                alignItems: 'center',
                paddingBottom: '2rem',
                borderBottom: idx < 3 ? '1px solid var(--line)' : 'none',
                paddingTop: idx > 0 ? '2rem' : 0
              }}>
                <div>
                  <div style={{
                    color: 'var(--accent-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {event.date}
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--ink)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {event.title}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
                    {event.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          margin: '3rem 0'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            marginBottom: '1.5rem'
          }}>
            Ready to Join?
          </h2>
          <p style={{
            color: 'var(--ink-secondary)',
            fontSize: '1.1rem',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Register your team now and get ready to showcase your skills, build amazing projects, and compete for great prizes!
          </p>

          <Link to="/register" className="primary-btn" style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>
            Start Registration <FiArrowRight />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass" style={{
        borderRadius: 0,
        borderTop: '1px solid var(--line)',
        borderBottom: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        padding: '2rem',
        textAlign: 'center',
        background: 'transparent'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <div>
            <h4 style={{ margin: '0 0 1rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              About
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li><a href="#" style={{ color: 'var(--muted)' }}>About Hackathon</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>FAQs</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 1rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
              Resources
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Guidelines</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Prizes</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Sponsors</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 1rem', color: 'var(--accent-warm)', fontWeight: 700 }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Terms & Conditions</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Privacy Policy</a></li>
              <li><a href="#" style={{ color: 'var(--muted)' }}>Code of Conduct</a></li>
            </ul>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid var(--line)',
          paddingTop: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            © 2026 CLASS D Hackathon. All rights reserved. All announcements are delivered by admin to all team members.
          </p>
        </div>
      </footer>
    </div>
  );
}
