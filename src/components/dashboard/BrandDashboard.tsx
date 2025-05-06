import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Heart, 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Video
} from 'lucide-react';
import { sendMatchNotification } from '../../lib/email';
import type { Database } from '../../lib/database.types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  opportunities: Database['public']['Tables']['opportunities']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row'];
  };
};

interface BrandDashboardProps {
  onUpdateProfile: () => void;
}

export default function BrandDashboard({ onUpdateProfile }: BrandDashboardProps) {
  const { user, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [matches, setMatches] = useState<string[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);
  const [matchedOpportunity, setMatchedOpportunity] = useState<Opportunity | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover');
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });
  const [adTypeFilter, setAdTypeFilter] = useState<string>('');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchUserMatches();
    }
  }, [user]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchUserMatches = async () => {
    if (!user) return;

    try {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          *,
          opportunities:opportunity_id (
            *,
            profiles:creator_id (*)
          )
        `)
        .eq('brand_id', user.id);
      
      if (error) throw error;
      
      const matchedOpportunityIds = matchesData.map(match => match.opportunity_id);
      setMatches(matchedOpportunityIds);
      setUserMatches(matchesData as Match[]);
      
      setStats({
        total: opportunities.length,
        pending: matchesData.filter(m => m.status === 'pending').length,
        accepted: matchesData.filter(m => m.status === 'accepted').length,
        rejected: matchesData.filter(m => m.status === 'rejected').length
      });
    } catch (error) {
      console.error('Error fetching user matches:', error);
    }
  };

  const fetchOpportunities = async (resetIndex: boolean = false) => {
    let query = supabase
      .from('opportunities')
      .select('*, categories(*)')
      .eq('status', 'active')
      .eq('verification_status', 'approved');
    
    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    
    if (adTypeFilter) {
      query = query.eq('ad_type', adTypeFilter);
    }
    
    if (priceRangeFilter) {
      const [min, max] = priceRangeFilter.split('-').map(Number);
      query = query.contains('price_range', { min, max });
    }
    
    if (locationSearch) {
      query = query.ilike('location', `%${locationSearch}%`);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching opportunities:', error);
      return;
    }
    
    // Filter out opportunities that are already matched (pending or accepted) or rejected
    const filteredOpportunities = data.filter(
      opp => 
        !userMatches.some(match => 
          match.opportunity_id === opp.id && 
          (match.status === 'pending' || match.status === 'accepted')
        ) && // Exclude opportunities with pending or accepted matches
        !rejections.includes(opp.id) // Exclude rejections
    );
    
    setOpportunities(filteredOpportunities);
    setLoading(false);
    
    // Reset index only on initial load or filter change
    if (resetIndex && filteredOpportunities.length > 0) {
      setCurrentOpportunityIndex(0);
    } else if (filteredOpportunities.length > 0 && currentOpportunityIndex >= filteredOpportunities.length) {
      setCurrentOpportunityIndex(0);
    }
  };

  // Fetch opportunities whenever filters or userMatches change
  useEffect(() => {
    if (user) {
      fetchOpportunities(true); // Reset index when filters or matches change
    }
  }, [user, selectedCategory, adTypeFilter, priceRangeFilter, locationSearch, searchQuery, userMatches]);

  const handleLike = async (opportunityId: string) => {
    if (!user) return;
    
    try {
      const { data: opportunityData, error: opportunityError } = await supabase
        .from('opportunities')
        .select(`
          *,
          profiles:creator_id (*)
        `)
        .eq('id', opportunityId)
        .single();
      
      if (opportunityError) throw opportunityError;
      
      const { error } = await supabase
        .from('matches')
        .insert({
          opportunity_id: opportunityId,
          brand_id: user.id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      if (profile) {
        try {
          const creatorProfile = (opportunityData as any).profiles;
          
          await sendMatchNotification(
            profile.company_name || user.email || '',
            user.email || '',
            opportunityData.title,
            creatorProfile?.company_name || 'Event Organizer',
            creatorProfile?.email || '',
            opportunityData.calendly_link,
            opportunityData.sponsorship_brochure_url
          );
          
          setMatchedOpportunity(opportunityData);
          setShowMatchSuccess(true);
          
          setTimeout(() => {
            setShowMatchSuccess(false);
            setMatchedOpportunity(null);
          }, 5000);
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }
      
      const updatedMatches = [...matches, opportunityId];
      setMatches(updatedMatches);
      fetchUserMatches();
      
      // Update opportunities and index in one step
      const updatedOpportunities = opportunities.filter(opp => opp.id !== opportunityId);
      setOpportunities(updatedOpportunities);
      
      if (updatedOpportunities.length === 0) {
        setCurrentOpportunityIndex(0);
      } else if (currentOpportunityIndex >= updatedOpportunities.length) {
        setCurrentOpportunityIndex(0);
      } else {
        setCurrentOpportunityIndex(currentOpportunityIndex);
      }
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  const handleReject = (opportunityId: string) => {
    const updatedRejections = [...rejections, opportunityId];
    setRejections(updatedRejections);
    
    // Update opportunities and index in one step
    const updatedOpportunities = opportunities.filter(opp => opp.id !== opportunityId);
    setOpportunities(updatedOpportunities);
    
    if (updatedOpportunities.length === 0) {
      setCurrentOpportunityIndex(0);
    } else if (currentOpportunityIndex >= updatedOpportunities.length) {
      setCurrentOpportunityIndex(0);
    } else {
      setCurrentOpportunityIndex(currentOpportunityIndex);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setLocationFilter('');
    setShowFilters(false);
    setAdTypeFilter('');
    setPriceRangeFilter('');
    setLocationSearch('');
    setSearchQuery('');
  };

  const handleProfileUpdate = () => {
    onUpdateProfile();
  };

  const currentOpportunity = opportunities[currentOpportunityIndex];

  const pendingMatches = userMatches.filter(match => match.status === 'pending');
  const acceptedMatches = userMatches.filter(match => match.status === 'accepted');
  const rejectedMatches = userMatches.filter(match => match.status === 'rejected');

  // Function to generate Google Calendar event link
  const generateGoogleCalendarLink = (match: Match) => {
    const event = {
      title: `Meeting for ${match.opportunities?.title || 'Opportunity'}`,
      description: `Meeting with brand and creator.\nJoin Meeting: ${match.meeting_link || ''}`,
      start: match.meeting_scheduled_at || new Date().toISOString(),
      end: match.meeting_scheduled_at 
        ? new Date(new Date(match.meeting_scheduled_at).getTime() + 60 * 60 * 1000).toISOString() 
        : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      location: match.meeting_link || match.opportunities?.location || 'TBD',
    };

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const startTime = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0];
    const dates = `${startTime}%2F${endTime}`; // Use %2F directly for date separator

    // Encode the description directly, letting encodeURIComponent handle \n to %0A conversion
    const encodedDescription = encodeURIComponent(event.description.trim());

    // Construct the URL manually to avoid double-encoding
    const params = [
      `action=TEMPLATE`,
      `text=${encodeURIComponent(event.title.trim()).replace(/%20/g, '+')}`, // Replace %20 with + for spaces in text
      `dates=${dates}`, // Already formatted with %2F
      `details=${encodedDescription}`, // Encode description with \n converted to %0A
      `location=${encodeURIComponent(event.location.trim())}`, // Encode location
    ];

    return `${baseUrl}?${params.join('&')}`;
  };

  if (loading) {
    return (
      <div className="max-w-full overflow-x-hidden">
        {/* Profile Completion Warning Skeleton */}
        {!profile?.company_name && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <Skeleton circle width={16} height={16} className="mt-0.5 mr-2" />
              <div className="flex-1">
                <Skeleton width={150} height={12} />
                <Skeleton width="90%" height={12} className="mt-2" />
                <Skeleton width={100} height={12} className="mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <Skeleton width={200} height={24} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2 mt-4 sm:mt-0">
            <Skeleton width={80} height={32} />
            <Skeleton width={200} height={32} />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 sm:gap-8">
            <Skeleton width={120} height={20} />
            <Skeleton width={150} height={20} />
          </div>
        </div>

        {/* Discover Tab Skeleton */}
        <div>
          {/* Filter Section Skeleton */}
          {showFilters && (
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <Skeleton width={150} height={16} />
                <Skeleton width={100} height={16} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array(4).fill(0).map((_, index) => (
                  <div key={index}>
                    <Skeleton width={80} height={12} className="mb-1" />
                    <Skeleton height={32} />
                  </div>
                ))}
              </div>
              <div className="mt-3 sm:mt-4">
                <Skeleton width={80} height={12} className="mb-1" />
                <Skeleton height={32} />
              </div>
            </div>
          )}

          {/* Opportunity Card Skeleton */}
          <div className="min-h-[400px] sm:min-h-[500px] bg-white rounded-lg shadow-sm overflow-hidden">
            <Skeleton height={192} className="sm:h-64" />
            <div className="p-4 sm:p-6">
              <Skeleton width="80%" height={24} className="mb-2" />
              <Skeleton width={120} height={16} className="mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <Skeleton width={150} height={16} />
                <Skeleton width={150} height={16} />
              </div>
              <Skeleton width={100} height={16} className="mb-4" />
              <Skeleton count={3} height={16} className="mb-2" />
              <div className="flex justify-center gap-4 mt-4">
                <Skeleton circle width={48} height={48} />
                <Skeleton circle width={48} height={48} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-hidden">
      {!profile?.company_name && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2" />
            <div>
              <h3 className="text-xs font-medium text-yellow-800">Complete your profile</h3>
              <p className="mt-1 text-xs text-yellow-700">
                Please complete your profile to get personalized opportunities and better matches.
              </p>
              <button
                onClick={handleProfileUpdate}
                className="mt-1 text-xs font-medium text-yellow-800 hover:text-yellow-900"
              >
                Update Profile →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Brand Dashboard</h1>
        {activeTab === 'discover' && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2 mt-4 sm:mt-0">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Filters</span>
            </button>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
              />
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 sm:gap-8">
          <button
            onClick={() => setActiveTab('discover')}
            className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
              activeTab === 'discover'
                ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discover Events
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
              activeTab === 'matches'
                ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Your Matches {pendingMatches.length > 0 && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {pendingMatches.length} pending
              </span>
            )}
          </button>
        </div>
      </div>

      {showMatchSuccess && matchedOpportunity && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <h3 className="text-xs sm:text-sm font-medium">Interest expressed successfully!</h3>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm">
                <p>You've expressed interest in "{matchedOpportunity.title}". The event organizer has been notified and will contact you soon.</p>
                
                {matchedOpportunity.calendly_link && (
                  <p className="mt-1 sm:mt-2">
                    <a 
                      href={matchedOpportunity.calendly_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-700 hover:text-green-900 font-medium text-xs sm:text-sm"
                    >
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      Schedule a meeting
                    </a>
                  </p>
                )}
                
                {matchedOpportunity.sponsorship_brochure_url && (
                  <p className="mt-1 sm:mt-2">
                    <a 
                      href={matchedOpportunity.sponsorship_brochure_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-700 hover:text-green-900 font-medium text-xs sm:text-sm"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      View sponsorship brochure
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discover' && (
        <>
          {showFilters && (
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 max-w-full overflow-x-hidden">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="font-medium text-xs sm:text-sm">Filter Opportunities</h3>
                <button 
                  onClick={resetFilters}
                  className="text-xs sm:text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
                >
                  Reset Filters
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Advertisement Type
                  </label>
                  <select
                    value={adTypeFilter}
                    onChange={(e) => setAdTypeFilter(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="digital">Digital Displays</option>
                    <option value="static">Static Displays</option>
                    <option value="video">Video Ads</option>
                    <option value="interactive">Interactive Displays</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Price Range
                  </label>
                  <select
                    value={priceRangeFilter}
                    onChange={(e) => setPriceRangeFilter(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  >
                    <option value="">Any Budget</option>
                    <option value="0-10000">Under ₹10,000</option>
                    <option value="10000-50000"> ₹10,000 - ₹50,000</option>
                    <option value="50000-100000">₹50,000 - ₹1,00,000</option>
                    <option value="100000-500000">₹1,00,000 - ₹5,00,000</option>
                    <option value="500000-1000000">₹5,00,000 - ₹10,00,000</option>
                    <option value="1000000-">Above ₹10,00,000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Enter location..."
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or description..."
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-medium text-gray-800 mb-2">No events found</h3>
              <p className="text-xs sm:text-gray-600 mb-3 sm:mb-4">
                We couldn't find any events matching your criteria. Try adjusting your filters.
              </p>
              <button
                onClick={resetFilters}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="min-h-[400px] sm:min-h-[500px] bg-white rounded-lg shadow-sm overflow-hidden max-w-full pb-14 sm:pb-0">
              {currentOpportunity ? (
                <div className="flex flex-col">
                  {currentOpportunity.media_urls && currentOpportunity.media_urls.length > 0 ? (
                    <div className="h-48 sm:h-64 bg-gray-200">
                      <img 
                        src={currentOpportunity.media_urls[0]} 
                        alt={currentOpportunity.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 sm:h-64 bg-gray-200 flex items-center justify-center">
                      <p className="text-gray-500 text-xs sm:text-sm">No image available</p>
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-6">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">{currentOpportunity.title}</h2>
                    
                    <div className="flex items-center text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      <span>{currentOpportunity.location}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      {currentOpportunity.start_date && (
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-2" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Date</p>
                            <p className="font-medium text-xs sm:text-sm">
                              {currentOpportunity.end_date &&
                              new Date(currentOpportunity.start_date).toDateString() ===
                              new Date(currentOpportunity.end_date).toDateString()
                                ? new Date(currentOpportunity.start_date).toLocaleDateString()
                                : `${new Date(currentOpportunity.start_date).toLocaleDateString()}${
                                    currentOpportunity.end_date
                                      ? ` - ${new Date(currentOpportunity.end_date).toLocaleDateString()}`
                                      : ''
                                  }`}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {currentOpportunity.price_range && (
                        <div className="flex items-center">
                          <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-2" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Budget</p>
                            <p className="font-medium text-xs sm:text-sm">
                              ₹{currentOpportunity.price_range.min} - ₹{currentOpportunity.price_range.max}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                      {currentOpportunity.calendly_link && (
                        <div className="flex items-center text-xs sm:text-sm text-[#2B4B9B]">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span>Calendly Available</span>
                        </div>
                      )}
                      
                      {currentOpportunity.sponsorship_brochure_url && (
                        <div className="flex items-center text-xs sm:text-sm text-[#2B4B9B]">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span>Brochure Available</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm">
                      {currentOpportunity.description && currentOpportunity.description.length > 100 && !showFullDescription ? (
                        <>
                          {currentOpportunity.description.slice(0, 100)}...
                          <button
                            onClick={() => setShowFullDescription(true)}
                            className="text-[#2B4B9B] hover:text-[#1a2f61] text-xs sm:text-sm font-medium ml-1"
                          >
                            Read more
                          </button>
                        </>
                      ) : (
                        <>
                          {currentOpportunity.description}
                          {currentOpportunity.description && currentOpportunity.description.length > 100 && (
                            <button
                              onClick={() => setShowFullDescription(false)}
                              className="text-[#2B4B9B] hover:text-[#1a2f61] text-xs sm:text-sm font-medium ml-1"
                              >
                              Read less
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-row justify-center gap-2 sm:gap-4">
                      <button
                        onClick={() => handleReject(currentOpportunity.id)}
                        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </button>
                      <button
                        onClick={() => handleLike(currentOpportunity.id)}
                        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
                      >
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-[400px] sm:min-h-[500px] flex items-center justify-center pb-14 sm:pb-0">
                  <div className="text-center p-6">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-xl font-medium text-gray-700 mb-2">No more events available</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      You've gone through all available events matching your criteria.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'matches' && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 pb-14 sm:pb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Your Matches</h2>
          
          {matches.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">No matches yet</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                When you express interest in events, they'll appear here.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
              >
                Discover Events
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {pendingMatches.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2 sm:mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full mr-1.5 sm:mr-2"></span>
                    Pending Response
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {pendingMatches.map(match => (
                      <div key={match.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <div className="mb-2 sm:mb-0">
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-800 text-xs sm:text-sm">{match.profiles?.company_name || 'Unknown Company'}</h4>
                              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Pending
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Interested in: <span className="font-medium">{(match as any).opportunities?.title || 'Unknown Event'}</span>
                            </p>
                            {match.profiles?.industry && (
                              <p className="text-xs sm:text-sm text-gray-600">Industry: {match.profiles.industry}</p>
                            )}
                            {match.profiles?.contact_person_name && (
                              <p className="text-xs sm:text-sm text-gray-600">
                                Contact: {match.profiles.contact_person_name}
                                {match.profiles.contact_person_phone ? ` (${match.profiles.contact_person_phone})` : ''}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-gray-600">
                              Sent: {new Date(match.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {match.opportunities?.sponsorship_brochure_url && (
                              <a 
                                href={match.opportunities.sponsorship_brochure_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center text-xs sm:text-sm"
                              >
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                View Brochure
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acceptedMatches.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-1.5 sm:mr-2"></span>
                    Accepted Matches
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {acceptedMatches.map(match => (
                      <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h4 className="font-medium text-gray-800 text-sm sm:text-base">{match.profiles?.company_name || 'Unknown Company'}</h4>
                                <span className="ml-2 px-2 py-0.5 text-xs sm:text-sm bg-green-100 text-green-800 rounded-full">
                                  Accepted
                                </span>
                              </div>
                              <p className="text-sm sm:text-base text-gray-600">
                                Event: <span className="font-medium">{(match as any).opportunities?.title || 'Unknown Event'}</span>
                              </p>
                              {match.meeting_scheduled_at && (
                                <p className="text-sm sm:text-base text-gray-600">
                                  Meeting scheduled for: {new Date(match.meeting_scheduled_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                              <div className="flex flex-row gap-3 sm:flex-row sm:gap-4">
                                {match.opportunities?.sponsorship_brochure_url && (
                                  <a 
                                    href={match.opportunities.sponsorship_brochure_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 flex items-center justify-center flex-1 sm:flex-none"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Brochure
                                  </a>
                                )}
                                {match.meeting_scheduled_at && (
                                  <a
                                    href={generateGoogleCalendarLink(match)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 flex items-center justify-center flex-1 sm:flex-none"
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Add to Calendar
                                  </a>
                                )}
                              </div>
                              {match.meeting_link && (
                                <a 
                                  href={match.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-blue-100 text-[#2B4B9B] text-sm font-medium rounded-md hover:bg-blue-200 flex items-center justify-center w-full sm:w-auto"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejectedMatches.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2 sm:mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-400 rounded-full mr-1.5 sm:mr-2"></span>
                    Rejected Matches
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {rejectedMatches.map(match => (
                      <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-800 text-xs sm:text-sm">{match.profiles?.company_name || 'Unknown Company'}</h4>
                              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-red-100 text-red-800 rounded-full">
                                Rejected
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Event: <span className="font-medium">{(match as any).opportunities?.title || 'Unknown Event'}</span>
                            </p>
                            {match.notes && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                Reason: {match.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}