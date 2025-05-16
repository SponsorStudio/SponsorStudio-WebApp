import React from 'react';
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import type { Database } from '../../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  opportunities?: Database['public']['Tables']['opportunities']['Row'];
};

interface EventCardProps {
  opportunity: Opportunity;
  matches: Match[];
  isExpanded: boolean;
  categories: Category[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onToggleExpand: () => void;
  onViewAnalytics: () => void;
  onUpdateMatchStatus: (matchId: string, status: 'accepted' | 'rejected') => void;
  processingMatches: Record<string, { accept: boolean; decline: boolean }>;
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

export default function EventCard({
  opportunity,
  matches,
  isExpanded,
  categories,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleExpand,
  onViewAnalytics,
  onUpdateMatchStatus,
  processingMatches,
}: EventCardProps) {
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              onClick={onViewAnalytics}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="View Analytics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleStatus}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title={opportunity.status === 'active' ? 'Pause Opportunity' : 'Activate Opportunity'}
              disabled={opportunity.verification_status !== 'approved'}
            >
              {opportunity.status === 'active' ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="Edit Opportunity"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
              title="Delete Opportunity"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        {opportunity.verification_status === 'pending' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              This Opportunity is pending verification by our team. It will be visible to
              brands once approved.
            </p>
          </div>
        )}
        {opportunity.verification_status === 'rejected' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">
                This Opportunity was rejected during verification.
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
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </span>
            {matches.length > 0 && (
              <button
                onClick={onToggleExpand}
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
      {isExpanded && matches.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-2">Matches</h4>
          <div className="space-y-3">
            {matches.map((match) => (
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
                        onClick={() => onUpdateMatchStatus(match.id, 'accepted')}
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
                        onClick={() => onUpdateMatchStatus(match.id, 'rejected')}
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
}