import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatModal from './ChatModal';
import ChatPanel from './ChatPanel';

const ChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState('');

  const handleOpen = () => {
    setIsOpen(true);
    setIsExpanded(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleMinimize = () => {
    setIsExpanded(false);
  };

  // Listen for custom event to open chatbot with pre-filled message
  useEffect(() => {
    const handleOpenChatbotWithMessage = (event) => {
      const { message } = event.detail;
      setPrefilledMessage(message);
      setIsOpen(true);
      setIsExpanded(true); // Open in expanded mode for better visibility
    };

    window.addEventListener('openChatbotWithMessage', handleOpenChatbotWithMessage);

    return () => {
      window.removeEventListener('openChatbotWithMessage', handleOpenChatbotWithMessage);
    };
  }, []);

  // Clear prefilled message when chat is closed
  const handleCloseWithClear = () => {
    setIsOpen(false);
    setIsExpanded(false);
    setPrefilledMessage('');
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-30"
        title="Open chat assistant"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Panel (Compact Mode) */}
      {isOpen && !isExpanded && (
        <ChatPanel 
          onExpand={handleExpand}
          onClose={handleCloseWithClear}
          prefilledMessage={prefilledMessage}
        />
      )}

      {/* Chat Modal (Expanded Mode) */}
      {isOpen && isExpanded && (
        <ChatModal 
          isOpen={isExpanded} 
          onClose={handleCloseWithClear}
          prefilledMessage={prefilledMessage}
        />
      )}
    </>
  );
};

export default ChatBubble; 