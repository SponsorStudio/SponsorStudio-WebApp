import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 text-white hover:bg-red-700',
  cancelButtonClass = 'border-gray-300 text-gray-700 hover:bg-gray-50'
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Prevent background scrolling by blocking wheel and touchmove events
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    if (isOpen) {
      setIsVisible(true);
      // Add event listeners to prevent scrolling
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
      // Trigger opening animation after a brief delay
      const timer = setTimeout(() => setAnimate(true), 10);
      return () => {
        clearTimeout(timer);
        // Remove event listeners when modal closes
        window.removeEventListener('wheel', preventScroll);
        window.removeEventListener('touchmove', preventScroll);
      };
    } else {
      setAnimate(false);
      // Delay setting isVisible to false to allow exit animation
      const timer = setTimeout(() => setIsVisible(false), 300); // Match with transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 bg-gray-600 flex items-center justify-center z-50 transition-all duration-300 ease-in-out ${
        animate
          ? 'bg-opacity-50 backdrop-blur-sm opacity-100'
          : 'bg-opacity-0 backdrop-blur-none opacity-0'
      }`}
    >
      <div
        className={`bg-white p-6 rounded-lg shadow-lg w-full max-w-md transition-all duration-300 ease-in-out ${
          animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 border rounded-lg ${cancelButtonClass}`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}