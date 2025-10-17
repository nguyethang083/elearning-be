import React from 'react';
import ReactMarkdown from 'react-markdown';

const IntelligentTutoringMessage = ({ tutoring_data, onButtonClick }) => {
  const { type, strategy, content, buttons = [], main_lo, prerequisites } = tutoring_data;

  const handleButtonClick = (button) => {
    if (onButtonClick) {
      onButtonClick(button.action, button.data, button.text);
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'foundation_first':
        return '🏗️';
      case 'targeted_practice':
        return '🎯';
      case 'direct_practice':
        return '💪';
      default:
        return '💡';
    }
  };

  const getStrategyColor = (strategy) => {
    switch (strategy) {
      case 'foundation_first':
        return 'border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50';
      case 'targeted_practice':
        return 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50';
      case 'direct_practice':
        return 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50';
      default:
        return 'border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50';
    }
  };

  const getButtonStyle = (action) => {
    switch (action) {
      case 'review_prerequisites':
        return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500';
      case 'skip_prerequisites':
        return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500';
      case 'start_practice':
        return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500';
      case 'watch_video':
        return 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500';
      default:
        return 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500';
    }
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm border ${getStrategyColor(strategy)}`}>
      {/* Strategy indicator */}
      <div className="flex items-center mb-3">
        <span className="text-lg mr-2">{getStrategyIcon(strategy)}</span>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Phân tích thông minh
        </span>
      </div>

      {/* Main content */}
      <div className="text-sm leading-relaxed text-gray-900 mb-4">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc list-inside ml-4 mb-2">{children}</ul>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Interactive buttons */}
      {buttons && buttons.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">
            🎯 Gợi ý của thầy:
          </div>
          <div className="flex flex-wrap gap-2">
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => handleButtonClick(button)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${getButtonStyle(button.action)}`}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default IntelligentTutoringMessage;