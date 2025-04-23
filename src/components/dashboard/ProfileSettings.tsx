import React, { useState } from 'react';
import { updateProfile } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Save, X } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileSettingsProps {
  profile: Profile | null;
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    company_name: profile?.company_name || '',
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
    }
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
      // Try to parse as JSON if it looks like JSON
      if (e.target.value.trim().startsWith('[')) {
        const sponsorships = JSON.parse(e.target.value);
        setFormData({
          ...formData,
          previous_sponsorships: sponsorships
        });
      } else {
        // Otherwise treat as comma-separated list
        const sponsorships = e.target.value.split(',').map(s => s.trim());
        setFormData({
          ...formData,
          previous_sponsorships: sponsorships
        });
      }
    } catch (err) {
      // If JSON parsing fails, just store as is
      setFormData({
        ...formData,
        previous_sponsorships: e.target.value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  const isBrand = profile?.user_type === 'brand' || profile?.user_type === 'agency';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h2>
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center justify-between">
          <span>Profile updated successfully!</span>
          <button onClick={() => setSuccess(false)} className="text-green-700">
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
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="contact_person_phone"
                  name="contact_person_phone"
                  value={formData.contact_person_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                />
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
                      Annual Marketing Budget (USD)
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
            disabled={loading}
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
    </div>
  );
}