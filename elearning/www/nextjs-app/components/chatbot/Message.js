import React from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AttachmentPreview from './AttachmentPreview';
import IntelligentTutoringMessage from './IntelligentTutoringMessage';
import MathRenderer from '../learn/MathRenderer';

const Message = ({ message, onTutoringButtonClick }) => {
  const isUser = message.role === 'user';
  const isProactive = message.isProactive;
  const hasIntelligentTutoring = message.tutoring_data && typeof message.tutoring_data === 'object';

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-gray-500' : 'bg-indigo-600'
      }`}>
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        {/* Intelligent Tutoring Message */}
        {!isUser && hasIntelligentTutoring ? (
          <IntelligentTutoringMessage 
            tutoring_data={message.tutoring_data}
            onButtonClick={onTutoringButtonClick}
          />
        ) : (
          <div className={`rounded-2xl p-4 inline-block shadow-sm ${
            isUser 
              ? 'bg-indigo-600 text-white' 
              : isProactive
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900 border border-purple-200'
                : 'bg-gray-50 text-gray-900 border border-gray-100'
          }`}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`mb-3 ${isUser ? 'text-right' : 'text-left'}`}>
              <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {message.attachments.map((attachment, index) => (
                  <AttachmentPreview
                    key={index}
                    attachment={attachment}
                    compact={true}
                    onRemove={null} // No remove button in message display
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Proactive Message Indicator */}
          {isProactive && (
            <div className="flex items-center mb-2 text-xs text-purple-600">
              <span className="mr-1">💡</span>
              <span className="font-medium">Gợi ý thông minh</span>
            </div>
          )}
          
          {/* Text Content */}
          {message.content && (
            <div className={`text-sm leading-relaxed ${
              isUser ? 'text-white' : 'text-gray-900'
            }`}>
              {isUser ? (
                // For user messages, use simple text display
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                // For AI messages, check if content has math expressions
                (() => {
                  const content = message.content || '';
                  const hasMath = content.includes('\\(') || content.includes('\\[');
                  
                  if (hasMath) {
                    // If has math, use MathRenderer for the entire content
                    return (
                      <div className="math-content ai-message">
                        <MathRenderer content={content} />
                      </div>
                    );
                  } else {
                    // If no math, use ReactMarkdown for formatting
                    return (
                      <div className="markdown-content ai-message">
                        <ReactMarkdown
                          components={{
                            strong({ children }) {
                              return <strong>{children}</strong>;
                            },
                            em({ children }) {
                              return <em>{children}</em>;
                            },
                            h1({ children }) {
                              return <h1 className="text-xl font-bold mb-2">{children}</h1>;
                            },
                            h2({ children }) {
                              return <h2 className="text-lg font-bold mb-2">{children}</h2>;
                            },
                            h3({ children }) {
                              return <h3 className="text-md font-bold mb-1">{children}</h3>;
                            },
                            ul({ children }) {
                              return <ul className="list-disc list-inside mb-2">{children}</ul>;
                            },
                            ol({ children }) {
                              return <ol className="list-decimal list-inside mb-2">{children}</ol>;
                            },
                            li({ children }) {
                              return <li className="mb-1">{children}</li>;
                            },
                            p({ children }) {
                              return <p className="mb-2">{children}</p>;
                            }
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                })()
              )}
            </div>
          )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-2 ${
          isUser ? 'text-right' : 'text-left'
        }`}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default Message; 