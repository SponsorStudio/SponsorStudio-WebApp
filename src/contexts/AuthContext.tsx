import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import toast from 'react-hot-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isProfileComplete: boolean;
  showProfileDialog: boolean;
  setShowProfileDialog: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isProfileComplete: false,
  showProfileDialog: false,
  setShowProfileDialog: () => {},
});

const checkProfileCompletion = (profile: Profile | null): boolean => {
  if (!profile) return false;

  const requiredFields = [
    'company_name',
    'contact_person_name',
    'contact_person_phone',
    'industry',
    'location'
  ];

  return requiredFields.every(field => Boolean(profile[field as keyof Profile]));
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setShowProfileDialog(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const profileComplete = checkProfileCompletion(profile);
    setIsProfileComplete(profileComplete);
    
    if (user && !profileComplete) {
      setShowProfileDialog(true);
    }
  }, [profile, user]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && status !== 406) {
        toast.error('Error fetching profile');
        throw error;
      }

      setProfile(data || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      toast.error('Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isProfileComplete, 
      showProfileDialog, 
      setShowProfileDialog 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}