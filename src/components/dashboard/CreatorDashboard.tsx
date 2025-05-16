import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import EventAnalytics from './EventAnalytics';
import emailjs from '@emailjs/browser';
import type { Database } from '../../lib/database.types';
import EventForm from './CreatorDashboard/EventForm';
import EventCard from './CreatorDashboard/EventCard';
import MatchList from './CreatorDashboard/MatchList';
import StatsCards from './CreatorDashboard/StatsCards';
import Tabs from './CreatorDashboard/Tabs';
import MatchFilter from './CreatorDashboard/MatchFilter';
import Modal from '../../components/Modal';
import { PlusCircle, ChevronDown } from 'lucide-react';

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
        console.error('Error fetching categories:', error.message);
        throw new Error('Failed to load categories');
      }
      setCategories(data || []);
      localStorage.setItem('categories', JSON.stringify(data || []));
    } catch (error) {
      console.error('Error in fetchCategories:', error);
      throw error;
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
        .limit(50);
      if (error) {
        console.error('Error fetching opportunities:', error.message);
        throw new Error('Failed to load opportunities');
      }
      setOpportunities(data || []);
      return data.length === 0;
    } catch (error) {
      console.error('Error in fetchOpportunities:', error);
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
        console.error('Error checking opportunities:', oppsError.message);
        throw new Error('Failed to load matches');
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
        console.error('Error fetching matches:', matchesError.message);
        throw new Error('Failed to load matches');
      }
      setMatches(matchesData as Match[] || []);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) {
      setOpportunities([]);
      setMatches([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    let channel: any;

    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchCategories(), fetchOpportunities(), fetchMatches()]);
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
      } catch (error: any) {
        console.error('Error fetching data:', error.message);
        toast.error('Failed to load dashboard data');
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    fetchData();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      isFetching.current = false;
    };
  }, [user?.id]);

  const fetchBrandEmail = async (brandId: string): Promise<string> => {
    try {
      const response = await fetch(
        'https://urablfvmqregyvfyaovi.supabase.co/functions/v1/get-user-email',
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
        [matchId]: {
          accept: action === 'accept' ? false : prev[matchId]?.accept ?? false,
          decline: action === 'decline' ? false : prev[matchId]?.decline ?? false,
        },
      }));
    }
  };

  const handleSubmit = async (formData: Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File }) => {
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
        toast.success('Opportunity updated successfully');
      } else {
        const { error } = await supabase.from('opportunities').insert([opportunityData]);
        if (error) throw error;
        toast.success('Opportunity created successfully');
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
      toast.error(`Failed to save opportunity: ${error.message}`);
      setError(`Failed to save opportunity: ${error.message}`);
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
      toast.success('Opportunity deleted successfully');
      fetchOpportunities();
    } catch (error: any) {
      toast.error('Failed to delete opportunity');
      setError('Failed to delete opportunity');
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const toggleOpportunityStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Opportunity ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      fetchOpportunities();
    } catch (error: any) {
      toast.error('Failed to update Opportunity status');
      setError('Failed to update Opportunity status');
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
      description: `Meeting with brand and creator.\nJoin Meeting: ${match.meeting_link || ''}`,
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
    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.append('text', event.title);
    googleCalendarUrl.searchParams.append('dates', `${startDate}/${endDate}`);
    googleCalendarUrl.searchParams.append('details', event.description);
    googleCalendarUrl.searchParams.append('location', event.location);
    return googleCalendarUrl.toString();
  };

  const pendingMatches = matches.filter((match) => match.status === 'pending');
  const acceptedMatches = matches.filter((match) => match.status === 'accepted');
  const rejectedMatches = matches.filter((match) => match.status === 'rejected');

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
        <StatsCards loading={true} />
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
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTargetId) handleDelete(deleteTargetId);
        }}
        title="Confirm Deletion"
        message="Are you sure you want to delete this Opportunity? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      {showForm ? (
        <EventForm
          formData={formData}
          setFormData={setFormData}
          mediaPreviews={mediaPreviews}
          setMediaPreviews={setMediaPreviews}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setMediaPreviews([]);
          }}
        />
      ) : (
        <div className={showForm ? 'hidden sm:block' : ''}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Opportunity Dashboard</h1>
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
              <span>Create Opportunity</span>
            </button>
          </div>
          <StatsCards
            opportunities={opportunities}
            pendingMatches={pendingMatches}
            acceptedMatches={acceptedMatches}
            rejectedMatches={rejectedMatches}
            loading={false}
          />
          <Tabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingMatchesCount={pendingMatches.length}
          />
          {activeTab === 'opportunities' && (
            <>
              {opportunities.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <PlusCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">No Opportunity yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first Opportunity to start connecting with brands.
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
                  >
                    Create Opportunity
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {opportunities.map((opportunity) => (
                    <EventCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      matches={getMatchesForOpportunity(opportunity.id)}
                      isExpanded={expandedMatches[opportunity.id] || false}
                      categories={categories}
                      onEdit={() => handleEdit(opportunity)}
                      onDelete={() => handleDelete(opportunity.id)}
                      onToggleStatus={() =>
                        toggleOpportunityStatus(opportunity.id, opportunity.status)
                      }
                      onToggleExpand={() => toggleMatchExpand(opportunity.id)}
                      onViewAnalytics={() => handleViewAnalytics(opportunity.id)}
                      onUpdateMatchStatus={updateMatchStatus}
                      processingMatches={processingMatches}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {activeTab === 'matches' && (
            <MatchList
              matches={matches}
              matchFilter={matchFilter}
              searchQuery={searchQuery}
              onUpdateMatchStatus={updateMatchStatus}
              processingMatches={processingMatches}
              onRefresh={fetchMatches}
              onFilterChange={setMatchFilter}
              onSearchChange={setSearchQuery}
              generateGoogleCalendarLink={generateGoogleCalendarLink}
            />
          )}
        </div>
      )}
    </div>
  );
}