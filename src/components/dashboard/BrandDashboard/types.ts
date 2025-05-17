export type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  price_range: { min: number; max: number } | null;
  media_urls: string[] | null;
  video_url: string | null;
  calendly_link: string | null;
  sponsorship_brochure_url: string | null;
  category_id: string | null;
  status: string;
  verification_status: string;
};

export type Post = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price_range: { min: number; max: number } | null;
  media_urls: string[] | null;
  video_url: string | null;
  hashtags: string | null;
  reach: number | null;
  category_id: string | null;
  status: string;
  verification_status: string;
  categories: Category | null;
};

export type Category = {
  id: string;
  name: string;
};

export type Match = {
  id: string;
  opportunity_id: string;
  brand_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  meeting_scheduled_at: string | null;
  meeting_link: string | null;
  notes: string | null;
  opportunities: Opportunity & {
    profiles: {
      company_name: string | null;
      industry: string | null;
      contact_person_name: string | null;
      contact_person_phone: string | null;
      email: string | null;
    };
  };
};

export type Database = {
  public: {
    Tables: {
      opportunities: { Row: Opportunity };
      posts: { Row: Post };
      categories: { Row: Category };
      matches: { Row: Match };
      profiles: {
        Row: {
          company_name: string | null;
          industry: string | null;
          contact_person_name: string | null;
          contact_person_phone: string | null;
          email: string | null;
        };
      };
    };
  };
};