import React from 'react';
import { Search } from 'lucide-react';

interface NoResultsCardProps {
  type: 'events' | 'influencer posts';
  resetFilters: () => void;
}

const NoResultsCard: React.FC<NoResultsCardProps> = ({ type, resetFilters }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
      </div>
      <h3 className="text-base sm:text-xl font-medium text-gray-800 mb-2">
        No {type} found
      </h3>
      <p className="text-xs sm:text-gray-600 mb-3 sm:mb-4">
        We couldn't find any {type} matching your criteria. Try adjusting your
        filters.
      </p>
      <button
        onClick={resetFilters}
        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-xs sm:text-sm"
      >
        Reset Filters
      </button>
    </div>
  );
};

export default NoResultsCard;