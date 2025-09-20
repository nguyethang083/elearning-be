import React, { useEffect } from 'react';
import ChatInterface from './ChatInterface';

const ChatModal = ({ isOpen, onClose, prefilledMessage }) => {
  // Force layout recalculation when modal opens
  useEffect(() => {
    if (isOpen) {
      // Force browser to recalculate layout
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl h-[80vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <ChatInterface onClose={onClose} prefilledMessage={prefilledMessage} />
      </div>
    </div>
  );
};

export default ChatModal; 