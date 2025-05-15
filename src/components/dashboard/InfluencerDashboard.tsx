import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  Hash,
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
  Search,
  RefreshCw,
  Building2,
  FileText as FileIcon,
  CalendarRange,
  Video,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from '../../components/Modal';
import type { Database } from '../../lib/database.types';
import emailjs from '@emailjs/browser';

type Post = Database['public']['Tables']['posts']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  posts?: Database['public']['Tables']['posts']['Row'];
};

interface InfluencerDashboardProps {
  onUpdateProfile: () => void;
}

export default function InfluencerDashboard({ onUpdateProfile }: InfluencerDashboardProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<
    Partial<Post> & { video_file?: File }
  >({
    title: '',
    description: '',
    hashtags: '',
    category_id: '',
    reach: undefined,
    price_range: { min: undefined, max: undefined },
    video_url: '',
    status: 'active',
    verification_status: 'pending',
  });
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'matches'>('posts');
  const [processingMatches, setProcessingMatches] = useState<
    Record<string, { accept: boolean; decline: boolean }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, [EMAILJS_PUBLIC_KEY]);

  const fetchCategories = async () => {
    const cachedCategories = localStorage.getItem('categories');
    if (cachedCategories) {
      setCategories(JSON.parse(cachedCategories));
      return;
    }
    const { data, error } = await supabase.from('categories').select('id, name').limit(100);
    if (error) {
      toast.error('Failed to load categories');
      return;
    }
    setCategories(data || []);
    localStorage.setItem('categories', JSON.stringify(data || []));
  };

  const fetchPosts = async () => {
    if (!user) return true;
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('influencer_id', user.id)
      .limit(1);
    if (error) {
      toast.error('Failed to load posts');
      throw error;
    }
    if (data.length === 0) {
      setPosts([]);
      return true;
    }
    const { data: fullData, error: fullError } = await supabase
      .from('posts')
      .select('*')
      .eq('influencer_id', user.id);
    if (fullError) {
      toast.error('Failed to load posts');
      throw fullError;
    }
    setPosts(fullData || []);
    return false;
  };

  const fetchMatches = async () => {
    if (!user) return;
    const { data: influencerPosts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('influencer_id', user.id)
      .limit(1);
    if (postsError) {
      toast.error('Failed to load matches');
      throw postsError;
    }
    if (!influencerPosts || influencerPosts.length === 0) {
      setMatches([]);
      return;
    }
    const postIds = influencerPosts.map((post) => post.id);
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        post_id,
        brand_id,
        meeting_link,
        meeting_scheduled_at,
        notes,
        profiles:brand_id (company_name, industry, contact_person_name, contact_person_phone, email),
        posts:post_id (title)
      `)
      .in('post_id', postIds);
    if (matchesError) {
      toast.error('Failed to load matches');
      throw matchesError;
    }
    setMatches(matchesData as Match[] || []);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let channel;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [_, isEmpty] = await Promise.all([fetchCategories(), fetchPosts()]);
        if (isEmpty) {
          setLoading(false);
          return;
        }
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
          .subscribe();
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

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
      toast.error('Failed to fetch brand email');
      throw error;
    }
  };

  const sendApprovalEmail = async (brandEmail: string, postTitle: string) => {
    try {
      const templateParams = {
        to_email: brandEmail,
        post_title: postTitle,
        message: 'Your match has been approved! Please check your dashboard for more details.',
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    } catch (error) {
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
        .select('id, status, brand_id, post_id')
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
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('title')
          .eq('id', currentMatch.post_id)
          .single();
        if (postError || !post) {
          throw new Error('Failed to fetch post title');
        }
        await sendApprovalEmail(brandEmail, post.title);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        video_file: file,
      }));
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      let videoUrl: string | undefined;

      if (formData.video_file) {
        const file = formData.video_file;
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `posts/${user.id}/${fileName}`;
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
            contentType: file.type,
          });
        if (error) {
          throw new Error(`Failed to upload video: ${error.message}`);
        }
        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        if (!publicUrlData.publicUrl) {
          throw new Error('Failed to generate public URL');
        }
        videoUrl = publicUrlData.publicUrl;
      }

      const postData = {
        ...formData,
        influencer_id: user.id,
        verification_status: 'pending',
        is_verified: false,
        reach: formData.reach ?? 0,
        price_range: {
          min: formData.price_range?.min ?? 0,
          max: formData.price_range?.max ?? 0,
        },
        video_url: videoUrl || formData.video_url,
      };
      delete postData.video_file;

      if (isEditing && selectedPostId) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', selectedPostId);
        if (error) throw error;
        toast.success('Post updated successfully');
      } else {
        const { error } = await supabase.from('posts').insert([postData]);
        if (error) throw error;
        toast.success('Post created successfully');
      }

      setFormData({
        title: '',
        description: '',
        hashtags: '',
        category_id: '',
        reach: undefined,
        price_range: { min: undefined, max: undefined },
        video_url: '',
        status: 'active',
        verification_status: 'pending',
      });
      setVideoPreview(null);
      setShowForm(false);
      setIsEditing(false);
      setSelectedPostId(null);
      fetchPosts();
    } catch (error: any) {
      toast.error(`Failed to save post: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post: Post) => {
    setFormData({
      title: post.title,
      description: post.description,
      hashtags: post.hashtags || '',
      category_id: post.category_id,
      reach: post.reach ?? undefined,
      price_range: {
        min: post.price_range?.min ?? undefined,
        max: post.price_range?.max ?? undefined,
      },
      video_url: post.video_url || '',
      status: post.status,
      verification_status: post.verification_status,
      video_file: undefined,
    });
    setVideoPreview(null);
    setIsEditing(true);
    setSelectedPostId(post.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!showDeleteModal) {
      setDeleteTargetId(id);
      setShowDeleteModal(true);
      return;
    }
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error: any) {
      toast.error('Failed to delete post');
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

  const togglePostStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Post ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      fetchPosts();
    } catch (error: any) {
      toast.error('Failed to update post status');
    }
  };

  const toggleMatchExpand = (postId: string) => {
    setExpandedMatches({
      ...expandedMatches,
      [postId]: !expandedMatches[postId],
    });
  };

  const getMatchesForPost = (postId: string) => {
    return matches.filter((match) => match.post_id === postId);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleViewAnalytics = (postId: string) => {
    setSelectedAnalyticsId(postId);
    setShowAnalytics(true);
  };

  const generateGoogleCalendarLink = (match: Match) => {
    const event = {
      title: `Meeting for ${match.posts?.title || 'Post'}`,
      description: `Meeting with brand and influencer.\nJoin Meeting: ${match.meeting_link || ''}`,
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
        match.posts?.title?.toLowerCase().includes(searchLower) ||
        match.profiles?.industry?.toLowerCase().includes(searchLower)
      );
    });

  const pendingMatches = matches.filter((match) => match.status === 'pending');
  const acceptedMatches = matches.filter((match) => match.status === 'accepted');
  const rejectedMatches = matches.filter((match) => match.status === 'rejected');

  if (loading) {
    return (
      <div className="pb-14 sm:pb-0">
        <div className="flex justify-between items-center mb-6">
          <Skeleton width={200} height={24} />
          <Skeleton width={120} height={36} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, index) => (
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
          className="mb-4 flex items-center text-[#2B4B9B] hover:text-[#1 ia2f61]"
        >
          <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
          Back to posts
        </button>
        {/* Reuse or create a PostAnalytics component similar to EventAnalytics */}
        <EventAnalytics opportunityId={selectedAnalyticsId} />
      </div>
    );
  }

  return (
    <div className="pb-14 sm:pb-0">
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {showForm ? (
        <div className="fixed inset-0 bg-white overflow-y-auto pb-14 sm:static sm:bg-transparent sm:overflow-visible">
          <div className="relative p-4 sm:p-6 pt-12 sm:pt-6 bg-white rounded-lg shadow-sm sm:mb-6">
            <button
              onClick={() => {
                setShowForm(false);
                setVideoPreview(null);
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
              aria-label="Close form"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {isEditing ? 'Edit Post' : 'Create New Post'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                <input
                  type="text"
                  name="hashtags"
                  value={formData.hashtags}
                  onChange={handleInputChange}
                  placeholder="#example #tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add hashtags to increase discoverability (e.g., #fashion #lifestyle)
                </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Video (Reel)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a short video (max 100MB, up to 60 seconds)
                </p>
                {formData.video_file && videoPreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Selected video: {formData.video_file.name}</p>
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-w-xs h-64 object-cover rounded-lg mt-2"
                    />
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
                    setVideoPreview(null);
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
                    'Update Post'
                  ) : (
                    'Create Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className={showForm ? 'hidden sm:block' : ''}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Influencer Dashboard</h1>
            <button
              onClick={() => {
                setShowForm(true);
                setIsEditing(false);
                setSelectedPostId(null);
                setFormData({
                  title: '',
                  description: '',
                  hashtags: '',
                  category_id: '',
                  reach: undefined,
                  price_range: { min: undefined, max: undefined },
                  video_url: '',
                  status: 'active',
                  verification_status: 'pending',
                });
                setVideoPreview(null);
              }}
              className="flex items-center space-x-1 px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Post</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Total Posts</h3>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Video className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-gray-500">
                  {posts.filter((p) => p.status === 'active').length} active
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
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-1 -mb-px font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Your Posts
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

          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <PlusCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">No posts yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first post to start connecting with brands.
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
                  >
                    Create Post
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => {
                    const postMatches = getMatchesForPost(post.id);
                    const isExpanded = expandedMatches[post.id] || false;
                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                            <div className="mb-4 sm:mb-0">
                              <div className="flex flex-wrap items-center mb-1">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mr-2">
                                  {post.title}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    post.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {post.status === 'active' ? 'Active' : 'Paused'}
                                </span>
                                <span className="ml-2">
                                  {getVerificationStatusBadge(post.verification_status)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {getCategoryName(post.category_id)}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewAnalytics(post.id)}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title="View Analytics"
                              >
                                <BarChart3 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => togglePostStatus(post.id, post.status)}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title={post.status === 'active' ? 'Pause Post' : 'Activate Post'}
                                disabled={post.verification_status !== 'approved'}
                              >
                                {post.status === 'active' ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(post)}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title="Edit Post"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                                title="Delete Post"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {post.verification_status === 'pending' && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                              <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                              <p className="text-sm text-yellow-700">
                                This post is pending verification by our team. It will be visible to
                                brands once approved.
                              </p>
                            </div>
                          )}

                          {post.verification_status === 'rejected' && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-red-700 font-medium">
                                  This post was rejected during verification.
                                </p>
                                {post.rejection_reason && (
                                  <p className="text-sm text-red-700 mt-1">
                                    Reason: {post.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {post.hashtags && (
                              <div className="flex items-center">
                                <Hash className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
                                  {post.hashtags}
                                </span>
                              </div>
                            )}

                            {post.reach && (
                              <div className="flex items-center">
                                <Users className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600">
                                  {post.reach.toLocaleString()} reach
                                </span>
                              </div>
                            )}

                            {post.price_range && (
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
                                  {typeof post.price_range === 'object'
                                    ? `₹${post.price_range.min} - ₹${post.price_range.max}`
                                    : 'Contact for pricing'}
                                </span>
                              </div>
                            )}
                          </div>

                          {post.video_url && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700">Video:</h4>
                              <video
                                src={post.video_url}
                                controls
                                className="w-full max-w-md h-64 object-cover rounded-lg mt-2"
                              />
                            </div>
                          )}
                          <p className="text-gray-600 mb-4">{post.description}</p>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex items-center mb-2 sm:mb-0">
                              <span className="text-sm font-medium text-gray-700 mr-2">
                                {postMatches.length}{' '}
                                {postMatches.length === 1 ? 'match' : 'matches'}
                              </span>
                              {postMatches.length > 0 && (
                                <button
                                  onClick={() => toggleMatchExpand(post.id)}
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

                        {isExpanded && postMatches.length > 0 && (
                          <div className="border-t border-gray-200 p-4 bg-gray-50">
                            <h4 className="font-medium text-gray-800 mb-2">Matches</h4>
                            <div className="space-y-3">
                              {postMatches.map((match) => (
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
                      : "When brands express interest in your posts, they'll appear here."}
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
                                <span className="font-medium">Post:</span>{' '}
                                {match.posts?.title || 'Unknown Post'}
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