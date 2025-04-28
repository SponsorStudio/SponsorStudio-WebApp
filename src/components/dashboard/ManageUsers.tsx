import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { UserCog, Trash2, Edit, Search } from 'lucide-react';
import Modal from './../Modal';

interface Profile {
  id: string;
  user_type: string | null;
  company_name: string | null;
  website: string | null;
  industry: string | null;
  annual_marketing_budget: number | null;
  target_audience: string | null;
  location: string | null;
  created_at: string | null;
  updated_at: string | null;
  industry_details: string | null;
  company_size: string | null;
  marketing_channels: string | null;
  previous_sponsorships: any | null;
  sponsorship_goals: string | null;
  contact_person_name: string | null;
  contact_person_position: string | null;
  contact_person_phone: string | null;
  social_media: any | null;
  profile_picture_url: string | null;
  phone_number: string | null;
  phone_number_verified: boolean | null;
  email?: string | null;
}

interface ManageUsersProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

interface UserTypeCount {
  user_type: string | null;
  count: number;
}

export default function ManageUsers({ searchTerm: externalSearchTerm, setSearchTerm: setExternalSearchTerm }: ManageUsersProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm || '');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userTypeCounts, setUserTypeCounts] = useState<UserTypeCount[]>([]);

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (setExternalSearchTerm) {
      setExternalSearchTerm(newSearchTerm);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserTypeCounts();
  }, []);

  const fetchUserEmail = async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch('https://urablfvmqregyvfyaovi.supabase.co/functions/v1/get-user-email', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWJsZnZtcXJlZ3l2Znlhb3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3MjYzNzIsImV4cCI6MjA1NDMwMjM3Mn0.QUBLQ_GxMWBCBiYEc3hCr1CwzFiQzudHpAfvR9OKME4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch email for user ${userId}:`, errorData);
        throw new Error(`Failed to fetch email for user ${userId}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Email response for user ${userId}:`, data);
      return data.email || null;
    } catch (error) {
      console.error(`Error fetching email for user ${userId}:`, error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching users from Supabase...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_type', 'admin'); // Exclude users with user_type='admin'

      if (profilesError) {
        console.error('Supabase fetch error (profiles):', profilesError);
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      console.log('Raw profiles data from Supabase:', profilesData);

      if (!profilesData || profilesData.length === 0) {
        console.warn('No profiles data returned from Supabase');
        setUsers([]);
        return;
      }

      const enrichedProfiles: Profile[] = [];
      for (const profile of profilesData) {
        const email = await fetchUserEmail(profile.id);
        enrichedProfiles.push({ ...profile, email });
      }

      console.log('Enriched profiles with emails:', enrichedProfiles);
      setUsers(enrichedProfiles);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTypeCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .neq('user_type', 'admin'); // Exclude user_type='admin'

      if (error) {
        console.error('Supabase fetch error (user type counts):', error);
        throw new Error(`Failed to fetch user type counts: ${error.message}`);
      }

      // Aggregate counts by user_type
      const userTypeMap = new Map<string | null, number>();
      data.forEach(item => {
        const userType = item.user_type || 'Unknown';
        userTypeMap.set(userType, (userTypeMap.get(userType) || 0) + 1);
      });

      const counts: UserTypeCount[] = Array.from(userTypeMap.entries()).map(([user_type, count]) => ({
        user_type,
        count
      }));

      console.log('User type counts from Supabase:', counts);
      setUserTypeCounts(counts);
    } catch (error) {
      console.error('Error in fetchUserTypeCounts:', error);
      toast.error('Failed to load user type counts');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
      fetchUserTypeCounts();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const openModal = (userId: string) => {
    setUserToDelete(userId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUserToDelete(null);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      handleDeleteUser(userToDelete);
    }
    closeModal();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearchTerm =
      !searchTerm ||
      (user.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    console.log(`Filtering user ID ${user.id}:`, {
      contact_person_name: user.contact_person_name,
      company_name: user.company_name,
      email: user.email,
      matchesSearchTerm
    });

    return matchesSearchTerm;
  });

  console.log('Filtered users:', filteredUsers);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
      </div>

      {/* Tiles for user type counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-800">Total Users</h3>
          <p className="text-2xl font-bold text-blue-600">{users.length}</p>
        </div>
        {userTypeCounts.map((count, index) => {
          const userTypeLabel = count.user_type === 'brand' ? 'Brands' :
                             count.user_type === 'event_organizer' ? 'Event Organizers' :
                             count.user_type === 'agency' ? 'Agencies' :
                             count.user_type === 'creator' ? 'Creators' :
                             'Unknown';
          return (
            <div
              key={count.user_type || 'unknown'}
              className={`p-4 rounded-lg text-center ${getTileColor(index)}`}
            >
              <h3 className="text-lg font-semibold text-blue-800">{userTypeLabel}</h3>
              <p className="text-2xl font-bold text-blue-600">{count.count}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name, email, or company..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      ) : error ? (
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-600">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-blue-200">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-blue-200">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-blue-200">Company</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-blue-200">Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    {user.contact_person_name || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    {user.email || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    {user.company_name || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    {user.user_type || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => alert(`Edit user ${user.contact_person_name} (ID: ${user.id})`)}
                        className="px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openModal(user.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 text-white hover:bg-red-700"
        cancelButtonClass="border-gray-300 text-gray-700 hover:bg-gray-50"
      />
    </div>
  );
}

const getTileColor = (index: number) => {
  const colors = [
    'bg-green-200',  // Brands
    'bg-red-300',   // Creators
    'bg-yellow-200', // Event Organizers
    'bg-purple-200', // Agencies
  ];
  return colors[index % colors.length] || 'bg-blue-100'; // Fallback to bg-blue-100
};