import React from 'react';
import { Briefcase, Calendar, CalendarPlus, CheckCircle, Clock, Frown, Sparkles, Video } from 'lucide-react';
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

  // Function to generate Google Calendar event link
  const generateGoogleCalendarLink = (meeting: Match) => {
    const event = {
      title: `Meeting for ${isBrand ? meeting.opportunities?.title || 'Opportunity' : meeting.profiles?.company_name || 'Brand Meeting'}`,
      description: `Meeting with ${isBrand ? 'creator' : 'brand'}.\nJoin Meeting: ${meeting.meeting_link || ''}`,
      start: meeting.meeting_scheduled_at || new Date().toISOString(),
      end: meeting.meeting_scheduled_at 
        ? new Date(new Date(meeting.meeting_scheduled_at).getTime() + 60 * 60 * 1000).toISOString() 
        : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      location: meeting.meeting_link || 'TBD',
    };

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const startTime = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0];
    const dates = `${startTime}%2F${endTime}`; // Use %2F directly for date separator

    // Encode the description directly, letting encodeURIComponent handle \n to %0A conversion
    const encodedDescription = encodeURIComponent(event.description.trim());

    // Construct the URL manually to avoid double-encoding
    const params = [
      `action=TEMPLATE`,
      `text=${encodeURIComponent(event.title.trim()).replace(/%20/g, '+')}`, // Replace %20 with + for spaces in text
      `dates=${dates}`, // Already formatted with %2F
      `details=${encodedDescription}`, // Encode description with \n converted to %0A
      `location=${encodeURIComponent(event.location.trim())}`, // Encode location
    ];

    return `${baseUrl}?${params.join('&')}`;
  };

  // Common content for both mobile and desktop views
  const content = (
    <>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Scheduled Meetings</h2>
      {scheduledMeetings.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <div className="flex justify-center space-x-2 mb-3 sm:mb-4">
            <Calendar className="w-8 h-8 sm:w-8 sm:h-8 text-gray-400" />
            <Frown className="w-8 h-8 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 text-base sm:text-base">No meetings scheduled yet.</p>
        </div>
      ) : (
        <div>
          {/* Table layout for larger screens */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isBrand ? 'Event' : 'Brand'}
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting Time
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledMeetings.map((meeting) => (
                  <tr key={meeting.id}>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[200px]">
                        {isBrand ? (
                          <Sparkles className="w-4 h-4 text-gray-500 mr-1.5" />
                        ) : (
                          <Briefcase className="w-4 h-4 text-gray-500 mr-1.5" />
                        )}
                        {isBrand
                          ? meeting.opportunities?.title || 'Unknown Event'
                          : meeting.profiles?.company_name || 'Unknown Brand'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                        {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-500 mr-1.5" />
                        {meeting.meeting_scheduled_at
                          ? new Date(meeting.meeting_scheduled_at).toLocaleString()
                          : 'Not scheduled'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm space-x-2 sm:space-x-3">
                      {meeting.meeting_link ? (
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-[#2B4B9B] text-white text-sm font-medium rounded-md hover:bg-[#1a2f61] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B]"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join Meeting
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Our team will schedule a meeting shortly</span>
                      )}
                      {meeting.meeting_scheduled_at && meeting.meeting_link && (
                        <a
                          href={generateGoogleCalendarLink(meeting)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-[#2B4B9B] text-white text-sm font-medium rounded-md hover:bg-[#1a2f61] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B]"
                        >
                          <CalendarPlus className="w-4 h-4 mr-1" />
                          Add to Calendar
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card layout for mobile screens */}
          <div className="block sm:hidden space-y-6 pb-8">
            {scheduledMeetings.map((meeting, index) => (
              <div
                key={meeting.id}
                className={`border border-gray-100 rounded-xl p-5 max-w-full overflow-hidden ${
                  index === scheduledMeetings.length - 1 ? 'mb-4' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center text-sm font-medium text-gray-900 truncate max-w-[170px]">
                    {isBrand ? (
                      <Sparkles className="w-4 h-4 text-gray-500 mr-1" />
                    ) : (
                      <Briefcase className="w-4 h-4 text-gray-500 mr-1" />
                    )}
                    {isBrand
                      ? meeting.opportunities?.title || 'Unknown Event'
                      : meeting.profiles?.company_name || 'Unknown Brand'}
                  </div>
                  <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 inline-flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                    {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <Clock className="w-4 h-4 text-gray-500 mr-1" />
                  {meeting.meeting_scheduled_at
                    ? new Date(meeting.meeting_scheduled_at).toLocaleString()
                    : 'Not scheduled'}
                </div>
                <div className="flex flex-row gap-2">
                  {meeting.meeting_link ? (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-1.5 py-2 bg-[#2B4B9B] text-white text-sm font-medium rounded-md hover:bg-[#1a2f61] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] truncate"
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Join Meeting
                    </a>
                  ) : (
                    <span className="flex-1 text-gray-400 text-sm text-center">Our team will schedule a meeting shortly</span>
                  )}
                  {meeting.meeting_scheduled_at && meeting.meeting_link && (
                    <a
                      href={generateGoogleCalendarLink(meeting)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-1.5 py-2 bg-[#2B4B9B] text-white text-sm font-medium rounded-md hover:bg-[#1a2f61] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] truncate"
                    >
                      <CalendarPlus className="w-4 h-4 mr-1" />
                      Add to Calendar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop view with outer container */}
      <div className="hidden sm:block bg-white rounded-lg shadow p-4 sm:p-6">
        {content}
      </div>
      {/* Mobile view without outer container */}
      <div className="block sm:hidden">
        {content}
      </div>
    </>
  );
}