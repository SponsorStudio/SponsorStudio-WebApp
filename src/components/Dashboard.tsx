import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Building2, BarChart3, FileCheck, MessageSquare, Menu, ChevronRight, X, Home, Calendar, FileText, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendContactEmail } from '../lib/email';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import ProfileCompletionDialog from './ProfileCompletionDialog';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';
import Marquee from 'react-fast-marquee';
import AdminDashboard from './dashboard/AdminDashboard';
import BrandDashboard from './dashboard/BrandDashboard';
import CreatorDashboard from './dashboard/CreatorDashboard';
import ProfileSettings from './dashboard/ProfileSettings';
import ScheduledMeetings from './dashboard/ScheduledMeetings';
import { signOut } from '../lib/auth';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

type ClientLogo = Database['public']['Tables']['client_logos']['Row'];
type SuccessStory = Database['public']['Tables']['success_stories']['Row'];

export default function Dashboard() {
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matches' | 'profile'>(() => {
    return (location.state as any)?.activeTab || 'dashboard';
  });
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
      fetchUserData();
    }
  }, [profile]);

  const fetchUserData = async () => {
    if (!user || !profile) return;

    try {
      if (profile.user_type !== 'admin') {
        if (profile.user_type === 'creator' || profile.user_type === 'event_organizer') {
          const { data: opportunitiesData, error: opportunitiesError } = await supabase
            .from('opportunities')
            .select('*')
            .eq('creator_id', user.id);
          
          if (opportunitiesError) throw opportunitiesError;
          setOpportunities(opportunitiesData || []);
        }
        
        let matchesQuery;
        if (profile.user_type === 'brand' || profile.user_type === 'agency') {
          matchesQuery = supabase
            .from('matches')
            .select(`
              *,
              opportunities:opportunity_id (
                *,
                profiles:creator_id (*)
              )
            `)
            .eq('brand_id', user.id);
        } else {
          const { data: creatorOpps, error: oppsError } = await supabase
            .from('opportunities')
            .select('id')
            .eq('creator_id', user.id);
          
          if (oppsError) throw oppsError;
          
          if (creatorOpps && creatorOpps.length > 0) {
            const oppIds = creatorOpps.map(opp => opp.id);
            matchesQuery = supabase
              .from('matches')
              .select(`
                *,
                profiles:brand_id (*),
                opportunities:opportunity_id (*)
              `)
              .in('opportunity_id', oppIds);
          }
        }
        
        if (matchesQuery) {
          const { data: matchesData, error: matchesError } = await matchesQuery;
          if (matchesError) throw matchesError;
          setMeetings(matchesData || []);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpdateProfile = () => {
    setActiveTab('profile');
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar Skeleton (Desktop) */}
        <div className="w-64 bg-white shadow-md hidden md:block fixed h-full p-6">
          <Skeleton height={48} width={120} className="mb-6" />
          <div className="flex items-center space-x-3 mb-8">
            <Skeleton circle width={40} height={40} />
            <div>
              <Skeleton width={100} height={16} />
              <Skeleton width={80} height={12} className="mt-2" />
            </div>
          </div>
          <nav className="px-4">
            <ul className="space-y-2">
              {Array(5).fill(0).map((_, index) => (
                <li key={index}>
                  <Skeleton height={40} className="rounded-lg" />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 md:ml-64 p-6">
          <div className="flex justify-between items-center mb-6">
            <Skeleton width={200} height={24} />
            <Skeleton width={120} height={36} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <Skeleton height={20} width="60%" />
                <Skeleton height={36} width="40%" className="mt-4" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton height={24} width="50%" className="mb-4" />
                <Skeleton count={3} height={16} className="mb-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Nav Skeleton (Mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-t z-50">
          <div className="flex justify-around p-2">
            {Array(4).fill(0).map((_, index) => (
              <Skeleton key={index} circle width={32} height={32} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.user_type === 'admin';
  const isBrand = profile?.user_type === 'brand' || profile?.user_type === 'agency';
  const isCreator = profile?.user_type === 'creator' || profile?.user_type === 'event_organizer';

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-md hidden md:block fixed h-full">
        <div className="p-6">
          <img 
            src="https://i.ibb.co/ZzPfwrxP/logo-final-png.png" 
            alt="Sponsor Studio" 
            className="h-12 mb-6 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <div className="flex items-center space-x-3 mb-8">
            {userProfile?.profile_picture_url && !avatarError ? (
              <img
                src={userProfile.profile_picture_url}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2B4B9B] flex items-center justify-center text-white">
                {userProfile?.company_name ? userProfile.company_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{userProfile?.company_name || 'Your Account'}</p>
              <p className="text-sm text-gray-500">{userProfile?.user_type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <nav className="px-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-[#2B4B9B]' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === 'messages' ? 'bg-blue-50 text-[#2B4B9B]' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === 'meetings' ? 'bg-blue-50 text-[#2B4B9B]' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Meetings</span>
              </button>
            </li>
            {isBrand && (
              <li>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    activeTab === 'reports' ? 'bg-blue-50 text-[#2B4B9B]' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === 'profile' ? 'bg-blue-50 text-[#2B4B9B]' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </button>
            </li>
            <li>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-t z-50">
        <div className="flex justify-around p-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-[#2B4B9B]' : 'text-gray-500'}`}
          >
            <Home className="w-6 h-6 mx-auto" />
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-2 rounded-lg ${activeTab === 'messages' ? 'text-[#2B4B9B]' : 'text-gray-500'}`}
          >
            <MessageSquare className="w-6 h-6 mx-auto" />
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`p-2 rounded-lg ${activeTab === 'meetings' ? 'text-[#2B4B9B]' : 'text-gray-500'}`}
          >
            <Calendar className="w-6 h-6 mx-auto" />
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`p-2 rounded-lg ${activeTab === 'profile' ? 'text-[#2B4B9B]' : 'text-gray-500'}`}
          >
            <User className="w-6 h-6 mx-auto" />
          </button>
        </div>
      </div>

      <div className="flex-1 md:ml-64 p-6">
        {activeTab === 'dashboard' && (
          <>
            {isBrand && <BrandDashboard onUpdateProfile={handleUpdateProfile} />}
            {isCreator && <CreatorDashboard onUpdateProfile={handleUpdateProfile} />}
          </>
        )}
        {activeTab === 'profile' && (
          <ProfileSettings profile={userProfile} />
        )}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Messages</h2>
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Messaging feature coming soon! You'll be able to communicate directly with your matches here.
              </p>
            </div>
          </div>
        )}
        {activeTab === 'meetings' && (
          <ScheduledMeetings meetings={meetings} isBrand={isBrand} />
        )}
        {activeTab === 'reports' && isBrand && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Sponsorship Reports</h2>
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Reports feature coming soon! You'll be able to view detailed analytics and performance metrics for your sponsorships here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}