import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Link as LinkIcon,
  BarChart3,
  Clock,
  Filter,
  Search,
  Settings,
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
import toast, { Toaster } from 'react-hot-toast';
import EventAnalytics from './EventAnalytics';
import Modal from '../../components/Modal'; // Import the new Modal component
import type { Database } from '../../lib/database.types';
import emailjs from '@emailjs/browser';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  opportunities?: Database['public']['Tables']['opportunities']['Row'];
};

interface BrandDashboardProps {
  onUpdateProfile: () => void;
}

export default function CreatorDashboard({ onUpdateProfile }: BrandDashboardProps) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File }>({
    title: '',
    description: '',
    location: '',
    category_id: '',
    reach: undefined,
    price_range: { min: undefined, max: undefined },
    requirements: '',
    benefits: '',
    media_urls: [],
    start_date: '',
    end_date: '',
    status: 'active',
    calendly_link: '',
    sponsorship_brochure_url: '',
    verification_status: 'pending'
  });
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'matches'>('opportunities');
  const [processingMatches, setProcessingMatches] = useState<Record<string, { accept: boolean; decline: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, [EMAILJS_PUBLIC_KEY]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      return;
    }
    setCategories(data || []);
  };

  const fetchOpportunities = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('creator_id', user.id);
    if (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Failed to load opportunities');
      return;
    }
    setOpportunities(data || []);
    setLoading(false);
  };

  const fetchMatches = async () => {
    if (!user) return;
    try {
      const { data: creatorOpps, error: oppsError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('creator_id', user.id);
      if (oppsError) {
        console.error('Error fetching creator opportunities:', oppsError);
        throw new Error(`Failed to fetch opportunities: ${oppsError.message}`);
      }
      if (!creatorOpps || creatorOpps.length === 0) {
        setMatches([]);
        return;
      }
      const oppIds = creatorOpps.map(opp => opp.id);
      console.log('Fetching matches for opportunity IDs:', oppIds);
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          profiles:brand_id (*),
          opportunities:opportunity_id (*)
        `)
        .in('opportunity_id', oppIds);
      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        throw new Error(`Failed to fetch matches: ${matchesError.message}`);
      }
      console.log('Fetched matches:', matchesData);
      setMatches(matchesData as Match[] || []);
    } catch (error: any) {
      console.error('Error fetching matches:', error.message);
      toast.error('Failed to load matches');
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchOpportunities();
      fetchMatches();
      const channel = supabase
        .channel('matches-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            console.log('Matches table changed, refreshing matches');
            fetchMatches();
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchBrandEmail = async (brandId: string): Promise<string> => {
    try {
      console.log('Fetching email for brandId:', brandId);
      const response = await fetch('https://urablfvmqregyvfyaovi.supabase.co/functions/v1/get-user-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(({ data }) => data.session?.access_token)}`
        },
        body: JSON.stringify({ userId: brandId })
      });
      const data = await response.json();
      console.log('Edge function response:', data);
      if (data.error || !data.email) {
        throw new Error(data.error || 'Failed to fetch brand email');
      }
      return data.email;
    } catch (error) {
      console.error('Error fetching brand email:', error);
      throw error;
    }
  };

  const sendApprovalEmail = async (brandEmail: string, opportunityTitle: string) => {
    try {
      const templateParams = {
        to_email: brandEmail,
        opportunity_title: opportunityTitle,
        message: 'Your match has been approved! Please check your dashboard for more details.'
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log('Email sent successfully to', brandEmail);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send notification email');
    }
  };

  const updateMatchStatus = async (matchId: string, status: 'accepted' | 'rejected') => {
    const action = status === 'accepted' ? 'accept' : 'decline';
    if (processingMatches[matchId]?.[action]) return;
    setProcessingMatches(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [action]: true }
    }));
    try {
      const { data: currentMatch, error: checkError } = await supabase
        .from('matches')
        .select('id, status, brand_id, opportunity_id')
        .eq('id', matchId)
        .single();
      if (checkError) {
        console.error('Match check error:', checkError);
        throw new Error(`Failed to verify match: ${checkError.message}`);
      }
      if (!currentMatch) {
        console.error('No match found for ID:', matchId);
        throw new Error('Match not found');
      }
      if (currentMatch.status !== 'pending') {
        console.error('Match is not pending:', currentMatch.status);
        throw new Error(`Match is already ${currentMatch.status}`);
      }
      const { error: updateError } = await supabase
        .from('matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', matchId);
      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update match: ${updateError.message}`);
      }
      if (status === 'accepted') {
        const brandEmail = await fetchBrandEmail(currentMatch.brand_id);
        const { data: opportunity, error: oppError } = await supabase
          .from('opportunities')
          .select('title')
          .eq('id', currentMatch.opportunity_id)
          .single();
        if (oppError || !opportunity) {
          console.error('Error fetching opportunity:', oppError);
          throw new Error('Failed to fetch opportunity title');
        }
        await sendApprovalEmail(brandEmail, opportunity.title);
      }
      await fetchMatches();
      toast.success(
        status === 'accepted'
          ? 'Match accepted successfully! The brand has been notified.'
          : 'Match declined successfully',
        { duration: 4000 }
      );
    } catch (error: any) {
      console.error('Error updating match status:', error.message);
      toast.error(error.message || `Failed to ${status} match. Please try again.`, {
        duration: 4000,
      });
    } finally {
      setProcessingMatches(prev => ({
        ...prev,
        [matchId]: { ...prev[matchId], [action]: false }
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price_min' || name === 'price_max') {
      setFormData({
        ...formData,
        price_range: {
          ...formData.price_range as any,
          [name === 'price_min' ? 'min' : 'max']: value === '' ? undefined : parseInt(value)
        }
      });
    } else if (name === 'reach') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : parseInt(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'media_files' | 'sponsorship_brochure_file') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        console.log(`Selected ${field === 'media_files' ? 'media' : 'sponsorship brochure'} file:`, file.name, 'size:', file.size, 'type:', file.type);
      });
      if (field === 'media_files') {
        setFormData(prev => ({
          ...prev,
          media_files: files
        }));
        const previews = files.map(file => URL.createObjectURL(file));
        setMediaPreviews(previews);
      } else {
        setFormData(prev => ({
          ...prev,
          sponsorship_brochure_file: files[0]
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      let mediaUrls: string[] = formData.media_urls || [];
      let sponsorshipBrochureUrl: string | undefined;

      if (formData.media_files && formData.media_files.length > 0) {
        const uploadPromises = formData.media_files.map(async (file) => {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = `opportunities/${user.id}/${fileName}`;
          console.log('Uploading media file:', file.name, 'to path:', filePath);
          const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
          });
          const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, fileBuffer, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            });
          if (error) {
            console.error('Upload error details:', error);
            throw new Error(`Failed to upload media file ${file.name}: ${error.message}`);
          }
          console.log('Media upload successful, data:', data);
          const { data: publicUrlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);
          if (!publicUrlData.publicUrl) {
            console.error('No public URL generated for path:', filePath);
            throw new Error('Failed to generate public URL');
          }
          console.log('Generated public URL for media:', publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        });
        mediaUrls = await Promise.all(uploadPromises);
        console.log('All media URLs:', mediaUrls);
      }

      if (formData.sponsorship_brochure_file) {
        const file = formData.sponsorship_brochure_file;
        const fileName = `${Date.now()}_brochure_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `opportunities/${user.id}/${fileName}`;
        console.log('Uploading sponsorship brochure:', file.name, 'to path:', filePath);
        const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(file);
        });
        const { data, error } = await supabase.storage
          .from('media')
          .upload(filePath, fileBuffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });
        if (error) {
          console.error('Upload error details:', error);
          throw new Error(`Failed to upload sponsorship brochure ${file.name}: ${error.message}`);
        }
        console.log('Sponsorship brochure upload successful, data:', data);
        const { data: publicUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        if (!publicUrlData.publicUrl) {
          console.error('No public URL generated for path:', filePath);
          throw new Error('Failed to generate public URL');
        }
        console.log('Generated public URL for brochure:', publicUrlData.publicUrl);
        sponsorshipBrochureUrl = publicUrlData.publicUrl;
      }

      const opportunityData = {
        ...formData,
        creator_id: user.id,
        verification_status: 'pending',
        reach: formData.reach ?? 0,
        price_range: {
          min: formData.price_range?.min ?? 0,
          max: formData.price_range?.max ?? 0
        },
        media_urls: mediaUrls,
        sponsorship_brochure_url: sponsorshipBrochureUrl
      };
      delete opportunityData.media_files;
      delete opportunityData.sponsorship_brochure_file;

      if (isEditing && selectedOpportunityId) {
        const { error } = await supabase
          .from('opportunities')
          .update(opportunityData)
          .eq('id', selectedOpportunityId);
        if (error) throw error;
        toast.success('Event updated successfully');
      } else {
        const { error } = await supabase
          .from('opportunities')
          .insert([opportunityData]);
        if (error) throw error;
        toast.success('Event created successfully');
      }
      
      setFormData({
        title: '',
        description: '',
        location: '',
        category_id: '',
        reach: undefined,
        price_range: { min: undefined, max: undefined },
        requirements: '',
        benefits: '',
        media_urls: [],
        start_date: '',
        end_date: '',
        status: 'active',
        calendly_link: '',
        sponsorship_brochure_url: '',
        verification_status: 'pending',
        media_files: undefined,
        sponsorship_brochure_file: undefined
      });
      setMediaPreviews([]);
      setShowForm(false);
      setIsEditing(false);
      setSelectedOpportunityId(null);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error saving opportunity:', error.message);
      toast.error(`Failed to save event: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setFormData({
      title: opportunity.title,
      description: opportunity.description,
      location: opportunity.location,
      category_id: opportunity.category_id,
      reach: opportunity.reach ?? undefined,
      price_range: {
        min: opportunity.price_range?.min ?? undefined,
        max: opportunity.price_range?.max ?? undefined
      },
      requirements: opportunity.requirements || '',
      benefits: opportunity.benefits || '',
      media_urls: opportunity.media_urls || [],
      start_date: opportunity.start_date || '',
      end_date: opportunity.end_date || '',
      status: opportunity.status,
      calendly_link: opportunity.calendly_link || '',
      sponsorship_brochure_url: opportunity.sponsorship_brochure_url || '',
      verification_status: opportunity.verification_status,
      media_files: undefined,
      sponsorship_brochure_file: undefined
    });
    setMediaPreviews([]);
    setIsEditing(true);
    setSelectedOpportunityId(opportunity.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!showDeleteModal) {
      setDeleteTargetId(id);
      setShowDeleteModal(true);
      return;
    }
    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Event deleted successfully');
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error deleting opportunity:', error.message);
      toast.error('Failed to delete event');
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      handleDelete(deleteTargetId);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const toggleOpportunityStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Event ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error updating opportunity status:', error.message);
      toast.error('Failed to update event status');
    }
  };

  const toggleMatchExpand = (opportunityId: string) => {
    setExpandedMatches({
      ...expandedMatches,
      [opportunityId]: !expandedMatches[opportunityId]
    });
  };

  const getMatchesForOpportunity = (opportunityId: string) => {
    return matches.filter(match => match.opportunity_id === opportunityId);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleViewAnalytics = (opportunityId: string) => {
    setSelectedAnalyticsId(opportunityId);
    setShowAnalytics(true);
  };

  const pendingMatches = matches.filter(match => match.status === 'pending');
  const acceptedMatches = matches.filter(match => match.status === 'accepted');
  const rejectedMatches = matches.filter(match => match.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2B4B9B]"></div>
      </div>
    );
  }

  if (showAnalytics && selectedAnalyticsId) {
    return (
      <div>
        <button
          onClick={() => {
            setShowAnalytics(false);
            setSelectedAnalyticsId(null);
          }}
          className="mb-4 flex items-center text-[#2B4B9B] hover:text-[#1a2f61]"
        >
          <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
          Back to opportunities
        </button>
        <EventAnalytics opportunityId={selectedAnalyticsId} />
      </div>
    );
  }

  return (
    <div>
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Event Dashboard</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            setSelectedOpportunityId(null);
            setFormData({
              title: '',
              description: '',
              location: '',
              category_id: '',
              reach: undefined,
              price_range: { min: undefined, max: undefined },
              requirements: '',
              benefits: '',
              media_urls: [],
              start_date: '',
              end_date: '',
              status: 'active',
              calendly_link: '',
              sponsorship_brochure_url: '',
              verification_status: 'pending',
              media_files: undefined,
              sponsorship_brochure_file: undefined
            });
            setMediaPreviews([]);
          }}
          className="flex items-center space-x-1 px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Total Events</h3>
            <div className="p-2 bg-blue-100 rounded-full">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{opportunities.length}</p>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-500">
              {opportunities.filter(o => o.status === 'active').length} active
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Pending Matches</h3>
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pendingMatches.length}</p>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-500">Awaiting your response</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Accepted Matches</h3>
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{acceptedMatches.length}</p>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-500">Confirmed partnerships</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Rejected Matches</h3>
            <div className="p-2 bg-red-100 rounded-full">
              <X className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{rejectedMatches.length}</p>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-500">Declined partnerships</span>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-2 px-1 -mb-px font-medium text-sm ${
              activeTab === 'opportunities'
                ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Your Events
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 px-1 -mb-px font-medium text-sm ${
              activeTab === 'matches'
                ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Brand Matches {pendingMatches.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {pendingMatches.length} new
              </span>
            )}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                required
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reach (Audience Size)
                </label>
                <input
                  type="number"
                  name="reach"
                  value={formData.reach ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price (₹)
                </label>
                <input
                  type="number"
                  name="price_min"
                  value={formData.price_range?.min ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  name="price_max"
                  value={formData.price_range?.max ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benefits
              </label>
              <textarea
                name="benefits"
                value={formData.benefits}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Media Files (Images/Videos)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileChange(e, 'media_files')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload images or videos that showcase your event (max 5 files, up to 10MB each)
              </p>
              {formData.media_files && formData.media_files.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Selected files:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {formData.media_files.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        {formData.media_files![index].type.startsWith('image/') ? (
                          <img
                            src={preview}
                            alt={`Media preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => console.error('Error loading preview:', preview)}
                          />
                        ) : formData.media_files![index].type.startsWith('video/') ? (
                          <video
                            src={preview}
                            controls
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => console.error('Error loading video preview:', preview)}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500">Unsupported file type</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {isSubmitting && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#2B4B9B] h-2.5 rounded-full animate-indeterminate"></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{display:"none"}}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calendly Link
              </label>
              <input
                type="url"
                name="calendly_link"
                value={formData.calendly_link}
                onChange={handleInputChange}
                placeholder="https://calendly.com/your-link"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add your Calendly link for brands to schedule meetings with you
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Sponsorship Brochure (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, 'sponsorship_brochure_file')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a PDF of your sponsorship brochure (up to 10MB)
              </p>
              {formData.sponsorship_brochure_file && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Selected brochure: {formData.sponsorship_brochure_file.name}</p>
                  {isSubmitting && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#2B4B9B] h-2.5 rounded-full animate-indeterminate"></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMediaPreviews([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 ${isSubmitting ? 'bg-gray-400' : 'bg-[#2B4B9B]'} text-white rounded-lg hover:${isSubmitting ? '' : 'bg-[#1a2f61]'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </span>
                ) : isEditing ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <>
          {opportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <PlusCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first event to start connecting with brands.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {opportunities.map((opportunity) => {
                const opportunityMatches = getMatchesForOpportunity(opportunity.id);
                const isExpanded = expandedMatches[opportunity.id] || false;
                return (
                  <div key={opportunity.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center mb-1">
                            <h3 className="text-xl font-bold text-gray-800 mr-2">{opportunity.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              opportunity.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {opportunity.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                            <span className="ml-2">
                              {getVerificationStatusBadge(opportunity.verification_status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{getCategoryName(opportunity.category_id)}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewAnalytics(opportunity.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleOpportunityStatus(opportunity.id, opportunity.status)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            title={opportunity.status === 'active' ? 'Pause Event' : 'Activate Event'}
                            disabled={opportunity.verification_status !== 'approved'}
                          >
                            {opportunity.status === 'active' ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleEdit(opportunity)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            title="Edit Event"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(opportunity.id)}
                            className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                            title="Delete Event"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {opportunity.verification_status === 'pending' && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                          <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                          <p className="text-sm text-yellow-700">
                            This event is pending verification by our team. It will be visible to brands once approved.
                          </p>
                        </div>
                      )}

                      {opportunity.verification_status === 'rejected' && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-red-700 font-medium">
                              This event was rejected during verification.
                            </p>
                            {opportunity.rejection_reason && (
                              <p className="text-sm text-red-700 mt-1">
                                Reason: {opportunity.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-600">{opportunity.location}</span>
                        </div>
                        
                        {opportunity.start_date && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-600">
                              {opportunity.end_date &&
                              new Date(opportunity.start_date).toDateString() ===
                              new Date(opportunity.end_date).toDateString()
                                ? new Date(opportunity.start_date).toLocaleDateString()
                                : `${new Date(opportunity.start_date).toLocaleDateString()}${
                                    opportunity.end_date
                                      ? ` - ${new Date(opportunity.end_date).toLocaleDateString()}`
                                      : ''
                                  }`}
                            </span>
                          </div>
                        )}
                        
                        {opportunity.reach && (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-600">{opportunity.reach.toLocaleString()} reach</span>
                          </div>
                        )}
                        
                        {opportunity.price_range && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-600">
                              {typeof opportunity.price_range === 'object' 
                                ? `₹${opportunity.price_range.min} - ₹${opportunity.price_range.max}`
                                : 'Contact for pricing'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {opportunity.calendly_link && (
                          <div className="flex items-center text-sm text-[#2B4B9B]">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>Calendly Link Available</span>
                          </div>
                        )}
                        
                        {opportunity.sponsorship_brochure_url && (
                          <div className="flex items-center text-sm text-[#2B4B9B]">
                            <LinkIcon className="w-4 h-4 mr-1" />
                            <a href={opportunity.sponsorship_brochure_url} target="_blank" rel="noopener noreferrer" className="underline">
                              Sponsorship Brochure Available
                            </a>
                          </div>
                        )}
                      </div>
                      {opportunity.media_urls && opportunity.media_urls.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Media:</h4>
                          <div className="flex gap-2 mt-2">
                            {opportunity.media_urls.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="w-24 h-24 object-cover rounded"
                                onError={(e) => console.error('Error loading image:', url)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-gray-600 mb-4">{opportunity.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 mr-2">
                            {opportunityMatches.length} {opportunityMatches.length === 1 ? 'match' : 'matches'}
                          </span>
                          {opportunityMatches.length > 0 && (
                            <button
                              onClick={() => toggleMatchExpand(opportunity.id)}
                              className="text-[#2B4B9B] hover:text-[#1a2f61] text-sm flex items-center"
                            >
                              {isExpanded ? 'Hide' : 'View'} 
                              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && opportunityMatches.length > 0 && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-2">Matches</h4>
                        <div className="space-y-3">
                          {opportunityMatches.map((match) => (
                            <div key={match.id} className="bg-white p-3 rounded border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{match.profiles?.company_name || 'Unknown Company'}</p>
                                  <p className="text-sm text-gray-600">
                                    Status: <span className={`font-medium ${
                                      match.status === 'pending' ? 'text-yellow-600' :
                                      match.status === 'accepted' ? 'text-green-600' :
                                      match.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                                    </span>
                                  </p>
                                  {match.profiles?.contact_person_name && (
                                    <p className="text-sm text-gray-600">
                                      Contact: {match.profiles.contact_person_name}
                                      {match.profiles.contact_person_phone && ` (${match.profiles.contact_person_phone})`}
                                    </p>
                                  )}
                                  {match.profiles?.email && (
                                    <p className="text-sm text-gray-600">
                                      Email: {match.profiles.email}
                                    </p>
                                  )}
                                </div>
                                
                                {match.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => updateMatchStatus(match.id, 'accepted')}
                                      disabled={processingMatches[match.id]?.accept}
                                      className={`p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 ${
                                        processingMatches[match.id]?.accept ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title="Accept Match"
                                    >
                                      {processingMatches[match.id]?.accept ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => updateMatchStatus(match.id, 'rejected')}
                                      disabled={processingMatches[match.id]?.decline}
                                      className={`p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 ${
                                        processingMatches[match.id]?.decline ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title="Reject Match"
                                    >
                                      {processingMatches[match.id]?.decline ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <X className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'matches' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Brand Matches</h2>
          <button
            onClick={fetchMatches}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Matches
          </button>
          
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No matches yet</h3>
              <p className="text-gray-500">
                When brands express interest in your events, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingMatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    Pending Response
                  </h3>
                  <div className="space-y-3">
                    {pendingMatches.map(match => (
                      <div key={match.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-800">{match.profiles?.company_name || 'Unknown Company'}</h4>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Pending
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Interested in: <span className="font-medium">{match.opportunities?.title || 'Unknown Event'}</span>
                            </p>
                            {match.profiles?.industry && (
                              <p className="text-sm text-gray-600">Industry: {match.profiles.industry}</p>
                            )}
                            {match.profiles?.contact_person_name && (
                              <p className="text-sm text-gray-600">
                                Contact: {match.profiles.contact_person_name}
                                {match.profiles.contact_person_phone && ` (${match.profiles.contact_person_phone})`}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              Received: {new Date(match.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateMatchStatus(match.id, 'accepted')}
                              disabled={processingMatches[match.id]?.accept}
                              className={`px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center ${
                                processingMatches[match.id]?.accept ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {processingMatches[match.id]?.accept ? (
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => updateMatchStatus(match.id, 'rejected')}
                              disabled={processingMatches[match.id]?.decline}
                              className={`px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center ${
                                processingMatches[match.id]?.decline ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {processingMatches[match.id]?.decline ? (
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <X className="w-4 h-4 mr-1" />
                              )}
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acceptedMatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Accepted Matches
                  </h3>
                  <div className="space-y-3">
                    {acceptedMatches.map(match => (
                      <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-800">{match.profiles?.company_name || 'Unknown Company'}</h4>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Accepted
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Event: <span className="font-medium">{match.opportunities?.title || 'Unknown Event'}</span>
                            </p>
                            {match.profiles?.industry && (
                              <p className="text-sm text-gray-600">Industry: {match.profiles.industry}</p>
                            )}
                            {match.profiles?.contact_person_name && (
                              <p className="text-sm text-gray-600">
                                Contact: {match.profiles.contact_person_name}
                                {match.profiles.contact_person_phone && ` (${match.profiles.contact_person_phone})`}
                              </p>
                            )}
                            {match.meeting_scheduled_at && (
                              <p className="text-sm text-gray-600">
                                Meeting: {new Date(match.meeting_scheduled_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div>
                            {match.meeting_link ? (
                              <a 
                                href={match.meeting_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center"
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Join Meeting
                              </a>
                            ) : (
                              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Schedule Meeting
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejectedMatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                    Declined Matches
                  </h3>
                  <div className="space-y-3">
                    {rejectedMatches.map(match => (
                      <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4 opacity-70">
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-800">{match.profiles?.company_name || 'Unknown Company'}</h4>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                                Declined
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Event: <span className="font-medium">{match.opportunities?.title || 'Unknown Event'}</span>
                            </p>
                            {match.profiles?.industry && (
                              <p className="text-sm text-gray-600">Industry: {match.profiles.industry}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              Declined on: {new Date(match.updated_at).toLocaleDateString()}
                            </p>
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

function getVerificationStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending Verification</span>;
    case 'approved':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Verified</span>;
    case 'rejected':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Rejected</span>;
    default:
      return null;
  }
}

// Add CSS for indeterminate progress animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes indeterminate {
    0% {
      left: -35%;
      right: 100%;
    }
    60% {
      left: 100%;
      right: -90%;
    }
    100% {
      left: 100%;
      right: -90%;
    }
  }
  .animate-indeterminate {
    position: relative;
    width: 35%;
    animation: indeterminate 2s infinite linear;
  }
`;
document.head.appendChild(styleSheet);