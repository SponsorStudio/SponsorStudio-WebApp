import React, { memo, useState, useEffect, useRef } from 'react';
import { DollarSign, MapPin, Users, Hash, Heart, X, Volume2, VolumeX } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { Post } from './types';

interface InfluencerPostCardProps {
  post: Post;
  onLike: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  swipeAction: 'like' | 'dislike' | null;
  onAnimationComplete: (id: string) => void;
}

const useSwipeAnimation = (
  onLike: () => Promise<void>,
  onReject: () => void
) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, 0], [1, 0]);

  useEffect(() => {
    return x.onChange(() => {});
  }, [x]);

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 100;
    try {
      if (Math.abs(info.offset.x) > swipeThreshold) {
        if (info.offset.x > swipeThreshold) {
          await onLike();
        } else if (info.offset.x < -swipeThreshold) {
          onReject();
        }
      } else {
        x.set(0, {
          type: 'spring',
          stiffness: 300,
          damping: 30
        });
      }
    } catch (error) {
      console.error('Swipe animation error:', error);
      x.set(0, true);
    }
  };

  return { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd };
};

const InfluencerPostCard: React.FC<InfluencerPostCardProps> = memo(
  ({ post, onLike, onReject, swipeAction, onAnimationComplete }) => {
    const { x, rotate, likeOpacity, dislikeOpacity, handleDragEnd } = useSwipeAnimation(
      () => onLike(post.id),
      () => onReject(post.id)
    );

    const [showFullDescription, setShowFullDescription] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showMuteIndicator, setShowMuteIndicator] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      x.set(0);
    }, [post.id, x]);

    useEffect(() => {
      let timeout: NodeJS.Timeout;
      if (showMuteIndicator) {
        timeout = setTimeout(() => {
          setShowMuteIndicator(false);
        }, 2000);
      }
      return () => clearTimeout(timeout);
    }, [showMuteIndicator]);

    useEffect(() => {
      if (!videoRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            videoRef.current.muted = isMuted;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Video playback failed:', error);
                setIsMuted(true);
                videoRef.current.muted = true;
                videoRef.current.play().catch(err => {
                  console.error('Video playback failed even when muted:', err);
                });
              });
            }
          } else {
            videoRef.current.pause();
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(videoRef.current);

      return () => {
        observer.disconnect();
      };
    }, [post.id, isMuted]);

    const handleButtonAction = async (action: 'like' | 'dislike') => {
      try {
        if (action === 'like') {
          await onLike(post.id);
        } else {
          onReject(post.id);
        }
      } catch (error) {
        console.error(`Action ${action} failed:`, error);
      }
    };

    const handleVideoClick = () => {
      if (videoRef.current) {
        const newMuteState = !isMuted;
        videoRef.current.muted = newMuteState;
        setIsMuted(newMuteState);
        setShowMuteIndicator(true);
      }
    };

    return (
      <motion.div
        key={post.id}
        className="snap-center flex-shrink-0 w-full h-[calc(100vh-150px)] sm:h-[calc(100vh-100px)] flex flex-col bg-black rounded-lg overflow-hidden"
        drag="x"
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        initial={{ 
          scale: 0.95,
          opacity: 0
        }}
        animate={{ 
          scale: 1,
          opacity: 1,
          transition: { 
            type: 'spring',
            stiffness: 200,
            damping: 25,
            mass: 0.8
          }
        }}
        exit={{
          x: swipeAction === 'like' ? '100%' : swipeAction === 'dislike' ? '-100%' : 0,
          opacity: 0,
          transition: { 
            duration: 0.3, 
            ease: 'easeOut'
          }
        }}
        style={{ 
          x, 
          rotate,
          willChange: 'transform',
          touchAction: 'pan-y'
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 25,
          mass: 0.8
        }}
        onAnimationComplete={() => {
          if (swipeAction) {
            onAnimationComplete(post.id);
          }
        }}
      >
        {/* Media Section */}
        {post.video_url ? (
          <div className="relative w-full h-full">
            <video 
              ref={videoRef}
              loop 
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
              onClick={handleVideoClick}
            >
              <source src={post.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <motion.div
              className="absolute top-4 right-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: showMuteIndicator ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={handleVideoClick}
                className="p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors duration-200"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </motion.div>
          </div>
        ) : post.media_urls && post.media_urls.length > 0 ? (
          <img
            src={post.media_urls[0]}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No media available</p>
          </div>
        )}

        {/* Like/Dislike Overlay */}
        <motion.div
          style={{ 
            opacity: likeOpacity,
            pointerEvents: 'none'
          }}
          className="absolute inset-0 flex items-center justify-center bg-green-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg transform rotate-12">
            LIKE
          </div>
        </motion.div>
        <motion.div
          style={{ 
            opacity: dislikeOpacity,
            pointerEvents: 'none'
          }}
          className="absolute inset-0 flex items-center justify-center bg-red-600/90"
        >
          <div className="text-4xl sm:text-6xl font-bold text-white border-4 border-white rounded-full px-6 py-3 shadow-lg -rotate-12">
            DISLIKE
          </div>
        </motion.div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Content Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{post.title}</h2>

          {/* Location */}
          {post.location && (
            <div className="flex items-center mb-3 text-sm sm:text-base">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>{post.location}</span>
            </div>
          )}

          {/* Price & Reach Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {post.price_range && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Budget</p>
                  <p className="text-sm sm:text-base">
                    ₹{post.price_range.min} - ₹{post.price_range.max}
                  </p>
                </div>
              </div>
            )}
            {post.reach && (
              <div className="flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <div>
                  <p className="text-xs sm:text-sm opacity-80">Reach</p>
                  <p className="text-sm sm:text-base">
                    {post.reach.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hashtags */}
          {post.hashtags && (
            <div className="flex items-center text-sm sm:text-base mb-4">
              <Hash className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>{post.hashtags}</span>
            </div>
          )}

          {/* Description */}
          <div className="text-sm sm:text-base mb-4">
            {post.description && post.description.length > 100 && !showFullDescription ? (
              <>
                {post.description.slice(0, 100)}...
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                >
                  Read more
                </button>
              </>
            ) : (
              <>
                {post.description}
                {post.description && post.description.length > 100 && (
                  <button
                    onClick={() => setShowFullDescription(false)}
                    className="text-blue-300 hover:text-blue-100 font-medium ml-1"
                  >
                    Read less
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-1/2 right-4 sm:right-6 transform -translate-y-1/2 flex flex-col gap-2">
          <button
            onClick={() => handleButtonAction('like')}
            className="p-2 bg-green-500/80 rounded-full hover:bg-green-600/90 transition-colors duration-200"
            aria-label="Like"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" />
          </button>
          <button
            onClick={() => handleButtonAction('dislike')}
            className="p-2 bg-red-500/80 rounded-full hover:bg-red-500/90 transition-colors duration-200"
            aria-label="Reject"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      </motion.div>
    );
  }
);

InfluencerPostCard.displayName = 'InfluencerPostCard';

export default InfluencerPostCard;