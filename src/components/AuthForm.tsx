import React, { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { Eye, EyeOff } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserType = Database['public']['Tables']['profiles']['Row']['user_type'];

interface AuthFormProps {
  onSuccess: () => void;
  onSignUpSuccess?: () => void;
}

export default function AuthForm({ onSuccess, onSignUpSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('brand');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, userType);
        if (onSignUpSuccess) {
          onSignUpSuccess();
        }
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-center text-[#2B4B9B] mb-6">
        {isSignUp ? 'Create an Account' : 'Welcome Back'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
            required
          />
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
              className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] pr-10"
              required
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

        {isSignUp && (
          <div>
            <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
              I am a
            </label>
            <select
              id="userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType)}
              className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
              required
            >
              <option value="brand">Brand</option>
              <option value="agency">Marketing Agency</option>
              <option value="creator">Creator</option>
              <option value="event_organizer">Event Organizer</option>
            </select>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-[#2B4B9B] text-white font-medium hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}