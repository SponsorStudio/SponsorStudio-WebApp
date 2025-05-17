import React from 'react';
import { Calendar, FileText } from 'lucide-react';
import type { Opportunity } from './types';

interface MatchNotificationProps {
  showMatchSuccess: boolean;
  matchedOpportunity: Opportunity | null;
  isInfluencerTab: boolean;
}

const MatchNotification: React.FC<MatchNotificationProps> = ({
  showMatchSuccess,
  matchedOpportunity,
  isInfluencerTab,
}) => {
  if (!showMatchSuccess) return null;

  return (
    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5 text-green-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-2 sm:ml-3">
          <h3 className="text-xs sm:text-sm font-medium">
            Interest expressed successfully!
          </h3>
          <div className="mt-1 sm:mt-2 text-xs sm:text-sm">
            {isInfluencerTab ? (
              <p>
                You've expressed interest in this influencer's post. They have been
                notified and will contact you soon.
              </p>
            ) : (
              <>
                <p>
                  You've expressed interest in "{matchedOpportunity?.title}". The
                  event organizer has been notified and will contact you soon.
                </p>
                {matchedOpportunity?.calendly_link && (
                  <p className="mt-1 sm:mt-2">
                    <a
                      href={matchedOpportunity.calendly_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-700 hover:text-green-900 font-medium text-xs sm:text-sm"
                    >
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      Schedule a meeting
                    </a>
                  </p>
                )}
                {matchedOpportunity?.sponsorship_brochure_url && (
                  <p className="mt-1 sm:mt-2">
                    <a
                      href={matchedOpportunity.sponsorship_brochure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-700 hover:text-green-900 font-medium text-xs sm:text-sm"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      View sponsorship brochure
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchNotification;