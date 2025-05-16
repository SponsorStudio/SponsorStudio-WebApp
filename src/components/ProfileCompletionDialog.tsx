import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileCompletionDialogProps {
  onClose: () => void;
}

export default function ProfileCompletionDialog({ onClose }: ProfileCompletionDialogProps) {
  const { setShowProfileDialog } = useAuth();

  const handleLinkClick = () => {
    setShowProfileDialog(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={() => {
            setShowProfileDialog(false);
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Complete Your Profile</h3>
            <p className="mt-2 text-sm text-gray-500">
              Please complete your profile to get the most out of Sponsor Studio. This will help us match you with the right opportunities.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">Required information includes:</p>
          <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
            <li>Company name</li>
            <li>Contact person details</li>
            <li>Industry</li>
            <li>Location</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <a
            href="/dashboard"
            onClick={handleLinkClick}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center"
          >
            Remind Me Later
          </a>
          <a
            href="/dashboard"
            onClick={handleLinkClick}
            className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] text-center"
          >
            Update Profile
          </a>
        </div>
      </div>
    </div>
  );
}