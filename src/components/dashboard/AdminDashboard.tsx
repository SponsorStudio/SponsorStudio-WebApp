import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
import toast from 'react-hot-toast'; // Import react-hot-toast
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Link as LinkIcon,
  BarChart3,
  Clock,
  Filter,
  Search,
  Settings,
  PlusCircle,
  Trash2,
  Edit,
  RefreshCw,
  LogOut,
  Building2,
  Globe,
  Phone,
  Mail,
  Tag,
  Info,
  Target,
  Clock8,
  Footprints,
  Users2,
  CalendarRange,
  FileText as FileIcon,
  ExternalLink,
  CheckSquare,
  ListChecks
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'] & {
  creator_profile: Database['public']['Tables']['profiles']['Row'] & { email?: string } | null;
  categories: Database['public']['Tables']['categories']['Row'] | null;
};

type Match = {
  id: string;
  opportunity_id: string;
  brand_id: string;
  event_organizer_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  meeting_scheduled_at?: string;
  meeting_link?: string;
  notes?: string;
  opportunity: (Database['public']['Tables']['opportunities']['Row'] & {
    categories: Database['public']['Tables']['categories']['Row'] | null;
    creator_profile: Database['public']['Tables']['profiles']['Row'] & { email?: string } | null;
  }) | null;
  brand_profile: Database['public']['Tables']['profiles']['Row'] & { email?: string } | null;
  event_organizer_profile: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [matchFilter, setMatchFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('all');
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [newMeetingLink, setNewMeetingLink] = useState<string>(''); // New state for meeting link
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalMatches: 0,
    pendingMatches: 0,
    acceptedMatches: 0,
    rejectedMatches: 0
  });

  useEffect(() => {
    console.log('useEffect triggered with filter:', filter, 'matchFilter:', matchFilter);
    fetchOpportunities();
    fetchMatches();
  }, [filter, matchFilter]);

  const fetchOpportunities = async () => {
    try {
      console.log('Fetching opportunities with filter:', filter);
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          creator_profile:creator_id (*),
          categories:category_id (*)
        `);

      // Fetch all opportunities and filter on the client side for debugging
      const { data, error } = await query;
      
      if (error) throw error;

      // Normalize verification_status and filter on the client side
      const normalizedData = data?.map(opp => ({
        ...opp,
        verification_status: opp.verification_status?.trim().toLowerCase()
      })) || [];

      const filteredData = filter === 'all' 
        ? normalizedData 
        : normalizedData.filter(opp => opp.verification_status === filter);

      console.log('Normalized opportunities:', normalizedData);
      console.log('Filtered opportunities:', filteredData);

      // Fetch emails for creators
      const creatorProfilesWithEmails = await Promise.all(
        filteredData.map(async (opp: any) => {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
            body: { userId: opp.creator_id }
          });
          if (emailError) {
            console.error(`Error fetching email for creator ${opp.creator_id}:`, emailError);
            return { ...opp, creator_profile: { ...opp.creator_profile, email: 'Not set' } };
          }
          return {
            ...opp,
            creator_profile: {
              ...opp.creator_profile,
              email: emailData?.email || 'Not set'
            }
          };
        })
      );

      setOpportunities(creatorProfilesWithEmails as Opportunity[] || []);
      
      const { data: statsData, error: statsError } = await supabase
        .from('opportunities')
        .select('verification_status');
      
      if (statsError) throw statsError;
      
      if (statsData) {
        const normalizedStats = statsData.map(item => ({
          ...item,
          verification_status: item.verification_status?.trim().toLowerCase()
        }));
        setStats(prev => ({
          ...prev,
          total: normalizedStats.length,
          pending: normalizedStats.filter(o => o.verification_status === 'pending').length,
          approved: normalizedStats.filter(o => o.verification_status === 'approved').length,
          rejected: normalizedStats.filter(o => o.verification_status === 'rejected').length
        }));
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      console.log('Fetching matches with matchFilter:', matchFilter);
      let matchesQuery = supabase
        .from('matches')
        .select('*');
      
      // Fetch all matches and filter on the client side for debugging
      const { data: matchesData, error: matchesError } = await matchesQuery;
      
      if (matchesError) throw matchesError;
      
      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      // Normalize status and filter on the client side
      const normalizedMatches = matchesData.map(match => ({
        ...match,
        status: match.status?.trim().toLowerCase()
      }));

      const filteredMatches = matchFilter === 'all'
        ? normalizedMatches
        : normalizedMatches.filter(match => match.status === matchFilter);

      console.log('Normalized matches:', normalizedMatches);
      console.log('Filtered matches (before relations):', filteredMatches);

      // Fetch all opportunity IDs from filtered matches
      const opportunityIds = [...new Set(filteredMatches.map(match => match.opportunity_id))];
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          *,
          categories:category_id (*)
        `)
        .in('id', opportunityIds);
      
      if (opportunitiesError) throw opportunitiesError;

      // Fetch all creator IDs from opportunities
      const creatorIds = [...new Set(opportunitiesData?.map(opp => opp.creator_id) || [])];
      
      // Fetch all profile IDs (brand_id and creator_id)
      const brandIds = [...new Set(filteredMatches.map(match => match.brand_id))];
      const allProfileIds = [...new Set([...brandIds, ...creatorIds])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allProfileIds);
      
      if (profilesError) throw profilesError;

      // Fetch emails for brands and creators
      const profilesWithEmails = await Promise.all(
        profilesData.map(async (profile: any) => {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
            body: { userId: profile.id }
          });
          if (emailError) {
            console.error(`Error fetching email for profile ${profile.id}:`, emailError);
            return { ...profile, email: 'Not set' };
          }
          return {
            ...profile,
            email: emailData?.email || 'Not set'
          };
        })
      );

      // Map opportunities with their creator profiles
      const opportunitiesWithCreators = opportunitiesData?.map(opp => {
        const creatorProfile = profilesWithEmails.find(profile => profile.id === opp.creator_id) || null;
        return {
          ...opp,
          creator_profile: creatorProfile
        };
      }) || [];

      // Map matches with related data
      const matchesWithRelations = filteredMatches.map(match => {
        const opportunity = opportunitiesWithCreators.find(opp => opp.id === match.opportunity_id) || null;
        const brandProfile = profilesWithEmails.find(profile => profile.id === match.brand_id) || null;

        return {
          ...match,
          opportunity,
          brand_profile: brandProfile,
          event_organizer_profile: null
        };
      });

      console.log('Fetched matches with relations:', matchesWithRelations);
      
      setMatches(matchesWithRelations as Match[] || []);
      
      // Calculate match stats
      const { data: matchStatsData, error: matchStatsError } = await supabase
        .from('matches')
        .select('status');
      
      if (matchStatsError) throw matchStatsError;
      
      const normalizedMatchStats = matchStatsData?.map(item => ({
        ...item,
        status: item.status?.trim().toLowerCase()
      })) || [];

      console.log('Match stats data:', normalizedMatchStats);
      
      if (normalizedMatchStats) {
        setStats(prev => ({
          ...prev,
          totalMatches: normalizedMatchStats.length,
          pendingMatches: normalizedMatchStats.filter(m => m.status === 'pending').length,
          acceptedMatches: normalizedMatchStats.filter(m => m.status === 'accepted').length,
          rejectedMatches: normalizedMatchStats.filter(m => m.status === 'rejected').length
        }));
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingAction(id);

      const { data: currentOpp, error: checkError } = await supabase
        .from('opportunities')
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentOpp) throw new Error('Opportunity not found');
      if (currentOpp.verification_status?.trim().toLowerCase() !== 'pending') {
        throw new Error('Opportunity is not in pending state');
      }

      const { data: updateData, error: updateError } = await supabase.rpc('approve_opportunity', {
        opportunity_id: id
      });

      if (updateError) throw updateError;

      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunities')
        .select('verification_status, is_verified')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status?.trim().toLowerCase() !== 'approved' || !verifyData.is_verified) {
        throw new Error('Failed to verify approval update');
      }

      setOpportunities(prevOpportunities => 
        prevOpportunities.map(opp => 
          opp.id === id 
            ? { 
                ...opp, 
                verification_status: 'approved', 
                is_verified: true, 
                rejection_reason: null 
              }
            : opp
        )
      );

      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1
      }));

      setExpandedOpportunity(null);

      toast.success('Opportunity approved successfully'); // Replace alert with toast.success

      await fetchOpportunities();

    } catch (error) {
      console.error('Error approving opportunity:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve opportunity'); // Replace alert with toast.error
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection'); // Replace alert with toast.error
      return;
    }

    try {
      setProcessingAction(id);

      const { data: currentOpp, error: checkError } = await supabase
        .from('opportunities')
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentOpp) throw new Error('Opportunity not found');
      if (currentOpp.verification_status?.trim().toLowerCase() !== 'pending') {
        throw new Error('Opportunity is not in pending state');
      }

      const { data: updateData, error: updateError } = await supabase.rpc('reject_opportunity', {
        opportunity_id: id,
        reason: rejectionReason
      });

      if (updateError) throw updateError;

      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunities')
        .select('verification_status, is_verified, rejection_reason')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status?.trim().toLowerCase() !== 'rejected') {
        throw new Error('Failed to verify rejection update');
      }

      setOpportunities(prevOpportunities => 
        prevOpportunities.map(opp => 
          opp.id === id 
            ? { 
                ...opp, 
                verification_status: 'rejected', 
                is_verified: false, 
                rejection_reason: rejectionReason 
              }
            : opp
        )
      );

      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1
      }));

      setRejectionReason('');
      setExpandedOpportunity(null);

      toast.success('Opportunity rejected successfully'); // Replace alert with toast.success

      await fetchOpportunities();

    } catch (error) {
      console.error('Error rejecting opportunity:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject opportunity'); // Replace alert with toast.error
    } finally {
      setProcessingAction(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  const filteredOpportunities = opportunities.filter(opportunity =>
    opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.creator_profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMatches = matches.filter(match => {
    const opportunityTitle = match.opportunity?.title?.toLowerCase() || '';
    const brandCompanyName = match.brand_profile?.company_name?.toLowerCase() || '';
    const creatorCompanyName = match.opportunity?.creator_profile?.company_name?.toLowerCase() || '';
    
    const searchLower = searchTerm.toLowerCase();
    return (
      opportunityTitle.includes(searchLower) ||
      brandCompanyName.includes(searchLower) ||
      creatorCompanyName.includes(searchLower)
    );
  });

  console.log('Filtered matches (UI):', filteredMatches);

  const handleSaveMeetingLink = async (matchId: string) => {
    if (!newMeetingLink) {
      toast.error('Please enter a meeting link'); // Replace alert with toast.error
      return;
    }

    try {
      setProcessingAction(matchId);
      const { error } = await supabase
        .from('matches')
        .update({ meeting_link: newMeetingLink })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId ? { ...match, meeting_link: newMeetingLink } : match
        )
      );
      setNewMeetingLink(''); // Clear the input
      setExpandedMatch(null); // Collapse the match
      toast.success('Meeting link saved successfully'); // Replace alert with toast.success
    } catch (error) {
      console.error('Error saving meeting link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save meeting link'); // Replace alert with toast.error
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage and verify opportunities and matches</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Opportunities</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <BarChart3 className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">{stats.rejected}</p>
            </div>
            <XCircle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search opportunities or matches..."
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
              console.log('Setting opportunities filter to:', e.target.value); 
              setFilter(e.target.value as typeof filter); 
            }}
          >
            <option value="all">All Opportunities</option>
            <option value="pending">Pending Opportunities</option>
            <option value="approved">Approved Opportunities</option>
            <option value="rejected">Rejected Opportunities</option>
          </select>
          <button
            onClick={() => {
              fetchOpportunities();
              fetchMatches();
            }}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-12">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Opportunities</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">No opportunities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{opportunity.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        opportunity.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        opportunity.verification_status?.trim().toLowerCase() === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : opportunity.verification_status?.trim().toLowerCase() === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {opportunity.verification_status?.charAt(0).toUpperCase() + opportunity.verification_status?.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin size={16} className="mr-2 flex-shrink-0" />
                          {opportunity.location}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarRange size={16} className="mr-2 flex-shrink-0" />
                          {opportunity.start_date && opportunity.end_date 
                            ? `${new Date(opportunity.start_date).toLocaleDateString()} - ${new Date(opportunity.end_date).toLocaleDateString()}`
                            : 'Dates not set'
                          }
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <DollarSign size={16} className="mr-2 flex-shrink-0" />
                          {formatPrice(opportunity.price_range)}
                        </div>

                        {opportunity.reach && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users size={16} className="mr-2 flex-shrink-0" />
                            {opportunity.reach.toLocaleString()} reach
                          </div>
                        )}

                        {opportunity.footfall && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Footprints size={16} className="mr-2 flex-shrink-0" />
                            {opportunity.footfall.toLocaleString()} footfall
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {opportunity.ad_type && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Tag size={16} className="mr-2 flex-shrink-0" />
                            Ad Type: {opportunity.ad_type}
                          </div>
                        )}

                        {opportunity.ad_duration && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock8 size={16} className="mr-2 flex-shrink-0" />
                            Duration: {opportunity.ad_duration}
                          </div>
                        )}

                        {opportunity.ad_dimensions && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Target size={16} className="mr-2 flex-shrink-0" />
                            Dimensions: {opportunity.ad_dimensions}
                          </div>
                        )}

                        {opportunity.peak_hours && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock size={16} className="mr-2 flex-shrink-0" />
                            Peak Hours: {formatPeakHours(opportunity.peak_hours)}
                          </div>
                        )}

                        {opportunity.target_demographics && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users2 size={16} className="mr-2 flex-shrink-0" />
                            Demographics: {formatDemographics(opportunity.target_demographics)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {opportunity.calendly_link && (
                          <div className="flex items-center text-sm text-[#2B4B9B]">
                            <Calendar size={16} className="mr-2 flex-shrink-0" />
                            <a 
                              href={opportunity.calendly_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center"
                            >
                              Calendly Link
                              <ExternalLink size={12} className="ml-1" />
                            </a>
                          </div>
                        )}

                        {opportunity.sponsorship_brochure_url && (
                          <div className="flex items-center text-sm text-[#2B4B9B]">
                            <FileIcon size={16} className="mr-2 flex-shrink-0" />
                            <a 
                              href={opportunity.sponsorship_brochure_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center"
                            >
                              Sponsorship Brochure
                              <ExternalLink size={12} className="ml-1" />
                            </a>
                          </div>
                        )}

                        {opportunity.media_urls && opportunity.media_urls.length > 0 && (
                          <div className="flex items-center text-sm text-[#2B4B9B]">
                            <LinkIcon size={16} className="mr-2 flex-shrink-0" />
                            <span>{opportunity.media_urls.length} Media Files</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {opportunity.verification_status?.trim().toLowerCase() === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(opportunity.id)}
                          disabled={processingAction === opportunity.id}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                          {processingAction === opportunity.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setExpandedOpportunity(opportunity.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedOpportunity(opportunity.id === expandedOpportunity ? null : opportunity.id)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      {opportunity.id === expandedOpportunity ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {opportunity.id === expandedOpportunity && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Description & Details</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                            <p className="text-gray-600">{opportunity.description}</p>
                          </div>
                          
                          {opportunity.requirements && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Requirements</h5>
                              <p className="text-gray-600">{opportunity.requirements}</p>
                            </div>
                          )}
                          
                          {opportunity.benefits && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Benefits</h5>
                              <p className="text-gray-600">{opportunity.benefits}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Creator Details</h4>
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <Building2 size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {opportunity.creator_profile?.company_name || 'Company name not set'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {opportunity.creator_profile?.industry || 'Industry not set'}
                              </p>
                            </div>
                          </div>

                          {opportunity.creator_profile?.email && (
                            <div className="flex items-center space-x-3">
                              <Mail size={20} className="text-gray-400" />
                              <p className="text-gray-900">{opportunity.creator_profile.email}</p>
                            </div>
                          )}

                          {opportunity.creator_profile?.website && (
                            <div className="flex items-center space-x-3">
                              <Globe size={20} className="text-gray-400" />
                              <a 
                                href={opportunity.creator_profile.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2B4B9B] hover:underline"
                              >
                                {opportunity.creator_profile.website}
                              </a>
                            </div>
                          )}

                          {opportunity.creator_profile?.contact_person_name && (
                            <div className="flex items-center space-x-3">
                              <Users size={20} className="text-gray-400" />
                              <div>
                                <p className="text-gray-900">{opportunity.creator_profile.contact_person_name}</p>
                                <p className="text-sm text-gray-500">
                                  {opportunity.creator_profile.contact_person_position || 'Position not set'}
                                </p>
                              </div>
                            </div>
                          )}

                          {opportunity.creator_profile?.contact_person_phone && (
                            <div className="flex items-center space-x-3">
                              <Phone size={20} className="text-gray-400" />
                              <p className="text-gray-900">{opportunity.creator_profile.contact_person_phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {opportunity.verification_status?.trim().toLowerCase() === 'pending' && (
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
                              setExpandedOpportunity(null);
                              setRejectionReason('');
                            }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(opportunity.id)}
                            disabled={!rejectionReason || processingAction === opportunity.id}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            {processingAction === opportunity.id ? 'Processing...' : 'Confirm Rejection'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Matched Opportunities</h2>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={matchFilter}
            onChange={(e) => { 
              console.log('Setting matches filter to:', e.target.value); 
              setMatchFilter(e.target.value as typeof matchFilter); 
            }}
          >
            <option value="all">All Matches</option>
            <option value="pending">Pending Matches</option>
            <option value="accepted">Accepted Matches</option>
            <option value="rejected">Rejected Matches</option>
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">No matches found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMatches.map((match) => (
              <div key={match.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {match.opportunity?.title || 'Opportunity not found'}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        match.status?.trim().toLowerCase() === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : match.status?.trim().toLowerCase() === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {match.status?.charAt(0).toUpperCase() + match.status?.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-3">
                          <Building2 size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">
                              Brand: {match.brand_profile?.company_name || 'Not set'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {match.brand_profile?.industry || 'Industry not set'}
                            </p>
                          </div>
                        </div>
                        {match.brand_profile?.email && (
                          <div className="flex items-center space-x-3">
                            <Mail size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.brand_profile.email}</p>
                          </div>
                        )}
                        {match.brand_profile?.contact_person_name && (
                          <div className="flex items-center space-x-3">
                            <Users size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.brand_profile.contact_person_name}</p>
                          </div>
                        )}
                        {match.brand_profile?.contact_person_phone && (
                          <div className="flex items-center space-x-3">
                            <Phone size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.brand_profile.contact_person_phone}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start space-x-3">
                          <Building2 size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">
                              Creator: {match.opportunity?.creator_profile?.company_name || 'Not set'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {match.opportunity?.creator_profile?.industry || 'Industry not set'}
                            </p>
                          </div>
                        </div>
                        {match.opportunity?.creator_profile?.email && (
                          <div className="flex items-center space-x-3">
                            <Mail size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.opportunity?.creator_profile?.email}</p>
                          </div>
                        )}
                        {match.opportunity?.creator_profile?.contact_person_name && (
                          <div className="flex items-center space-x-3">
                            <Users size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.opportunity?.creator_profile?.contact_person_name}</p>
                          </div>
                        )}
                        {match.opportunity?.creator_profile?.contact_person_phone && (
                          <div className="flex items-center space-x-3">
                            <Phone size={16} className="text-gray-400" />
                            <p className="text-gray-900">{match.opportunity?.creator_profile?.contact_person_phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedMatch(match.id === expandedMatch ? null : match.id)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    {match.id === expandedMatch ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                </div>

                {match.id === expandedMatch && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Opportunity Details</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                            <p className="text-gray-600">{match.opportunity?.description || 'No description available'}</p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin size={16} className="mr-2 flex-shrink-0" />
                            {match.opportunity?.location || 'Location not set'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarRange size={16} className="mr-2 flex-shrink-0" />
                            {match.opportunity?.start_date && match.opportunity?.end_date 
                              ? `${new Date(match.opportunity.start_date).toLocaleDateString()} - ${new Date(match.opportunity.end_date).toLocaleDateString()}`
                              : 'Dates not set'
                            }
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <DollarSign size={16} className="mr-2 flex-shrink-0" />
                            {match.opportunity ? formatPrice(match.opportunity.price_range) : 'Price not set'}
                          </div>
                          {match.opportunity?.categories?.name && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Tag size={16} className="mr-2 flex-shrink-0" />
                              Category: {match.opportunity.categories.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Match Details</h4>
                        <div className="space-y-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock size={16} className="mr-2 flex-shrink-0" />
                            Matched on: {new Date(match.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CheckSquare size={16} className="mr-2 flex-shrink-0" />
                            Status: {match.status?.charAt(0).toUpperCase() + match.status?.slice(1)}
                          </div>
                          {match.meeting_scheduled_at && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar size={16} className="mr-2 flex-shrink-0" />
                              Meeting Scheduled: {new Date(match.meeting_scheduled_at).toLocaleString()}
                            </div>
                          )}
                          {match.meeting_link && (
                            <div className="flex items-center text-sm text-[#2B4B9B]">
                              <LinkIcon size={16} className="mr-2 flex-shrink-0" />
                              <a href={match.meeting_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                Meeting Link
                              </a>
                            </div>
                          )}
                          {match.notes && (
                            <div className="flex items-start text-sm text-gray-500">
                              <FileText size={16} className="mr-2 flex-shrink-0 mt-1" />
                              <p>Notes: {match.notes}</p>
                            </div>
                          )}
                          {match.brand_profile?.website && (
                            <div className="flex items-center space-x-3">
                              <Globe size={16} className="text-gray-400" />
                              <a 
                                href={match.brand_profile.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2B4B9B] hover:underline"
                              >
                                Brand Website
                              </a>
                            </div>
                          )}
                          {match.opportunity?.creator_profile?.website && (
                            <div className="flex items-center space-x-3">
                              <Globe size={16} className="text-gray-400" />
                              <a 
                                href={match.opportunity?.creator_profile?.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2B4B9B] hover:underline"
                              >
                                Creator Website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {match.status?.trim().toLowerCase() === 'accepted' && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Set Meeting Link</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMeetingLink}
                            onChange={(e) => setNewMeetingLink(e.target.value)}
                            placeholder="Enter meeting link (e.g., https://zoom.us/j/123456789)"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                          />
                          <button
                            onClick={() => handleSaveMeetingLink(match.id)}
                            disabled={processingAction === match.id || !newMeetingLink}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                          >
                            {processingAction === match.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}