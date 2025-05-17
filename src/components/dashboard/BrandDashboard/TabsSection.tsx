import React from 'react';
import type { Match } from './types';

interface TabsSectionProps {
  activeTab: 'discover' | 'influencers' | 'matches';
  setActiveTab: (tab: 'discover' | 'influencers' | 'matches') => void;
  pendingMatches: Match[];
}

const TabsSection: React.FC<TabsSectionProps> = ({
  activeTab,
  setActiveTab,
  pendingMatches,
}) => {
  return (
    <div className="mb-4 border-b border-gray-200">
      <div className="flex flex-wrap gap-4 sm:gap-8">
        <button
          onClick={() => setActiveTab('discover')}
          className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
            activeTab === 'discover'
              ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Discover Events
        </button>
        <button
          onClick={() => setActiveTab('influencers')}
          className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
            activeTab === 'influencers'
              ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Discover Influencers
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`py-2 px-1 -mb-px font-medium text-xs sm:text-sm ${
            activeTab === 'matches'
              ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Your Matches{' '}
          {pendingMatches.length > 0 && (
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-yellow-100 text-yellow-800 rounded-full">
              {pendingMatches.length} pending
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default TabsSection;