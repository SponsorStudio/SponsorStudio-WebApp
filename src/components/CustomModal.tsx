import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  customStyles?: React.CSSProperties;
  showCloseButton?: boolean;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  customStyles = {},
  showCloseButton = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Prevent background scrolling
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    if (isOpen) {
      setIsVisible(true);
      // Trigger animation after mount
      const animationFrame = requestAnimationFrame(() => {
        setAnimate(true);
      });
      // Prevent scrolling
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        cancelAnimationFrame(animationFrame);
        window.removeEventListener('wheel', preventScroll);
        window.removeEventListener('touchmove', preventScroll);
      };
    } else {
      setAnimate(false);
      // Delay unmount to allow closing animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const defaultStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '32rem',
    minHeight: '10rem',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const combinedStyles = { ...defaultStyles, ...customStyles };

  return (
    <div
      className={`fixed inset-0 bg-gray-600 flex items-center justify-center z-50 transition-all duration-300 ease-in-out will-change-[opacity,backdrop-filter] ${
        animate
          ? 'bg-opacity-50 backdrop-blur-sm opacity-100'
          : 'bg-opacity-0 backdrop-blur-none opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-lg p-6 transition-all duration-300 ease-in-out will-change-[transform,opacity] ${
          animate ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
        style={combinedStyles}
      >
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          )}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};