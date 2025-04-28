import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  Clock,
  Building2,
  Globe,
  Phone,
  Mail,
  Tag,
  CheckSquare,
  CalendarRange,
  Search,
  Users
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

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

interface MatchedOpportunitiesProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  stats: {
    totalMatches: number;
    pendingMatches: number;
    acceptedMatches: number;
    rejectedMatches: number;
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

export default function MatchedOpportunities({ searchTerm, setSearchTerm, stats, setStats }: MatchedOpportunitiesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [newMeetingLink, setNewMeetingLink] = useState<string>('');
  const [meetingScheduledAt, setMeetingScheduledAt] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('all');

  useEffect(() => {
    fetchMatches();
  }, [matchFilter]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      let matchesQuery = supabase
        .from('matches')
        .select('*');
      
      const { data: matchesData, error: matchesError } = await matchesQuery;
      
      if (matchesError) throw matchesError;
      
      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      const normalizedMatches = matchesData.map(match => ({
        ...match,
        status: match.status?.trim().toLowerCase()
      }));

      const filteredMatches = matchFilter === 'all'
        ? normalizedMatches
        : normalizedMatches.filter(match => match.status === matchFilter);

      const opportunityIds = [...new Set(filteredMatches.map(match => match.opportunity_id))];
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          *,
          categories:category_id (*)
        `)
        .in('id', opportunityIds);
      
      if (opportunitiesError) throw opportunitiesError;

      const creatorIds = [...new Set(opportunitiesData?.map(opp => opp.creator_id) || [])];
      
      const brandIds = [...new Set(filteredMatches.map(match => match.brand_id))];
      const allProfileIds = [...new Set([...brandIds, ...creatorIds])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allProfileIds);
      
      if (profilesError) throw profilesError;

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

      const opportunitiesWithCreators = opportunitiesData?.map(opp => {
        const creatorProfile = profilesWithEmails.find(profile => profile.id === opp.creator_id) || null;
        return {
          ...opp,
          creator_profile: creatorProfile
        };
      }) || [];

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

      
      setMatches(matchesWithRelations as Match[] || []);
      
      const { data: matchStatsData, error: matchStatsError } = await supabase
        .from('matches')
        .select('status');
      
      if (matchStatsError) throw matchStatsError;
      
      const normalizedMatchStats = matchStatsData?.map(item => ({
        ...item,
        status: item.status?.trim().toLowerCase()
      })) || [];

      
      if (normalizedMatchStats) {
        setStats({
          totalMatches: normalizedMatchStats.length,
          pendingMatches: normalizedMatchStats.filter(m => m.status === 'pending').length,
          acceptedMatches: normalizedMatchStats.filter(m => m.status === 'accepted').length,
          rejectedMatches: normalizedMatchStats.filter(m => m.status === 'rejected').length
        });
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
      setMatches([]);
    } finally {
      setLoading(false);
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

  const handleSaveMeetingLink = async (matchId: string) => {
    if (!newMeetingLink || !meetingScheduledAt) {
      toast.error('Please enter both a meeting link and scheduled date/time');
      return;
    }

    try {
      setProcessingAction(matchId);


      // Parse the input string (e.g., "2025-04-30T00:00") as local time
      const [datePart, timePart] = meetingScheduledAt.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Create a Date object in local timezone
      // Month is 0-based in JavaScript Date, so subtract 1 from month
      const localDate = new Date(year, month - 1, day, hours, minutes);


      // Use the Parsed local time (ISO) as the UTC value to store
      const utcDateString = localDate.toISOString();

      const { error } = await supabase
        .from('matches')
        .update({ meeting_link: newMeetingLink, meeting_scheduled_at: utcDateString })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId ? { ...match, meeting_link: newMeetingLink, meeting_scheduled_at: utcDateString } : match
        )
      );
      setNewMeetingLink('');
      setMeetingScheduledAt('');
      setExpandedMatch(null);
      toast.success('Meeting details saved successfully');
    } catch (error) {
      console.error('Error saving meeting details:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save meeting details');
    } finally {
      setProcessingAction(null);
    }
  };

  const generateGoogleCalendarLink = (match: Match) => {
    const event = {
      title: `Meeting for ${match.opportunity?.title || 'Opportunity'}`,
      description: `Meeting with brand and creator.\nJoin Meeting: ${match.meeting_link || ''}`,
      start: match.meeting_scheduled_at || new Date().toISOString(),
      end: match.meeting_scheduled_at ? new Date(new Date(match.meeting_scheduled_at).getTime() + 60 * 60 * 1000).toISOString() : new Date().toISOString(),
      location: match.meeting_link || '',
    };

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: string) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatDate(event.start);
    const endDate = formatDate(event.end);

    // Construct the Google Calendar URL
    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.append('text', event.title);
    googleCalendarUrl.searchParams.append('dates', `${startDate}/${endDate}`);
    googleCalendarUrl.searchParams.append('details', event.description);
    googleCalendarUrl.searchParams.append('location', event.location);

    return googleCalendarUrl.toString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matched Opportunities</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search matches..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={matchFilter}
            onChange={(e) => { 
              setMatchFilter(e.target.value as typeof matchFilter); 
            }}
          >
            <option value="all">All Matches</option>
            <option value="pending">Pending Matches</option>
            <option value="accepted">Accepted Matches</option>
            <option value="rejected">Rejected Matches</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        <h4 className="font-semibold text-gray-900 mb-4">Set Meeting Details</h4>
                        <div className="flex flex-col md:flex-row gap-2">
                          <input
                            type="text"
                            value={newMeetingLink}
                            onChange={(e) => setNewMeetingLink(e.target.value)}
                            placeholder="Enter meeting link (e.g., https://meet.google.com/xxx-yyyy-zzz)"
                            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                          />
                          <input
                            type="datetime-local"
                            value={meetingScheduledAt}
                            onChange={(e) => setMeetingScheduledAt(e.target.value)}
                            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                          />
                          <button
                            onClick={() => handleSaveMeetingLink(match.id)}
                            disabled={processingAction === match.id || !newMeetingLink || !meetingScheduledAt}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                          >
                            {processingAction === match.id ? 'Saving...' : 'Save'}
                          </button>
                          {(match.meeting_link && match.meeting_scheduled_at) && (
                            <a
                              href={generateGoogleCalendarLink(match)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-center"
                            >
                              Add to Google Calendar
                            </a>
                          )}
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