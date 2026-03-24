import React, { Component } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../../context/AuthContext.jsx';
import '../../styles/Auth.css';

class Register extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      error: '',
      loading: false,
      redirect: false
    };

    this.googleLoginRef = React.createRef();
  }

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
      error: ''
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    const { username, email, password, confirmPassword, fullName } = this.state;

    if (!username || !email || !password || !confirmPassword) {
      this.setState({ error: 'Vui lòng điền đầy đủ các trường bắt buộc' });
      return;
    }

    if (password !== confirmPassword) {
      this.setState({ error: 'Mật khẩu không khớp' });
      return;
    }

    if (password.length < 6) {
      this.setState({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    this.setState({ loading: true });

    const result = await this.context.register({
      username,
      email,
      password,
      fullName: fullName || username
    });

    if (result.success) {
      this.setState({ redirect: true });
    } else {
      this.setState({
        error: result.message || 'Đăng ký thất bại',
        loading: false
      });
    }
  };

  handleGoogleSuccess = async (credentialResponse) => {
    this.setState({ loading: true });
    const result = await this.context.loginWithGoogle(credentialResponse.credential);
    
    if (result.success) {
      this.setState({ redirect: true, redirectToHome: true });
    } else {
      this.setState({
        error: result.message || 'Đăng ký Google thất bại',
        loading: false
      });
    }
  };

  handleGoogleError = () => {
    this.setState({ 
      error: 'Đăng ký Google thất bại. Vui lòng thử lại.',
      loading: false
    });
  };

  handleGoogleButtonClick = () => {
    // Trigger click on the hidden GoogleLogin button
    if (this.googleLoginRef.current) {
      const button = this.googleLoginRef.current.querySelector('div[role="button"]');
      if (button) {
        button.click();
        return;
      }
    }
    
    // Fallback: Try to find the button by other means
    const googleButton = document.querySelector('[data-google-register] div[role="button"]');
    if (googleButton) {
      googleButton.click();
    }
  };

  render() {
    const { username, email, password, confirmPassword, fullName, error, loading, redirect, redirectToHome } = this.state;

    if (redirect) {
      return <Navigate to={redirectToHome ? "/" : "/login"} replace />;
    }

    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Tạo Tài Khoản</h1>
          <p className="auth-subtitle">Đăng ký để bắt đầu trò chuyện</p>

          <form onSubmit={this.handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Tên đăng nhập *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={this.handleChange}
                placeholder="Chọn tên đăng nhập"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={this.handleChange}
                placeholder="Nhập email của bạn"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Họ và tên (Không bắt buộc)</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={this.handleChange}
                placeholder="Nhập họ và tên"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={this.handleChange}
                placeholder="Tạo mật khẩu"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={this.handleChange}
                placeholder="Nhập lại mật khẩu"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
            </button>

            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            <div ref={this.googleLoginRef} className="google-login-wrapper" data-google-register>
              <GoogleLogin
                onSuccess={this.handleGoogleSuccess}
                onError={this.handleGoogleError}
                useOneTap={false}
                size="large"
                width="400"
              />
            </div>
          </form>

          <div className="google-custom-button-wrapper">
            <button
              type="button"
              className="btn-google"
              onClick={this.handleGoogleButtonClick}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Đăng ký với Google</span>
            </button>
          </div>

          <div className="auth-footer">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Register;
