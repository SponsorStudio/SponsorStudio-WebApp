import React from 'react';
import { Calendar } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'] & {
  opportunities?: Database['public']['Tables']['opportunities']['Row'] & {
    profiles?: Database['public']['Tables']['profiles']['Row'];
  };
  profiles?: Database['public']['Tables']['profiles']['Row'];
};

interface ScheduledMeetingsProps {
  meetings: Match[];
  isBrand: boolean;
}

export default function ScheduledMeetings({ meetings, isBrand }: ScheduledMeetingsProps) {
  // Filter only accepted matches
  const scheduledMeetings = meetings.filter(meeting => meeting.status === 'accepted');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Scheduled Meetings</h2>
      {scheduledMeetings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No meetings scheduled yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isBrand ? 'Event' : 'Brand'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meeting Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheduledMeetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {isBrand
                        ? meeting.opportunities?.title || 'Unknown Event'
                        : meeting.profiles?.company_name || 'Unknown Brand'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {meeting.meeting_scheduled_at
                      ? new Date(meeting.meeting_scheduled_at).toLocaleString()
                      : 'Not scheduled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {meeting.meeting_link ? (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2B4B9B] hover:text-[#1a2f61]"
                      >
                        Join Meeting
                      </a>
                    ) : (
                      <span className="text-gray-400">No link available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}