import React from 'react';
import { Search } from 'lucide-react';
import type { Database } from '../../../lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  opportunities?: Database['public']['Tables']['opportunities']['Row'];
};

interface MatchFilterProps {
  matchFilter: 'all' | 'pending' | 'accepted' | 'rejected';
  searchQuery: string;
  onFilterChange: (filter: 'all' | 'pending' | 'accepted' | 'rejected') => void;
  onSearchChange: (query: string) => void;
  matches: Match[];
}

export default function MatchFilter({
  matchFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  matches,
}: MatchFilterProps) {
  const getMatchCount = (status: 'all' | 'pending' | 'accepted' | 'rejected') => {
    if (status === 'all') return matches.length;
    return matches.filter((match) => match.status === status).length;
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-sm"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'accepted', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                matchFilter === filter
                  ? 'bg-[#2B4B9B] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getMatchCount(filter)})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}