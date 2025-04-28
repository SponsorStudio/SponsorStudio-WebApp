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
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      await supabase.auth.signOut();
      toast.error('Failed to create user profile');
      throw new Error('Failed to create user profile');
    }

    toast.success('Account created successfully!');
    return authData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    toast.error('An unexpected error occurred during signup');
    throw new Error('An unexpected error occurred during signup');
  }
}

export async function signIn(email: string, password: string) {
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
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
        throw new Error('Invalid email or password');
      }
      toast.error(error.message);
      throw error;
    }

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

export async function updateProfile(data: Partial<Profile>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      throw new Error('Not authenticated');
    }

    // Clean the data to remove fields that shouldn't be updated
    const updateData: Partial<Profile> = { ...data };
    delete updateData.created_at;
    delete updateData.id;

    // Ensure updated_at is set
    updateData.updated_at = new Date().toISOString();

    // Validate and transform data to match schema
    if (updateData.annual_marketing_budget !== undefined) {
      if (updateData.annual_marketing_budget === '' || isNaN(Number(updateData.annual_marketing_budget))) {
        updateData.annual_marketing_budget = null;
      } else {
        updateData.annual_marketing_budget = Number(updateData.annual_marketing_budget);
      }
    }

    // Ensure array fields are arrays
    if (updateData.marketing_channels && !Array.isArray(updateData.marketing_channels)) {
      updateData.marketing_channels = updateData.marketing_channels
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (updateData.sponsorship_goals && !Array.isArray(updateData.sponsorship_goals)) {
      updateData.sponsorship_goals = updateData.sponsorship_goals
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (updateData.previous_sponsorships && !Array.isArray(updateData.previous_sponsorships)) {
      updateData.previous_sponsorships = updateData.previous_sponsorships
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    // Ensure JSONB fields are valid
    if (updateData.social_media) {
      const socialMedia = updateData.social_media;
      if (
        Object.values(socialMedia).every(
          (value) => value === '' || value === null || value === undefined
        )
      ) {
        updateData.social_media = null;
      }
    }
    if (updateData.target_audience) {
      const targetAudience = updateData.target_audience;
      if (
        !targetAudience.age_range ||
        !targetAudience.genders ||
        !targetAudience.interests ||
        !targetAudience.locations
      ) {
        updateData.target_audience = null;
      } else if (
        targetAudience.genders.length === 0 &&
        targetAudience.interests.length === 0 &&
        targetAudience.locations.length === 0 &&
        targetAudience.age_range.min === 0 &&
        targetAudience.age_range.max === 0
      ) {
        updateData.target_audience = null;
      }
    }

    console.log('Updating profile with data:', JSON.stringify(updateData, null, 2));

    const { error, data: updatedData, status } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
      });
      toast.error('Error updating profile');
      throw error;
    }

    toast.success('Profile updated successfully');
    return updatedData;
  } catch (error) {
    if (error instanceof Error) {
      toast.error('Failed to update profile');
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

    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error('Only JPG and PNG files are allowed');
      throw new Error('Only JPG and PNG files are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Error uploading profile picture');
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

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