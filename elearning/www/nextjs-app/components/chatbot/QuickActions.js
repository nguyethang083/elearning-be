import React, { useState, useEffect } from 'react';
import { Brain, Target, Video, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';

const QuickActions = ({ onActionClick }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('quickActionsExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('quickActionsExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);
  const actions = [
    {
      id: 'analyze_weakness',
      icon: Brain,
      title: 'Phân tích điểm yếu',
      description: 'Tìm hiểu em đang gặp khó khăn ở đâu',
      message: '/phân tích - Em đang yếu ở đâu vậy thầy?',
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-purple-600'
    },
    {
      id: 'practice_request',
      icon: Target,
      title: 'Tạo bài tập',
      description: 'Xin thêm bài tập để luyện tập',
      message: 'Thầy cho em thêm bài tập để luyện tập được không ạ?',
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-600'
    },
    {
      id: 'video_recommendation',
      icon: Video,
      title: 'Gợi ý video',
      description: 'Xem video học tập phù hợp',
      message: 'Em muốn xem video học tập về chủ đề này ạ.',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-green-600'
    },
    {
      id: 'study_guidance',
      icon: BookOpen,
      title: 'Hướng dẫn học',
      description: 'Nhận lời khuyên về cách học hiệu quả',
      message: 'Em cần lời khuyên về cách học hiệu quả ạ.',
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-orange-600'
    }
  ];

  const handleActionClick = (action) => {
    if (onActionClick) {
      onActionClick(action.message);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="text-xs font-medium text-gray-500">
          💡 Gợi ý nhanh:
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors duration-200"
          title={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </button>
      </div>

      {/* Collapsible content */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="flex items-center p-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3 group-hover:scale-105 transition-transform`}>
                    <IconComponent size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${action.textColor} mb-1`}>
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 leading-tight">
                      {action.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Manual analyze command hint */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 text-center">
              💡 Hoặc gõ <code className="bg-gray-200 px-1 rounded text-xs">/phân tích</code> để yêu cầu phân tích ngay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;