import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ProfileAlertProps {
  companyName: string | undefined;
  onUpdateProfile: () => void;
}

const ProfileAlert: React.FC<ProfileAlertProps> = ({
  companyName,
  onUpdateProfile,
}) => {
  if (companyName) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
      <div className="flex items-start">
        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2" />
        <div>
          <h3 className="text-xs font-medium text-yellow-800">
            Complete your profile
          </h3>
          <p className="mt-1 text-xs text-yellow-700">
            Please complete your profile to get personalized opportunities and
            better matches.
          </p>
          <button
            onClick={onUpdateProfile}
            className="mt-1 text-xs font-medium text-yellow-800 hover:text-yellow-900"
          >
            Update Profile →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileAlert;