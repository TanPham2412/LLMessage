import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';

// Pages
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';
import ChatHome from './components/Chat/ChatHome.jsx';
import AdminDashboard from './components/Admin/AdminDashboard.jsx';
import AdminUsers from './components/Admin/AdminUsers.jsx';
import AdminMessages from './components/Admin/AdminMessages.jsx';
import UserProfile from './components/Profile/UserProfile.jsx';
import EditProfile from './components/Profile/EditProfile.jsx';
import PublicProfile from './components/Profile/PublicProfile.jsx';

// HOC for protected routes
class ProtectedRoute extends Component {
  render() {
    const token = localStorage.getItem('token');
    return token ? this.props.children : <Navigate to="/login" replace />;
  }
}

// HOC for admin routes
class AdminRoute extends Component {
  render() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return token && user.role === 'admin' ? this.props.children : <Navigate to="/" replace />;
  }
}

class App extends Component {
  render() {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <Router>
          <AuthProvider>
            <SocketProvider>
              <ChatProvider>
                <div className="app">
                  <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <ChatHome />
                      </ProtectedRoute>
                    }
                  />

                  {/* Profile Routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <UserProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/edit"
                    element={
                      <ProtectedRoute>
                        <EditProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/:userId"
                    element={
                      <ProtectedRoute>
                        <PublicProfile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/messages"
                    element={
                      <AdminRoute>
                        <AdminMessages />
                      </AdminRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </ChatProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
      </GoogleOAuthProvider>
    );
  }
}

export default App;
