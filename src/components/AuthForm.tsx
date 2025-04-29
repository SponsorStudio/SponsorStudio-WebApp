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
  const [usePhone, setUsePhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userType, setUserType] = useState<UserType>('brand');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  async function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (usePhone) {
        if (!phoneNumber || !/^\+[1-9]{1}[0-9]{3,14}$/.test(phoneNumber)) {
          setError('Please enter a valid phone number in international format (e.g., +12025550123)');
          toast.error('Please enter a valid phone number in international format');
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long');
          toast.error('Password must be at least 6 characters long');
          return;
        }

        // Look up email by phone number
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone_number', phoneNumber)
          .single();

        if (profileError || !profile?.email) {
          setError('No account found with this phone number');
          toast.error('No account found with this phone number');
          throw new Error('No account found with this phone number');
        }

        const { user, profile: userProfile } = await signIn(profile.email, password);
        toast.success('Welcome back!');
        onSuccess();
      } else {
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
        toast.success('Welcome Kernals back!');
        onSuccess();
      }
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

    if (usePhone) {
      if (!phoneNumber || !/^\+[1-9]{1}[0-9]{3,14}$/.test(phoneNumber)) {
        setError('Please enter a valid phone number in international format (e.g., +12025550123)');
        toast.error('Please enter a valid phone number in international format');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long');
        toast.error('Password must be at least 6 characters long');
        return;
      }

      console.log('Sending OTP to phone:', phoneNumber);

      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: phoneNumber,
        });
        if (error) {
          console.error('Supabase OTP error:', {
            message: error.message,
            status: error.status,
            code: error.code,
          });
          if (error.status === 422) {
            setError(
              'Failed to send OTP. Please ensure your phone number is correct and try again, or contact support.'
            );
            toast.error(
              'Failed to send OTP. Please ensure your phone number is correct and try again, or contact support.'
            );
          } else {
            setError(error.message);
            toast.error(error.message);
          }
          throw error;
        }
        setIsOtpSent(true);
        setOtpResendCooldown(30); // 30-second cooldown for resend
        const cooldownInterval = setInterval(() => {
          setOtpResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        toast.success('OTP sent to your phone number');
      } catch (err) {
        if (!error) {
          setError('Failed to send OTP. Please try again or contact support.');
          toast.error('Failed to send OTP. Please try again or contact support.');
        }
      } finally {
        setLoading(false);
      }
    } else {
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

      try {
        const authData = await signUp(email, password, userType);
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
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);

    console.log('Verifying OTP for phone:', phoneNumber, 'with token:', otp);

    try {
      const { data: { user }, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otp,
        type: 'sms',
      });
      if (error) {
        console.error('Supabase OTP verification error:', {
          message: error.message,
          status: error.status,
          code: error.code,
        });
        setError(error.message);
        toast.error(error.message);
        throw error;
      }

      // Generate email from phone number
      const generatedEmail = `${phoneNumber.replace(/[^0-9]/g, '')}@sponsorstudio.in`;

      // Create the account
      const authData = await signUp(generatedEmail, password, userType, phoneNumber);
      if (!authData.user) {
        setError('Account creation failed - no user data returned');
        toast.error('Account creation failed - no user data returned');
        throw new Error('Account creation failed - no user data returned');
      }

      toast.success('Account created successfully');
      if (onSignUpSuccess) onSignUpSuccess();
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OTP verification or account creation failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <style jsx>{`
        .PhoneInput {
          display: flex;
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .PhoneInput:hover {
          border-color: #a1a1aa;
        }
        .PhoneInput:focus-within {
          border-color: #2B4B9B;
          box-shadow: 0 0 0 2px rgba(43, 75, 155, 0.2);
        }
        .PhoneInputInput {
          border: none;
          outline: none;
          flex: 1;
          font-size: 1rem;
          line-height: 1.5rem;
          background: transparent;
          color: #111827;
          width: 100%;
        }
        .PhoneInputInput::placeholder {
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
        .PhoneInput--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <h2 className="text-2xl font-bold text-center text-[#2B4B9B] mb-6">
        {isSignUp ? (isOtpSent ? 'Verify OTP' : 'Create an Account') : 'Welcome Back'}
      </h2>

      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={() => {
            setUsePhone(!usePhone);
            setError('');
            setOtp('');
            setIsOtpSent(false);
            setOtpResendCooldown(0);
            setPhoneNumber('');
            setEmail('');
          }}
          className="text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
          disabled={loading}
        >
          {usePhone ? 'Use Email Instead' : 'Use Phone Number Instead'}
        </button>
      </div>

      <form
        onSubmit={isSignUp ? (isOtpSent ? handleOtpSubmit : handleSignUpSubmit) : handleSignInSubmit}
        className="space-y-6"
      >
        {!isOtpSent && (
          <>
            {usePhone ? (
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <PhoneInput
                  id="phoneNumber"
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="US"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] disabled:opacity-50"
                  required
                  disabled={loading}
                  placeholder="+12025550123"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter your phone number in international format (e.g., +12025550123)
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] disabled:opacity-50"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] pr-10 disabled:opacity-50"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                  className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] disabled:opacity-50"
                  required
                  disabled={loading}
                >
                  <option value="brand">Brand</option>
                  <option value="agency">Marketing Agency</option>
                  <option value="creator">Creator</option>
                  <option value="event_organizer">Event Organizer</option>
                </select>
              </div>
            )}
          </>
        )}

        {isSignUp && isOtpSent && usePhone && (
          <>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B] disabled:opacity-50"
                required
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-600">
                Enter the 6-digit OTP sent to {phoneNumber}
              </p>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={handleSignUpSubmit}
                className="text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
                disabled={loading || otpResendCooldown > 0}
              >
                {otpResendCooldown > 0
                  ? `Resend OTP in ${otpResendCooldown}s`
                  : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-[#2B4B9B] text-white font-medium hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Please wait...'
            : isSignUp
              ? isOtpSent && usePhone
                ? 'Verify OTP and Create Account'
                : 'Create Account'
              : 'Sign In'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsOtpSent(false);
              setError('');
              setOtp('');
              setPhoneNumber('');
              setEmail('');
              setPassword('');
              setOtpResendCooldown(0);
            }}
            className="text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {error && (
          <div className="text-center text-sm text-gray-600 mt-4">
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