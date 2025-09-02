import React from 'react';
import { Calculator, BookOpen, Brain, Target, Code, FileText } from 'lucide-react';

const SuggestedActions = ({ onActionClick, compact = false }) => {
  const suggestedActions = [
    {
      title: 'Chào bạn!',
      label: 'Tôi cần trợ giúp Toán 9',
      action: 'Chào bạn! Tôi muốn nhờ bạn hỗ trợ về việc học Toán lớp 9.',
      icon: <Target className="w-4 h-4" />,
    },
    {
      title: 'Tìm động lực',
      label: 'Khi học Toán bị nản',
      action: 'Bạn có thể chia sẻ vài lời khuyên để có động lực học Toán không?',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      title: 'Cách học tốt',
      label: 'Toán 9 dễ hiểu, hiệu quả',
      action: 'Bạn có thể gợi ý cách học Toán lớp 9 hiệu quả không?',
      icon: <Code className="w-4 h-4" />,
    },
    {
      title: 'Giải bài toán',
      label: 'Từng bước, dễ hiểu',
      action: 'Bạn có thể giúp tôi giải bài toán này không: 2x + y = 7 và x - y = 1',
      icon: <Calculator className="w-4 h-4" />,
    }
  ];
  

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {suggestedActions.slice(0, 4).map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action.action)}
            className="text-left border rounded-xl px-4 py-3 text-sm flex-1 gap-1 w-full h-auto justify-start items-start bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="text-indigo-600">{action.icon}</div>
              <span className="font-medium text-gray-900 text-sm">{action.title}</span>
            </div>
            <span className="text-gray-500 text-xs leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full">
      {suggestedActions.map((action, index) => (
        <div key={index} className={`${index > 1 ? 'hidden sm:block' : 'block'}`}>
          <button
            onClick={() => onActionClick(action.action)}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="text-indigo-600">{action.icon}</div>
              <span className="font-medium text-gray-900">{action.title}</span>
            </div>
            <span className="text-gray-500 text-xs">{action.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default SuggestedActions; 