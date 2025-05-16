import React from 'react';

interface TabsProps {
  activeTab: 'opportunities' | 'matches';
  setActiveTab: (tab: 'opportunities' | 'matches') => void;
  pendingMatchesCount: number;
}

export default function Tabs({ activeTab, setActiveTab, pendingMatchesCount }: TabsProps) {
  return (
    <div className="mb-6 border-b border-gray-200">
      <div className="flex space-x-8">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`py-2 px-1 -mb-px font-medium text-sm ${
            activeTab === 'opportunities'
              ? 'text-[#2B4B9B] border-b-2 border-[#2B4B9B]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Your Opportunities
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
          {pendingMatchesCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              {pendingMatchesCount} new
            </span>
          )}
        </button>
      </div>
    </div>
  );
}