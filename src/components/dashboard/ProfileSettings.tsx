import React, { useState, useCallback, useRef } from 'react';
import { updateProfile } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { Save, X, Camera, SquarePen, Crop, LogOut } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop/types';
import { CustomModal } from '../../components/CustomModal';
import toast from 'react-hot-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileSettingsProps {
  profile: Profile | null;
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    company_name: profile?.company_name || '',
    email: profile?.email || '',
    website: profile?.website || '',
    industry: profile?.industry || '',
    industry_details: profile?.industry_details || '',
    company_size: profile?.company_size || '',
    annual_marketing_budget: profile?.annual_marketing_budget || '',
    marketing_channels: profile?.marketing_channels || [],
    previous_sponsorships: profile?.previous_sponsorships || [],
    sponsorship_goals: profile?.sponsorship_goals || [],
    location: profile?.location || '',
    contact_person_name: profile?.contact_person_name || '',
    contact_person_position: profile?.contact_person_position || '',
    contact_person_phone: profile?.contact_person_phone || '',
    profile_picture_url: profile?.profile_picture_url || '',
    social_media: profile?.social_media || {
      linkedin: '',
      twitter: '',
      instagram: '',
      facebook: ''
    },
    target_audience: profile?.target_audience || {
      age_range: { min: 18, max: 65 },
      genders: [],
      interests: [],
      locations: [],
      income_level: ''
    },
    phone_number_verified: profile?.phone_number_verified || false
  });
  const [previewImage, setPreviewImage] = useState<string | null>(formData.profile_picture_url || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [emailVerificationPrompt, setEmailVerificationPrompt] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      setShowLogoutModal(false);
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Failed to log out');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'annual_marketing_budget') {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseFloat(value)
      });
    } else if (name === 'min_age' || name === 'max_age') {
      setFormData({
        ...formData,
        target_audience: {
          ...formData.target_audience as any,
          age_range: {
            ...(formData.target_audience as any).age_range,
            [name === 'min_age' ? 'min' : 'max']: parseInt(value) || 0
          }
        }
      });
    } else if (name.startsWith('social_media_')) {
      const platform = name.replace('social_media_', '');
      setFormData({
        ...formData,
        social_media: {
          ...(formData.social_media as any),
          [platform]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
      toast.error('No file selected');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setError('Profile picture must be JPEG, PNG, or GIF');
      toast.error('Profile picture must be JPEG, PNG, or GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile picture must be less than 5MB');
      toast.error('Profile picture must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImageSrc(null);
    setShowCropper(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImage = async (imageSrc: string, pixelCrop: Area): Promise<File> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !user?.id) return;

    setUploading(true);
    setLoading(true);
    try {
      const croppedFile = await getCroppedImage(imageSrc, croppedAreaPixels);
      const imageUrl = URL.createObjectURL(croppedFile);
      setPreviewImage(imageUrl);

      const fileExt = croppedFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      if (formData.profile_picture_url) {
        const oldFilePath = formData.profile_picture_url.split('/').slice(-2).join('/');
        const { error: removeError } = await supabase.storage.from('public').remove([oldFilePath]);
        if (removeError) {
          console.error('Failed to remove old file:', removeError);
        }
      }

      const fileBuffer = await croppedFile.arrayBuffer();

      const { data, error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: croppedFile.type
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from('public').getPublicUrl(filePath);
      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to generate public URL');
      }

      console.log('New profile picture URL:', publicUrlData.publicUrl);

      setFormData(prev => ({
        ...prev,
        profile_picture_url: publicUrlData.publicUrl
      }));

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrlData.publicUrl })
        .eq('id', user.id);

      if (dbError) {
        throw new Error(`Failed to update profile picture in database: ${dbError.message}`);
      }

      console.log('Profile picture updated in database:', publicUrlData.publicUrl);
      toast.success('Profile picture updated successfully!');
      resetFileInput();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('File upload or database update error:', err);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const values = e.target.value.split(',').map(item => item.trim());
    setFormData({
      ...formData,
      [field]: values
    });
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const currentGenders = [...((formData.target_audience as any).genders || [])];

    if (checked && !currentGenders.includes(value)) {
      currentGenders.push(value);
    } else if (!checked && currentGenders.includes(value)) {
      const index = currentGenders.indexOf(value);
      currentGenders.splice(index, 1);
    }

    setFormData({
      ...formData,
      target_audience: {
        ...formData.target_audience as any,
        genders: currentGenders
      }
    });
  };

  const handleInterestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const interests = e.target.value.split(',').map(interest => interest.trim());

    setFormData({
      ...formData,
      target_audience: {
        ...formData.target_audience as any,
        interests
      }
    });
  };

  const handleLocationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const locations = e.target.value.split(',').map(location => location.trim());

    setFormData({
      ...formData,
      target_audience: {
        ...formData.target_audience as any,
        locations
      }
    });
  };

  const handleIncomeLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      target_audience: {
        ...formData.target_audience as any,
        income_level: e.target.value
      }
    });
  };

  const handlePreviousSponsorshipsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      if (e.target.value.trim().startsWith('[')) {
        const sponsorships = JSON.parse(e.target.value);
        setFormData({
          ...formData,
          previous_sponsorships: sponsorships
        });
      } else {
        const sponsorships = e.target.value.split(',').map(s => s.trim());
        setFormData({
          ...formData,
          previous_sponsorships: sponsorships
        });
      }
    } catch (err) {
      setFormData({
        ...formData,
        previous_sponsorships: e.target.value
      });
    }
  };

  const sendOtp = async () => {
    if (!formData.contact_person_phone) {
      setError('Please enter a phone number');
      toast.error('Please enter a phone number');
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(import.meta.env.VITE_TWILIO_API_URL + '/api/twilio/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.contact_person_phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      setShowOtpPopup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      toast.error('Please enter the OTP');
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(import.meta.env.VITE_TWILIO_API_URL + '/api/twilio/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.contact_person_phone,
          code: otp,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid OTP');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_number_verified: true,
          contact_person_phone: formData.contact_person_phone
        })
        .eq('id', user?.id);

      if (updateError) {
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      setFormData(prev => ({
        ...prev,
        phone_number_verified: true,
        contact_person_phone: formData.contact_person_phone
      }));
      setShowOtpPopup(false);
      setOtp('');
      setSuccess(true);
      toast.success('Phone number verified successfully!');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
      toast.error(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setEmailVerificationPrompt(false);

    try {
      const emailChanged = formData.email !== profile?.email;

      if (emailChanged) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          throw new Error('Invalid email format');
        }

        console.log('Updating auth email to:', formData.email);
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (authError) {
          throw new Error(`Failed to update authentication email: ${authError.message}`);
        }

        setEmailVerificationPrompt(true);
      }

      console.log('Updating profile with full formData:', formData);
      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.message.includes('Failed to update profile') && err.cause
        ? `Failed to update profile: ${err.cause.message || 'Unknown error'}`
        : err.message || 'An error occurred while updating your profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isBrand = profile?.user_type === 'brand' || profile?.user_type === 'agency';

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <button
        onClick={handleLogout}
        className="block sm:hidden absolute top-2 right-2 p-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] flex items-center"
      >
        <LogOut className="w-4 h-4 mr-1" />
        <span className="text-sm">Logout</span>
      </button>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center justify-between">
          <span>Profile updated successfully!</span>
          <button onClick={() => setSuccess(false)} className="text-green-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {emailVerificationPrompt && (
        <div className="mb-6 p-4 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-between">
          <span>Please check your new email ({formData.email}) to verify the change.</span>
          <button onClick={() => setEmailVerificationPrompt(false)} className="text-blue-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center items-center my-6">
          <div className="text-center">
            <label
              htmlFor="profile_picture"
              className="relative group cursor-pointer block"
              aria-label="Change profile picture"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>
              {!uploading && (
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                  <SquarePen className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div
                className={`absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center rounded-full transition-opacity ${
                  uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {uploading ? (
                  <svg
                    className="animate-spin h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-sm text-white font-medium">Change</span>
                  </div>
                )}
              </div>
            </label>
            <input
              type="file"
              id="profile_picture"
              name="profile_picture"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
              ref={fileInputRef}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Company Information</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Media">Media & Entertainment</option>
                  <option value="Food">Food & Beverage</option>
                  <option value="Travel">Travel & Hospitality</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="industry_details" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry Details
                </label>
                <textarea
                  id="industry_details"
                  name="industry_details"
                  value={formData.industry_details}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  placeholder="Please provide more specific details about your industry"
                />
              </div>

              <div>
                <label htmlFor="company_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </label>
                <select
                  id="company_size"
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                >
                  <option value="">Select Company Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1001+">1001+ employees</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Information</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>

              <div>
                <label htmlFor="contact_person_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  id="contact_person_name"
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>

              <div>
                <label htmlFor="contact_person_position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position/Title
                </label>
                <input
                  type="text"
                  id="contact_person_position"
                  name="contact_person_position"
                  value={formData.contact_person_position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
              </div>

              <div>
                <label htmlFor="contact_person_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number {formData.phone_number_verified && <span className="text-green-600 text-xs">(Verified)</span>}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="tel"
                    id="contact_person_phone"
                    name="contact_person_phone"
                    value={formData.contact_person_phone}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                    placeholder="+1234567890"
                    disabled={formData.phone_number_verified}
                  />
                  {!formData.phone_number_verified && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading || !formData.contact_person_phone}
                      className="px-3 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] disabled:opacity-50"
                    >
                      {otpLoading ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Media
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    name="social_media_linkedin"
                    value={(formData.social_media as any)?.linkedin || ''}
                    onChange={handleInputChange}
                    placeholder="LinkedIn URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                  <input
                    type="url"
                    name="social_media_twitter"
                    value={(formData.social_media as any)?.twitter || ''}
                    onChange={handleInputChange}
                    placeholder="Twitter URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                  <input
                    type="url"
                    name="social_media_instagram"
                    value={(formData.social_media as any)?.instagram || ''}
                    onChange={handleInputChange}
                    placeholder="Instagram URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                  <input
                    type="url"
                    name="social_media_facebook"
                    value={(formData.social_media as any)?.facebook || ''}
                    onChange={handleInputChange}
                    placeholder="Facebook URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {isBrand && (
          <>
            <hr className="my-6 border-gray-200" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Marketing Information</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="annual_marketing_budget" className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Marketing Budget
                    </label>
                    <input
                      type="number"
                      id="annual_marketing_budget"
                      name="annual_marketing_budget"
                      value={formData.annual_marketing_budget}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="marketing_channels" className="block text-sm font-medium text-gray-700 mb-1">
                      Marketing Channels (comma separated)
                    </label>
                    <input
                      type="text"
                      id="marketing_channels"
                      value={formData.marketing_channels.join(', ')}
                      onChange={(e) => handleArrayInputChange(e, 'marketing_channels')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      placeholder="Social Media, Email, Events, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="previous_sponsorships" className="block text-sm font-medium text-gray-700 mb-1">
                      Previous Sponsorships (comma separated)
                    </label>
                    <textarea
                      id="previous_sponsorships"
                      value={Array.isArray(formData.previous_sponsorships) ? formData.previous_sponsorships.join(', ') : formData.previous_sponsorships}
                      onChange={handlePreviousSponsorshipsChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      placeholder="List previous events or organizations you've sponsored"
                    />
                  </div>

                  <div>
                    <label htmlFor="sponsorship_goals" className="block text-sm font-medium text-gray-700 mb-1">
                      Sponsorship Goals (comma separated)
                    </label>
                    <input
                      type="text"
                      id="sponsorship_goals"
                      value={formData.sponsorship_goals.join(', ')}
                      onChange={(e) => handleArrayInputChange(e, 'sponsorship_goals')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      placeholder="Brand Awareness, Lead Generation, etc."
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Target Audience</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="min_age" className="block text-sm font-medium text-gray-700 mb-1">
                        Min Age
                      </label>
                      <input
                        type="number"
                        id="min_age"
                        name="min_age"
                        value={(formData.target_audience as any)?.age_range?.min || 18}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="max_age" className="block text-sm font-medium text-gray-700 mb-1">
                        Max Age
                      </label>
                      <input
                        type="number"
                        id="max_age"
                        name="max_age"
                        value={(formData.target_audience as any)?.age_range?.max || 65}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          value="male"
                          checked={(formData.target_audience as any)?.genders?.includes('male')}
                          onChange={handleGenderChange}
                          className="mr-2"
                        />
                        Male
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          value="female"
                          checked={(formData.target_audience as any)?.genders?.includes('female')}
                          onChange={handleGenderChange}
                          className="mr-2"
                        />
                        Female
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          value="other"
                          checked={(formData.target_audience as any)?.genders?.includes('other')}
                          onChange={handleGenderChange}
                          className="mr-2"
                        />
                        Other
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
                      Interests (comma separated)
                    </label>
                    <input
                      type="text"
                      id="interests"
                      value={(formData.target_audience as any)?.interests?.join(', ') || ''}
                      onChange={handleInterestsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      placeholder="Technology, Fashion, Sports, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="locations" className="block text-sm font-medium text-gray-700 mb-1">
                      Target Locations (comma separated)
                    </label>
                    <input
                      type="text"
                      id="locations"
                      value={(formData.target_audience as any)?.locations?.join(', ') || ''}
                      onChange={handleLocationsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                      placeholder="New York, London, Tokyo, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="income_level" className="block text-sm font-medium text-gray-700 mb-1">
                      Income Level
                    </label>
                    <select
                      id="income_level"
                      value={(formData.target_audience as any)?.income_level || ''}
                      onChange={handleIncomeLevelChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                    >
                      <option value="">Select Income Level</option>
                      <option value="low">Low Income</option>
                      <option value="middle">Middle Income</option>
                      <option value="high">High Income</option>
                      <option value="luxury">Luxury</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || uploading}
            className="inline-flex items-center px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>

      <CustomModal
        isOpen={showOtpPopup}
        onClose={() => setShowOtpPopup(false)}
        title="Verify Phone Number"
        customStyles={{ maxWidth: '28rem', height: '15.5rem' ,width:'90%'}}
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            An OTP has been sent to {formData.contact_person_phone}. Please enter it below.
          </p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B] mb-4"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowOtpPopup(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={verifyOtp}
              disabled={otpLoading}
              className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] disabled:opacity-50"
            >
              {otpLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </div>
      </CustomModal>

      {imageSrc && (
        <CustomModal
          isOpen={showCropper}
          onClose={resetFileInput}
          title="Crop Profile Picture"
          customStyles={{ maxWidth: '32rem', height: 'auto' ,width: '90%'}}
        >
          <div>
            <div className="relative w-full h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={resetFileInput}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploading}
                className="px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1a2f61] disabled:opacity-50 flex items-center"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Crop className="w-4 h-4 mr-2" />
                    Crop & Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      <CustomModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        customStyles={{ maxWidth: '28rem', height: '11rem',width: '90%' }}
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to log out?
          </p>
          <div className="flex justify-end space-x-3 mt-5">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}