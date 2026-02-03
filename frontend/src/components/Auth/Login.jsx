import React, { Component } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../../context/AuthContext.jsx';
import '../../styles/Auth.css';

class Login extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    
    this.state = {
      loginId: '',
      password: '',
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
    
    const { loginId, password } = this.state;

    if (!loginId || !password) {
      this.setState({ error: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    this.setState({ loading: true });

    const result = await this.context.login({ loginId, password });

    if (result.success) {
      this.setState({ redirect: true });
    } else {
      this.setState({
        error: result.message || 'Đăng nhập thất bại',
        loading: false
      });
    }
  };

  handleGoogleSuccess = async (credentialResponse) => {
    this.setState({ loading: true });
    const result = await this.context.loginWithGoogle(credentialResponse.credential);
    
    if (result.success) {
      this.setState({ redirect: true });
    } else {
      this.setState({
        error: result.message || 'Đăng nhập Google thất bại',
        loading: false
      });
    }
  };

  handleGoogleError = () => {
    this.setState({ 
      error: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
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
    const googleButton = document.querySelector('[data-google-login] div[role="button"]');
    if (googleButton) {
      googleButton.click();
    }
  };

  render() {
    const { loginId, password, error, loading, redirect } = this.state;

    if (redirect) {
      return <Navigate to="/" replace />;
    }

    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Chào Mừng Trở Lại</h1>
          <p className="auth-subtitle">Đăng nhập để tiếp tục trò chuyện</p>

          <form onSubmit={this.handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="loginId">Tên đăng nhập hoặc Email</label>
              <input
                type="text"
                id="loginId"
                name="loginId"
                value={loginId}
                onChange={this.handleChange}
                placeholder="Nhập tên đăng nhập hoặc email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={this.handleChange}
                placeholder="Nhập mật khẩu"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </button>

            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            <div ref={this.googleLoginRef} className="google-login-wrapper" data-google-login>
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
              <span>Tiếp tục với Google</span>
            </button>
          </div>

          <div className="auth-footer">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
