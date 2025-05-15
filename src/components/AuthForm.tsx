import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { signIn, signUp } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import toast from 'react-hot-toast';

type UserType = Database['public']['Tables']['profiles']['Row']['user_type'];

interface AuthFormProps {
  onSuccess: () => void;
  onSignUpSuccess?: () => void;
}

export default function AuthForm({ onSuccess, onSignUpSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<UserType>('brand');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        toast.error('Please enter a valid email address');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long');
        toast.error('Password must be at least 6 characters long');
        return;
      }

      const { user, profile: userProfile } = await signIn(email, password);
      toast.success('Welcome back!');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during sign in';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        toast.error('Please enter a valid email address');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long');
        toast.error('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        toast.error('Passwords do not match');
        return;
      }
      if (!name) {
        setError('Please enter a name');
        toast.error('Please enter a name');
        return;
      }
      if (!phoneNumber || !/^\+[1-9]{1}[0-9]{3,14}$/.test(phoneNumber)) {
        setError('Please enter a valid phone number in international format (e.g., +12025550123)');
        toast.error('Please enter a valid phone number in international format');
        return;
      }

      const authData = await signUp(email, password, userType, phoneNumber, name);
      if (!authData.user) {
        setError('Account creation failed - no user data returned');
        toast.error('Account creation failed - no user data returned');
        throw new Error('Account creation failed - no user data returned');
      }
      toast.success('Account created successfully');
      if (onSignUpSuccess) onSignUpSuccess();
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during sign up';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-lg shadow-md p-6 max-h-[90vh] overflow-y-auto">
      <style jsx>{`
        .PhoneInput,
        input.custom-input,
        select.custom-select {
          display: flex;
          align-items: center;
          border: 1px solid #d1d5db !important;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .PhoneInput:hover,
        input.custom-input:hover,
        select.custom-select:hover {
          border-color: #a1a1aa !important;
        }
        .PhoneInput:focus-within,
        input.custom-input:focus,
        select.custom-select:focus {
          border-color: #2B4B9B !important;
          box-shadow: 0 0 0 2px rgba(43, 75, 155, 0.2);
          outline: none;
        }
        .PhoneInputInput,
        input.custom-input,
        select.custom-select {
          border: none;
          outline: none;
          flex: 1;
          font-size: 0.875rem;
          line-height: 1.25rem;
          background: transparent;
          color: #111827;
          width: 100%;
        }
        .PhoneInputInput::placeholder,
        input.custom-input::placeholder {
          color: #9ca3af;
        }
        .PhoneInputCountry {
          margin-right: 0.5rem;
        }
        .PhoneInputCountrySelect {
          border: none;
          background: transparent;
          color: #111827;
          outline: none;
        }
        .PhoneInputCountrySelectArrow {
          display: none;
        }
        .PhoneInput--disabled,
        input.custom-input:disabled,
        select.custom-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <h2 className="text-xl font-bold text-center text-[#2B4B9B] mb-4">
        {isSignUp ? 'Create an Account' : 'Welcome Back'}
      </h2>

      <form
        onSubmit={isSignUp ? handleSignUpSubmit : handleSignInSubmit}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-1.5 shadow-sm custom-input disabled:opacity-50"
            required
            disabled={loading}
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 shadow-sm custom-input disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700">
                Phone Number
              </label>
              <PhoneInput
                id="phoneNumber"
                international
                countryCallingCodeEditable={false}
                defaultCountry="IN"
                value={phoneNumber}
                onChange={setPhoneNumber}
                className="mt-1 block w-full shadow-sm disabled:opacity-50"
                required
                disabled={loading}
                placeholder="+12025550123"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-1.5 shadow-sm custom-input pr-8 disabled:opacity-50"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-1.5 shadow-sm custom-input pr-8 disabled:opacity-50"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {isSignUp && (
          <div>
            <label htmlFor="userType" className="block text-xs font-medium text-gray-700">
              I am a
            </label>
            <select
              id="userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType)}
              className="mt-1 block w-full px-3 py-1.5 shadow-sm custom-select disabled:opacity-50"
              required
              disabled={loading}
            >
              <option value="brand">Brand</option>
              <option value="agency">Marketing Agency</option>
              <option value="influencer">Influencer</option>
              <option value="event_organizer">Event Organizer</option>
            </select>
          </div>
        )}

        {error && <div className="text-red-600 text-xs">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-3 rounded-md bg-[#2B4B9B] text-white text-sm font-medium hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Please wait...'
            : isSignUp
              ? 'Create Account'
              : 'Sign In'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setPhoneNumber('');
              setName('');
            }}
            className="text-xs text-[#2B4B9B] hover:text-[#1a2f61]"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {error && (
          <div className="text-center text-xs text-gray-600 mt-2">
            Having trouble?{' '}
            <a href="mailto:support@sponsorstudio.in" className="text-[#2B4B9B] hover:text-[#1a2f61]">
              Contact support
            </a>
          </div>
        )}
      </form>
    </div>
  );
}