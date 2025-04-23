import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../lib/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('admin@sponsorstudio.in');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && profile?.user_type === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if this is the admin email
      if (email !== 'admin@sponsorstudio.in') {
        setError('Invalid admin email address');
        setLoading(false);
        return;
      }

      // Attempt to sign in
      const { user, profile } = await signIn(email, password);
      
      if (profile?.user_type !== 'admin') {
        setError('This account does not have admin privileges');
        return;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-[#2B4B9B]">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the admin dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{error}</p>
            {error.includes('Invalid credentials') && (
              <p className="mt-2 text-sm">
                Need to create an admin account?{' '}
                <Link to="/admin/signup" className="font-medium text-red-700 hover:text-red-800 underline">
                  Sign up here
                </Link>
              </p>
            )}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                required
                autoComplete="email"
                disabled
              />
              <p className="mt-1 text-xs text-gray-500">
                Admin email is fixed to admin@sponsorstudio.in
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-[#2B4B9B] focus:border-[#2B4B9B] pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#2B4B9B] hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              First time here?{' '}
              <Link to="/admin/signup" className="font-medium text-[#2B4B9B] hover:text-[#1a2f61]">
                Create admin account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}