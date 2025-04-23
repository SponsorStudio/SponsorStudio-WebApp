import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
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
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchOpportunities();
  }, [filter]);

  const fetchOpportunities = async () => {
    try {
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          profiles:creator_id (*),
          categories:category_id (*)
        `);
      
      if (filter !== 'all') {
        query = query.eq('verification_status', filter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setOpportunities(data as Opportunity[] || []);
      
      // Calculate stats
      const { data: statsData, error: statsError } = await supabase
        .from('opportunities')
        .select('verification_status');
      
      if (statsError) throw statsError;
      
      if (statsData) {
        setStats({
          total: statsData.length,
          pending: statsData.filter(o => o.verification_status === 'pending').length,
          approved: statsData.filter(o => o.verification_status === 'approved').length,
          rejected: statsData.filter(o => o.verification_status === 'rejected').length
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingAction(id);

      // First verify the opportunity exists and is pending
      const { data: currentOpp, error: checkError } = await supabase
        .from('opportunities')
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentOpp) throw new Error('Opportunity not found');
      if (currentOpp.verification_status !== 'pending') {
        throw new Error('Opportunity is not in pending state');
      }

      // Update the opportunity status using RPC call
      const { data: updateData, error: updateError } = await supabase.rpc('approve_opportunity', {
        opportunity_id: id
      });

      if (updateError) throw updateError;

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunities')
        .select('verification_status, is_verified')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status !== 'approved' || !verifyData.is_verified) {
        throw new Error('Failed to verify approval update');
      }

      // Update local state
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

      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1
      }));

      // Close expanded view
      setExpandedOpportunity(null);

      // Show success message
      alert('Opportunity approved successfully');

      // Refresh opportunities to ensure consistency
      await fetchOpportunities();

    } catch (error) {
      console.error('Error approving opportunity:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve opportunity');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingAction(id);

      // First verify the opportunity exists and is pending
      const { data: currentOpp, error: checkError } = await supabase
        .from('opportunities')
        .select('verification_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!currentOpp) throw new Error('Opportunity not found');
      if (currentOpp.verification_status !== 'pending') {
        throw new Error('Opportunity is not in pending state');
      }

      // Update the opportunity status using RPC call
      const { data: updateData, error: updateError } = await supabase.rpc('reject_opportunity', {
        opportunity_id: id,
        reason: rejectionReason
      });

      if (updateError) throw updateError;

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('opportunities')
        .select('verification_status, is_verified, rejection_reason')
        .eq('id', id)
        .single();

      if (verifyError) throw verifyError;
      if (!verifyData || verifyData.verification_status !== 'rejected') {
        throw new Error('Failed to verify rejection update');
      }

      // Update local state
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

      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1
      }));

      // Reset form and close expanded view
      setRejectionReason('');
      setExpandedOpportunity(null);

      // Show success message
      alert('Opportunity rejected successfully');

      // Refresh opportunities to ensure consistency
      await fetchOpportunities();

    } catch (error) {
      console.error('Error rejecting opportunity:', error);
      alert(error instanceof Error ? error.message : 'Failed to reject opportunity');
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
    opportunity.profiles?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage and verify opportunities</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </button>
      </div>

      {/* Stats */}
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

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search opportunities..."
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
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={fetchOpportunities}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        opportunity.verification_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : opportunity.verification_status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {opportunity.verification_status.charAt(0).toUpperCase() + opportunity.verification_status.slice(1)}
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
                    {opportunity.verification_status === 'pending' && (
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

                {/* Expanded View */}
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
                                {opportunity.profiles?.company_name || 'Company name not set'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {opportunity.profiles?.industry || 'Industry not set'}
                              </p>
                            </div>
                          </div>

                          {opportunity.profiles?.website && (
                            <div className="flex items-center space-x-3">
                              <Globe size={20} className="text-gray-400" />
                              <a 
                                href={opportunity.profiles.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2B4B9B] hover:underline"
                              >
                                {opportunity.profiles.website}
                              </a>
                            </div>
                          )}

                          {opportunity.profiles?.contact_person_name && (
                            <div className="flex items-center space-x-3">
                              <Users size={20} className="text-gray-400" />
                              <div>
                                <p className="text-gray-900">{opportunity.profiles.contact_person_name}</p>
                                <p className="text-sm text-gray-500">
                                  {opportunity.profiles.contact_person_position || 'Position not set'}
                                </p>
                              </div>
                            </div>
                          )}

                          {opportunity.profiles?.contact_person_phone && (
                            <div className="flex items-center space-x-3">
                              <Phone size={20} className="text-gray-400" />
                              <p className="text-gray-900">{opportunity.profiles.contact_person_phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {opportunity.verification_status === 'pending' && (
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
    </div>
  );
}