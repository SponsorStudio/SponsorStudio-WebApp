import React, { useState, useEffect, useRef, memo } from 'react';
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
  Video,
  Hash
} from 'lucide-react';
import { sendMatchNotification } from '../../lib/email';
import type { Database } from '../../lib/database.types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

type Opportunity = Database['public']['Tables']['opportunities']['Row'] & {
  video_url?: string | null;
};
type Post = Database['public']['Tables']['posts']['Row'] & {
  categories: Database['public']['Tables']['categories']['Row'] | null;
};
type Category = Database['public']['Tables']['categories']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  opportunities: Database['public']['Tables']['opportunities']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row'];
  };
};

interface BrandDashboardProps {
  onUpdateProfile: () => void;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onLike: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  swipeAction: 'like' | 'dislike' | null;
  onAnimationComplete: (id: string) => void;
}

interface InfluencerPostCardProps {
  post: Post;
  onLike: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  swipeAction: 'like' | 'dislike' | null;
  onAnimationComplete: (id: string) => void;
}

// Custom hook to handle swipe animation logic for left/right swipes
const useSwipeAnimation = (
  onLike: () => Promise<void>,
  onReject: () => void
) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, 0], [1, 0]);

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 100; // Reduced for better sensitivity

    // Horizontal swipe for like/dislike
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > swipeThreshold) {
        await onLike();
      } else if (info.offset.x < -swipeThreshold) {
        onReject();
      }
    } else {
      // Reset position if swipe threshold not met
      x.set(0, true);
    }
  };

  return { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd };
};

// Memoized OpportunityCard to prevent unnecessary re-renders
const OpportunityCard: React.FC<OpportunityCardProps> = memo(
  ({ opportunity, onLike, onReject, swipeAction, onAnimationComplete }) => {
    const { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd } = useSwipeAnimation(
      () => onLike(opportunity.id),
      () => onReject(opportunity.id)
    );

    const [showFullDescription, setShowFullDescription] = useState(false);

    // Reset the x position when a new opportunity card is loaded
    useEffect(() => {
      x.set(0);
    }, [opportunity.id, x]);

    // Handle button-triggered animations for like/dislike
    const handleButtonAction = async (action: 'like' | 'dislike') => {
      if (action === 'like') {
        await onLike(opportunity.id);
      } else {
        onReject(opportunity.id);
      }
    };

    return (
      <motion.div
        key={opportunity.id}
        className="snap-center flex-shrink-0 w-full h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] flex flex-col bg-black rounded-lg overflow-hidden"
        drag="x" // Only allow horizontal dragging
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.2} // Reduced elasticity for smoother feel
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.95, x: 0 }}
        animate={{ scale: 1, x }}
        exit={{
          x: swipeAction === 'like' ? '100%' : swipeAction === 'dislike' ? '-100%' : 0,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
        style={{ x, rotate, willChange: 'transform' }}
        onAnimationComplete={() => {
          if (swipeAction) {
            onAnimationComplete(opportunity.id);
          }
        }}
      >
        {/* Background Media */}
        {opportunity.video_url ? (
          <video autoPlay loop muted className="w-full h-full object-cover">
            <source src={opportunity.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : opportunity.media_urls && opportunity.media_urls.length > 0 ? (
          <img
            src={opportunity.media_urls[0]}
            alt={opportunity.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No media available</p>
          </div>
        )}

        {/* Swipe Overlay with Enhanced Shades */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none bg-green-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg">
            LIKE
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: dislikeOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg">
            DISLIKE
          </div>
        </motion.div>

        {/* Gradient Overlay for Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{opportunity.title}</h2>

          <div className="flex items-center mb-3 text-sm sm:text-base">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span>{opportunity.location}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {opportunity.start_date && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Date</p>
                  <p className="text-sm sm:text-base">
                    {opportunity.end_date &&
                    new Date(opportunity.start_date).toDateString() ===
                    new Date(opportunity.end_date).toDateString()
                      ? new Date(opportunity.start_date).toLocaleDateString()
                      : `${new Date(opportunity.start_date).toLocaleDateString()}${
                          opportunity.end_date
                            ? ` - ${new Date(opportunity.end_date).toLocaleDateString()}`
                            : ''
                        }`}
                  </p>
                </div>
              </div>
            )}

            {opportunity.price_range && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Budget</p>
                  <p className="text-sm sm:text-base">
                    ₹{opportunity.price_range.min} - ₹{opportunity.price_range.max}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {opportunity.calendly_link && (
              <div className="flex items-center text-sm sm:text-base bg-blue-600/50 px-2 py-1 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span>Calendly Available</span>
              </div>
            )}

            {opportunity.sponsorship_brochure_url && (
              <div className="flex items-center text-sm sm:text-base bg-blue-600/50 px-2 py-1 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span>Brochure Available</span>
              </div>
            )}
          </div>

          <div className="text-sm sm:text-base mb-4">
            {opportunity.description && opportunity.description.length > 100 && !showFullDescription ? (
              <>
                {opportunity.description.slice(0, 100)}...
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                >
                  Read more
                </button>
              </>
            ) : (
              <>
                {opportunity.description}
                {opportunity.description && opportunity.description.length > 100 && (
                  <button
                    onClick={() => setShowFullDescription(false)}
                    className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                  >
                    Read less
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Like/Dislike Buttons on the Right Side */}
        <div className="absolute top-1/2 right-4 sm:right-6 transform -translate-y-1/2 flex flex-col gap-2">
          <button
            onClick={() => handleButtonAction('like')}
            className="p-2 bg-green-500/80 rounded-full hover:bg-green-600/90 transition-colors"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <button
            onClick={() => handleButtonAction('dislike')}
            className="p-2 bg-red-500/80 rounded-full hover:bg-red-500/90 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      </motion.div>
    );
  }
);

// Memoized InfluencerPostCard to handle individual influencer posts with swipe functionality
const InfluencerPostCard: React.FC<InfluencerPostCardProps> = memo(
  ({ post, onLike, onReject, swipeAction, onAnimationComplete }) => {
    const { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd } = useSwipeAnimation(
      () => onLike(post.id),
      () => onReject(post.id)
    );

    const [showFullDescription, setShowFullDescription] = useState(false);

    // Reset the x position when a new post card is loaded
    useEffect(() => {
      x.set(0);
    }, [post.id, x]);

    // Handle button-triggered animations for like/dislike
    const handleButtonAction = async (action: 'like' | 'dislike') => {
      if (action === 'like') {
        await onLike(post.id);
      } else {
        onReject(post.id);
      }
    };

    return (
      <motion.div
        key={post.id}
        className="snap-center flex-shrink-0 w-full h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] flex flex-col bg-black rounded-lg overflow-hidden"
        drag="x" // Only allow horizontal dragging
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.95, x: 0 }}
        animate={{ scale: 1, x }}
        exit={{
          x: swipeAction === 'like' ? '100%' : swipeAction === 'dislike' ? '-100%' : 0,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
        style={{ x, rotate, willChange: 'transform' }}
        onAnimationComplete={() => {
          if (swipeAction) {
            onAnimationComplete(post.id);
          }
        }}
      >
        {/* Background Media */}
        {post.video_url ? (
          <video autoPlay loop muted className="w-full h-full object-cover">
            <source src={post.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : post.media_urls && post.media_urls.length > 0 ? (
          <img
            src={post.media_urls[0]}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No media available</p>
          </div>
        )}

        {/* Swipe Overlay with Enhanced Shades */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none bg-green-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg">
            LIKE
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: dislikeOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg">
            DISLIKE
          </div>
        </motion.div>

        {/* Gradient Overlay for Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{post.title}</h2>

          {post.location && (
            <div className="flex items-center mb-3 text-sm sm:text-base">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>{post.location}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {post.price_range && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Budget</p>
                  <p className="text-sm sm:text-base">
                    ₹{post.price_range.min} - ₹{post.price_range.max}
                  </p>
                </div>
              </div>
            )}
            {post.reach && (
              <div className="flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Reach</p>
                  <p className="text-sm sm:text-base">
                    {post.reach.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {post.hashtags && (
            <div className="flex items-center text-sm sm:text-base mb-4">
              <Hash className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>{post.hashtags}</span>
            </div>
          )}

          <div className="text-sm sm:text-base mb-4">
            {post.description && post.description.length > 100 && !showFullDescription ? (
              <>
                {post.description.slice(0, 100)}...
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                >
                  Read more
                </button>
              </>
            ) : (
              <>
                {post.description}
                {post.description && post.description.length > 100 && (
                  <button
                    onClick={() => setShowFullDescription(false)}
                    className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                  >
                    Read less
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Like/Dislike Buttons on the Right Side */}
        <div className="absolute top-1/2 right-4 sm:right-6 transform -translate-y-1/2 flex flex-col gap-2">
          <button
            onClick={() => handleButtonAction('like')}
            className="p-2 bg-green-500/80 rounded-full hover:bg-green-600/90 transition-colors"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <button
            onClick={() => handleButtonAction('dislike')}
            className="p-2 bg-red-500/80 rounded-full hover:bg-red-500/90 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      </motion.div>
    );
  }
);

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
    rejected: 0
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
      }, 1500);

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
    
    const filteredOpportunities = data.filter(
      opp => 
        !userMatches.some(match => 
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
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,hashtags.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }
    
    const filteredPosts = data.filter(
      post => 
        !rejections.includes(post.id)
    );
    
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
      const updatedOpportunities = opportunities.filter(opp => opp.id !== id);
      setOpportunities(updatedOpportunities);
    } else {
      const updatedPosts = posts.filter(post => post.id !== id);
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
        
        const { error } = await supabase
          .from('matches')
          .insert({
            opportunity_id: id,
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
        
        const { error } = await supabase
          .from('matches')
          .insert({
            post_id: id,
            brand_id: user.id,
            status: 'pending'
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
      const updatedOpportunities = opportunities.filter(opp => opp.id !== id);
      setOpportunities(updatedOpportunities);
    } else {
      const updatedPosts = posts.filter(post => post.id !== id);
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

  const handleProfileUpdate = () => {
    onUpdateProfile();
  };

  const handleAnimationComplete = (id: string) => {
    setSwipeActions(prev => ({ ...prev, [id]: null }));
  };

  const pendingMatches = userMatches.filter(match => match.status === 'pending');
  const acceptedMatches = userMatches.filter(match => match.status === 'accepted');
  const rejectedMatches = userMatches.filter(match => match.status === 'rejected');

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
        {(activeTab === 'discover' || activeTab === 'influencers') && (
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
            onClick={() => setActiveTab('influencers')}
            className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
              activeTab === 'influencers'
                ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discover Influencers
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

      {showMatchSuccess && (matchedOpportunity || activeTab === 'influencers') && (
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
                {activeTab === 'influencers' ? (
                  <p>You've expressed interest in this influencer's post. They have been notified and will contact you soon.</p>
                ) : (
                  <>
                    <p>You've expressed interest in "{matchedOpportunity?.title}". The event organizer has been notified and will contact you soon.</p>
                    {matchedOpportunity?.calendly_link && (
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
                    {matchedOpportunity?.sponsorship_brochure_url && (
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
                  </>
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
                    placeholder="Search by title, description, or hashtags..."
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
            <div className="h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] overflow-y-auto snap-y snap-mandatory">
              <AnimatePresence>
                {opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onLike={async (id: string) => {
                      setSwipeActions(prev => ({ ...prev, [id]: 'like' }));
                      await handleLike(id, 'opportunity');
                    }}
                    onReject={(id: string) => {
                      setSwipeActions(prev => ({ ...prev, [id]: 'dislike' }));
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
            </div>
          )}
        </>
      )}

      {activeTab === 'influencers' && (
        <>
          {showFilters && (
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 max-w-full overflow-x-hidden">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="font-medium text-xs sm:text-sm">Filter Influencer Posts</h3>
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
                    placeholder="Search by title, description, or hashtags..."
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-medium text-gray-800 mb-2">No influencer posts found</h3>
              <p className="text-xs sm:text-gray-600 mb-3 sm:mb-4">
                We couldn't find any influencer posts matching your criteria. Try adjusting your filters.
              </p>
              <button
                onClick={resetFilters}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] overflow-y-auto snap-y snap-mandatory">
              <AnimatePresence>
                {posts.map((post) => (
                  <InfluencerPostCard
                    key={post.id}
                    post={post}
                    onLike={async (id: string) => {
                      setSwipeActions(prev => ({ ...prev, [id]: 'like' }));
                      await handleLike(id, 'post');
                    }}
                    onReject={(id: string) => {
                      setSwipeActions(prev => ({ ...prev, [id]: 'dislike' }));
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
                  <h3 className="text-base sm:text-xl font-medium text-gray-700 mb-2">No more influencer posts available</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    You've gone through all available influencer posts matching your criteria.
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