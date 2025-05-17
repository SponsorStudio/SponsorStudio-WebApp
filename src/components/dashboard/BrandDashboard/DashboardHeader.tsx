import React from 'react';
import { Filter, Search } from 'lucide-react';

interface DashboardHeaderProps {
  activeTab: 'discover' | 'influencers' | 'matches';
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  activeTab,
  showFilters,
  setShowFilters,
  locationFilter,
  setLocationFilter,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Brand Dashboard</h1>
      {(activeTab === 'discover' || activeTab === 'influencers') && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Filters</span>
          </button>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
            />
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;