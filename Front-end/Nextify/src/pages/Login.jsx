import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerAPI, userLoginAPI } from '../Services/allAPI';
import './Login.css';

function Login() {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('user');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Form data
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Clear alert after delay
  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 5000);
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      showAlert('error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await userLoginAPI(loginData);

      if (response.status === 200) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        showAlert('success', `Welcome back, ${user.username}!`);

        setTimeout(() => {
          if (user.role === 'admin') navigate('/admin'); else navigate('/');
        }, 1000);
      } else {
        showAlert('error', response.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      showAlert('error', 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      showAlert('error', 'Please fill in all fields');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      showAlert('error', 'Passwords do not match');
      return;
    }
    if (registerData.password.length < 6) {
      showAlert('error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await registerAPI({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password
      });

      if (response.status === 201) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        showAlert('success', 'Account created successfully!');

        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        showAlert('error', response.response?.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      showAlert('error', 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Switch tab handler (kept for compatibility but admin tab is hidden)
  const switchTab = (tab) => {
    setActiveTab(tab);
    setAlert({ type: '', message: '' });
    setLoginData({ email: '', password: '' });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <h1>Nextify</h1>
          <p>{isRegister ? 'Create your account' : 'Welcome back'}</p>
        </div>

        {/* Registration Form */}
        {isRegister ? (
          <div className="login-form-container" key="register">
            <button className="back-to-login" onClick={() => { setIsRegister(false); setAlert({ type: '', message: '' }); }}>
              ← Back to login
            </button>

            {/* Alert */}
            {alert.message && (
              <div className={`login-alert ${alert.type}`}>
                <span className="login-alert-icon">
                  {alert.type === 'error' ? '⚠' : '✓'}
                </span>
                {alert.message}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="login-input-group">
                <label>Username</label>
                <div className="login-input-wrapper">
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Enter your username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  />
                  <span className="login-input-icon">👤</span>
                </div>
              </div>

              <div className="login-input-group">
                <label>Email</label>
                <div className="login-input-wrapper">
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  />
                  <span className="login-input-icon">✉</span>
                </div>
              </div>

              <div className="login-input-group">
                <label>Password</label>
                <div className="login-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  />
                  <span className="login-input-icon">🔒</span>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="login-input-group">
                <label>Confirm Password</label>
                <div className="login-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  />
                  <span className="login-input-icon">🔒</span>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading && <span className="btn-spinner"></span>}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="login-switch">
              Already have an account?{' '}
              <button onClick={() => { setIsRegister(false); setAlert({ type: '', message: '' }); }}>
                Sign in
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="login-form-container" key={`login-${activeTab}`}>
            {/* Tabs */}
            <div className="login-tabs">
              <button
                className={`login-tab-btn ${activeTab === 'user' ? 'active' : ''}`}
                onClick={() => switchTab('user')}
              >
                👤 User Login
              </button>
            </div>

            {/* Alert */}
            {alert.message && (
              <div className={`login-alert ${alert.type}`}>
                <span className="login-alert-icon">
                  {alert.type === 'error' ? '⚠' : '✓'}
                </span>
                {alert.message}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="login-input-group">
                <label>Email</label>
                <div className="login-input-wrapper">
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    id="login-email"
                  />
                  <span className="login-input-icon">✉</span>
                </div>
              </div>

              <div className="login-input-group">
                <label>Password</label>
                <div className="login-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    id="login-password"
                  />
                  <span className="login-input-icon">🔒</span>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`login-submit-btn`}
                disabled={loading}
                id="login-submit"
              >
                {loading && <span className="btn-spinner"></span>}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Register link — only for user tab */}
            {activeTab === 'user' && (
              <div className="login-switch">
                Don't have an account?{' '}
                <button onClick={() => { setIsRegister(true); setAlert({ type: '', message: '' }); }}>
                  Create one
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default Login;