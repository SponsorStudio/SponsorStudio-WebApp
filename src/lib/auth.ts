import { supabase } from './supabase';
import type { Database } from './database.types';
import toast from 'react-hot-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Password validation
function validatePassword(password: string): boolean {
  return password.length >= 6;
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function signUp(email: string, password: string, userType: Profile['user_type']) {
  // Validate email and password
  if (!validateEmail(email)) {
    toast.error('Invalid email format');
    throw new Error('Invalid email format');
  }

  if (!validatePassword(password)) {
    toast.error('Password must be at least 6 characters long');
    throw new Error('Password must be at least 6 characters long');
  }

  // Special handling for admin signup
  if (userType === 'admin' && email !== 'admin@sponsorstudio.in') {
    toast.error('Invalid admin credentials');
    throw new Error('Invalid admin credentials');
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      // Provide more specific error messages
      if (authError.message.includes('already registered')) {
        toast.error('This email is already registered');
        throw new Error('This email is already registered');
      }
      toast.error(authError.message);
      throw authError;
    }

    if (!authData.user) {
      toast.error('Signup failed - no user data returned');
      throw new Error('Signup failed - no user data returned');
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        user_type: userType,
      });

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      await supabase.auth.signOut();
      toast.error('Failed to create user profile');
      throw new Error('Failed to create user profile');
    }

    toast.success('Account created successfully!');
    return authData;
  } catch (error) {
    // Ensure we always throw an Error object with a message
    if (error instanceof Error) {
      throw error;
    }
    toast.error('An unexpected error occurred during signup');
    throw new Error('An unexpected error occurred during signup');
  }
}

export async function signIn(email: string, password: string) {
  // Validate email and password
  if (!validateEmail(email)) {
    toast.error('Invalid email format');
    throw new Error('Invalid email format');
  }

  if (!validatePassword(password)) {
    toast.error('Password must be at least 6 characters long');
    throw new Error('Password must be at least 6 characters long');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
        throw new Error('Invalid email or password');
      }
      toast.error(error.message);
      throw error;
    }

    // After successful sign in, fetch the user's profile
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        toast.error('Error fetching user profile');
        throw profileError;
      }

      // For admin login, verify user type
      if (email === 'admin@sponsorstudio.in' && profileData.user_type !== 'admin') {
        await signOut();
        toast.error('Invalid admin credentials');
        throw new Error('Invalid admin credentials');
      }

      toast.success('Welcome back!');
      return { user: data.user, profile: profileData };
    }

    toast.error('Sign in failed - no user data returned');
    throw new Error('Sign in failed - no user data returned');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    toast.error('An unexpected error occurred during sign in');
    throw new Error('An unexpected error occurred during sign in');
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Signed out successfully');
  } catch (error) {
    if (error instanceof Error) {
      toast.error('Error signing out');
      throw error;
    }
    toast.error('An unexpected error occurred during sign out');
    throw new Error('An unexpected error occurred during sign out');
  }
}

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      toast.error('Error fetching profile');
      throw error;
    }
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    toast.error('Failed to fetch user profile');
    throw new Error('Failed to fetch user profile');
  }
}

export async function updateProfile(profile: Partial<Profile>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Not authenticated');
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      toast.error('Error updating profile');
      throw error;
    }

    toast.success('Profile updated successfully');
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    toast.error('Failed to update profile');
    throw new Error('Failed to update profile');
  }
}

export async function uploadProfilePicture(file: File) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Not authenticated');
      throw new Error('Not authenticated');
    }

    // Check file type
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error('Only JPG and PNG files are allowed');
      throw new Error('Only JPG and PNG files are allowed');
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Error uploading profile picture');
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    // Update profile with new picture URL
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ profile_picture_url: publicUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      toast.error('Error updating profile picture');
      throw updateError;
    }

    toast.success('Profile picture updated successfully');
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    toast.error('Failed to upload profile picture');
    throw new Error('Failed to upload profile picture');
  }
}