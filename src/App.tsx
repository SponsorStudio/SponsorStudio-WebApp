import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Building2, FileCheck, MessageSquare, Menu, ChevronRight, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { sendContactEmail } from './lib/email';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import ProfileCompletionDialog from './components/ProfileCompletionDialog';
import { useAuth } from './contexts/AuthContext';
import type { Database } from './lib/database.types';
import Marquee from 'react-fast-marquee';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

gsap.registerPlugin(ScrollTrigger);

type ClientLogo = Database['public']['Tables']['client_logos']['Row'];
type SuccessStory = Database['public']['Tables']['success_stories']['Row'];

const titles = [
  "Spend your marketing budget wisely!",
  "Find Sponsors for your event!",
  "Secure your next collaboration with us!"
];

// Hero Component
const HeroSection: React.FC<{ user: any; setShowAuthForm: (value: boolean) => void }> = ({ user, setShowAuthForm }) => {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  useEffect(() => {
    gsap.fromTo(
      heroRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: heroRef.current, fastScrollEnd: true } }
    );

    gsap.fromTo(
      textRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1.2, ease: 'power4.out', delay: 0.2 }
    );

    gsap.fromTo(
      buttonRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.4 }
    );

    if (buttonRef.current) {
      buttonRef.current.addEventListener('mouseenter', () => {
        gsap.to(buttonRef.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
      });
      buttonRef.current.addEventListener('mouseleave', () => {
        gsap.to(buttonRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    }

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

    return () => {
      clearTimeout(timeout);
      if (buttonRef.current) {
        buttonRef.current.removeEventListener('mouseenter', () => {});
        buttonRef.current.removeEventListener('mouseleave', () => {});
      }
    };
  }, [currentTitleIndex]);

  return (
    <div ref={heroRef} className="min-h-[80vh] flex items-center pt-20 relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 ref={textRef} className="text-5xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
          <span className="block text-[#2B4B9B] min-h-[60px] lg:min-h-[72px]">
            {displayText}
            <span className={`inline-block w-0.5 h-8 lg:h-10 bg-[#2B4B9B] -mb-1 ml-1 ${isTyping ? 'animate-blink' : 'opacity-0'}`} />
          </span>
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg sm:text-xl text-gray-600">
          Connect with the right partners for your next event. Whether you're a brand or an organizer, we've got you covered.
        </p>
        <div className="mt-8">
          {user ? (
            <Link
              ref={buttonRef as React.RefObject<HTMLAnchorElement>}
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-[#2B4B9B] text-white text-lg sm:text-base rounded-full hover:bg-[#1F3A7A] will-change-transform"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          ) : (
            <button
              ref={buttonRef as React.RefObject<HTMLButtonElement>}
              onClick={() => setShowAuthForm(true)}
              className="inline-flex items-center px-6 py-3 bg-[#2B4B9B] text-white text-lg sm:text-base rounded-full hover:bg-[#1F3A7A] will-change-transform"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// How We Work Step Component
const Step: React.FC<{ icon: React.ReactNode; title: string; description: string; index: number }> = ({ icon, title, description, index }) => {
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      stepRef.current,
      { opacity: 0, y: 50, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: stepRef.current, start: 'top 85%', fastScrollEnd: true },
        delay: index * 0.2,
      }
    );
  }, [index]);

  return (
    <div ref={stepRef} className="text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#2B4B9B] text-white mx-auto shadow-md transform will-change-transform hover:scale-110 transition-transform duration-200 ease-out">
        {icon}
      </div>
      <h3 className="mt-6 text-2xl sm:text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-lg sm:text-base text-gray-600">{description}</p>
    </div>
  );
};

// Client Logo Component
const ClientLogo: React.FC<{ logo: ClientLogo }> = ({ logo }) => {
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, x: 20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        scrollTrigger: { trigger: logoRef.current, start: 'top 90%', fastScrollEnd: true },
      }
    );
  }, []);

  return (
    <div ref={logoRef} className="flex-shrink-0 px-4">
      <img className="h-14 md:h-16 object-contain" src={logo.logo_url} alt={logo.name} loading="lazy" />
    </div>
  );
};

// Success Story Component
const SuccessStoryCard: React.FC<{ story: SuccessStory }> = ({ story }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: cardRef.current, start: 'top 85%', fastScrollEnd: true },
      }
    );

    const card = cardRef.current;
    if (card) {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    }

    return () => {
      if (card) {
        card.removeEventListener('mouseenter', () => {});
        card.removeEventListener('mouseleave', () => {});
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-transform duration-200 ease-out bg-white"
    >
      <img className="h-48 w-full object-cover" src={story.preview_image} alt={story.title} loading="lazy" />
      <div className="flex-1 p-6">
        <h3 className="text-2xl sm:text-xl font-semibold text-gray-900">{story.title}</h3>
        <p className="mt-3 text-lg sm:text-base text-gray-600">{story.preview_text}</p>
        <Link
          to={`/story/${story.id}`}
          className="mt-6 flex items-center text-[#2B4B9B] hover:text-[#1F3A7A] text-lg sm:text-base transition-colors duration-200 ease-out"
        >
          Read more <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

// Contact Form Component
const ContactForm: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
  showThankYou: boolean;
  setShowThankYou: (value: boolean) => void;
}> = ({ formData, setFormData, showThankYou, setShowThankYou }) => {
  const formRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: formRef.current, start: 'top 80%', fastScrollEnd: true },
      }
    );

    const inputs = formRef.current?.querySelectorAll('input, textarea, select');
    if (inputs) {
      gsap.fromTo(
        inputs,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: formRef.current, start: 'top 80%', fastScrollEnd: true },
        }
      );
    }

    if (buttonRef.current) {
      buttonRef.current.addEventListener('mouseenter', () => {
        gsap.to(buttonRef.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
      });
      buttonRef.current.addEventListener('mouseleave', () => {
        gsap.to(buttonRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    }

    return () => {
      if (buttonRef.current) {
        buttonRef.current.removeEventListener('mouseenter', () => {});
        buttonRef.current.removeEventListener('mouseleave', () => {});
      }
    };
  }, []);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await sendContactEmail(formData);
      setShowThankYou(true);
      setFormData({ name: '', email: '', phone: '', message: '', organization_type: '' });
      setTimeout(() => setShowThankYou(false), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div ref={formRef} className="max-w-2xl mx-auto mt-12">
      {showThankYou ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center animate-fadeIn shadow-lg">
          <h3 className="text-2xl sm:text-xl font-semibold text-green-800">Thank you for contacting us!</h3>
          <p className="mt-3 text-lg sm:text-base text-green-600">We'll get back to you as soon as possible.</p>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <h3 className="text-3xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">Get in Touch</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#2B4B9B] focus:ring-0 text-lg sm:text-base transition-colors duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Your email"
                className="block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#2B4B9B] focus:ring-0 text-lg sm:text-base transition-colors duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Your phone number"
                className="block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#2B4B9B] focus:ring-0 text-lg sm:text-base transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="organization_type" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">I am a</label>
              <select
                id="organization_type"
                value={formData.organization_type}
                onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                className="block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-[#2B4B9B] focus:ring-0 text-lg sm:text-base transition-colors duration-200"
                required
              >
                <option value="">Select one</option>
                <option value="brand">Brand</option>
                <option value="marketing_agency">Marketing Agency</option>
                <option value="influencer_agency">Influencer Agency</option>
                <option value="influencer">Influencer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="message" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                id="message"
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Your message"
                className="block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#2B4B9B] focus:ring-0 text-lg sm:text-base transition-colors duration-200"
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                ref={buttonRef}
                onClick={handleSubmit}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#2B4B9B] to-[#1F3A7A] text-white rounded-lg font-medium hover:from-[#1F3A7A] hover:to-[#13295A] text-lg sm:text-base will-change-transform"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { user, profile, isProfileComplete, showProfileDialog, setShowProfileDialog } = useAuth();
  const navigate = useNavigate();
  const [clientLogos, setClientLogos] = useState<ClientLogo[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStories, setShowAllStories] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    organization_type: '',
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    console.log('App mounted', { user, profile, isProfileComplete, showProfileDialog });
    
    gsap.fromTo(
      navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
    );

    if (signInButtonRef.current) {
      signInButtonRef.current.addEventListener('mouseenter', () => {
        gsap.to(signInButtonRef.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
      });
      signInButtonRef.current.addEventListener('mouseleave', () => {
        gsap.to(signInButtonRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    }

    if (mobileMenuButtonRef.current) {
      mobileMenuButtonRef.current.addEventListener('mouseenter', () => {
        gsap.to(mobileMenuButtonRef.current, { scale: 1.1, duration: 0.2, ease: 'power2.out' });
      });
      mobileMenuButtonRef.current.addEventListener('mouseleave', () => {
        gsap.to(mobileMenuButtonRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchClientLogos(), fetchSuccessStories()]);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      if (signInButtonRef.current) {
        signInButtonRef.current.removeEventListener('mouseenter', () => {});
        signInButtonRef.current.removeEventListener('mouseleave', () => {});
      }
      if (mobileMenuButtonRef.current) {
        mobileMenuButtonRef.current.removeEventListener('mouseenter', () => {});
        mobileMenuButtonRef.current.removeEventListener('mouseleave', () => {});
      }
    };
  }, []);

  const fetchClientLogos = async () => {
    const { data, error } = await supabase.from('client_logos').select('*');
    if (error) {
      console.error('Error fetching client logos:', error);
      throw error;
    }
    console.log('Client logos fetched:', data);
    setClientLogos(data || []);
  };

  const fetchSuccessStories = async () => {
    const { data, error } = await supabase.from('success_stories').select('*');
    if (error) {
      console.error('Error fetching success stories:', error);
      throw error;
    }
    console.log('Success stories fetched:', data);
    setSuccessStories(data || []);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#2B4B9B] text-white rounded-lg hover:bg-[#1F3A7A]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowAuthForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 will-change-transform"
            >
              <X className="h-6 w-6" />
            </button>
            <AuthForm onSuccess={() => setShowAuthForm(false)} onSignUpSuccess={() => setShowAuthForm(false)} />
          </div>
        </div>
      )}

      {showProfileDialog && !isProfileComplete && (
        <ProfileCompletionDialog onClose={() => setShowProfileDialog(false)} />
      )}

      <nav ref={navRef} className="fixed w-full bg-white shadow-md z-40">
        <div className="container mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex-shrink-0">
              <img
                src="https://i.ibb.co/ZzPfwrxP/logo-final-png.png"
                alt="Sponsor Studio"
                className="h-12 md:h-16"
              />
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#about" className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium transition-colors text-lg sm:text-base">
                About
              </a>
              <a href="#clients" className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium transition-colors text-lg sm:text-base">
                Clients
              </a>
              <a href="#success" className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium transition-colors text-lg sm:text-base">
                Success Stories
              </a>
              <a href="#contact" className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium transition-colors text-lg sm:text-base">
                Contact
              </a>
              {user ? (
                <Link to="/dashboard" className="flex items-center space-x-2 group">
                  {profile?.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt={profile.company_name || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-[#2B4B9B] transition-colors duration-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2B4B9B] flex items-center justify-center text-white group-hover:bg-[#1F3A7A] transition-colors duration-200 text-lg sm:text-base">
                      {profile?.company_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[#2B4B9B] font-medium group-hover:text-[#1F3A7A] transition-colors text-lg sm:text-base">
                      {profile?.company_name || 'Complete Profile'}
                    </span>
                    <span className="text-sm sm:text-xs text-gray-500 capitalize">{profile?.user_type.replace('_', ' ')}</span>
                  </div>
                  {!isProfileComplete && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </Link>
              ) : (
                <button
                  ref={signInButtonRef}
                  onClick={() => setShowAuthForm(true)}
                  className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg sm:text-base will-change-transform"
                >
                  Sign In
                </button>
              )}
            </div>
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#2B4B9B] hover:bg-[#2B4B9B] hover:text-white will-change-transform"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-gray-200 animate-slideIn">
              <div className="flex flex-col space-y-4">
                <a
                  href="#about"
                  className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
                <a
                  href="#clients"
                  className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Clients
                </a>
                <a
                  href="#success"
                  className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Success Stories
                </a>
                <a
                  href="#contact"
                  className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg transition-colors duration-200"
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
                      <div className="w-8 h-8 rounded-full bg-[#2B4B9B] flex items-center justify-center text-white text-lg">
                        {profile?.company_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[#2B4B9B] font-medium text-lg">{profile?.company_name || 'Complete Profile'}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthForm(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-[#2B4B9B] hover:text-[#1F3A7A] font-medium text-lg transition-colors duration-200"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <HeroSection user={user} setShowAuthForm={setShowAuthForm} />

      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">How We Work</h2>
            <p className="mt-4 text-xl sm:text-lg text-gray-600">
              Simple steps to connect brands with the right sponsorship opportunities
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Building2 className="h-8 w-8" />,
                title: 'Create Your Profile',
                description: 'Sign up and create your profile as a brand or event organizer',
              },
              {
                icon: <MessageSquare className="h-8 w-8" />,
                title: 'Connect & Collaborate',
                description: 'Browse opportunities or list your event to find the perfect match',
              },
              {
                icon: <FileCheck className="h-8 w-8" />,
                title: 'Finalize & Execute',
                description: 'Seal the deal and bring your partnership to life',
              },
            ].map((step, index) => (
              <Step key={index} icon={step.icon} title={step.title} description={step.description} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">People Who Trust Us</h2>
            <p className="mt-4 text-xl sm:text-lg text-gray-600">Join these amazing brands and event organizers on our platform</p>
          </div>
          <div className="mt-16">
            {loading ? (
              <div className="flex justify-center space-x-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} width={100} height={56} className="md:h-16" />
                ))}
              </div>
            ) : (
              <Marquee gradient={true} gradientColor={[249, 250, 252]} speed={40} pauseOnHover={true}>
                {clientLogos.map((logo) => (
                  <ClientLogo key={logo.id} logo={logo} />
                ))}
              </Marquee>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">Success Stories</h2>
            <p className="mt-4 text-xl sm:text-lg text-gray-600">Read about successful partnerships formed through our platform</p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col rounded-lg shadow-lg bg-white">
                  <Skeleton height={192} />
                  <div className="p-6">
                    <Skeleton width="80%" height={24} className="mb-3" />
                    <Skeleton count={2} height={16} className="mb-2" />
                    <Skeleton width={100} height={16} />
                  </div>
                </div>
              ))
            ) : (
              (showAllStories ? successStories : successStories.slice(0, 3)).map((story) => (
                <SuccessStoryCard key={story.id} story={story} />
              ))
            )}
          </div>
          {successStories.length > 3 && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setShowAllStories(!showAllStories)}
                className="inline-flex items-center px-6 py-3 border border-[#2B4B9B] text-[#2B4B9B] rounded-full hover:bg-[#2B4B9B] hover:text-white text-lg sm:text-base will-change-transform"
              >
                {showAllStories ? 'Show Less' : 'View All Stories'}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">Contact Us</h2>
            <p className="mt-4 text-xl sm:text-lg text-gray-600">Have questions? We're here to help!</p>
          </div>
          <ContactForm
            formData={formData}
            setFormData={setFormData}
            showThankYou={showThankYou}
            setShowThankYou={setShowThankYou}
          />
        </div>
      </section>

      <footer className="bg-white py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg sm:text-base text-gray-400">© {new Date().getFullYear()} Sponsor Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;