import React, { Component } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
          </form>

          <div className="auth-footer">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
