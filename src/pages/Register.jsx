import { useMemo, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEPT = 'Computer Science and Engineering (CSE)';
const emptyMember = { 
  name: '', 
  registerNumber: '', 
  email: '', 
  phone: '', 
  department: DEPT, 
  year: '', 
  section: '', 
  gender: '',
  laptop: ''
};

// Password strength calculator
const calculatePasswordStrength = (password) => {
  if (!password) return 0;
  let strength = 0;
  
  // Length
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Uppercase
  if (/[A-Z]/.test(password)) strength += 1;
  
  // Lowercase
  if (/[a-z]/.test(password)) strength += 1;
  
  // Numbers
  if (/\d/.test(password)) strength += 1;
  
  // Special characters
  if (/[!@#$%^&*]/.test(password)) strength += 1;
  
  return Math.min(strength, 4);
};

const getPasswordStrengthLabel = (strength) => {
  if (strength === 0) return 'N/A';
  if (strength === 1) return 'Weak';
  if (strength === 2 || strength === 3) return 'Fair';
  return 'Strong';
};

const getPasswordStrengthClass = (strength) => {
  if (strength <= 1) return 'weak';
  if (strength <= 3) return 'fair';
  return 'strong';
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [teamName, setTeamName] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captcha, setCaptcha] = useState(false);
  const [members, setMembers] = useState([{ ...emptyMember }, { ...emptyMember }, { ...emptyMember }]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  // Validation Calculations
  const genderValid = useMemo(() => {
    const male = members.filter((m) => m.gender === 'Male').length;
    const female = members.filter((m) => m.gender === 'Female').length;
    return (male === 2 && female === 1) || (male === 1 && female === 2);
  }, [members]);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const formProgress = useMemo(() => {
    let completed = 0;
    if (teamName.trim()) completed++;
    if (college.trim()) completed++;
    if (password && confirmPassword && password === confirmPassword) completed++;
    if (genderValid) completed++;
    if (captcha) completed++;
    return Math.round((completed / 5) * 100);
  }, [teamName, college, password, confirmPassword, genderValid, captcha]);

  // Validation Functions
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateRegisterNumber = (regNum) => {
    // Assuming register numbers are alphanumeric and 8-10 chars
    return regNum.trim().length >= 6;
  };

  const validatePhone = (phone) => {
    return /^[0-9]{10}$/.test(phone);
  };

  const validateMember = (member, index) => {
    const memberErrors = {};

    if (!member.name.trim()) {
      memberErrors.name = 'Name is required';
    }

    if (!member.registerNumber.trim()) {
      memberErrors.registerNumber = 'Register number is required';
    } else if (!validateRegisterNumber(member.registerNumber)) {
      memberErrors.registerNumber = 'Invalid register number format';
    }

    if (!member.email.trim()) {
      memberErrors.email = 'Email is required';
    } else if (!validateEmail(member.email)) {
      memberErrors.email = 'Invalid email address';
    }

    if (!member.phone.trim()) {
      memberErrors.phone = 'Phone is required';
    } else if (!validatePhone(member.phone)) {
      memberErrors.phone = 'Must be 10 digits';
    }

    if (!member.year) {
      memberErrors.year = 'Year is required';
    }

    if (!member.section.trim()) {
      memberErrors.section = 'Section is required';
    }

    if (!member.gender) {
      memberErrors.gender = 'Gender is required';
    }

    if (!member.laptop) {
      memberErrors.laptop = 'Please select whether you have a laptop';
    }

    return memberErrors;
  };

  // Handle Member Change
  const setMember = (index, field, value) => {
    const copy = [...members];
    copy[index] = { ...copy[index], [field]: value, department: DEPT };
    setMembers(copy);
    
    // Clear error when user starts typing
    if (errors[`member${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`member${index}_${field}`];
      setErrors(newErrors);
    }
  };

  // Handle Submit
  const submit = async (event) => {
    event.preventDefault();
    setServerError('');

    // Validate Step 1 (Team Info)
    const step1Errors = {};
    if (!teamName.trim()) step1Errors.teamName = 'Team name is required';
    if (!college.trim()) step1Errors.college = 'College name is required';
    if (password.length < 8) step1Errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) step1Errors.confirmPassword = 'Passwords do not match';

    // Validate Step 2 (Members)
    const step2Errors = {};
    members.forEach((member, index) => {
      const memberErrors = validateMember(member, index);
      Object.keys(memberErrors).forEach(field => {
        step2Errors[`member${index}_${field}`] = memberErrors[field];
      });
    });

    // Validate Step 3 (Final)
    const step3Errors = {};
    const regs = members.map((m) => m.registerNumber.trim().toUpperCase());
    const emails = members.map((m) => m.email.trim().toLowerCase());

    if (!captcha) {
      step3Errors.captcha = 'You must confirm before proceeding';
    }
    if (new Set(regs).size !== 3) {
      step3Errors.duplicateRegs = 'Duplicate register numbers are not allowed';
    }
    if (new Set(emails).size !== 3) {
      step3Errors.duplicateEmails = 'Duplicate email addresses are not allowed';
    }
    if (!genderValid) {
      step3Errors.gender = 'Team must have 2 Male + 1 Female or 2 Female + 1 Male';
    }

    const allErrors = { ...step1Errors, ...step2Errors, ...step3Errors };
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      return;
    }

    // Submit Registration
    setIsLoading(true);
    try {
      await register({
        teamName,
        college,
        password,
        confirmPassword,
        captchaToken: 'custom-captcha-ok',
        members
      });
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Team Info' },
    { num: 2, title: 'Members' },
    { num: 3, title: 'Confirm' }
  ];

  return (
    <section className="register-page">
      <form className="register-panel glass" onSubmit={submit}>
        {/* Header */}
        <div className="form-heading">
          <p className="eyebrow">Free Registration</p>
          <h1>CLASS D Hackathon</h1>
          <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>
            Register your team and await admin announcements for all details
          </p>
          <Link to="/login" className="secondary-link">Already registered? Login here</Link>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${formProgress}%` }} />
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
            <FiAlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {/* STEP 1: Team Information */}
        <div className="form-section">
          <h3>Step 1: Team Information</h3>

          {/* Team Name */}
          <div className="form-group">
            <label htmlFor="teamName" className="form-label required">Team Name</label>
            <input
              id="teamName"
              type="text"
              placeholder="e.g., Code Wizards"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isLoading}
              maxLength="100"
              required
            />
            {errors.teamName && (
              <div className="form-error">
                <FiAlertCircle size={14} />
                {errors.teamName}
              </div>
            )}
          </div>

          {/* College Name */}
          <div className="form-group">
            <label htmlFor="college" className="form-label required">College Name</label>
            <input
              id="college"
              type="text"
              placeholder="e.g., Tech Institute"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              disabled={isLoading}
              maxLength="150"
              required
            />
            {errors.college && (
              <div className="form-error">
                <FiAlertCircle size={14} />
                {errors.college}
              </div>
            )}
          </div>

          {/* Password Fields */}
          <div className="grid two">
            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label required">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setTouched({ ...touched, password: true })}
                  disabled={isLoading}
                  minLength="8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="icon-btn"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)'
                  }}
                  tabIndex="-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {/* Password Requirements */}
              {touched.password && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <div className="password-strength">
                    <div className={`strength-meter`}>
                      <div className={`strength-fill ${getPasswordStrengthClass(passwordStrength)}`} />
                    </div>
                    <div className="strength-text" style={{ color: `var(--${getPasswordStrengthClass(passwordStrength) === 'weak' ? 'error' : getPasswordStrengthClass(passwordStrength) === 'fair' ? 'warning' : 'success'})` }}>
                      Strength: {getPasswordStrengthLabel(passwordStrength)}
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem', color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: password.length >= 8 ? 'var(--success)' : 'var(--muted)' }}>
                        {password.length >= 8 ? '✓' : '○'}
                      </span>
                      At least 8 characters
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: /[A-Z]/.test(password) ? 'var(--success)' : 'var(--muted)' }}>
                        {/[A-Z]/.test(password) ? '✓' : '○'}
                      </span>
                      One uppercase letter
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: /\d/.test(password) ? 'var(--success)' : 'var(--muted)' }}>
                        {/\d/.test(password) ? '✓' : '○'}
                      </span>
                      One number
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: /[!@#$%^&*]/.test(password) ? 'var(--success)' : 'var(--muted)' }}>
                        {/[!@#$%^&*]/.test(password) ? '✓' : '○'}
                      </span>
                      One special character (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}

              {errors.password && (
                <div className="form-error">
                  <FiAlertCircle size={14} />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label required">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  minLength="8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="icon-btn"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)'
                  }}
                  tabIndex="-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {confirmPassword && password === confirmPassword && (
                <div className="form-success">
                  <FiCheckCircle size={14} />
                  Passwords match
                </div>
              )}

              {errors.confirmPassword && (
                <div className="form-error">
                  <FiAlertCircle size={14} />
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: Team Members */}
        <div className="form-section">
          <h3>Step 2: Team Members (3 Required)</h3>

          {members.map((member, index) => (
            <div className="member-block" key={index}>
              <h2>
                {index === 0 ? '👑 Team Leader / Member 1' : `👤 Member ${index + 1}`}
              </h2>
              <div className="grid four">
                {/* Name */}
                <div className="form-group">
                  <label htmlFor={`name-${index}`} className="form-label required">Full Name</label>
                  <input
                    id={`name-${index}`}
                    type="text"
                    placeholder="Full Name"
                    value={member.name}
                    onChange={(e) => setMember(index, 'name', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {errors[`member${index}_name`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_name`]}
                    </div>
                  )}
                </div>

                {/* Register Number */}
                <div className="form-group">
                  <label htmlFor={`regNum-${index}`} className="form-label required">Register Number</label>
                  <input
                    id={`regNum-${index}`}
                    type="text"
                    placeholder="REG123456"
                    value={member.registerNumber}
                    onChange={(e) => setMember(index, 'registerNumber', e.target.value.toUpperCase())}
                    disabled={isLoading}
                    required
                  />
                  {errors[`member${index}_registerNumber`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_registerNumber`]}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor={`email-${index}`} className="form-label required">Email</label>
                  <input
                    id={`email-${index}`}
                    type="email"
                    placeholder="student@college.edu"
                    value={member.email}
                    onChange={(e) => setMember(index, 'email', e.target.value.toLowerCase())}
                    disabled={isLoading}
                    required
                  />
                  {errors[`member${index}_email`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_email`]}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label htmlFor={`phone-${index}`} className="form-label required">Mobile (10 digits)</label>
                  <input
                    id={`phone-${index}`}
                    type="tel"
                    placeholder="9876543210"
                    value={member.phone}
                    onChange={(e) => setMember(index, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    pattern="[0-9]{10}"
                    disabled={isLoading}
                    required
                  />
                  {errors[`member${index}_phone`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_phone`]}
                    </div>
                  )}
                </div>

                {/* Department (Read-only) */}
                <div className="form-group">
                  <label htmlFor={`dept-${index}`} className="form-label">Department</label>
                  <input
                    id={`dept-${index}`}
                    type="text"
                    value={DEPT}
                    readOnly
                    disabled
                  />
                </div>

                {/* Year */}
                <div className="form-group">
                  <label htmlFor={`year-${index}`} className="form-label required">Year</label>
                  <select
                    id={`year-${index}`}
                    value={member.year}
                    onChange={(e) => setMember(index, 'year', e.target.value)}
                    disabled={isLoading}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                  {errors[`member${index}_year`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_year`]}
                    </div>
                  )}
                </div>

                {/* Section */}
                <div className="form-group">
                  <label htmlFor={`section-${index}`} className="form-label required">Section</label>
                  <select
                    id={`section-${index}`}
                    value={member.section}
                    onChange={(e) => setMember(index, 'section', e.target.value)}
                    disabled={isLoading}
                    required
                  >
                    <option value="">Select Section</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                  {errors[`member${index}_section`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_section`]}
                    </div>
                  )}
                </div>

                {/* Gender */}
                <div className="form-group">
                  <label htmlFor={`gender-${index}`} className="form-label required">Gender</label>
                  <select
                    id={`gender-${index}`}
                    value={member.gender}
                    onChange={(e) => setMember(index, 'gender', e.target.value)}
                    disabled={isLoading}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors[`member${index}_gender`] && (
                    <div className="form-error">
                      <FiAlertCircle size={14} />
                      {errors[`member${index}_gender`]}
                    </div>
                  )}
                </div>

                {/* Laptop */}
                <div className="form-group">
                  <label htmlFor={`laptop-${index}`} className="form-label required">Laptop available?</label>
                  <select
                    id={`laptop-${index}`}
                    value={member.laptop}
                    onChange={(e) => setMember(index, 'laptop', e.target.value)}
                    disabled={isLoading}
                    required
                  >
                    <option value="">Select one</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {errors[`member${index}_laptop`] && <div className="form-error"><FiAlertCircle size={14} />{errors[`member${index}_laptop`]}</div>}
                </div>
              </div>
            </div>
          ))}

          {/* Gender Validation Indicator */}
          <div className={genderValid ? 'validation-note valid-note' : 'validation-note invalid-note'}>
            {genderValid ? (
              <>
                <FiCheckCircle />
                Gender composition is valid
              </>
            ) : (
              <>
                <FiAlertCircle />
                Team must have 2 Male + 1 Female or 2 Female + 1 Male
              </>
            )}
          </div>

          {/* Duplicate Errors */}
          {errors.duplicateRegs && (
            <div className="alert alert-danger">
              <FiAlertCircle />
              {errors.duplicateRegs}
            </div>
          )}
          {errors.duplicateEmails && (
            <div className="alert alert-danger">
              <FiAlertCircle />
              {errors.duplicateEmails}
            </div>
          )}
        </div>

        {/* STEP 3: Confirmation */}
        <div className="form-section">
          <h3>Step 3: Confirm & Submit</h3>

          <label className="captcha-box">
            <input
              type="checkbox"
              checked={captcha}
              onChange={(e) => setCaptcha(e.target.checked)}
              disabled={isLoading}
              aria-describedby="captcha-desc"
            />
            <span id="captcha-desc">
              I confirm I am not a robot and all participants are CSE students.
            </span>
          </label>

          {errors.captcha && (
            <div className="form-error" style={{ marginTop: '0.5rem' }}>
              <FiAlertCircle size={14} />
              {errors.captcha}
            </div>
          )}

          {errors.gender && (
            <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
              <FiAlertCircle />
              {errors.gender}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          className={`primary-btn ${isLoading ? 'loading' : ''}`}
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          style={{ width: '100%', minHeight: '50px' }}
        >
          {isLoading ? 'Submitting Registration...' : 'Submit Registration'}
        </button>

        <p style={{
          marginTop: '1.5rem',
          fontSize: '0.8rem',
          color: 'var(--muted-dark)',
          textAlign: 'center'
        }}>
          By registering, you agree to the terms and conditions of CSE Hackathon 2026
        </p>
      </form>
    </section>
  );
}
