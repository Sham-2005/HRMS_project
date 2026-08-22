import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private Shielded Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Default redirect to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Main Workspace pages */}
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route
            path="employees"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          
          <Route path="attendance" element={<Attendance />} />
          
          <Route path="leaves" element={<Leaves />} />
          
          <Route path="payroll" element={<Payroll />} />
          
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch all / 404 Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
