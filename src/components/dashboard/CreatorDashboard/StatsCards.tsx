import React from 'react';
import {
  Calendar,
  Clock,
  Check,
  X,
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import type { Database } from '../../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  opportunities?: Database['public']['Tables']['opportunities']['Row'];
};

interface StatsCardsProps {
  opportunities: Opportunity[];
  pendingMatches: Match[];
  acceptedMatches: Match[];
  rejectedMatches: Match[];
  loading: boolean;
}

export default function StatsCards({
  opportunities,
  pendingMatches,
  acceptedMatches,
  rejectedMatches,
  loading,
}: StatsCardsProps) {
  if (loading) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">Total Opportunities</h3>
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
  );
}