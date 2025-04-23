export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_type: 'brand' | 'agency' | 'creator' | 'event_organizer' | 'admin';
          company_name: string | null;
          website: string | null;
          industry: string | null;
          industry_details: string | null;
          company_size: string | null;
          annual_marketing_budget: number | null;
          marketing_channels: string[] | null;
          previous_sponsorships: any | null;
          sponsorship_goals: string[] | null;
          target_audience: any | null;
          location: string | null;
          contact_person_name: string | null;
          contact_person_position: string | null;
          contact_person_phone: string | null;
          social_media: any | null;
          profile_picture_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_type: 'brand' | 'agency' | 'creator' | 'event_organizer' | 'admin';
          company_name?: string | null;
          website?: string | null;
          industry?: string | null;
          industry_details?: string | null;
          company_size?: string | null;
          annual_marketing_budget?: number | null;
          marketing_channels?: string[] | null;
          previous_sponsorships?: any | null;
          sponsorship_goals?: string[] | null;
          target_audience?: any | null;
          location?: string | null;
          contact_person_name?: string | null;
          contact_person_position?: string | null;
          contact_person_phone?: string | null;
          social_media?: any | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_type?: 'brand' | 'agency' | 'creator' | 'event_organizer' | 'admin';
          company_name?: string | null;
          website?: string | null;
          industry?: string | null;
          industry_details?: string | null;
          company_size?: string | null;
          annual_marketing_budget?: number | null;
          marketing_channels?: string[] | null;
          previous_sponsorships?: any | null;
          sponsorship_goals?: string[] | null;
          target_audience?: any | null;
          location?: string | null;
          contact_person_name?: string | null;
          contact_person_position?: string | null;
          contact_person_phone?: string | null;
          social_media?: any | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      opportunities: {
        Row: {
          id: string;
          creator_id: string;
          category_id: string;
          title: string;
          description: string;
          location: string;
          reach: number | null;
          footfall: number | null;
          start_date: string | null;
          end_date: string | null;
          price_range: any | null;
          requirements: string | null;
          benefits: string | null;
          media_urls: string[] | null;
          status: 'active' | 'paused' | 'completed';
          calendly_link: string | null;
          sponsorship_brochure_url: string | null;
          is_verified: boolean | null;
          verification_status: 'pending' | 'approved' | 'rejected';
          rejection_reason: string | null;
          ad_type: string | null;
          ad_duration: string | null;
          ad_dimensions: string | null;
          foot_traffic: number | null;
          peak_hours: any | null;
          target_demographics: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          category_id: string;
          title: string;
          description: string;
          location: string;
          reach?: number | null;
          footfall?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          price_range?: any | null;
          requirements?: string | null;
          benefits?: string | null;
          media_urls?: string[] | null;
          status?: 'active' | 'paused' | 'completed';
          calendly_link?: string | null;
          sponsorship_brochure_url?: string | null;
          is_verified?: boolean | null;
          verification_status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string | null;
          ad_type?: string | null;
          ad_duration?: string | null;
          ad_dimensions?: string | null;
          foot_traffic?: number | null;
          peak_hours?: any | null;
          target_demographics?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          category_id?: string;
          title?: string;
          description?: string;
          location?: string;
          reach?: number | null;
          footfall?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          price_range?: any | null;
          requirements?: string | null;
          benefits?: string | null;
          media_urls?: string[] | null;
          status?: 'active' | 'paused' | 'completed';
          calendly_link?: string | null;
          sponsorship_brochure_url?: string | null;
          is_verified?: boolean | null;
          verification_status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string | null;
          ad_type?: string | null;
          ad_duration?: string | null;
          ad_dimensions?: string | null;
          foot_traffic?: number | null;
          peak_hours?: any | null;
          target_demographics?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          opportunity_id: string;
          brand_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'completed';
          meeting_scheduled_at: string | null;
          meeting_link: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          opportunity_id: string;
          brand_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'completed';
          meeting_scheduled_at?: string | null;
          meeting_link?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          opportunity_id?: string;
          brand_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'completed';
          meeting_scheduled_at?: string | null;
          meeting_link?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_logos: {
        Row: {
          id: string;
          name: string;
          logo_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string;
          created_at?: string;
        };
      };
      success_stories: {
        Row: {
          id: string;
          title: string;
          preview_image: string;
          preview_text: string;
          content: string;
          media: {
            type: 'image' | 'video';
            url: string;
            caption?: string;
          }[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          preview_image: string;
          preview_text: string;
          content: string;
          media: {
            type: 'image' | 'video';
            url: string;
            caption?: string;
          }[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          preview_image?: string;
          preview_text?: string;
          content?: string;
          media?: {
            type: 'image' | 'video';
            url: string;
            caption?: string;
          }[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}