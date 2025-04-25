import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Clock,
  Search,
  LogOut,
  UserCog,
  ClipboardList,
  Settings as SettingsIcon,
  LayoutDashboard,
  Briefcase,
  Link as LinkIcon
} from 'lucide-react';
import Opportunities from './Opportunities';
import MatchedOpportunities from './MatchedOpportunities';
import ManageUsers from './ManageUsers';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalMatches: 0,
    pendingMatches: 0,
    acceptedMatches: 0,
    rejectedMatches: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch stats for opportunities and matches when the dashboard loads
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // Fetch opportunities stats
        const { data: oppStatsData, error: oppStatsError } = await supabase
          .from('opportunities')
          .select('verification_status');
        
        if (oppStatsError) throw oppStatsError;

        const normalizedOppStats = oppStatsData.map(item => ({
          ...item,
          verification_status: item.verification_status?.trim().toLowerCase() ?? 'pending'
        }));

        // Fetch matches stats
        const { data: matchStatsData, error: matchStatsError } = await supabase
          .from('matches')
          .select('status');
        
        if (matchStatsError) throw matchStatsError;

        const normalizedMatchStats = matchStatsData?.map(item => ({
          ...item,
          status: item.status?.trim().toLowerCase()
        })) || [];

        setStats({
          total: normalizedOppStats.length,
          pending: normalizedOppStats.filter(o => o.verification_status === 'pending').length,
          approved: normalizedOppStats.filter(o => o.verification_status === 'approved').length,
          rejected: normalizedOppStats.filter(o => o.verification_status === 'rejected').length,
          totalMatches: normalizedMatchStats.length,
          pendingMatches: normalizedMatchStats.filter(m => m.status === 'pending').length,
          acceptedMatches: normalizedMatchStats.filter(m => m.status === 'accepted').length,
          rejectedMatches: normalizedMatchStats.filter(m => m.status === 'rejected').length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 bg-white shadow-lg h-screen fixed">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h2>
          <nav className="space-y-2">
            <Link
              to="/admin/dashboard"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link
              to="/admin/opportunities"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Briefcase className="w-5 h-5 mr-3" />
              Opportunities
            </Link>
            <Link
              to="/admin/matched-opportunities"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LinkIcon className="w-5 h-5 mr-3" />
              Matched Opportunities
            </Link>
            <Link
              to="/admin/manage-users"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <UserCog className="w-5 h-5 mr-3" />
              Manage Users
            </Link>
            <Link
              to="/admin/manage-events"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ClipboardList className="w-5 h-5 mr-3" />
              Manage Events
            </Link>
            <Link
              to="/admin/settings"
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <SettingsIcon className="w-5 h-5 mr-3" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg mt-4"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>
      </div>

      <div className="ml-64 w-full p-6">
        <Routes>
          <Route
            path="/dashboard"
            element={
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage and verify opportunities and matches</p>
                  </div>
                </div>

                {loadingStats ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading stats...</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Opportunities Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Opportunities</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                          </div>
                          <BarChart3 className="text-blue-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Pending Review</p>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                          </div>
                          <Clock className="text-yellow-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Approved</p>
                            <p className="text-2xl font-bold">{stats.approved}</p>
                          </div>
                          <CheckCircle className="text-green-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Rejected</p>
                            <p className="text-2xl font-bold">{stats.rejected}</p>
                          </div>
                          <XCircle className="text-red-500" size={24} />
                        </div>
                      </div>
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Matches Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Matches</p>
                            <p className="text-2xl font-bold">{stats.totalMatches}</p>
                          </div>
                          <BarChart3 className="text-blue-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Pending Matches</p>
                            <p className="text-2xl font-bold">{stats.pendingMatches}</p>
                          </div>
                          <Clock className="text-yellow-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Accepted Matches</p>
                            <p className="text-2xl font-bold">{stats.acceptedMatches}</p>
                          </div>
                          <CheckCircle className="text-green-500" size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Rejected Matches</p>
                            <p className="text-2xl font-bold">{stats.rejectedMatches}</p>
                          </div>
                          <XCircle className="text-red-500" size={24} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            }
          />
          <Route
            path="/opportunities"
            element={
              <Opportunities 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                stats={stats}
                setStats={(newStats) => setStats(prev => ({ ...prev, ...newStats }))}
              />
            }
          />
          <Route
            path="/matched-opportunities"
            element={
              <MatchedOpportunities 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                stats={stats}
                setStats={(newStats) => setStats(prev => ({ ...prev, ...newStats }))}
              />
            }
          />
           <Route
            path="/manage-users"
            element={
              <ManageUsers 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            }
          />
          <Route
            path="*"
            element={<div className="text-center mt-8">Page Not Found</div>}
          />
        </Routes>
      </div>
    </div>
  );
}