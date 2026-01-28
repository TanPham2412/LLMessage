import React, { Component } from 'react';
import { Link, Navigate } from 'react-router-dom';
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

  render() {
    const { username, email, password, confirmPassword, fullName, error, loading, redirect } = this.state;

    if (redirect) {
      return <Navigate to="/login" replace />;
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
          </form>

          <div className="auth-footer">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Register;
