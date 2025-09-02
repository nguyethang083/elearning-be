import React from 'react';
import Message from './Message';
import { Bot, User } from 'lucide-react';

const MessageList = ({ messages, isLoading, error, onActionClick, onTutoringButtonClick }) => {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <Message 
          key={message.id || index} 
          message={message}
          onTutoringButtonClick={onTutoringButtonClick}
        />
      ))}
      
      {isLoading && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
              <p className="text-red-700 text-sm">
                Xin lỗi, tôi đã gặp lỗi. Vui lòng thử lại.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList; 