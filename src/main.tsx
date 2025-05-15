import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import App from './App';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import SuccessStoryPage from './components/SuccessStoryPage';
import ProfilePage from './components/ProfilePage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } 
          />
          <Route path="/story/:id" element={<SuccessStoryPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#f0faf5',
            color: '#047857',
            maxWidth: '500px',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>
);