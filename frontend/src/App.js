import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';

// Pages
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatHome from './components/Chat/ChatHome';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminUsers from './components/Admin/AdminUsers';
import AdminMessages from './components/Admin/AdminMessages';

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
    return (
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
    );
  }
}

export default App;
