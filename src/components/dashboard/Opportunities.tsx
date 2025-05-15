import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  Clock,
  RefreshCw,
  Building2,
  Globe,
  Phone,
  Mail,
  Tag,
  Target,
  Clock8,
  Footprints,
  Users2,
  CalendarRange,
  FileText as FileIcon,
  ExternalLink,
  Search,
  FileSpreadsheet,
  Pause,
  Trash2,
  Hash,
  Video
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'] & {
  creator_profile: Database['public']['Tables']['profiles']['Row'] & { email?: string } | null;
  categories: Database['public']['Tables']['categories']['Row'] | null;
  type: 'opportunity';
};

type Post = Database['public']['Tables']['posts']['Row'] & {
  influencer_profile: Database['public']['Tables']['profiles']['Row'] & { email?: string } | null;
  categories: Database['public']['Tables']['categories']['Row'] | null;
  type: 'post';
};

type CombinedItem = Opportunity | Post;

interface OpportunitiesProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  setStats: (stats: Partial<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalMatches: number;
    pendingMatches: number;
    acceptedMatches: number;
    rejectedMatches: number;
  }>) => void;
}

export default function Opportunities({ searchTerm, setSearchTerm, stats, setStats }: OpportunitiesProps) {
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [videoErrors, setVideoErrors] = useState<{ [key: string]: boolean }>({});
  const [sheetLinkInput, setSheetLinkInput] = useState<{ [key: string]: string }>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'opportunity' | 'post' } | null>(null);

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching items with filter:', filter);

      // Fetch opportunities
      let opportunitiesQuery = supabase
        .from('opportunities')
        .select(`
          *,
          creator_profile:creator_id (*),
          categories:category_id (*)
        `);

      const { data: opportunitiesData, error: opportunitiesError } = await opportunitiesQuery;
      
      if (opportunitiesError) {
        console.error('Supabase opportunities query error:', opportunitiesError);
        throw opportunitiesError;
      }

      const normalizedOpportunities = (opportunitiesData || []).map(opp => ({
        ...opp,
        verification_status: opp.verification_status?.trim().toLowerCase() ?? 'pending',
        type: 'opportunity' as const
      }));

      // Fetch posts
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          influencer_profile:influencer_id (*),
          categories:category_id (*)
        `);

      const { data: postsData, error: postsError } = await postsQuery;
      
      if (postsError) {
        console.error('Supabase posts query error:', postsError);
        throw postsError;
      }

      const normalizedPosts = (postsData || []).map(post => ({
        ...post,
        verification_status: post.verification_status?.trim().toLowerCase() ?? 'pending',
        type: 'post' as const
      }));

      // Combine and filter data
      const combinedData: CombinedItem[] = [...normalizedOpportunities, ...normalizedPosts];

      if (!combinedData.length) {
        console.log('No items (opportunities or posts) found in the database');
        setItems([]);
      }

      console.log('Raw combined data:', combinedData);

      const filteredData = filter === 'all' 
        ? combinedData 
        : combinedData.filter(item => item.verification_status === filter);

      console.log('Filtered items:', filteredData);

      // Fetch emails for creators and influencers
      const itemsWithEmails = await Promise.all(
        filteredData.map(async (item: CombinedItem) => {
          try {
            const userId = item.type === 'opportunity' ? item.creator_id : item.influencer_id;
            const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
              body: { userId }
            });
            if (emailError) {
              console.warn(`Error fetching email for user ${userId}:`, emailError);
              return {
                ...item,
                [item.type === 'opportunity' ? 'creator_profile' : 'influencer_profile']: {
                  ...(item.type === 'opportunity' ? item.creator_profile : item.influencer_profile),
                  email: 'Not set'
                }
              };
            }
            return {
              ...item,
              [item.type === 'opportunity' ? 'creator_profile' : 'influencer_profile']: {
                ...(item.type === 'opportunity' ? item.creator_profile : item.influencer_profile),
                email: emailData?.email || 'Not set'
              }
            };
          } catch (error) {
            console.warn(`Failed to fetch email for user ${item.type === 'opportunity' ? item.creator_id : item.influencer_id}:`, error);
            return {
              ...item,
              [item.type === 'opportunity' ? 'creator_profile' : 'influencer_profile']: {
                ...(item.type === 'opportunity' ? item.creator_profile : item.influencer_profile),
                email: 'Not set'
              }
            };
          }
        })
      );

      console.log('Items with emails:', itemsWithEmails);
      setItems(itemsWithEmails as CombinedItem[]);

      // Update stats for both opportunities and posts
      const { data: opportunitiesStatsData, error: opportunitiesStatsError } = await supabase
        .from('opportunities')
        .select('verification_status');
      
      const { data: postsStatsData, error: postsStatsError } = await supabase
        .from('posts')
        .select('verification_status');
      
      if (opportunitiesStatsError) throw opportunitiesStatsError;
      if (postsStatsError) throw postsStatsError;
      
      const normalizedOpportunitiesStats = (opportunitiesStatsData || []).map(item => ({
        ...item,
        verification_status: item.verification_status?.trim().toLowerCase() ?? 'pending'
      }));
      const normalizedPostsStats = (postsStatsData || []).map(item => ({
        ...item,
        verification_status: item.verification_status?.trim().toLowerCase() ?? 'pending'
      }));

      const totalStats = [...normalizedOpportunitiesStats, ...normalizedPostsStats];
      setStats({
        total: totalStats.length,
        pending: totalStats.filter(o => o.verification_status === 'pending').length,
        approved: totalStats.filter(o => o.verification_status === 'approved').length,
        rejected: totalStats.filter(o => o.verification_status === 'rejected').length
      });
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch opportunities and posts');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, type: 'opportunity' | 'post') => {
    try {
      setProcessingAction(id);

      const table = type === 'opportunity' ? 'opportunities' : 'posts';
      const profileField = type === 'opportunity' ? 'creator_id' : 'influencer_id';
      const rpcFunction = type === 'opportunity' ? 'approve_opportunity' : 'approve_post';

      const { data: currentItem, error: checkError } = await supabase
        .from(table)
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentItem) throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
      if (currentItem.verification_status?.trim().toLowerCase() !== 'pending') {
        throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} is not in pending state`);
      }

      const { data: updateData, error: updateError } = await supabase.rpc(rpcFunction, {
        [`${type}_id`]: id
      });

      if (updateError) throw updateError;

      const { data: verifyData, error: verifyError } = await supabase
        .from(table)
        .select('verification_status, is_verified')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status?.trim().toLowerCase() !== 'approved' || !verifyData.is_verified) {
        throw new Error(`Failed to verify approval update for ${type}`);
      }

      setItems(prevItems => 
        prevItems.map(item => 
          item.id === id 
            ? { 
                ...item, 
                verification_status: 'approved', 
                is_verified: true, 
                rejection_reason: null 
              }
            : item
        )
      );

      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1
      }));

      setExpandedItem(null);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully`);

      await fetchItems();

    } catch (error) {
      console.error(`Error approving ${type}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to approve ${type}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (id: string, type: 'opportunity' | 'post') => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingAction(id);

      const table = type === 'opportunity' ? 'opportunities' : 'posts';
      const profileField = type === 'opportunity' ? 'creator_id' : 'influencer_id';
      const rpcFunction = type === 'opportunity' ? 'reject_opportunity' : 'reject_post';

      const { data: currentItem, error: checkError } = await supabase
        .from(table)
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentItem) throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
      if (currentItem.verification_status?.trim().toLowerCase() !== 'pending') {
        throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} is not in pending state`);
      }

      const { data: updateData, error: updateError } = await supabase.rpc(rpcFunction, {
        [`${type}_id`]: id,
        reason: rejectionReason
      });

      if (updateError) throw updateError;

      const { data: verifyData, error: verifyError } = await supabase
        .from(table)
        .select('verification_status, is_verified, rejection_reason')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status?.trim().toLowerCase() !== 'rejected') {
        throw new Error(`Failed to verify rejection update for ${type}`);
      }

      setItems(prevItems => 
        prevItems.map(item => 
          item.id === id 
            ? { 
                ...item, 
                verification_status: 'rejected', 
                is_verified: false, 
                rejection_reason: rejectionReason 
              }
            : item
        )
      );

      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1
      }));

      setRejectionReason('');
      setExpandedItem(null);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully`);

      await fetchItems();

    } catch (error) {
      console.error(`Error rejecting ${type}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to reject ${type}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUpdateSheetLink = async (id: string, type: 'opportunity' | 'post') => {
    const sheetLink = sheetLinkInput[id]?.trim();
    
    // Validate URL
    if (sheetLink && !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(sheetLink)) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      setProcessingAction(id);

      const table = type === 'opportunity' ? 'opportunities' : 'posts';

      const { error } = await supabase
        .from(table)
        .update({ sheetlink: sheetLink || null })
        .eq('id', id)
        .eq('verification_status', 'approved');

      if (error) throw error;

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, sheetlink: sheetLink || null } : item
        )
      );

      toast.success('Spreadsheet link updated successfully');
      setSheetLinkInput(prev => ({ ...prev, [id]: '' }));

    } catch (error) {
      console.error(`Error updating spreadsheet link for ${type}:`, error);
      toast.error('Failed to update spreadsheet link');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleTogglePause = async (id: string, type: 'opportunity' | 'post', currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      setProcessingAction(id);

      const table = type === 'opportunity' ? 'opportunities' : 'posts';

      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', id)
        .eq('verification_status', 'approved');

      if (error) throw error;

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully`);

    } catch (error) {
      console.error(`Error toggling ${type} status:`, error);
      toast.error(`Failed to update ${type} status`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDelete = async (id: string, type: 'opportunity' | 'post') => {
    setItemToDelete({ id, type });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setProcessingAction(itemToDelete.id);

      const table = itemToDelete.type === 'opportunity' ? 'opportunities' : 'posts';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id)
        .eq('verification_status', 'approved');

      if (error) throw error;

      setItems(prevItems =>
        prevItems.filter(item => item.id !== itemToDelete.id)
      );

      setStats(prev => ({
        ...prev,
        approved: Math.max(0, prev.approved - 1),
        total: Math.max(0, prev.total - 1)
      }));

      setExpandedItem(null);
      toast.success(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully`);

    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
      toast.error(`Failed to delete ${itemToDelete.type}`);
    } finally {
      setProcessingAction(null);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleRefresh = () => {
    fetchItems();
  };

  const handleVideoError = (mediaUrl: string) => {
    setVideoErrors(prev => ({ ...prev, [mediaUrl]: true }));
  };

  const formatPrice = (priceRange: any) => {
    if (!priceRange || typeof priceRange !== 'object') return 'Price not set';
    
    const min = typeof priceRange.min === 'number' ? priceRange.min : 0;
    const max = typeof priceRange.max === 'number' ? priceRange.max : 0;
    
    if (min === 0 && max === 0) return 'Price not set';
    if (min === max) return `₹${min.toLocaleString()}`;
    return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
  };

  const formatPeakHours = (peakHours: any) => {
    if (!peakHours || typeof peakHours !== 'object') return 'Not specified';
    
    const { start, end } = peakHours;
    if (!start || !end) return 'Not specified';
    
    return `${start} - ${end}`;
  };

  const formatDemographics = (demographics: any) => {
    if (!demographics || typeof demographics !== 'object') return 'Not specified';
    
    const details = [];
    if (demographics.age_range) {
      details.push(`Age: ${demographics.age_range.min}-${demographics.age_range.max}`);
    }
    if (demographics.gender) {
      details.push(`Gender: ${demographics.gender}`);
    }
    if (demographics.income_level) {
      details.push(`Income: ${demographics.income_level}`);
    }
    
    return details.length > 0 ? details.join(', ') : 'Not specified';
  };

  const filteredItems = items.filter(item => {
    const title = item.title.toLowerCase();
    const profileName = item.type === 'opportunity' 
      ? item.creator_profile?.company_name?.toLowerCase()
      : item.influencer_profile?.company_name?.toLowerCase();
    const location = (item as Opportunity).location?.toLowerCase();
    const hashtags = (item as Post).hashtags?.toLowerCase();

    return (
      title.includes(searchTerm.toLowerCase()) ||
      profileName?.includes(searchTerm.toLowerCase()) ||
      location?.includes(searchTerm.toLowerCase()) ||
      hashtags?.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opportunities & Posts</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search opportunities or posts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => { 
              console.log('Setting filter to:', e.target.value); 
              setFilter(e.target.value as typeof filter); 
            }}
          >
            <option value="all">All Items</option>
            <option value="pending">Pending Items</option>
            <option value="approved">Approved Items</option>
            <option value="rejected">Rejected Items</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">No opportunities or posts found</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const isOpportunity = item.type === 'opportunity';
              const profile = isOpportunity ? (item as Opportunity).creator_profile : (item as Post).influencer_profile;
              return (
                <div key={item.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          item.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          item.verification_status?.trim().toLowerCase() === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.verification_status?.trim().toLowerCase() === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.verification_status?.charAt(0).toUpperCase() + item.verification_status?.slice(1)}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          {isOpportunity ? 'Opportunity' : 'Post'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          {isOpportunity ? (
                            <>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin size={16} className="mr-2 flex-shrink-0" />
                                {(item as Opportunity).location}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <CalendarRange size={16} className="mr-2 flex-shrink-0" />
                                {(item as Opportunity).start_date && (item as Opportunity).end_date 
                                  ? `${new Date((item as Opportunity).start_date).toLocaleDateString()} - ${new Date((item as Opportunity).end_date).toLocaleDateString()}`
                                  : 'Dates not set'
                                }
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center text-sm text-gray-500">
                              <Hash size={16} className="mr-2 flex-shrink-0" />
                              {(item as Post).hashtags || 'No hashtags'}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <DollarSign size={16} className="mr-2 flex-shrink-0" />
                            {formatPrice(item.price_range)}
                          </div>
                          {item.reach && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Users size={16} className="mr-2 flex-shrink-0" />
                              {item.reach.toLocaleString()} reach
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).footfall && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Footprints size={16} className="mr-2 flex-shrink-0" />
                              {(item as Opportunity).footfall.toLocaleString()} footfall
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isOpportunity && (item as Opportunity).ad_type && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Tag size={16} className="mr-2 flex-shrink-0" />
                              Ad Type: {(item as Opportunity).ad_type}
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).ad_duration && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock8 size={16} className="mr-2 flex-shrink-0" />
                              Duration: {(item as Opportunity).ad_duration}
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).ad_dimensions && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Target size={16} className="mr-2 flex-shrink-0" />
                              Dimensions: {(item as Opportunity).ad_dimensions}
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).peak_hours && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock size={16} className="mr-2 flex-shrink-0" />
                              Peak Hours: {formatPeakHours((item as Opportunity).peak_hours)}
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).target_demographics && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Users2 size={16} className="mr-2 flex-shrink-0" />
                              Demographics: {formatDemographics((item as Opportunity).target_demographics)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isOpportunity && (item as Opportunity).calendly_link && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <Calendar size={16} className="mr-2 flex-shrink-0" />
                              <a 
                                href={(item as Opportunity).calendly_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center"
                              >
                                Calendly Link
                                <ExternalLink size={12} className="ml-1" />
                              </a>
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).sponsorship_brochure_url && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <FileIcon size={16} className="mr-2 flex-shrink-0" />
                              <a 
                                href={(item as Opportunity).sponsorship_brochure_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center"
                              >
                                Sponsorship Brochure
                                <ExternalLink size={12} className="ml-1" />
                              </a>
                            </div>
                          )}
                          {item.sheetlink && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <FileSpreadsheet size={16} className="mr-2 flex-shrink-0" />
                              <a 
                                href={item.sheetlink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center"
                              >
                                Spreadsheet Link
                                <ExternalLink size={12} className="ml-1" />
                              </a>
                            </div>
                          )}
                          {isOpportunity && (item as Opportunity).media_urls && (item as Opportunity).media_urls.length > 0 && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <LinkIcon size={16} className="mr-2 flex-shrink-0" />
                              <span>{(item as Opportunity).media_urls.length} Media Files</span>
                            </div>
                          )}
                          {!isOpportunity && (item as Post).video_url && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <Video size={16} className="mr-2 flex-shrink-0" />
                              <span>Video Content</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.verification_status?.trim().toLowerCase() === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id, item.type)}
                            disabled={processingAction === item.id}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            {processingAction === item.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setExpandedItem(item.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedItem(item.id === expandedItem ? null : item.id)}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        {item.id === expandedItem ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  {item.id === expandedItem && (
                    <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4">Description & Details</h4>
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                              <p className="text-gray-600">{item.description}</p>
                            </div>
                            {isOpportunity && (item as Opportunity).requirements && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Requirements</h5>
                                <p className="text-gray-600">{(item as Opportunity).requirements}</p>
                              </div>
                            )}
                            {isOpportunity && (item as Opportunity).benefits && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Benefits</h5>
                                <p className="text-gray-600">{(item as Opportunity).benefits}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4">{isOpportunity ? 'Creator' : 'Influencer'} Details</h4>
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                              <Building2 size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {profile?.company_name || 'Name not set'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {profile?.industry || 'Industry not set'}
                                </p>
                              </div>
                            </div>
                            {profile?.email && (
                              <div className="flex items-center space-x-3">
                                <Mail size={20} className="text-gray-400" />
                                <p className="text-gray-900">{profile.email}</p>
                              </div>
                            )}
                            {profile?.website && (
                              <div className="flex items-center space-x-3">
                                <Globe size={20} className="text-gray-400" />
                                <a 
                                  href={profile.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#2B4B9B] hover:underline"
                                >
                                  {profile.website}
                                </a>
                              </div>
                            )}
                            {profile?.contact_person_name && (
                              <div className="flex items-center space-x-3">
                                <Users size={20} className="text-gray-400" />
                                <div>
                                  <p className="text-gray-900">{profile.contact_person_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {profile.contact_person_position || 'Position not set'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {profile?.contact_person_phone && (
                              <div className="flex items-center space-x-3">
                                <Phone size={20} className="text-gray-400" />
                                <p className="text-gray-900">{profile.contact_person_phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {isOpportunity && (item as Opportunity).media_urls && (item as Opportunity).media_urls.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Media</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(item as Opportunity).media_urls.map((mediaUrl, index) => {
                              const isImage = /\.(jpg|jpeg|png|gif)$/i.test(mediaUrl);
                              const isVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
                              const hasVideoError = videoErrors[mediaUrl];
                              return (
                                <div key={index} className="border rounded-lg p-2">
                                  {isImage ? (
                                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={mediaUrl}
                                        alt={`Media ${index + 1}`}
                                        className="w-full h-32 object-cover rounded"
                                      />
                                    </a>
                                  ) : isVideo && !hasVideoError ? (
                                    <video
                                      controls
                                      className="w-full h-32 object-cover rounded"
                                      onError={() => handleVideoError(mediaUrl)}
                                    >
                                      <source src={mediaUrl} type={`video/${mediaUrl.split('.').pop()?.toLowerCase()}`} />
                                      Your browser does not support the video tag.
                                    </video>
                                  ) : (
                                    <a
                                      href={mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#2B4B9B] hover:underline flex items-center"
                                    >
                                      {hasVideoError ? 'Video failed to load - View Media' : `Media ${index + 1}`}
                                      <ExternalLink size={12} className="ml-1" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {!isOpportunity && (item as Post).video_url && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Video</h4>
                          <div className="border rounded-lg p-2">
                            {videoErrors[(item as Post).video_url] ? (
                              <a
                                href={(item as Post).video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2B4B9B] hover:underline flex items-center"
                              >
                                Video failed to load - View Video
                                <ExternalLink size={12} className="ml-1" />
                              </a>
                            ) : (
                              <video
                                controls
                                className="w-full h-32 object-cover rounded"
                                onError={() => handleVideoError((item as Post).video_url)}
                              >
                                <source src={(item as Post).video_url} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            )}
                          </div>
                        </div>
                      )}
                      {item.verification_status?.trim().toLowerCase() === 'pending' && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Rejection Reason</h4>
                          <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter reason for rejection..."
                          />
                          <div className="mt-4 flex justify-end space-x-3">
                            <button
                              onClick={() => {
                                setExpandedItem(null);
                                setRejectionReason('');
                              }}
                              className="px-4 py-2 text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReject(item.id, item.type)}
                              disabled={!rejectionReason || processingAction === item.id}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                              {processingAction === item.id ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                          </div>
                        </div>
                      )}
                      {item.verification_status?.trim().toLowerCase() === 'approved' && (
                        <>
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-4">Spreadsheet Link</h4>
                            <div className="flex items-center space-x-3">
                              <input
                                type="text"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                                value={sheetLinkInput[item.id] || item.sheetlink || ''}
                                onChange={(e) => setSheetLinkInput(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                placeholder="Enter spreadsheet link..."
                              />
                              <button
                                onClick={() => handleUpdateSheetLink(item.id, item.type)}
                                disabled={processingAction === item.id}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                              >
                                {processingAction === item.id ? 'Processing...' : 
                                  item.sheetlink ? 'Update Link' : 'Add Link'}
                              </button>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-4">{isOpportunity ? 'Opportunity' : 'Post'} Management</h4>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleTogglePause(item.id, item.type, item.status)}
                                disabled={processingAction === item.id}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center"
                              >
                                <Pause size={16} className="mr-2" />
                                {processingAction === item.id ? 'Processing...' : 
                                  item.status === 'active' ? `Pause ${isOpportunity ? 'Opportunity' : 'Post'}` : `Resume ${isOpportunity ? 'Opportunity' : 'Post'}`}
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.type)}
                                disabled={processingAction === item.id}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center"
                              >
                                <Trash2 size={16} className="mr-2" />
                                {processingAction === item.id ? 'Processing...' : `Delete ${isOpportunity ? 'Opportunity' : 'Post'}`}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={`Delete ${itemToDelete?.type.charAt(0).toUpperCase() + itemToDelete?.type.slice(1)}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}