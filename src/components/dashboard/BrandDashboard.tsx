import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { sendMatchNotification } from '../../lib/email';
import { Search } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import ProfileAlert from './BrandDashboard/ProfileAlert';
import FilterSection from './BrandDashboard/FilterSection';
import TabsSection from './BrandDashboard/TabsSection';
import MatchNotification from './BrandDashboard/MatchNotification';
import MatchesSection from './BrandDashboard/MatchesSection';
import NoResultsCard from './BrandDashboard/NoResultsCard';
import OpportunityCard from './BrandDashboard/OpportunityCard';
import InfluencerPostCard from './BrandDashboard/InfluencerPostCard';
import type { Opportunity, Post, Category, Match, Database } from './BrandDashboard/types';

interface BrandDashboardProps {
  onUpdateProfile: () => void;
}

export default function BrandDashboard({ onUpdateProfile }: BrandDashboardProps) {
  const { user, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [matches, setMatches] = useState<string[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);
  const [matchedOpportunity, setMatchedOpportunity] = useState<Opportunity | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'influencers' | 'matches'>('discover');
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [adTypeFilter, setAdTypeFilter] = useState<string>('');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [swipeActions, setSwipeActions] = useState<{ [key: string]: 'like' | 'dislike' | null }>({});

  const isInitialLoad = useRef(true);
  const hasRefreshed = useRef(false);
  const loadStartTime = useRef(Date.now());

  useEffect(() => {
    if (user) {
      const isNewUser = !profile?.company_name;

      const timer = setTimeout(() => {
        if (isInitialLoad.current && loading && isNewUser && !hasRefreshed.current) {
          console.log('Initial load taking too long, triggering auto-refresh');
          hasRefreshed.current = true;
          window.location.reload();
        }
      }, 2000);

      fetchCategories();
      fetchUserMatches();
      fetchPosts();

      return () => {
        clearTimeout(timer);
        isInitialLoad.current = false;
      };
    }
  }, [user, profile]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
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
      const matchedOpportunityIds = matchesData.map((match) => match.opportunity_id);
      setMatches(matchedOpportunityIds);
      setUserMatches(matchesData as Match[]);
      setStats({
        total: opportunities.length,
        pending: matchesData.filter((m) => m.status === 'pending').length,
        accepted: matchesData.filter((m) => m.status === 'accepted').length,
        rejected: matchesData.filter((m) => m.status === 'rejected').length,
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

    const filteredOpportunities = data.filter(
      (opp) =>
        !userMatches.some(
          (match) =>
            match.opportunity_id === opp.id &&
            (match.status === 'pending' || match.status === 'accepted')
        ) &&
        !rejections.includes(opp.id)
    );
    setOpportunities(filteredOpportunities);
    setLoading(false);
  };

  const fetchPosts = async (resetIndex: boolean = false) => {
    let query = supabase
      .from('posts')
      .select('*, categories(*)')
      .eq('status', 'active')
      .eq('verification_status', 'approved');

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (priceRangeFilter) {
      const [min, max] = priceRangeFilter.split('-').map(Number);
      query = query.contains('price_range', { min, max });
    }
    if (locationSearch) {
      query = query.ilike('location', `%${locationSearch}%`);
    }
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,hashtags.ilike.%${searchQuery}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    const filteredPosts = data.filter((post) => !rejections.includes(post.id));
    setPosts(filteredPosts);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      if (activeTab === 'discover') {
        fetchOpportunities(true);
      } else if (activeTab === 'influencers') {
        fetchPosts(true);
      }
    }
  }, [user, selectedCategory, adTypeFilter, priceRangeFilter, locationSearch, searchQuery, userMatches, activeTab]);

  const handleLike = async (id: string, type: 'opportunity' | 'post' = 'opportunity') => {
    if (!user) return;

    if (type === 'opportunity') {
      const updatedOpportunities = opportunities.filter((opp) => opp.id !== id);
      setOpportunities(updatedOpportunities);
    } else {
      const updatedPosts = posts.filter((post) => post.id !== id);
      setPosts(updatedPosts);
    }

    try {
      if (type === 'opportunity') {
        const { data: opportunityData, error: opportunityError } = await supabase
          .from('opportunities')
          .select(`
            *,
            profiles:creator_id (*)
          `)
          .eq('id', id)
          .single();

        if (opportunityError) throw opportunityError;

        const { error } = await supabase.from('matches').insert({
          opportunity_id: id,
          brand_id: user.id,
          status: 'pending',
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

        const updatedMatches = [...matches, id];
        setMatches(updatedMatches);

        fetchUserMatches();
      } else {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:influencer_id (*)
          `)
          .eq('id', id)
          .single();

        if (postError) throw postError;

        const { error } = await supabase.from('matches').insert({
          post_id: id,
          brand_id: user.id,
          status: 'pending',
        });

        if (error) throw error;

        if (profile) {
          try {
            const influencerProfile = (postData as any).profiles;

            await sendMatchNotification(
              profile.company_name || user.email || '',
              user.email || '',
              postData.title,
              influencerProfile?.company_name || 'Influencer',
              influencerProfile?.email || '',
              null,
              null
            );

            setShowMatchSuccess(true);

            setTimeout(() => {
              setShowMatchSuccess(false);
            }, 5000);
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
          }
        }
      }
    } catch (error) {
      console.error('Error creating match:', error);
      if (type === 'opportunity') {
        await fetchOpportunities();
      } else {
        await fetchPosts();
      }
    }
  };

  const handleReject = (id: string, type: 'opportunity' | 'post') => {
    const updatedRejections = [...rejections, id];
    setRejections(updatedRejections);

    if (type === 'opportunity') {
      const updatedOpportunities = opportunities.filter((opp) => opp.id !== id);
      setOpportunities(updatedOpportunities);
    } else {
      const updatedPosts = posts.filter((post) => post.id !== id);
      setPosts(updatedPosts);
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

  const handleAnimationComplete = (id: string) => {
    setSwipeActions((prev) => ({ ...prev, [id]: null }));
  };

  const pendingMatches = userMatches.filter((match) => match.status === 'pending');
  const acceptedMatches = userMatches.filter((match) => match.status === 'accepted');
  const rejectedMatches = userMatches.filter((match) => match.status === 'rejected');

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
    const dates = `${startTime}%2F${endTime}`;
    const encodedDescription = encodeURIComponent(event.description.trim());

    const params = [
      `action=TEMPLATE`,
      `text=${encodeURIComponent(event.title.trim()).replace(/%20/g, '+')}`,
      `dates=${dates}`,
      `details=${encodedDescription}`,
      `location=${encodeURIComponent(event.location.trim())}`,
    ];

    return `${baseUrl}?${params.join('&')}`;
  };

  if (loading) {
    return (
      <div className="max-w-full overflow-x-hidden">
        <ProfileAlert companyName={profile?.company_name} onUpdateProfile={onUpdateProfile} />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <Skeleton width={200} height={24} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2 mt-4 sm:mt-0">
            <Skeleton width={80} height={32} />
            <Skeleton width={200} height={32} />
          </div>
        </div>
        <div className="mb-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 sm:gap-8">
            <Skeleton width={120} height={20} />
            <Skeleton width={150} height={20} />
            <Skeleton width={150} height={20} />
          </div>
        </div>
        <div>
          {showFilters && (
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <Skeleton width={150} height={16} />
                <Skeleton width={100} height={16} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array(4)
                  .fill(0)
                  .map((_, index) => (
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
      <ProfileAlert companyName={profile?.company_name} onUpdateProfile={onUpdateProfile} />
      {(activeTab === 'discover' || activeTab === 'influencers') && (
        <FilterSection
          showFilters={showFilters}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          adTypeFilter={adTypeFilter}
          setAdTypeFilter={setAdTypeFilter}
          priceRangeFilter={priceRangeFilter}
          setPriceRangeFilter={setPriceRangeFilter}
          locationSearch={locationSearch}
          setLocationSearch={setLocationSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resetFilters={resetFilters}
          toggleFilters={() => setShowFilters(!showFilters)}
          isInfluencerTab={activeTab === 'influencers'}
        />
      )}
      <TabsSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingMatches={pendingMatches}
      />
      <MatchNotification
        showMatchSuccess={showMatchSuccess}
        matchedOpportunity={matchedOpportunity}
        isInfluencerTab={activeTab === 'influencers'}
      />
      {activeTab === 'discover' && (
        <>
          {opportunities.length === 0 ? (
            <NoResultsCard type="events" resetFilters={resetFilters} />
          ) : (
            <div className="h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] overflow-y-auto snap-y snap-mandatory">
              <AnimatePresence>
                {opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onLike={async (id: string) => {
                      setSwipeActions((prev) => ({ ...prev, [id]: 'like' }));
                      await handleLike(id, 'opportunity');
                    }}
                    onReject={(id: string) => {
                      setSwipeActions((prev) => ({ ...prev, [id]: 'dislike' }));
                      handleReject(id, 'opportunity');
                    }}
                    swipeAction={swipeActions[opportunity.id] || null}
                    onAnimationComplete={handleAnimationComplete}
                  />
                ))}
              </AnimatePresence>
              <div className="snap-center flex-shrink-0 w-full h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] flex items-center justify-center">
                <div className="text-center p-6">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-xl font-medium text-gray-700 mb-2">
                    No more events available
                  </h3>
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
            </div>
          )}
        </>
      )}
      {activeTab === 'influencers' && (
        <>
          {posts.length === 0 ? (
            <NoResultsCard type="influencer posts" resetFilters={resetFilters} />
          ) : (
            <div className="h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] overflow-y-auto snap-y snap-mandatory">
              <AnimatePresence>
                {posts.map((post) => (
                  <InfluencerPostCard
                    key={post.id}
                    post={post}
                    onLike={async (id: string) => {
                      setSwipeActions((prev) => ({ ...prev, [id]: 'like' }));
                      await handleLike(id, 'post');
                    }}
                    onReject={(id: string) => {
                      setSwipeActions((prev) => ({ ...prev, [id]: 'dislike' }));
                      handleReject(id, 'post');
                    }}
                    swipeAction={swipeActions[post.id] || null}
                    onAnimationComplete={handleAnimationComplete}
                  />
                ))}
              </AnimatePresence>
              <div className="snap-center flex-shrink-0 w-full h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] flex items-center justify-center">
                <div className="text-center p-6">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-xl font-medium text-gray-700 mb-2">
                    No more influencer posts available
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    You've gone through all available influencer posts matching your
                    criteria.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {activeTab === 'matches' && (
        <MatchesSection
          matches={matches}
          pendingMatches={pendingMatches}
          acceptedMatches={acceptedMatches}
          rejectedMatches={rejectedMatches}
          setActiveTab={setActiveTab}
          generateGoogleCalendarLink={generateGoogleCalendarLink}
        />
      )}
    </div>
  );
}