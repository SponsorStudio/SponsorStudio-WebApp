import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  Target, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Match = Database['public']['Tables']['matches']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};
type FundRow = {
  CompanyName: string;
  Location: string;
  Result: string;
};

interface AnalyticsProps {
  opportunityId: string;
}

export default function EventAnalytics({ opportunityId }: AnalyticsProps) {
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [raisedAmount, setRaisedAmount] = useState<number>(0);
  const [totalSheetMatches, setTotalSheetMatches] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [fundRows, setFundRows] = useState<FundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFundingOpen, setIsFundingOpen] = useState(false);
  const [stats, setStats] = useState({
    totalMatches: 0,
    pendingMatches: 0,
    acceptedMatches: 0,
    rejectedMatches: 0,
    targetAmount: 0,
    raisedAmount: 0,
    remainingAmount: 0,
    conversionRate: 0
  });

  useEffect(() => {
    if (user && opportunityId) {
      fetchOpportunityData();
      fetchMatches();
    }
  }, [user, opportunityId]);

  useEffect(() => {
    if (opportunity && matches) {
      calculateStats();
    }
  }, [opportunity, matches, raisedAmount, totalSheetMatches, totalAmount]);

  const fetchOpportunityData = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();
      
      if (error) throw error;
      
      setOpportunity(data);
      
      if (data.sheetlink) {
        await fetchSheetData(data.sheetlink);
      } else {
        setRaisedAmount(0);
        setTotalSheetMatches(0);
        setTotalAmount(0);
        setFundRows([]);
      }
    } catch (error) {
      console.error('Error fetching opportunity data:', error);
      setRaisedAmount(0);
      setTotalSheetMatches(0);
      setTotalAmount(0);
      setFundRows([]);
      setOpportunity(null);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          profiles:brand_id (*)
        `)
        .eq('opportunity_id', opportunityId);
      
      if (error) throw error;
      
      setMatches(data as Match[]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
      setLoading(false);
    }
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const fetchSheetData = async (sheetlink: string) => {
    try {
      const spreadsheetId = extractSpreadsheetId(sheetlink);
      if (!spreadsheetId) {
        console.warn('Invalid spreadsheet URL:', sheetlink);
        setRaisedAmount(0);
        setTotalSheetMatches(0);
        setTotalAmount(0);
        setFundRows([]);
        return;
      }
      const apiUrl = `https://opensheet.elk.sh/${spreadsheetId}/Sheet1`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Find the total amount row and extract its Result
      const totalAmountRow = data.find((row: any) => 
        row.Name?.toLowerCase() === 'total amount'
      );
      const totalAmountValue = totalAmountRow && !isNaN(parseFloat(totalAmountRow.Result)) 
        ? parseFloat(totalAmountRow.Result) 
        : 0;
      
      // Filter valid rows (excluding total amount, with valid positive Result)
      const validRows = data.filter((row: any) => 
        row.Name?.toLowerCase() !== 'total amount' && 
        !isNaN(parseFloat(row.Result)) && 
        parseFloat(row.Result) > 0
      );
      
      // Calculate sum of valid rows
      const sum = validRows.reduce((acc: number, row: any) => {
        const result = parseFloat(row.Result);
        return acc + result;
      }, 0);
      
      // Map valid rows to FundRow format for table
      const fundData = validRows.map((row: any) => ({
        CompanyName: row['Company Name'] || '',
        Location: row.Location || '',
        Result: row.Result
      }));
      
      setRaisedAmount(sum);
      setTotalSheetMatches(validRows.length);
      setTotalAmount(totalAmountValue);
      setFundRows(fundData);
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      setRaisedAmount(0);
      setTotalSheetMatches(0);
      setTotalAmount(0);
      setFundRows([]);
    }
  };

  const calculateStats = () => {
    if (!opportunity) {
      setStats({
        totalMatches: 0,
        pendingMatches: 0,
        acceptedMatches: 0,
        rejectedMatches: 0,
        targetAmount: 0,
        raisedAmount: 0,
        remainingAmount: 0,
        conversionRate: 0
      });
      return;
    }

    const totalMatches = totalSheetMatches;
    const pendingMatches = matches.filter(m => m.status === 'pending').length;
    const acceptedMatches = matches.filter(m => m.status === 'accepted').length;
    const rejectedMatches = matches.filter(m => m.status === 'rejected').length;
    
    const targetAmount = totalAmount;
    const effectiveRaisedAmount = raisedAmount || 0;
    const remainingAmount = targetAmount - effectiveRaisedAmount;
    
    const conversionRate = totalMatches > 0 
      ? (acceptedMatches / totalMatches) * 100 
      : 0;
    
    setStats({
      totalMatches,
      pendingMatches,
      acceptedMatches,
      rejectedMatches,
      targetAmount,
      raisedAmount: effectiveRaisedAmount,
      remainingAmount,
      conversionRate
    });
  };

  const toggleFundingAccordion = () => {
    setIsFundingOpen(!isFundingOpen);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2B4B9B]"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Opportunity not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analytics for {opportunity.title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-800">Total Matches</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900">{stats.totalMatches}</p>
          <div className="mt-2 text-sm text-blue-700">
            <span className="font-medium">Conversion Rate:</span> {stats.conversionRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <DollarSign className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-800">Raised Amount</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">₹{stats.raisedAmount.toLocaleString()}</p>
          <div className="mt-2 text-sm text-green-700">
            <span className="font-medium">Target:</span> ₹{stats.targetAmount.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Target className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-yellow-800">Remaining Goal</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-900">₹{stats.remainingAmount.toLocaleString()}</p>
          <div className="mt-2 text-sm text-yellow-700">
            <span className="font-medium">Progress:</span> {stats.targetAmount > 0 ? ((stats.raisedAmount / stats.targetAmount) * 100).toFixed(1) : 0}%
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-medium text-purple-800">Pending Matches</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">{stats.pendingMatches}</p>
          <div className="mt-2 text-sm text-purple-700">
            <span className="font-medium">Potential Value:</span> ₹{(stats.pendingMatches * (stats.targetAmount / 5)).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Fundraising Progress</h3>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-green-600">
                {stats.targetAmount > 0 ? ((stats.raisedAmount / stats.targetAmount) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
            <div 
              style={{ width: `${stats.targetAmount > 0 ? ((stats.raisedAmount / stats.targetAmount) * 100) : 0}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>₹0</span>
            <span>₹{(stats.targetAmount / 4).toLocaleString()}</span>
            <span>₹{(stats.targetAmount / 2).toLocaleString()}</span>
            <span>₹{((stats.targetAmount / 4) * 3).toLocaleString()}</span>
            <span>₹{stats.targetAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Match Status Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-xl font-bold text-yellow-900">{stats.pendingMatches}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-green-700">Accepted</p>
              <p className="text-xl font-bold text-green-900">{stats.acceptedMatches}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-red-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-red-700">Rejected</p>
              <p className="text-xl font-bold text-red-900">{stats.rejectedMatches}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Matches</h3>
        {matches.length === 0 ? (
          <p className="text-gray-600">No matches yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.slice(0, 5).map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {match.profiles?.company_name || 'Unknown Company'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {match.profiles?.contact_person_name || match.profiles?.industry || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        match.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : match.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(match.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-8">
        <button
          onClick={toggleFundingAccordion}
          className="flex items-center w-full text-left text-lg font-bold text-gray-800 mb-4 focus:outline-none"
        >
          <ChevronDown className={`w-5 h-5 mr-2 transform transition-transform ${isFundingOpen ? 'rotate-180' : ''}`} />
          Funding Contributions
        </button>
        {isFundingOpen && (
          <div className="transition-all duration-300">
            {fundRows.length === 0 ? (
              <p className="text-gray-600">No funds raised yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fundRows.map((row, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.CompanyName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.Location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{parseFloat(row.Result).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {' '}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ₹{raisedAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}