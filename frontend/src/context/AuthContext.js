import React, { Component, createContext } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export class AuthProvider extends Component {
  constructor(props) {
    super(props);
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    this.state = {
      user: user,
      token: token,
      loading: false,
      error: null
    };
  }

  componentDidMount() {
    if (this.state.token) {
      this.loadUser();
    }
  }

  loadUser = async () => {
    try {
      this.setState({ loading: true });
      const response = await api.getMe();
      
      if (response.success) {
        this.setState({
          user: response.data,
          loading: false,
          error: null
        });
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Load user error:', error);
      this.setState({ loading: false, error: error.message });
      this.logout();
    }
  };

  login = async (credentials) => {
    try {
      this.setState({ loading: true, error: null });
      const response = await api.login(credentials);

      if (response.success) {
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        this.setState({
          user,
          token,
          loading: false,
          error: null
        });

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      this.setState({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  register = async (userData) => {
    try {
      this.setState({ loading: true, error: null });
      const response = await api.register(userData);

      if (response.success) {
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        this.setState({
          user,
          token,
          loading: false,
          error: null
        });

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      this.setState({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  logout = async () => {
    try {
      if (this.state.token) {
        await api.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.setState({
        user: null,
        token: null,
        loading: false,
        error: null
      });
    }
  };

  updateUser = (userData) => {
    this.setState({ user: userData });
    localStorage.setItem('user', JSON.stringify(userData));
  };

  clearError = () => {
    this.setState({ error: null });
  };

  render() {
    const contextValue = {
      user: this.state.user,
      token: this.state.token,
      loading: this.state.loading,
      error: this.state.error,
      isAuthenticated: !!this.state.token,
      login: this.login,
      register: this.register,
      logout: this.logout,
      updateUser: this.updateUser,
      clearError: this.clearError,
      loadUser: this.loadUser
    };

    return (
      <AuthContext.Provider value={contextValue}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}
