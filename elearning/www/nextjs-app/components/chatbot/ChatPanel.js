import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, StopCircle, Trash2, Maximize2, X } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import AttachmentPreview from './AttachmentPreview';
import SuggestedActions from './SuggestedActions';
import QuickActions from './QuickActions';
import { useChat } from '../../hooks/useChat';

const ChatPanel = ({ onExpand, onClose }) => {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    error,
    clearMessages,
    handleTutoringButtonClick
  } = useChat();

  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachments]);

  const handleActionClick = (actionText) => {
    setInput(actionText);
    setTimeout(() => {
      handleSubmit(null, attachments);
      setAttachments([]); // Clear attachments after sending
    }, 100);
  };

  const handleQuickActionClick = (message) => {
    setInput(message);
    setTimeout(() => {
      handleSubmit(null, attachments);
      setAttachments([]); // Clear attachments after sending
    }, 100);
  };

  const handleAttachmentRemove = (attachmentToRemove) => {
    setAttachments(prev => prev.filter(att => att !== attachmentToRemove));
  };

  const handleFileUpload = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      contentType: file.type,
      type: file.type.split('/')[0],
      file: file
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleAudioUpload = (audioBlob) => {
    const audioAttachment = {
      name: `audio_${Date.now()}.wav`,
      url: URL.createObjectURL(audioBlob),
      contentType: 'audio/wav',
      type: 'audio',
      file: audioBlob
    };
    
    setAttachments(prev => [...prev, audioAttachment]);
  };

  const handleClearChat = () => {
    if (showClearConfirm) {
      clearMessages();
      setShowClearConfirm(false);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Đã xóa lịch sử trò chuyện';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-40">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Học cùng ISY</h3>
            <p className="text-xs text-gray-500">Người bạn đồng hành học Toán</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Clear Button */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className={`p-2 rounded-lg transition-colors ${
                showClearConfirm 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={showClearConfirm ? 'Bấm lại để xác nhận' : 'Xóa lịch sử trò chuyện'}
            >
              <Trash2 size={16} />
            </button>
          )}
          
          {/* Expand Button */}
          <button
            onClick={onExpand}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Expand chat"
          >
            <Maximize2 size={16} />
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Compact Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-3 text-gray-900">Chào mừng bạn!</h3>
            <p className="text-sm mb-6 text-gray-600">
                Tôi ở đây để giúp bạn học Toán. Hãy thử một trong các đề xuất sau:
            </p>
            <SuggestedActions onActionClick={handleActionClick} compact={true} />
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              error={error}
              onActionClick={handleActionClick}
              onTutoringButtonClick={handleTutoringButtonClick}
            />
            
            {/* Quick Actions for compact mode */}
            {messages.length > 2 && (
              <QuickActions onActionClick={handleQuickActionClick} />
            )}
            

          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
        <MessageInput
          input={input}
          setInput={setInput}
          handleSubmit={(e) => {
            handleSubmit(e, attachments);
            setAttachments([]); // Clear attachments after sending
          }}
          isLoading={isLoading}
          stop={stop}
          onFileUpload={handleFileUpload}
          onAudioUpload={handleAudioUpload}
          attachments={attachments}
          uploadQueue={uploadQueue}
          onAttachmentRemove={handleAttachmentRemove}
        />
      </div>
    </div>
  );
};

export default ChatPanel; 