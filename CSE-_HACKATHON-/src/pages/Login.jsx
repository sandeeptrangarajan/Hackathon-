import { useEffect, useState } from 'react';
import { FiArrowRight, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);
  
  // Form State
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({});

  // Validation Rules
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    return newErrors;
  };

  // Handle Input Change
  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Handle Blur (Mark field as touched)
  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  // Handle Submit
  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    
    // Validate all fields
    const newErrors = validateForm();
    setErrors(newErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(form);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setServerError(message);
      // Also set password error for common issues
      if (message.toLowerCase().includes('password')) {
        setErrors({ ...errors, password: 'Incorrect password' });
      } else if (message.toLowerCase().includes('email')) {
        setErrors({ ...errors, email: 'Email not found' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card glass">
        {/* Header */}
        <p className="eyebrow">New Applicant?</p>
        <h1>CLASS D Hackathon Login</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}>
          Sign in to access your dashboard and receive admin announcements for the hackathon.
        </p>
        <p style={{ color: 'var(--muted-dark)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Use your registered email and the password entered during team registration. Admins can use this same sign-in form.
        </p>

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert alert-danger" role="alert">
            <FiAlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={submit}>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label required">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={isLoading}
              required
            />
            {touched.email && errors.email && (
              <div className="form-error" id="email-error">
                <FiAlertCircle size={14} />
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label required">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              disabled={isLoading}
              required
              minLength="8"
            />
            {touched.password && errors.password && (
              <div className="form-error" id="password-error">
                <FiAlertCircle size={14} />
                {errors.password}
              </div>
            )}
            {!errors.password && form.password && (
              <div className="form-success">
                <FiCheckCircle size={14} />
                Password looks good
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className={`primary-btn ${isLoading ? 'loading' : ''}`}
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <FiArrowRight />}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            New to CSE Hackathon?
          </p>
          <Link to="/register" className="secondary-link">
            Create an account
          </Link>
        </div>

        {/* Help Text */}
        <p style={{ 
          marginTop: '1.5rem', 
          fontSize: '0.8rem', 
          color: 'var(--muted-dark)',
          textAlign: 'center'
        }}>
          Having trouble? Contact us at support@csehackathon.com
        </p>
      </div>
    </section>
  );
}
