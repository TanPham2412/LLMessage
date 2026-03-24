import React, { Component } from 'react';
import api from '../../services/api';
import '../../styles/UserSettings.css';

class UserSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // 2FA State
      twoFactorEnabled: false,
      twoFactorMethod: 'totp',
      unusedBackupCodes: 0,
      
      // Setup 2FA State
      showSetup2FA: false,
      qrCode: null,
      secret: null,
      setupCode: '',
      setupError: '',
      setupLoading: false,
      
      // Disable 2FA State
      showDisable2FA: false,
      disablePassword: '',
      disableError: '',
      disableLoading: false,
      
      // Backup Codes State
      backupCodes: null,
      showBackupCodes: false,
      regeneratePassword: '',
      regenerateError: '',
      regenerateLoading: false,
      
      // Change Password State
      showChangePassword: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      changePasswordError: '',
      changePasswordLoading: false,
      
      loading: true,
      success: ''
    };
  }

  async componentDidMount() {
    await this.load2FAStatus();
  }

  load2FAStatus = async () => {
    try {
      this.setState({ loading: true });
      const result = await api.get2FAStatus();
      
      if (result.success) {
        this.setState({
          twoFactorEnabled: result.data.twoFactorEnabled,
          twoFactorMethod: result.data.twoFactorMethod,
          unusedBackupCodes: result.data.unusedBackupCodes,
          loading: false
        });
      }
    } catch (error) {
      console.error('Load 2FA status error:', error);
      this.setState({ loading: false });
    }
  };

  handleSetup2FA = async () => {
    try {
      this.setState({ setupLoading: true, setupError: '' });
      const result = await api.setup2FA();
      
      if (result.success) {
        this.setState({
          showSetup2FA: true,
          qrCode: result.data.qrCode,
          secret: result.data.secret,
          setupLoading: false
        });
      }
    } catch (error) {
      this.setState({
        setupError: error.response?.data?.message || 'Không thể khởi tạo 2FA',
        setupLoading: false
      });
    }
  };

  handleVerify2FA = async (e) => {
    e.preventDefault();
    const { setupCode } = this.state;

    if (setupCode.length !== 6) {
      this.setState({ setupError: 'Vui lòng nhập mã 6 số' });
      return;
    }

    try {
      this.setState({ setupLoading: true, setupError: '' });
      const result = await api.verify2FA(setupCode);
      
      if (result.success) {
        this.setState({
          backupCodes: result.data.backupCodes,
          showBackupCodes: true,
          showSetup2FA: false,
          setupCode: '',
          twoFactorEnabled: true,
          unusedBackupCodes: result.data.backupCodes.length,
          success: '2FA đã được kích hoạt thành công!',
          setupLoading: false
        });
      }
    } catch (error) {
      this.setState({
        setupError: error.response?.data?.message || 'Mã xác thực không đúng',
        setupLoading: false
      });
    }
  };

  handleDisable2FA = async (e) => {
    e.preventDefault();
    const { disablePassword } = this.state;

    if (!disablePassword) {
      this.setState({ disableError: 'Vui lòng nhập mật khẩu' });
      return;
    }

    try {
      this.setState({ disableLoading: true, disableError: '' });
      const result = await api.disable2FA(disablePassword);
      
      if (result.success) {
        this.setState({
          twoFactorEnabled: false,
          showDisable2FA: false,
          disablePassword: '',
          success: '2FA đã được tắt',
          disableLoading: false
        });
      }
    } catch (error) {
      this.setState({
        disableError: error.response?.data?.message || 'Không thể tắt 2FA',
        disableLoading: false
      });
    }
  };

  handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    const { regeneratePassword } = this.state;

    if (!regeneratePassword) {
      this.setState({ regenerateError: 'Vui lòng nhập mật khẩu' });
      return;
    }

    try {
      this.setState({ regenerateLoading: true, regenerateError: '' });
      const result = await api.regenerateBackupCodes(regeneratePassword);
      
      if (result.success) {
        this.setState({
          backupCodes: result.data.backupCodes,
          showBackupCodes: true,
          regeneratePassword: '',
          unusedBackupCodes: result.data.backupCodes.length,
          success: 'Mã backup mới đã được tạo',
          regenerateLoading: false
        });
      }
    } catch (error) {
      this.setState({
        regenerateError: error.response?.data?.message || 'Không thể tạo mã backup mới',
        regenerateLoading: false
      });
    }
  };

  copyBackupCodes = () => {
    const { backupCodes } = this.state;
    if (backupCodes) {
      const text = backupCodes.join('\n');
      navigator.clipboard.writeText(text);
      this.setState({ success: 'Đã sao chép mã backup' });
    }
  };

  handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = this.state;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      this.setState({ changePasswordError: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    if (newPassword.length < 6) {
      this.setState({ changePasswordError: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    if (newPassword !== confirmPassword) {
      this.setState({ changePasswordError: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      this.setState({ changePasswordLoading: true, changePasswordError: '' });
      const result = await api.changePassword({
        currentPassword,
        newPassword
      });
      
      if (result.success) {
        this.setState({
          showChangePassword: false,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          success: result.message || 'Mật khẩu đã được thay đổi thành công',
          changePasswordLoading: false
        });
      }
    } catch (error) {
      this.setState({
        changePasswordError: error.response?.data?.message || 'Không thể thay đổi mật khẩu',
        changePasswordLoading: false
      });
    }
  };

  render() {
    const {
      twoFactorEnabled, unusedBackupCodes, loading, success,
      showSetup2FA, qrCode, secret, setupCode, setupError, setupLoading,
      showDisable2FA, disablePassword, disableError, disableLoading,
      backupCodes, showBackupCodes, regeneratePassword, regenerateError, regenerateLoading,
      showChangePassword, currentPassword, newPassword, confirmPassword, changePasswordError, changePasswordLoading
    } = this.state;

    const { onClose } = this.props;

    if (loading) {
      return (
        <div className="settings-modal">
          <div className="settings-content">
            <div className="loading">Đang tải...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="settings-modal" onClick={onClose}>
        <div className="settings-content" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Cài đặt bảo mật</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="settings-body">
            {success && <div className="success-message">{success}</div>}

            {/* 2FA Status */}
            <div className="settings-section">
              <h3>Xác thực 2 lớp (2FA)</h3>
              <p className="section-description">
                {twoFactorEnabled 
                  ? 'Bảo vệ tài khoản của bạn với xác thực 2 lớp' 
                  : 'Thêm một lớp bảo mật bổ sung cho tài khoản của bạn'}
              </p>

              <div className="settings-row">
                <div className="settings-info">
                  <strong>Trạng thái:</strong>
                  <span className={`status ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                    {twoFactorEnabled ? 'Đã bật' : 'Chưa bật'}
                  </span>
                </div>

                {twoFactorEnabled ? (
                  <button 
                    className="btn btn-danger"
                    onClick={() => this.setState({ showDisable2FA: true, success: '' })}
                  >
                    Tắt 2FA
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={this.handleSetup2FA}
                    disabled={setupLoading}
                  >
                    {setupLoading ? 'Đang khởi tạo...' : 'Bật 2FA'}
                  </button>
                )}
              </div>

              {twoFactorEnabled && (
                <div className="settings-row">
                  <div className="settings-info">
                    <strong>Mã backup còn lại:</strong>
                    <span>{unusedBackupCodes}</span>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => this.setState({ showBackupCodes: true, success: '' })}
                  >
                    Tạo mã backup mới
                  </button>
                </div>
              )}
            </div>

            {/* Change Password Section */}
            <div className="settings-section">
              <h3>Thay đổi mật khẩu</h3>
              <p className="section-description">
                Cập nhật mật khẩu của bạn để bảo mật tài khoản
              </p>

              <div className="settings-row">
                <div className="settings-info">
                  <strong>Mật khẩu:</strong>
                  <span style={{ color: 'rgba(226, 232, 240, 0.6)' }}>••••••••</span>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => this.setState({ showChangePassword: true, success: '' })}
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>

            {/* Setup 2FA Modal */}
            {showSetup2FA && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3>Thiết lập 2FA</h3>
                  {setupError && <div className="error-message">{setupError}</div>}

                  <div className="setup-steps">
                    <p><strong>Bước 1:</strong> Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy, etc.)</p>
                    {qrCode && (
                      <div className="qr-code-container">
                        <img src={qrCode} alt="QR Code" />
                      </div>
                    )}

                    <p><strong>Bước 2:</strong> Hoặc nhập mã thủ công:</p>
                    <div className="secret-code">
                      <code>{secret}</code>
                    </div>

                    <p><strong>Bước 3:</strong> Nhập mã 6 số từ ứng dụng để xác nhận:</p>
                    <form onSubmit={this.handleVerify2FA}>
                      <input
                        type="text"
                        value={setupCode}
                        onChange={(e) => this.setState({ 
                          setupCode: e.target.value.replace(/\D/g, '').slice(0, 6),
                          setupError: '' 
                        })}
                        placeholder="000000"
                        maxLength={6}
                        className="code-input"
                        style={{ 
                          fontSize: '24px', 
                          textAlign: 'center', 
                          letterSpacing: '8px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <div className="modal-actions">
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => this.setState({ showSetup2FA: false, setupCode: '', setupError: '' })}
                        >
                          Hủy
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={setupLoading || setupCode.length !== 6}
                        >
                          {setupLoading ? 'Đang xác thực...' : 'Xác nhận'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Disable 2FA Modal */}
            {showDisable2FA && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3>Tắt 2FA</h3>
                  {disableError && <div className="error-message">{disableError}</div>}
                  
                  <p>Nhập mật khẩu của bạn để xác nhận tắt 2FA:</p>
                  <form onSubmit={this.handleDisable2FA}>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => this.setState({ disablePassword: e.target.value, disableError: '' })}
                      placeholder="Mật khẩu"
                    />
                    <div className="modal-actions">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => this.setState({ showDisable2FA: false, disablePassword: '', disableError: '' })}
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-danger"
                        disabled={disableLoading}
                      >
                        {disableLoading ? 'Đang xử lý...' : 'Tắt 2FA'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Backup Codes Modal */}
            {showBackupCodes && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3>Mã Backup</h3>
                  
                  {backupCodes ? (
                    <>
                      <p className="warning-message">
                        ⚠️ Lưu các mã này ở nơi an toàn. Mỗi mã chỉ có thể sử dụng một lần.
                      </p>
                      <div className="backup-codes-list">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="backup-code">{code}</div>
                        ))}
                      </div>
                      <div className="modal-actions">
                        <button 
                          className="btn btn-secondary"
                          onClick={this.copyBackupCodes}
                        >
                          Sao chép
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={() => this.setState({ showBackupCodes: false, backupCodes: null })}
                        >
                          Đã lưu
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {regenerateError && <div className="error-message">{regenerateError}</div>}
                      <p>Nhập mật khẩu để tạo mã backup mới:</p>
                      <form onSubmit={this.handleRegenerateBackupCodes}>
                        <input
                          type="password"
                          value={regeneratePassword}
                          onChange={(e) => this.setState({ regeneratePassword: e.target.value, regenerateError: '' })}
                          placeholder="Mật khẩu"
                        />
                        <div className="modal-actions">
                          <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => this.setState({ showBackupCodes: false, regeneratePassword: '', regenerateError: '' })}
                          >
                            Hủy
                          </button>
                          <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={regenerateLoading}
                          >
                            {regenerateLoading ? 'Đang tạo...' : 'Tạo mã mới'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {showChangePassword && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3>Thay đổi mật khẩu</h3>
                  {changePasswordError && <div className="error-message">{changePasswordError}</div>}
                  
                  <form onSubmit={this.handleChangePassword}>
                    <p>Mật khẩu hiện tại:</p>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => this.setState({ currentPassword: e.target.value, changePasswordError: '' })}
                      placeholder="Nhập mật khẩu hiện tại"
                      autoComplete="current-password"
                    />

                    <p>Mật khẩu mới:</p>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => this.setState({ newPassword: e.target.value, changePasswordError: '' })}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      autoComplete="new-password"
                    />

                    <p>Xác nhận mật khẩu mới:</p>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => this.setState({ confirmPassword: e.target.value, changePasswordError: '' })}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                    />

                    <div className="modal-actions">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => this.setState({ 
                          showChangePassword: false, 
                          currentPassword: '', 
                          newPassword: '', 
                          confirmPassword: '', 
                          changePasswordError: '' 
                        })}
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={changePasswordLoading}
                      >
                        {changePasswordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default UserSettings;
