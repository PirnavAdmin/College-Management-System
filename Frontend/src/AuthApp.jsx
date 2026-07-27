import { useMemo, useState } from 'react';
import { authenticateUser, registerUser, requestPasswordReset, resetPasswordWithOtp, ROLE_OPTIONS } from './auth-utils';

const initialUsers = [];

function AuthApp() {
  const [view, setView] = useState('login');
  const [users, setUsers] = useState(initialUsers);
  const [authMessage, setAuthMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [resetContact, setResetContact] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    password: '',
    confirmPassword: '',
    role: 'Student',
  });
  const [loginData, setLoginData] = useState({ contact: '', password: '' });
  const [errors, setErrors] = useState({});

  const dashboardStats = useMemo(
    () => [
      { label: 'Active Students', value: '12,440' },
      { label: 'New Admissions', value: '1,280' },
      { label: 'Attendance Rate', value: '92%' },
      { label: 'Pending Fees', value: '₹ 2.3M' },
    ],
    []
  );

  const rolePanels = useMemo(
    () => ({
      'Super Admin': ['Colleges', 'Campuses', 'Users', 'Audit logs'],
      'College Admin': ['Admissions', 'Staff', 'Departments', 'Reports'],
      HOD: ['Faculty', 'Subjects', 'Timetable', 'Attendance'],
      Faculty: ['Attendance', 'Lessons', 'Assignments', 'Internal marks'],
      Student: ['Profile', 'Timetable', 'Fees', 'Results'],
      Parent: ['Attendance', 'Fees', 'Results', 'Notices'],
      Accounts: ['Collections', 'Scholarships', 'Payroll', 'Reports'],
      'Examination Cell': ['Schedules', 'Hall tickets', 'Seating', 'Results'],
      Library: ['Catalog', 'Issue/return', 'Fines', 'Inventory'],
      'Hostel Warden': ['Rooms', 'Mess', 'Visitors', 'Leave'],
      'Placement Officer': ['Companies', 'Drives', 'Offers', 'Reports'],
    }),
    []
  );

  const headings = {
    login: 'Sign in to the College CMS',
    register: 'Create your CMS account',
    forgot: 'Forgot your password?',
    reset: 'Reset your password',
  };

  const descriptions = {
    login: 'Enter your email or phone number and password to access your campus dashboard.',
    register: 'Register with your role and start using the college management portal.',
    forgot: 'We will send an OTP to your email or phone so you can reset your password.',
    reset: 'Enter a new password and confirm it to finish resetting your account.',
  };

  const clearErrors = () => setErrors({});

  const validateEmailOrPhone = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email or phone number is required.';
    if (trimmed.length < 6) return 'Enter a valid email or phone number.';
    return '';
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const nextErrors = {};

    const contactError = validateEmailOrPhone(formData.contact);
    if (contactError) nextErrors.contact = contactError;
    if (!formData.name.trim()) nextErrors.name = 'Name is required.';
    if (!formData.password) nextErrors.password = 'Password is required.';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const user = registerUser({ ...formData, users });
      setUsers([...users, user]);
      setAuthMessage(`Registration successful for ${user.name}. Please login.`);
      setFormData({ name: '', contact: '', password: '', confirmPassword: '', role: 'Student' });
      setView('login');
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const nextErrors = {};

    const contactError = validateEmailOrPhone(loginData.contact);
    if (contactError) nextErrors.contact = contactError;
    if (!loginData.password) nextErrors.password = 'Password is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const session = authenticateUser(users, loginData.contact, loginData.password);
      setLoggedInUser(session);
      setAuthMessage(`Welcome back, ${session.name}.`);
      setLoginData({ contact: '', password: '' });
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const handleForgotPassword = (event) => {
    event.preventDefault();
    try {
      const resetState = requestPasswordReset(users, resetContact);
      setOtp(resetState.otp);
      setAuthMessage(`OTP sent to ${resetState.contact}. Use it to reset your password.`);
      setView('reset');
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    const password = event.target.password.value;
    const confirmPassword = event.target.confirmPassword.value;

    try {
      const updatedUser = resetPasswordWithOtp(users, resetContact, otp, password, confirmPassword);
      setUsers((currentUsers) => currentUsers.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));
      setAuthMessage(`Password reset successful for ${updatedUser.contact}. Please login.`);
      setView('login');
      setResetContact('');
      setOtp('');
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const logout = () => {
    setLoggedInUser(null);
    setAuthMessage('You have logged out.');
    setView('login');
  };

  return (
    <div className="app-shell">
      {loggedInUser ? (
        <div className="dashboard-shell">
          <aside className="sidebar">
            <div className="brand-block">
              <span>CMS</span>
              <strong>Admin Hub</strong>
            </div>
            <nav>
              <button type="button" className="sidebar-link active">Overview</button>
              <button type="button" className="sidebar-link">Admissions</button>
              <button type="button" className="sidebar-link">Timetable</button>
              <button type="button" className="sidebar-link">Fees</button>
              <button type="button" className="sidebar-link">Library</button>
              <button type="button" className="sidebar-link">Reports</button>
            </nav>
          </aside>
          <main className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <p className="secondary-label">Signed in as</p>
                <h1>{loggedInUser.name}</h1>
                <p className="role-label">{loggedInUser.role}</p>
              </div>
              <button type="button" className="logout-button" onClick={logout}>
                Logout
              </button>
            </header>
            <section className="stats-panel">
              {dashboardStats.map((item) => (
                <div className="stat-card" key={item.label}>
                  <p className="stat-value">{item.value}</p>
                  <p className="stat-label">{item.label}</p>
                </div>
              ))}
            </section>
            <section className="quick-panel">
              <h2>Quick access</h2>
              <div className="quick-grid">
                {(rolePanels[loggedInUser.role] || rolePanels.Student).map((item) => (
                  <div className="quick-item" key={item}>
                    <h3>{item}</h3>
                    <p>Open {item.toLowerCase()} section.</p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      ) : (
        <div className={`auth-layout auth-${view}`}>
          <section className="auth-side">
            <div className="auth-side-layer">
              <span className="brand-pill">College CMS</span>
              <h1>Smart campus control for every role</h1>
              <p>
                Manage students, faculty, fees, exams and more from a clean admin portal tailored for colleges.
              </p>
              <ul className="feature-list">
                <li>Role-based access</li>
                <li>Academic dashboards</li>
                <li>Secure password recovery</li>
              </ul>
            </div>
          </section>

          <section className="auth-panel">
            <div className="auth-card">
              <div className="auth-card-header">
                <span className="auth-step">{view === 'login' ? 'Sign in' : view === 'register' ? 'Register' : 'Recover'}</span>
                <h2>{headings[view]}</h2>
                <p>{descriptions[view]}</p>
              </div>

              {authMessage ? <div className="message-box">{authMessage}</div> : null}

              {view === 'login' && (
                <form onSubmit={handleLogin} className="auth-form">
                  <div className="field-group">
                    <input
                      className={errors.contact ? 'invalid' : ''}
                      value={loginData.contact}
                      onChange={(event) => setLoginData({ ...loginData, contact: event.target.value })}
                      placeholder="Email or phone number"
                      required
                    />
                    {errors.contact ? <span className="field-error">{errors.contact}</span> : null}
                  </div>
                  <div className="field-group">
                    <input
                      className={errors.password ? 'invalid' : ''}
                      type="password"
                      value={loginData.password}
                      onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
                      placeholder="Password"
                      required
                    />
                    {errors.password ? <span className="field-error">{errors.password}</span> : null}
                  </div>
                  <button type="submit">Sign in to dashboard</button>
                  <div className="auth-link-row">
                    <button type="button" className="link-button" onClick={() => setView('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                </form>
              )}

              {view === 'register' && (
                <form onSubmit={handleRegister} className="auth-form">
                  <div className="field-group">
                    <input
                      className={errors.name ? 'invalid' : ''}
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="Full name"
                      required
                    />
                    {errors.name ? <span className="field-error">{errors.name}</span> : null}
                  </div>
                  <div className="field-group">
                    <input
                      className={errors.contact ? 'invalid' : ''}
                      value={formData.contact}
                      onChange={(event) => setFormData({ ...formData, contact: event.target.value })}
                      placeholder="Email or phone number"
                      required
                    />
                    {errors.contact ? <span className="field-error">{errors.contact}</span> : null}
                  </div>
                  <select value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value })}>
                    {ROLE_OPTIONS.map((role) => (
                      <option value={role} key={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <div className="field-group">
                    <input
                      className={errors.password ? 'invalid' : ''}
                      type="password"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      placeholder="Password"
                      required
                    />
                    {errors.password ? <span className="field-error">{errors.password}</span> : null}
                  </div>
                  <div className="field-group">
                    <input
                      className={errors.confirmPassword ? 'invalid' : ''}
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                      placeholder="Confirm password"
                      required
                    />
                    {errors.confirmPassword ? (
                      <span className="field-error">{errors.confirmPassword}</span>
                    ) : null}
                  </div>
                  <button type="submit">Create account</button>
                </form>
              )}

              {view === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="auth-form">
                  <div className="field-group">
                    <input
                      className={errors.contact ? 'invalid' : ''}
                      value={resetContact}
                      onChange={(event) => setResetContact(event.target.value)}
                      placeholder="Email or phone number"
                      required
                    />
                    {errors.contact ? <span className="field-error">{errors.contact}</span> : null}
                  </div>
                  <button type="submit">Send OTP</button>
                </form>
              )}

              {view === 'reset' && (
                <form onSubmit={handleResetPassword} className="auth-form">
                  <p className="otp-note">Enter a new password for {resetContact}</p>
                  <div className="field-group">
                    <input
                      className={errors.password ? 'invalid' : ''}
                      type="password"
                      name="password"
                      placeholder="New password"
                      required
                    />
                    {errors.password ? <span className="field-error">{errors.password}</span> : null}
                  </div>
                  <div className="field-group">
                    <input
                      className={errors.confirmPassword ? 'invalid' : ''}
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm password"
                      required
                    />
                    {errors.confirmPassword ? (
                      <span className="field-error">{errors.confirmPassword}</span>
                    ) : null}
                  </div>
                  <button type="submit">Reset password</button>
                </form>
              )}

              <div className="auth-switch">
                {view === 'login' ? (
                  <p>
                    New here?{' '}
                    <button type="button" className="link-button" onClick={() => setView('register')}>
                      Create an account
                    </button>
                  </p>
                ) : view === 'register' ? (
                  <p>
                    Already have an account?{' '}
                    <button type="button" className="link-button" onClick={() => setView('login')}>
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p>
                    Remembered your password?{' '}
                    <button type="button" className="link-button" onClick={() => setView('login')}>
                      Back to login
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AuthApp;
