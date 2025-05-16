import React from 'react';
import {
  PlusCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import type { Database } from '../../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface EventFormProps {
  formData: Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File };
  setFormData: React.Dispatch<
    React.SetStateAction<
      Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File }
    >
  >;
  mediaPreviews: string[];
  setMediaPreviews: React.Dispatch<React.SetStateAction<string[]>>;
  isEditing: boolean;
  isSubmitting: boolean;
  categories: Category[];
  onSubmit: (formData: Partial<Opportunity> & { media_files?: File[]; sponsorship_brochure_file?: File }) => void;
  onClose: () => void;
}

export default function EventForm({
  formData,
  setFormData,
  mediaPreviews,
  setMediaPreviews,
  isEditing,
  isSubmitting,
  categories,
  onSubmit,
  onClose,
}: EventFormProps) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'price_min' || name === 'price_max') {
      setFormData({
        ...formData,
        price_range: {
          ...formData.price_range,
          [name === 'price_min' ? 'min' : 'max']: value === '' ? undefined : parseInt(value),
        },
      });
    } else if (name === 'reach') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : parseInt(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'media_files' | 'sponsorship_brochure_file'
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (field === 'media_files') {
        setFormData((prev) => ({
          ...prev,
          media_files: files,
        }));
        const previews = files.map((file) => URL.createObjectURL(file));
        setMediaPreviews(previews);
      } else {
        setFormData((prev) => ({
          ...prev,
          sponsorship_brochure_file: files[0],
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto pb-14 sm:static sm:bg-transparent sm:overflow-visible">
      <div className="relative p-4 sm:p-6 pt-12 sm:pt-6 bg-white rounded-lg shadow-sm sm:mb-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Close form"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isEditing ? 'Edit Opportunity' : 'Create New Opportunity'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              required
            ></textarea>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reach (Audience Size)
              </label>
              <input
                type="number"
                name="reach"
                value={formData.reach ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₹)</label>
              <input
                type="number"
                name="price_min"
                value={formData.price_range?.min ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (₹)</label>
              <input
                type="number"
                name="price_max"
                value={formData.price_range?.max ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
            <textarea
              name="benefits"
              value={formData.benefits}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Media Files (Images/Videos)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileChange(e, 'media_files')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload images or videos that showcase your Opportunity (max 5 files, up to 10MB each)
            </p>
            {formData.media_files && formData.media_files.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Selected files:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {formData.media_files.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      {formData.media_files![index].type.startsWith('image/') ? (
                        <img
                          src={preview}
                          alt={`Media preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : formData.media_files![index].type.startsWith('video/') ? (
                        <video
                          src={preview}
                          controls
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500">Unsupported file type</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isSubmitting && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#2B4B9B] h-2.5 rounded-full animate-indeterminate"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'none' }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendly Link</label>
            <input
              type="url"
              name="calendly_link"
              value={formData.calendly_link}
              onChange={handleInputChange}
              placeholder="https://calendly.com/your-link"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add your Calendly link for brands to schedule meetings with you
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Sponsorship Brochure (PDF)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileChange(e, 'sponsorship_brochure_file')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2B4B9B] focus:border-[#2B4B9B]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload a PDF of your sponsorship brochure (up to 10MB)
            </p>
            {formData.sponsorship_brochure_file && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Selected brochure: {formData.sponsorship_brochure_file.name}
                </p>
                {isSubmitting && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#2B4B9B] h-2.5 rounded-full animate-indeterminate"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${
                isSubmitting ? 'bg-gray-400' : 'bg-[#2B4B9B]'
              } text-white rounded-lg hover:${isSubmitting ? '' : 'bg-[#1a2f61]'}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </span>
              ) : isEditing ? (
                'Update Opportunity'
              ) : (
                'Create Opportunity'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}