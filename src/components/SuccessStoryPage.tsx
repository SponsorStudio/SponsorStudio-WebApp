import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Menu, X } from 'lucide-react';
import type { Database } from '../lib/database.types';

type SuccessStory = Database['public']['Tables']['success_stories']['Row'];

export default function SuccessStoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<SuccessStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchStory() {
      if (!id) return;

      const { data: storyData, error: storyError } = await supabase
        .from('success_stories')
        .select('*')
        .eq('id', id)
        .single();

      if (storyError || !storyData) {
        console.error('Error fetching story:', storyError);
        return;
      }

      setStory(storyData);
      setLoading(false);
    }

    fetchStory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2B4B9B]"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Story not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed w-full bg-white shadow-sm z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <img 
              src="https://i.ibb.co/ZzPfwrxP/logo-final-png.png" 
              alt="Sponsor Studio" 
              className="h-24 cursor-pointer"
              onClick={() => navigate('/')}
            />
            <div className="hidden md:flex space-x-8">
              <Link to="/#about" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">About</Link>
              <Link to="/#clients" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Clients</Link>
              <Link to="/#success" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Success Stories</Link>
              <Link to="/#contact" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Contact</Link>
            </div>
            <button 
              className="md:hidden text-[#2B4B9B]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg py-4 px-6 transition-all duration-300">
              <div className="flex flex-col space-y-4">
                <Link 
                  to="/#about" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link 
                  to="/#clients" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Clients
                </Link>
                <Link 
                  to="/#success" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Success Stories
                </Link>
                <Link 
                  to="/#contact" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <article className="container mx-auto px-6 py-32 max-w-4xl">
        <Link 
          to="/#success" 
          className="inline-flex items-center text-[#2B4B9B] hover:text-[#1a2f61] mb-8"
        >
          ← Back to Success Stories
        </Link>
        <img
          src={story.preview_image}
          alt={story.title}
          className="w-full h-[400px] object-cover rounded-xl mb-8"
        />
        <h1 className="text-4xl font-bold text-[#2B4B9B] mb-8">{story.title}</h1>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: story.content }} />
        
        {story.media && story.media.length > 0 && (
          <div className="mt-12 grid gap-8">
            {story.media.map((media, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                {media.type === 'image' ? (
                  <img src={media.url} alt={media.caption || ''} className="w-full" />
                ) : (
                  <div className="aspect-video">
                    <iframe
                      src={media.url}
                      className="w-full h-full"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                {media.caption && (
                  <p className="text-gray-600 mt-2 text-center">{media.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}