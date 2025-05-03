import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Building2, BarChart3, FileCheck, MessageSquare, Menu, ChevronRight, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { sendContactEmail } from './lib/email';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import ProfileCompletionDialog from './components/ProfileCompletionDialog';
import { useAuth } from './contexts/AuthContext';
import type { Database } from './lib/database.types';
import Marquee from 'react-fast-marquee';

type ClientLogo = Database['public']['Tables']['client_logos']['Row'];
type SuccessStory = Database['public']['Tables']['success_stories']['Row'];

const titles = [
  "Spend your marketing budget wisely!",
  "Find Sponsors for your event!",
  "Secure your next collaboration with us!"
];

export default function App() {
  const { user, profile, isProfileComplete, showProfileDialog, setShowProfileDialog } = useAuth();
  const navigate = useNavigate();
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [clientLogos, setClientLogos] = useState<ClientLogo[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [showAllStories, setShowAllStories] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    organization_type: ''
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const logoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentTitle = titles[currentTitleIndex];
      const shouldDelayBeforeDeleting = !isDeleting && currentText === currentTitle;
      const shouldStartNextWord = isDeleting && currentText === '';

      if (shouldStartNextWord) {
        isDeleting = false;
        setCurrentTitleIndex((prevIndex) => (prevIndex + 1) % titles.length);
        return;
      }

      if (shouldDelayBeforeDeleting) {
        timeout = setTimeout(() => {
          isDeleting = true;
          type();
        }, 2000);
        return;
      }

      const delta = isDeleting ? -1 : 1;
      currentText = isDeleting
        ? currentTitle.substring(0, currentText.length - 1)
        : currentTitle.substring(0, currentText.length + 1);

      setDisplayText(currentText);
      setIsTyping(!shouldDelayBeforeDeleting);

      const typingSpeed = isDeleting ? 50 : 100;
      timeout = setTimeout(type, typingSpeed);
    };

    timeout = setTimeout(type, 100);

    return () => clearTimeout(timeout);
  }, [currentTitleIndex]);

  useEffect(() => {
    fetchClientLogos();
    fetchSuccessStories();
  }, []);

  const fetchClientLogos = async () => {
    const { data, error } = await supabase
      .from('client_logos')
      .select('*');
    
    if (error) {
      console.error('Error fetching client logos:', error);
      return;
    }

    setClientLogos(data || []);
  };

  const fetchSuccessStories = async () => {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*');
    
    if (error) {
      console.error('Error fetching success stories:', error);
      return;
    }

    setSuccessStories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendContactEmail(formData);
      setShowThankYou(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        organization_type: ''
      });
      setTimeout(() => setShowThankYou(false), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md">
            <button 
              onClick={() => setShowAuthForm(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
            <AuthForm 
              onSuccess={() => setShowAuthForm(false)}
              onSignUpSuccess={() => {
                setShowAuthForm(false);
              }}
            />
          </div>
        </div>
      )}

      {showProfileDialog && !isProfileComplete && (
        <ProfileCompletionDialog onClose={() => setShowProfileDialog(false)} />
      )}

      <nav className="fixed w-full bg-white shadow-sm z-40">
        <div className="container mx-auto px-4 sm:px-6 py-1 sm:py-2">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex-shrink-0">
              <img 
                src="https://i.ibb.co/ZzPfwrxP/logo-final-png.png" 
                alt="Sponsor Studio" 
                className="h-12 md:h-20"
              />
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#about" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">About</a>
              <a href="#clients" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Clients</a>
              <a href="#success" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Success Stories</a>
              <a href="#contact" className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium">Contact</a>
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <Link to="/dashboard" className="flex items-center space-x-2">
                      {profile?.profile_picture_url ? (
                        <img 
                          src={profile.profile_picture_url} 
                          alt={profile.company_name || 'Profile'} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-[#2B4B9B] transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2B4B9B] flex items-center justify-center text-white border-2 border-transparent group-hover:bg-[#1a2f61] transition-colors">
                          {profile?.company_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[#2B4B9B] font-medium group-hover:text-[#1a2f61] transition-colors">
                          {profile?.company_name || 'Complete Profile'}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {profile?.user_type.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                    {!isProfileComplete && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAuthForm(true)} 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                >
                  Sign In
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#2B4B9B] hover:bg-[#2B4B9B] hover:text-white transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-2 py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#about" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
                <a 
                  href="#clients" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Clients
                </a>
                <a 
                  href="#success" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Success Stories
                </a>
                <a 
                  href="#contact" 
                  className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
                {user ? (
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {profile?.profile_picture_url ? (
                      <img 
                        src={profile.profile_picture_url} 
                        alt={profile.company_name || 'Profile'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#2B4B9B] flex items-center justify-center text-white">
                        {profile?.company_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[#2B4B9B] font-medium">
                      {profile?.company_name || 'Complete Profile'}
                    </span>
                  </Link>
                ) : (
                  <button 
                    onClick={() => {
                      setShowAuthForm(true);
                      setMobileMenuOpen(false);
                    }} 
                    className="text-[#2B4B9B] hover:text-[#1a2f61] font-medium"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="min-h-[80vh] flex items-center pt-14 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl tracking-tight font-extrabold">
              <span className="block text-[#2B4B9B] min-h-[48px] md:min-h-[60px]">
                {displayText}
                <span className={`inline-block w-0.5 h-6 md:h-8 bg-[#2B4B9B] -mb-1 ml-1 ${isTyping ? 'animate-blink' : 'opacity-0'}`} />
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Connect with the right partners for your next event. Whether you're a brand looking to sponsor or an organizer seeking sponsors, we've got you covered.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              {user ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#2B4B9B] hover:bg-[#1a2f61] md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuthForm(true)}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#2B4B9B] hover:bg-[#1a2f61] md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#15213A]">
              How We Work
            </h2>
            <p className="mt-4 text-lg text-[#6B7280]">
              Simple steps to connect brands with the right sponsorship opportunities
            </p>
          </div>

          <div className="mt-10 md:mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#2B4B9B] text-white mx-auto">
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-medium text-[#15213A]">Create Your Profile</h3>
                <p className="mt-2 text-base text-[#6B7280]">
                  Sign up and create your profile as a brand or event organizer
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#2B4B9B] text-white mx-auto">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-medium text-[#15213A]">Connect & Collaborate</h3>
                <p className="mt-2 text-base text-[#6B7280]">
                  Browse opportunities or list your event to find the perfect match
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#2B4B9B] text-white mx-auto">
                  <FileCheck className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-medium text-[#15213A]">Finalize & Execute</h3>
                <p className="mt-2 text-base text-[#6B7280]">
                  Seal the deal and bring your partnership to life
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              People Who Trust Us
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Join these amazing brands and event organizers on our platform
            </p>
          </div>

          <div className="mt-10 md:mt-16 relative marquee-blur">
            <Marquee
              gradient={false}
              speed={40}
              pauseOnHover={true}
            >
              <div className="flex items-center gap-12 px-4">
                {clientLogos.map((logo) => (
                  <div key={logo.id} className="flex-shrink-0">
                    <img
                      className="h-14 md:h-16 object-contain"
                      src={logo.logo_url}
                      alt={logo.name}
                    />
                  </div>
                ))}
              </div>
            </Marquee>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Success Stories
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Read about successful partnerships formed through our platform
            </p>
          </div>

          <div className="mt-10 md:mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(showAllStories ? successStories : successStories.slice(0, 3)).map((story) => (
              <div key={story.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105">
                <div className="flex-shrink-0">
                  <img
                    className="h-48 w-full object-cover"
                    src={story.preview_image}
                    alt={story.title}
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between bg-white p-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {story.title}
                    </h3>
                    <p className="mt-3 text-base text-gray-500">
                      {story.preview_text}
                    </p>
                  </div>
                  <div className="mt-6">
                    <Link
                      to={`/story/${story.id}`}
                      className="flex items-center text-[#2B4B9B] hover:text-[#1a2f61]"
                    >
                      Read more
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {successStories.length > 3 && (
            <div className="mt-8 md:mt-10 text-center">
              <button
                onClick={() => setShowAllStories(!showAllStories)}
                className="inline-flex items-center px-6 py-3 border border-[#2B4B9B] text-[#2B4B9B] rounded-md hover:bg-[#2B4B9B] hover:text-white transition-colors"
              >
                {showAllStories ? 'Show Less' : 'View All Stories'}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Contact Us
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Have questions? We're here to help!
            </p>
          </div>

          <div className="mt-10 md:mt-16 max-w-lg mx-auto">
            {showThankYou ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-green-800">Thank you for contacting us!</h3>
                <p className="mt-2 text-sm text-green-600">
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
                  />
                </div>

                <div>
                  <label htmlFor="organization_type" className="block text-sm font-medium text-gray-700">
                    I am a
                  </label>
                  <select
                    id="organization_type"
                    name="organization_type"
                    value={formData.organization_type}
                    onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
                    required
                  >
                    <option value="">Select one</option>
                    <option value="brand">Brand</option>
                    <option value="marketing_agency">Marketing Agency</option>
                    <option value="influencer_agency">Influencer Agency</option>
                    <option value="influencer">Influencer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2B4B9B] focus:ring-[#2B4B9B]"
                    required
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#2B4B9B] hover:bg-[#1a2f61] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2B4B9B] transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-base text-gray-400">
              © {new Date().getFullYear()} Sponsor Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}