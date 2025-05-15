import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // Adjust the import path based on your project structure
import toast from 'react-hot-toast';
import { ArrowLeft, Twitter, Facebook, Linkedin, Instagram, CheckCircle } from 'lucide-react';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [instagramData, setInstagramData] = useState(null);
  const [loadingInstagram, setLoadingInstagram] = useState(false);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1); // Equivalent to history.back()
  };

  // Fetch user data from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          throw new Error('Failed to fetch user data: ' + error.message);
        }

        if (!data) {
          throw new Error('User not found');
        }

        setUserData(data);
      } catch (error) {
        toast.error('Error loading profile');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, user, authLoading]);

  // Fetch Instagram data if Instagram link exists
  useEffect(() => {
    const fetchInstagramData = async () => {
      if (!userData || !userData.social_media || !userData.social_media.instagram) {
        setInstagramData(null);
        return;
      }

      setLoadingInstagram(true);
      try {
        const instagramUrl = userData.social_media.instagram;
        const username = instagramUrl.split('instagram.com/')[1]?.replace('/', '');
        if (!username) {
          throw new Error('Invalid Instagram URL');
        }

        const response = await fetch(
          `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
          {
            method: 'GET',
            headers: {
              'User-Agent':
                'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)',
              'Origin': 'https://www.instagram.com',
              'Referer': 'https://www.instagram.com/',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch Instagram data');
        }

        const data = await response.json();
        setInstagramData(data.data.user);
      } catch (error) {
        toast.error('Error fetching Instagram data');
        console.error(error);
        setInstagramData(null);
      } finally {
        setLoadingInstagram(false);
      }
    };

    fetchInstagramData();
  }, [userData]);

  // Wait for auth loading to complete before deciding to redirect
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="mt-6 h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="mt-2 h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mt-8">
            <div className="h-6 w-40 bg-gray-200 rounded mb-6 animate-pulse"></div>
            <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login only if auth loading is complete and user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="mt-6 h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="mt-2 h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mt-8">
            <div className="h-6 w-40 bg-gray-200 rounded mb-6 animate-pulse"></div>
            <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full flex justify-center items-center">
          <p className="text-xl text-gray-600 font-semibold">User not found</p>
        </div>
      </div>
    );
  }

  // Define fields to display based on user_type
  const renderProfileDetails = () => {
    // Mapping of platforms to their icons and colors
    const platformIcons = {
      twitter: { icon: Twitter, color: 'text-blue-400' }, // Twitter blue
      facebook: { icon: Facebook, color: 'text-blue-600' }, // Facebook blue
      linkedin: { icon: Linkedin, color: 'text-blue-700' }, // LinkedIn blue
      instagram: { icon: Instagram, color: 'text-pink-500' }, // Instagram pink
    };

    const renderSocialMedia = (socialMedia) => {
      if (!socialMedia) return 'N/A';
      const platforms = Object.entries(socialMedia).filter(([_, url]) => url);
      if (platforms.length === 0) return 'N/A';

      return (
        <div className="flex gap-3">
          {platforms.map(([platform, url]) => {
            const { icon: Icon, color } = platformIcons[platform.toLowerCase()] || {};
            if (!Icon) return null;
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${color} hover:scale-110 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color.split('-')[1]}`}
                aria-label={`Visit ${platform} profile`}
              >
                <Icon className="w-6 h-6" />
              </a>
            );
          })}
        </div>
      );
    };

    const renderPreviousSponsorships = (previousSponsorships) => {
      if (!previousSponsorships) return 'N/A';
      if (Array.isArray(previousSponsorships)) {
        return previousSponsorships.join(', ') || 'N/A';
      }
      if (typeof previousSponsorships === 'object') {
        return Object.values(previousSponsorships).join(', ') || 'N/A';
      }
      return String(previousSponsorships);
    };

    const commonFields = (
      <>
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-gray-500">User Type:</span>
          <p className="text-gray-700">{userData.user_type || 'N/A'}</p>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-gray-500">Joined:</span>
          <p className="text-gray-700">
            {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-gray-500">Last Updated:</span>
          <p className="text-gray-700">
            {userData.updated_at ? new Date(userData.updated_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </>
    );

    switch (userData.user_type) {
      case 'Brand':
        return (
          <>
            {commonFields}
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Name:</span>
              <p className="text-gray-700">{userData.company_name || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Website:</span>
              <p className="text-gray-700">{userData.website || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Industry:</span>
              <p className="text-gray-700">{userData.industry || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Industry Details:</span>
              <p className="text-gray-700">{userData.industry_details || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Size:</span>
              <p className="text-gray-700">{userData.company_size || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Annual Marketing Budget:</span>
              <p className="text-gray-700">
                {userData.annual_marketing_budget ? `${userData.annual_marketing_budget} INR` : 'N/A'}
              </p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Marketing Channels:</span>
              <p className="text-gray-700">{userData.marketing_channels?.join(', ') || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Previous Sponsorships:</span>
              <p className="text-gray-700">{renderPreviousSponsorships(userData.previous_sponsorships)}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Sponsorship Goals:</span>
              <p className="text-gray-700">{userData.sponsorship_goals?.join(', ') || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Target Audience:</span>
              <p className="text-gray-700">
                {userData.target_audience
                  ? `Age: ${userData.target_audience.age_range?.min || 'N/A'}-${userData.target_audience.age_range?.max || 'N/A'}, 
                     Genders: ${userData.target_audience.genders?.join(', ') || 'N/A'}, 
                     Interests: ${userData.target_audience.interests?.join(', ') || 'N/A'}, 
                     Locations: ${userData.target_audience.locations?.join(', ') || 'N/A'}`
                  : 'N/A'}
              </p>
            </div>
          </>
        );
      case 'Event Organizer':
        return (
          <>
            {commonFields}
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Name:</span>
              <p className="text-gray-700">{userData.company_name || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Website:</span>
              <p className="text-gray-700">{userData.website || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Industry Details:</span>
              <p className="text-gray-700">{userData.industry_details || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Size:</span>
              <p className="text-gray-700">{userData.company_size || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Location:</span>
              <p className="text-gray-700">{userData.location || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Contact Person:</span>
              <p className="text-gray-700">{userData.contact_person_name || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Position:</span>
              <p className="text-gray-700">{userData.contact_person_position || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Contact Phone:</span>
              <div className="flex items-center space-x-2">
                <p className="text-gray-700">{userData.contact_person_phone || 'N/A'}</p>
                {userData.contact_person_phone && userData.phone_number_verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" aria-label="Phone number verified" />
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Social Media Profiles:</span>
              {renderSocialMedia(userData.social_media)}
            </div>
          </>
        );
      case 'Influencer':
        return (
          <>
            {commonFields}
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Username:</span>
              <p className="text-gray-700">{userData.username || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Bio:</span>
              <p className="text-gray-700">{userData.bio || 'No bio available'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Social Media Profiles:</span>
              {renderSocialMedia(userData.social_media)}
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Phone Number:</span>
              <div className="flex items-center space-x-2">
                <p className="text-gray-700">{userData.phone_number || 'N/A'}</p>
                {userData.phone_number && userData.phone_number_verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" aria-label="Phone number verified" />
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Location:</span>
              <p className="text-gray-700">{userData.location || 'N/A'}</p>
            </div>
          </>
        );
      case 'Marketing Agency':
        return (
          <>
            {commonFields}
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Name:</span>
              <p className="text-gray-700">{userData.company_name || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Website:</span>
              <p className="text-gray-700">{userData.website || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Industry:</span>
              <p className="text-gray-700">{userData.industry || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Industry Details:</span>
              <p className="text-gray-700">{userData.industry_details || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Company Size:</span>
              <p className="text-gray-700">{userData.company_size || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Marketing Channels:</span>
              <p className="text-gray-700">{userData.marketing_channels?.join(', ') || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Previous Sponsorships:</span>
              <p className="text-gray-700">{renderPreviousSponsorships(userData.previous_sponsorships)}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Sponsorship Goals:</span>
              <p className="text-gray-700">{userData.sponsorship_goals?.join(', ') || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Contact Person:</span>
              <p className="text-gray-700">{userData.contact_person_name || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Position:</span>
              <p className="text-gray-700">{userData.contact_person_position || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Contact Phone:</span>
              <div className="flex items-center space-x-2">
                <p className="text-gray-700">{userData.contact_person_phone || 'N/A'}</p>
                {userData.contact_person_phone && userData.phone_number_verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" aria-label="Phone number verified" />
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Social Media Profiles:</span>
              {renderSocialMedia(userData.social_media)}
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Target Audience:</span>
              <p className="text-gray-700">
                {userData.target_audience
                  ? `Age: ${userData.target_audience.age_range?.min || 'N/A'}-${userData.target_audience.age_range?.max || 'N/A'}, 
                     Genders: ${userData.target_audience.genders?.join(', ') || 'N/A'}, 
                     Interests: ${userData.target_audience.interests?.join(', ') || 'N/A'}, 
                     Locations: ${userData.target_audience.locations?.join(', ') || 'N/A'}`
                  : 'N/A'}
              </p>
            </div>
          </>
        );
      default:
        return (
          <>
            {commonFields}
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Username:</span>
              <p className="text-gray-700">{userData.username || 'N/A'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Bio:</span>
              <p className="text-gray-700">{userData.bio || 'No bio available'}</p>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Social Media Profiles:</span>
              {renderSocialMedia(userData.social_media)}
            </div>
          </>
        );
    }
  };

  // Render Instagram profile details
  const renderInstagramDetails = () => {
    if (loadingInstagram) {
      return (
        <div className="mt-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Instagram Profile Details</h3>
          <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!instagramData) {
      return (
        <div className="mt-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Instagram Profile Details</h3>
          <p className="text-gray-600">Not Available</p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">Instagram Profile Details</h3>
        <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-gray-500">Full Name:</span>
            <p className="text-gray-700">{instagramData.full_name || 'N/A'}</p>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-gray-500">Biography:</span>
            <p className="text-gray-700">{instagramData.biography || 'No bio available'}</p>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-gray-500">Followers:</span>
            <p className="text-gray-700">{instagramData.edge_followed_by?.count || 'N/A'}</p>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-gray-500">Following:</span>
            <p className="text-gray-700">{instagramData.edge_follow?.count || 'N/A'}</p>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-gray-500">Posts:</span>
            <p className="text-gray-700">{instagramData.edge_owner_to_timeline_media?.count || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Main Content */}
      <div className="max-w-4xl w-full relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-0 left-0 p-3 rounded-full bg-gradient-to-r from-[#2B4B9B] to-[#1a2f61] text-white hover:scale-105 transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#2B4B9B] focus:ring-offset-2"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="bg-white rounded-xl shadow-lg p-8 mt-12">
          <div className="flex flex-col items-center">
            {userData.profile_picture || userData.profile_picture_url ? (
              <img
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                src={userData.profile_picture || userData.profile_picture_url}
                alt="Profile"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2B4B9B] to-[#1a2f61] flex items-center justify-center text-white text-4xl border-4 border-white shadow-md">
                {userData.company_name ? userData.company_name.charAt(0).toUpperCase() : userData.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <h2 className="mt-6 text-3xl font-semibold text-gray-900">
              {userData.company_name || userData.username || 'Unknown User'}
            </h2>
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-sm text-gray-500">{userData.email || 'No email provided'}</p>
              {userData.email && userData.email_verified && (
                <CheckCircle className="w-4 h-4 text-green-500" aria-label="Email verified" />
              )}
            </div>
          </div>
          <div className="mt-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Profile Details</h3>
            <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
              {renderProfileDetails()}
            </div>
          </div>
          {renderInstagramDetails()}
          {user && user.id === userId && (
            <div className="mt-8">
              <button
                onClick={() => navigate('/dashboard', { state: { activeTab: 'profile' } })}
                className="w-full bg-gradient-to-r from-[#2B4B9B] to-[#1a2f61] text-white py-3 px-4 rounded-lg hover:scale-105 transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#2B4B9B] focus:ring-offset-2"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;