import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Building2,
  FileText as FileIcon,
  CalendarRange,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import EventAnalytics from './EventAnalytics';
import Modal from '../../components/Modal';
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
  const [formData, setFormData] = useState<
    Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File }
  >({
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
  });
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'matches'>('opportunities');
  const [processingMatches, setProcessingMatches] = useState<
    Record<string, { accept: boolean; decline: boolean }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);
  const refreshCount = useRef(0);

  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, [EMAILJS_PUBLIC_KEY]);

  const fetchCategories = async () => {
    try {
      const cachedCategories = localStorage.getItem('categories');
      if (cachedCategories) {
        setCategories(JSON.parse(cachedCategories));
        return;
      }
      const { data, error } = await supabase.from('categories').select('id, name').limit(100);
      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return;
      }
      setCategories(data || []);
      localStorage.setItem('categories', JSON.stringify(data || []));
    } catch (error) {
      console.error('Error in fetchCategories:', error);
      toast.error('Failed to load categories');
      setError('Failed to load categories');
    }
  };

  const fetchOpportunities = async () => {
    if (!user) {
      setOpportunities([]);
      return true;
    }
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('creator_id', user.id)
        .limit(50); // Added pagination
      if (error) {
        console.error('Error fetching opportunities:', error);
        toast.error('Failed to load opportunities');
        throw error;
      }
      setOpportunities(data || []);
      return data.length === 0;
    } catch (error) {
      console.error('Error in fetchOpportunities:', error);
      setOpportunities([]);
      setError('Failed to load opportunities');
      throw error;
    }
  };

  const fetchMatches = async () => {
    if (!user) {
      setMatches([]);
      return;
    }
    try {
      const { data: creatorOpps, error: oppsError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('creator_id', user.id)
        .limit(50);
      if (oppsError) {
        console.error('Error checking opportunities:', oppsError);
        toast.error('Failed to load matches');
        throw oppsError;
      }
      if (!creatorOpps || creatorOpps.length === 0) {
        setMatches([]);
        return;
      }
      const oppIds = creatorOpps.map((opp) => opp.id);
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          opportunity_id,
          brand_id,
          meeting_link,
          meeting_scheduled_at,
          notes,
          profiles:brand_id (company_name, industry, contact_person_name, contact_person_phone, email),
          opportunities:opportunity_id (title)
        `)
        .in('opportunity_id', oppIds)
        .limit(100);
      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        toast.error('Failed to load matches');
        throw matchesError;
      }
      setMatches(matchesData as Match[] || []);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
      setMatches([]);
      setError('Failed to load matches');
      toast.error('Failed to load matches');
    }
  };

  useEffect(() => {
    if (!user) {
      setOpportunities([]);
      setMatches([]);
      setLoading(false);
      return;
    }
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    let channel: any;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (refreshCount.current >= 2) {
          setError('Failed to load data after multiple attempts');
          setLoading(false);
          isFetching.current = false;
          return;
        }

        timeoutId = setTimeout(() => {
          if (loading) {
            console.warn('Loading exceeded 2 seconds, refreshing page');
            refreshCount.current += 1;
            window.location.reload();
          }
        }, 2000);

        const [, isEmpty] = await Promise.all([fetchCategories(), fetchOpportunities()]);
        if (!isEmpty) {
          await fetchMatches();
          channel = supabase
            .channel('matches-changes')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'matches' },
              () => {
                fetchMatches();
              }
            )
            .subscribe((status: string, err: any) => {
              if (status === 'SUBSCRIBED') {
                console.log('Real-time subscription active');
              } else if (err) {
                console.error('Subscription error:', err);
              }
            });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
        isFetching.current = false;
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    fetchData();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      isFetching.current = false;
    };
  }, [user?.id]);

  const fetchBrandEmail = async (brandId: string): Promise<string> => {
    try {
      const response = await fetch(
        'https://urablfvmqregyvfyaovi.supabase.co/functions/v1/get-user-email ',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await supabase.auth.getSession().then(({ data }) => data.session?.access_token)}`,
          },
          body: JSON.stringify({ userId: brandId }),
        }
      );
      const data = await response.json();
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
        message: 'Your match has been approved! Please check your dashboard for more details.',
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send notification email');
    }
  };

  const updateMatchStatus = async (matchId: string, status: 'accepted' | 'rejected') => {
    const action = status === 'accepted' ? 'accept' : 'decline';
    if (processingMatches[matchId]?.[action]) return;
    setProcessingMatches((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [action]: true },
    }));
    try {
      const { data: currentMatch, error: checkError } = await supabase
        .from('matches')
        .select('id, status, brand_id, opportunity_id')
        .eq('id', matchId)
        .single();
      if (checkError) {
        throw new Error(`Failed to verify match: ${checkError.message}`);
      }
      if (!currentMatch) {
        throw new Error('Match not found');
      }
      if (currentMatch.status !== 'pending') {
        throw new Error(`Match is already ${currentMatch.status}`);
      }
      const { error: updateError } = await supabase
        .from('matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', matchId);
      if (updateError) {
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
          throw new Error('Failed to fetch opportunity title');
        }
        await sendApprovalEmail(brandEmail, opportunity.title);
      }
      await fetchMatches();
      toast.success(
        status === 'accepted'
          ? 'Match accepted successfully! The brand has been notified.'
          : 'Match declined successfully'
      );
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status} match. Please try again.`);
    } finally {
      setProcessingMatches((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], [action]: false },
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'price_min' || name === 'price_max') {
      setFormData({
        ...formData,
        price_range: {
          ...formData.price_range,
          [name === 'price_min' ? 'min' : 'max']: value === '' ? undefined : parseInt(value),
        },
      });
    } else if (name === 'reach') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : parseInt(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'media_files' | 'sponsorship_brochure_file'
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (field === 'media_files') {
        setFormData((prev) => ({
          ...prev,
          media_files: files,
        }));
        const previews = files.map((file) => URL.createObjectURL(file));
        setMediaPreviews(previews);
      } else {
        setFormData((prev) => ({
          ...prev,
          sponsorship_brochure_file: files[0],
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
          const fileBuffer = await file.arrayBuffer();
          const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, fileBuffer, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type,
            });
          if (error) {
            throw new Error(`Failed to upload media file ${file.name}: ${error.message}`);
          }
          const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
          if (!publicUrlData.publicUrl) {
            throw new Error('Failed to generate public URL');
          }
          return publicUrlData.publicUrl;
        });
        mediaUrls = await Promise.all(uploadPromises);
      }
      if (formData.sponsorship_brochure_file) {
        const file = formData.sponsorship_brochure_file;
        const fileName = `${Date.now()}_brochure_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `opportunities/${user.id}/${fileName}`;
        const fileBuffer = await file.arrayBuffer();
        const { data, error } = await supabase.storage
          .from('media')
          .upload(filePath, fileBuffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });
        if (error) {
          throw new Error(`Failed to upload sponsorship brochure ${file.name}: ${error.message}`);
        }
        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        if (!publicUrlData.publicUrl) {
          throw new Error('Failed to generate public URL');
        }
        sponsorshipBrochureUrl = publicUrlData.publicUrl;
      }
      const opportunityData = {
        ...formData,
        creator_id: user.id,
        verification_status: 'pending',
        reach: formData.reach ?? 0,
        price_range: {
          min: formData.price_range?.min ?? 0,
          max: formData.price_range?.max ?? 0,
        },
        media_urls: mediaUrls,
        sponsorship_brochure_url: sponsorshipBrochureUrl,
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
        const { error } = await supabase.from('opportunities').insert([opportunityData]);
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
      });
      setMediaPreviews([]);
      setShowForm(false);
      setIsEditing(false);
      setSelectedOpportunityId(null);
      fetchOpportunities();
    } catch (error: any) {
      toast.error(`Failed to save event: ${error.message}`);
      setError(`Failed to save event: ${error.message}`);
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
        max: opportunity.price_range?.max ?? undefined,
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
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
      toast.success('Event deleted successfully');
      fetchOpportunities();
    } catch (error: any) {
      toast.error('Failed to delete event');
      setError('Failed to delete event');
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
      toast.error('Failed to update event status');
      setError('Failed to update event status');
    }
  };

  const toggleMatchExpand = (opportunityId: string) => {
    setExpandedMatches({
      ...expandedMatches,
      [opportunityId]: !expandedMatches[opportunityId],
    });
  };

  const getMatchesForOpportunity = (opportunityId: string) => {
    return matches.filter((match) => match.opportunity_id === opportunityId);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleViewAnalytics = (opportunityId: string) => {
    setSelectedAnalyticsId(opportunityId);
    setShowAnalytics(true);
  };

  const generateGoogleCalendarLink = (match: Match) => {
    const event = {
      title: `Meeting for ${match.opportunities?.title || 'Opportunity'}`,
      description: `Meeting with brand and creator.
Join Meeting: ${match.meeting_link || ''}`,
      start: match.meeting_scheduled_at || new Date().toISOString(),
      end: match.meeting_scheduled_at
        ? new Date(new Date(match.meeting_scheduled_at).getTime() + 60 * 60 * 1000).toISOString()
        : new Date().toISOString(),
      location: match.meeting_link || '',
    };
    const formatDate = (date: string) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const startDate = formatDate(event.start);
    const endDate = formatDate(event.end);
    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render ');
    googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.append('text', event.title);
    googleCalendarUrl.searchParams.append('dates', `${startDate}/${endDate}`);
    googleCalendarUrl.searchParams.append('details', event.description);
    googleCalendarUrl.searchParams.append('location', event.location);
    return googleCalendarUrl.toString();
  };

  const filteredMatches = matches
    .filter((match) => {
      if (matchFilter === 'all') return true;
      return match.status === matchFilter;
    })
    .filter((match) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        match.profiles?.company_name?.toLowerCase().includes(searchLower) ||
        match.opportunities?.title?.toLowerCase().includes(searchLower) ||
        match.profiles?.industry?.toLowerCase().includes(searchLower)
      );
    });

  const pendingMatches = matches.filter((match) => match.status === 'pending');
  const acceptedMatches = matches.filter((match) => match.status === 'accepted');
  const rejectedMatches = matches.filter((match) => match.status === 'rejected');

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  if (error) {
    return (
      <div className="pb-14 sm:pb-0 text-center">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-red-800">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              refreshCount.current = 0;
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-14 sm:pb-0">
        <div className="flex justify-between items-center mb-6">
          <Skeleton width={200} height={24} />
          <Skeleton width={120} height={36} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <Skeleton height={20} width="60%" />
                <Skeleton height={36} width="40%" className="mt-4" />
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (showAnalytics && selectedAnalyticsId) {
    return (
      <div className="pb-14 sm:pb-0">
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
    <div className="pb-14 sm:pb-0">
      <Toaster />
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      {showForm ? (
        <div className="fixed inset-0 bg-white overflow-y-auto pb-14 sm:static sm:bg-transparent sm:overflow-visible">
          <div className="relative p-4 sm:p-6 pt-12 sm:pt-6 bg-white rounded-lg shadow-sm sm:mb-6">
            <button
              onClick={() => {
                setShowForm(false);
                setMediaPreviews([]);
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
              aria-label="Close form"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  required
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₹)</label>
                  <input
                    type="number"
                    name="price_min"
                    value={formData.price_range?.min ?? ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (₹)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
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
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          {formData.media_files![index].type.startsWith('image/') ? (
                            <img
                              src={preview}
                              alt={`Media preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ) : formData.media_files![index].type.startsWith('video/') ? (
                            <video
                              src={preview}
                              controls
                              className="w-full h-32 object-cover rounded-lg"
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
              <div style={{ display: 'none' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calendly Link</label>
                <input
                  type="url"
                  name="calendly_link"
                  value={formData.calendly_link}
                  onChange={handleInputChange}
                  placeholder="https://calendly.com/your-link "
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
                    <p className="text-sm text-gray-600">
                      Selected brochure: {formData.sponsorship_brochure_file.name}
                    </p>
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
              <div className="flex justify-end space-x-2 mt-6">
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
                  className={`px-4 py-2 ${
                    isSubmitting ? 'bg-gray-400' : 'bg-[#2B4B9B]'
                  } text-white rounded-lg hover:${isSubmitting ? '' : 'bg-[#1a2f61]'}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : isEditing ? (
                    'Update Event'
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className={showForm ? 'hidden sm:block' : ''}>
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
                });
                setMediaPreviews([]);
              }}
              className="flex items-center space-x-1 px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  {opportunities.filter((o) => o.status === 'active').length} active
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
                Brand Matches{' '}
                {pendingMatches.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    {pendingMatches.length} new
                  </span>
                )}
              </button>
            </div>
          </div>
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
                      <div
                        key={opportunity.id}
                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                            <div className="mb-4 sm:mb-0">
                              <div className="flex flex-wrap items-center mb-1">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mr-2">
                                  {opportunity.title}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    opportunity.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {opportunity.status === 'active' ? 'Active' : 'Paused'}
                                </span>
                                <span className="ml-2">
                                  {getVerificationStatusBadge(opportunity.verification_status)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {getCategoryName(opportunity.category_id)}
                              </p>
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
                                {opportunity.status === 'active' ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
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
                                This event is pending verification by our team. It will be visible to
                                brands once approved.
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600 truncate">
                                {opportunity.location}
                              </span>
                            </div>
                            {opportunity.start_date && (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
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
                                <Users className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600">
                                  {opportunity.reach.toLocaleString()} reach
                                </span>
                              </div>
                            )}
                            {opportunity.price_range && (
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
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
                                <a
                                  href={opportunity.sponsorship_brochure_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Sponsorship Brochure Available
                                </a>
                              </div>
                            )}
                          </div>
                          {opportunity.media_urls && opportunity.media_urls.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700">Media:</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {opportunity.media_urls.map((url, index) => (
                                  <div key={index} className="relative">
                                    {isVideoUrl(url) ? (
                                      <video
                                        src={url}
                                        controls
                                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded"
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Media ${index + 1}`}
                                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-gray-600 mb-4">{opportunity.description}</p>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex items-center mb-2 sm:mb-0">
                              <span className="text-sm font-medium text-gray-700 mr-2">
                                {opportunityMatches.length}{' '}
                                {opportunityMatches.length === 1 ? 'match' : 'matches'}
                              </span>
                              {opportunityMatches.length > 0 && (
                                <button
                                  onClick={() => toggleMatchExpand(opportunity.id)}
                                  className="text-[#2B4B9B] hover:text-[#1a2f61] text-sm flex items-center"
                                >
                                  {isExpanded ? 'Hide' : 'View'}{' '}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 ml-1" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 ml-1" />
                                  )}
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
                                <div
                                  key={match.id}
                                  className="bg-white p-3 rounded border border-gray-200"
                                >
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                    <div className="mb-2 sm:mb-0">
                                      <p className="font-medium">
                                        {match.profiles?.company_name || 'Unknown Company'}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Status:{' '}
                                        <span
                                          className={`font-medium ${
                                            match.status === 'pending'
                                              ? 'text-yellow-600'
                                              : match.status === 'accepted'
                                              ? 'text-green-600'
                                              : match.status === 'rejected'
                                              ? 'text-red-600'
                                              : 'text-gray-600'
                                          }`}
                                        >
                                          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                                        </span>
                                      </p>
                                      {match.profiles?.contact_person_name && (
                                        <p className="text-sm text-gray-600 truncate">
                                          Contact: {match.profiles.contact_person_name}
                                          {match.profiles.contact_person_phone &&
                                            ` (${match.profiles.contact_person_phone})`}
                                        </p>
                                      )}
                                      {match.profiles?.email && (
                                        <p className="text-sm text-gray-600 truncate">
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
                                            processingMatches[match.id]?.accept
                                              ? 'opacity-50 cursor-not-allowed'
                                              : ''
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
                                            processingMatches[match.id]?.decline
                                              ? 'opacity-50 cursor-not-allowed'
                                              : ''
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
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-0">Brand Matches</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={fetchMatches}
                    className="flex items-center px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search matches..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                    />
                  </div>
                  <div className="flex space-x-2">
                    {['all', 'pending', 'accepted', 'rejected'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setMatchFilter(filter as any)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                          matchFilter === filter
                            ? 'bg-[#2B4B9B] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {filter} {filter !== 'all' && `(${matches.filter((m) => m.status === filter).length})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {filteredMatches.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {searchQuery ? 'No matching results' : 'No matches yet'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? 'Try adjusting your search or filter criteria.'
                      : "When brands express interest in your events, they'll appear here."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredMatches.map((match) => (
                    <div
                      key={match.id}
                      className={`rounded-lg border shadow-sm transition-all duration-200 ${
                        match.status === 'pending'
                          ? 'border-yellow-200 bg-yellow-50/50'
                          : match.status === 'accepted'
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-gray-200 bg-gray-50/50 opacity-80'
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center mb-2">
                              <Building2 className="w-5 h-5 text-gray-500 mr-2" />
                              <h4 className="text-lg font-semibold text-gray-800">
                                {match.profiles?.company_name || 'Unknown Company'}
                              </h4>
                              <span
                                className={`ml-3 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                  match.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : match.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Event:</span>{' '}
                                {match.opportunities?.title || 'Unknown Event'}
                              </p>
                              {match.profiles?.industry && (
                                <p>
                                  <span className="font-medium">Industry:</span> {match.profiles.industry}
                                </p>
                              )}
                              {match.profiles?.contact_person_name && (
                                <p>
                                  <span className="font-medium">Contact:</span>{' '}
                                  {match.profiles.contact_person_name}
                                  {match.profiles.contact_person_phone &&
                                    ` (${match.profiles.contact_person_phone})`}
                                </p>
                              )}
                              {match.profiles?.email && (
                                <p>
                                  <span className="font-medium">Email:</span> {match.profiles.email}
                                </p>
                              )}
                              <p>
                                <span className="font-medium">
                                  {match.status === 'pending' ? 'Received' : 'Updated'}:
                                </span>{' '}
                                {new Date(
                                  match.status === 'pending' ? match.created_at : match.updated_at
                                ).toLocaleDateString()}
                              </p>
                              {match.meeting_scheduled_at && match.status === 'accepted' && (
                                <p className="flex items-center">
                                  <CalendarRange className="w-4 h-4 mr-1" />
                                  <span>
                                    Meeting: {new Date(match.meeting_scheduled_at).toLocaleString()}
                                  </span>
                                </p>
                              )}
                              {match.notes && match.status === 'accepted' && (
                                <p className="flex items-start">
                                  <FileIcon className="w-4 h-4 mr-1 mt-1" />
                                  <span>
                                    <span className="font-medium">Notes:</span> {match.notes}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            {match.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => updateMatchStatus(match.id, 'accepted')}
                                  disabled={processingMatches[match.id]?.accept}
                                  className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-400 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                                >
                                  {processingMatches[match.id]?.accept ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  onClick={() => updateMatchStatus(match.id, 'rejected')}
                                  disabled={processingMatches[match.id]?.decline}
                                  className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                                >
                                  {processingMatches[match.id]?.decline ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4 mr-2" />
                                  )}
                                  Decline
                                </button>
                              </>
                            ) : match.status === 'accepted' && match.meeting_link && match.meeting_scheduled_at ? (
                              <>
                                <a
                                  href={match.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-200 text-[#2B4B9B] rounded-lg hover:bg-blue-400 transition-colors"
                                >
                                  <LinkIcon className="w-4 h-4 mr-2" />
                                  Join Meeting
                                </a>
                                <a
                                  href={generateGoogleCalendarLink(match)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Add to Calendar
                                </a>
                              </>
                            ) : match.status === 'accepted' ? (
                              <span className="text-sm text-gray-600 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Meeting to be scheduled
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
          Pending Verification
        </span>
      );
    case 'approved':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Verified</span>
      );
    case 'rejected':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Rejected</span>
      );
    default:
      return null;
  }
}

const styleSheet = document.createElement('style');
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