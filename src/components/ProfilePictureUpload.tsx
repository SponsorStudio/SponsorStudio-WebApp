import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadProfilePicture } from '../lib/auth';

interface ProfilePictureUploadProps {
  currentPictureUrl: string | null;
  onUploadSuccess: (url: string) => void;
}

export default function ProfilePictureUpload({ currentPictureUrl, onUploadSuccess }: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const profile = await uploadProfilePicture(file);
      if (profile?.profile_picture_url) {
        onUploadSuccess(profile.profile_picture_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while uploading the image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
          {currentPictureUrl ? (
            <img
              src={currentPictureUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Upload className="w-8 h-8" />
            </div>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-0 right-0 bg-[#2B4B9B] text-white p-2 rounded-full hover:bg-[#1a2f61] transition-colors"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />

      {isUploading && (
        <div className="mt-2 text-sm text-gray-600">
          Uploading...
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <X className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Supported formats: JPG, PNG. Max size: 5MB
      </p>
    </div>
  );
}