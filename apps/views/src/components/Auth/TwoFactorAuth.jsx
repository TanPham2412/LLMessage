import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import api from '../../services/api';
import '../../styles/Auth.css';

class TwoFactorAuth extends Component {
  static contextType = AuthContext;
  constructor(props) {
    super(props);
    this.state = {
      code: '',
      backupCode: '',
      useBackupCode: false,
      error: '',
      loading: false,
      redirect: false
    };
  }

  handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      this.setState({ code: value, error: '' });
    }
  };

  handleBackupCodeChange = (e) => {
    this.setState({ backupCode: e.target.value.trim(), error: '' });
  };

  toggleBackupCode = () => {
    this.setState(prevState => ({
      useBackupCode: !prevState.useBackupCode,
      code: '',
      backupCode: '',
      error: ''
    }));
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { code, backupCode, useBackupCode } = this.state;
    const { tempToken, onSuccess } = this.props;

    if (!useBackupCode && code.length !== 6) {
      this.setState({ error: 'Vui lòng nhập đầy đủ mã 6 số' });
      return;
    }

    if (useBackupCode && !backupCode) {
      this.setState({ error: 'Vui lòng nhập mã backup' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      console.log('Validating 2FA with:', { tempToken, code, backupCode, useBackupCode });
      
      const result = await api.validate2FALogin({
        tempToken,
        code: useBackupCode ? undefined : code,
        backupCode: useBackupCode ? backupCode : undefined
      });

      console.log('2FA validation result:', result);

      if (result.success && result.data) {
        const { token, user } = result.data;
        
        console.log('Updating AuthContext with user and token...');

        // Update AuthContext
        if (this.context && this.context.setUserAndToken) {
          this.context.setUserAndToken(user, token);
        } else {
          // Fallback: save to localStorage only
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userId', user._id);
        }

        console.log('Context updated, redirecting...');

        // Small delay to ensure state is updated
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            this.setState({ redirect: true });
          }
        }, 100);
      } else {
        this.setState({
          error: result.message || 'Xác thực thất bại',
          loading: false,
          code: '',
          backupCode: ''
        });
      }
    } catch (error) {
      console.error('2FA validation error:', error);
      this.setState({
        error: error.response?.data?.message || 'Mã xác thực không đúng. Vui lòng thử lại.',
        loading: false,
        code: '',
        backupCode: ''
      });
    }
  };

  handleCancel = () => {
    const { onCancel } = this.props;
    if (onCancel) {
      onCancel();
    }
  };

  render() {
    const { code, backupCode, useBackupCode, error, loading, redirect } = this.state;

    if (redirect) {
      return <Navigate to="/" replace />;
    }

    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-icon">
            <div className="icon-circle">
              <span className="icon-lock">🔐</span>
            </div>
          </div>

          <h1>Xác thực 2 lớp</h1>
          <p className="auth-subtitle">
            {useBackupCode 
              ? 'Nhập mã backup để tiếp tục' 
              : 'Nhập mã từ ứng dụng xác thực của bạn'}
          </p>

          <form onSubmit={this.handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            {!useBackupCode ? (
              <div className="form-group">
                <label htmlFor="code">Mã xác thực (6 số)</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={this.handleCodeChange}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                  className="code-input-large"
                />
                <small className="form-hint">Nhập mã từ Google Authenticator hoặc ứng dụng tương tự</small>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="backupCode">Mã backup</label>
                <input
                  type="text"
                  id="backupCode"
                  value={backupCode}
                  onChange={this.handleBackupCodeChange}
                  placeholder="XXXXXXXX"
                  autoFocus
                  disabled={loading}
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="form-hint">Nhập một trong các mã backup đã được cung cấp</small>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (!useBackupCode && code.length !== 6) || (useBackupCode && !backupCode)}
            >
              {loading ? (
                <span>
                  <span className="spinner"></span>
                  Đang xác thực...
                </span>
              ) : (
                'Xác thực'
              )}
            </button>

            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            <div className="auth-options">
              <button
                type="button"
                onClick={this.toggleBackupCode}
                className="btn-secondary"
                disabled={loading}
              >
                {useBackupCode ? '🔢 Dùng mã xác thực' : '🔑 Dùng mã backup'}
              </button>
            </div>

            <div className="auth-footer">
              <button
                type="button"
                onClick={this.handleCancel}
                className="btn-link"
                disabled={loading}
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default TwoFactorAuth;
