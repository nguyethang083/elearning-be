import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, StopCircle, Trash2, Maximize2, X } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import AttachmentPreview from './AttachmentPreview';
import SuggestedActions from './SuggestedActions';
import QuickActions from './QuickActions';
import { useChat } from '../../hooks/useChat';
import { useChatContext } from '../../contexts/ChatContext';
import FeedbackButtons from './FeedbackButtons';
import { fetchWithAuth } from '../../pages/api/helper';

const ChatPanel = ({ onExpand, onClose, initialPrompt }) => {
  const { currentLoId } = useChatContext();
  // Nhận initialPrompt từ props
  // --- HARDCODED CONVERSATION FLOW FOR DEMO ---
  // Comment out original chat logic
  // const {
  //   messages,
  //   input,
  //   setInput,
  //   handleSubmit,
  //   isLoading,
  //   stop,
  //   error,
  //   clearMessages,
  //   handleTutoringButtonClick
  // } = useChat();

  // Hardcoded flow state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);

  // Simulate ISY thinking with delay
  const sendISYMessage = (content, nextStep = null, delay = 1200) => {
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content,
        timestamp: Date.now()
      }]);
      setIsLoading(false);
      if (nextStep !== null) setStep(nextStep);
    }, delay);
  };

  // Handle user input for hardcoded flow
  const handleSubmit = (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      role: 'user',
      content: input,
      timestamp: Date.now()
    }]);
    // Flow logic
    if (step === 0 && input.includes('Hệ thức Vi-ét')) {
      sendISYMessage('Chắc chắn rồi! Hãy thử bài này nhé: Cho phương trình x² - 5x + 4 = 0. Tính tổng và tích hai nghiệm.', 1);
    } else if (step === 1 && (input.includes('Tổng') || input.includes('tích'))) {
      sendISYMessage(
        [
          'Tích là 4 đúng rồi! 👍 Bạn đã xác định rất chính xác hệ số *c* và *a*.',
          '',
          'Tuy nhiên, có một chút nhầm lẫn nhỏ ở phần *tổng hai nghiệm*. Mình đoán là bạn có thể đã quên mất dấu trừ trong công thức *S = -b/a*. Đây là một lỗi rất hay gặp, đừng lo lắng nhé!',
          '',
          '*Hãy cùng xem lại:*',
          '- Phương trình của chúng ta là: x² - 5x + 4 = 0',
          '- Ở đây, *a = 1* và *b = -5*',
          '- Vậy tổng hai nghiệm phải là:',
          '  S = -(-5) / 1 = 5',
          '',
          'Để giúp bạn nhớ kỹ hơn về dấu trừ quan trọng này, chúng mình cùng làm thêm vài bài tập tương tự nha.'
        ].join('\n'),
        2,
        1800
      );
      // Sau khi ISY giải thích xong, tự động gửi thử thách luyện tập
      setTimeout(() => {
        sendISYMessage(
        [
          '*ISY: 🎯 THỬ THÁCH CÙNG ISY*',
          '',
          'Hãy luyện tập lại nhé!',
          '',
          '*Bài 1*: x² + 7x + 10 = 0',
          '',
          '*Bài 2*: 2x² - 6x + 1 = 0'
        ].join('\n'),
          3,
          1500
        );
      }, 2200);
    } else if (step === 2) {
      sendISYMessage('ISY: 🎯 THỬ THÁCH CÙNG ISY\nHãy luyện tập lại nhé!\nBài 1: x² + 7x + 10 = 0\nBài 2: 2x² - 6x + 1 = 0', 3, 1500);
    }
    setInput('');
  };
  React.useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt, setInput]);

  // Debug: log current LO and messages
  React.useEffect(() => {
    console.log('[DEBUG] currentLoId:', currentLoId);
    console.log('[DEBUG] messages:', messages);
  }, [currentLoId, messages]);

  // Feedback logic
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const handleFeedback = async (outcome) => {
    console.log('[DEBUG] Feedback button clicked:', outcome, 'for LO:', currentLoId);
    if (!currentLoId) return;
    try {
      await fetchWithAuth('student_lo_mastery.student_lo_mastery.record_interaction_outcome', {
        method: 'POST',
        body: { lo_id: currentLoId, outcome },
      });
      setFeedbackGiven(true);
      console.log('[DEBUG] Feedback API called successfully');
    } catch (err) {
      console.error('[DEBUG] Feedback API error:', err);
    }
  };

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
      name: audio_${Date.now()}.wav,
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
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {/* Hardcoded Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          error={null}
          onActionClick={() => {}}
          onTutoringButtonClick={() => {}}
        />
        <div ref={messagesEndRef} />
      </div>
      {/* Compact Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
        <MessageInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={() => {}}
          onFileUpload={() => {}}
          onAudioUpload={() => {}}
          attachments={[]}
          uploadQueue={[]}
          onAttachmentRemove={() => {}}
        />
      </div>
    </div>
  );
};

export default ChatPanel; 