import React from 'react';
import {
  Users,
  Building2,
  Calendar,
  CalendarRange,
  Link as LinkIcon,
  FileText as FileIcon,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import type { Database } from '../../../lib/database.types';
import MatchFilter from './MatchFilter';

type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  opportunities?: Database['public']['Tables']['opportunities']['Row'];
};

interface MatchListProps {
  matches: Match[];
  matchFilter: 'all' | 'pending' | 'accepted' | 'rejected';
  searchQuery: string;
  onUpdateMatchStatus: (matchId: string, status: 'accepted' | 'rejected') => void;
  processingMatches: Record<string, { accept: boolean; decline: boolean }>;
  onRefresh: () => void;
  onFilterChange: (filter: 'all' | 'pending' | 'accepted' | 'rejected') => void;
  onSearchChange: (query: string) => void;
  generateGoogleCalendarLink: (match: Match) => string;
}

export default function MatchList({
  matches,
  matchFilter,
  searchQuery,
  onUpdateMatchStatus,
  processingMatches,
  onRefresh,
  onFilterChange,
  onSearchChange,
  generateGoogleCalendarLink,
}: MatchListProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-0">Brand Matches</h2>
        <div className="flex space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      <MatchFilter
        matchFilter={matchFilter}
        searchQuery={searchQuery}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        matches={matches}
      />
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
                          onClick={() => onUpdateMatchStatus(match.id, 'accepted')}
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
                          onClick={() => onUpdateMatchStatus(match.id, 'rejected')}
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
  );
}