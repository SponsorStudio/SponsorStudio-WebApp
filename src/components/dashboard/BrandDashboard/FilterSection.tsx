import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { Category } from './types';

interface FilterSectionProps {
  showFilters: boolean;
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  adTypeFilter: string;
  setAdTypeFilter: (value: string) => void;
  priceRangeFilter: string;
  setPriceRangeFilter: (value: string) => void;
  locationSearch: string;
  setLocationSearch: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  resetFilters: () => void;
  toggleFilters: () => void;
  isInfluencerTab: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  showFilters,
  categories,
  selectedCategory,
  setSelectedCategory,
  adTypeFilter,
  setAdTypeFilter,
  priceRangeFilter,
  setPriceRangeFilter,
  locationSearch,
  setLocationSearch,
  searchQuery,
  setSearchQuery,
  resetFilters,
  toggleFilters,
  isInfluencerTab,
}) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Brand Dashboard
        </h1>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2 mt-4 sm:mt-0">
          <button
            onClick={toggleFilters}
            className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Filters</span>
          </button>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search location..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
            />
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 max-w-full overflow-x-hidden">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="font-medium text-xs sm:text-sm">
              Filter {isInfluencerTab ? 'Influencer Posts' : 'Opportunities'}
            </h3>
            <button
              onClick={resetFilters}
              className="text-xs sm:text-sm text-[#2B4B9B] hover:text-[#1a2f61]"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {!isInfluencerTab && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Advertisement Type
                </label>
                <select
                  value={adTypeFilter}
                  onChange={(e) => setAdTypeFilter(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="digital">Digital Displays</option>
                  <option value="static">Static Displays</option>
                  <option value="video">Video Ads</option>
                  <option value="interactive">Interactive Displays</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <select
                value={priceRangeFilter}
                onChange={(e) => setPriceRangeFilter(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
              >
                <option value="">Any Budget</option>
                <option value="0-10000">Under ₹10,000</option>
                <option value="10000-50000"> ₹10,000 - ₹50,000</option>
                <option value="50000-100000">₹50,000 - ₹1,00,000</option>
                <option value="100000-500000">₹1,00,000 - ₹5,00,000</option>
                <option value="500000-1000000">₹5,00,000 - ₹10,00,000</option>
                <option value="1000000-">Above ₹10,00,000</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Enter location..."
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, or hashtags..."
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] text-xs sm:text-sm"
              />
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FilterSection;