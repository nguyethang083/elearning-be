import React from 'react';

const DetailPanel = ({ 
  selectedLO, 
  isOpen, 
  onClose, 
  onLearningObjectAction,
  allLearningObjects = []
}) => {
  if (!selectedLO) return null;

  const {
    title,
    description,
    difficulty_level,
    weakness_score = 0,
    hasKnowledgeGap = false,
    isExternalPrerequisite = false,
    externalTopicName = null,
    prerequisites = []
  } = selectedLO;

  const weaknessPercentage = hasKnowledgeGap ? 90 : Math.round(weakness_score * 100);
  const masteryPercentage = 100 - weaknessPercentage;

  // Get prerequisite details - remove duplicates
  const prerequisiteDetails = [...new Set(prerequisites)].map(prereqId => {
    return allLearningObjects.find(lo => lo.id === prereqId)?.data;
  }).filter(Boolean); // Remove undefined values

  // Get dependent nodes (nodes that depend on this one)
  const dependentNodes = allLearningObjects.filter(lo => 
    lo.data.prerequisites?.includes(selectedLO.id)
  );

  const handleAction = (actionType) => {
    if (onLearningObjectAction) {
      onLearningObjectAction(actionType, selectedLO);
    }
    onClose();
  };

  // Get status styling
  const getStatusStyle = () => {
    if (isExternalPrerequisite) {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        icon: '📚',
        label: 'Tiên quyết ngoài'
      };
    }

    if (hasKnowledgeGap) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        icon: '🚨',
        label: 'Cần ôn ngay'
      };
    }

    if (weaknessPercentage > 70) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-600',
        icon: '⚠️',
        label: 'Nên ôn tập'
      };
    } else if (weaknessPercentage > 40) {
      return {
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-600',
        icon: '📖',
        label: 'Ổn định'
      };
    } else {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        icon: '✅',
        label: 'Thành thạo'
      };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl mr-4 flex items-center justify-center text-2xl ${statusStyle.bg} ${statusStyle.border} border-2`}>
                {statusStyle.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* External Topic Badge */}
          {isExternalPrerequisite && externalTopicName && (
            <div className="mt-3 inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Thuộc {externalTopicName}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Mô tả</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Stats */}
          {!isExternalPrerequisite && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Độ khó</div>
                <div className="font-bold text-gray-900">{difficulty_level || 'Trung bình'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Mức độ yếu</div>
                <div className={`font-bold ${statusStyle.text}`}>{weaknessPercentage}%</div>
              </div>
            </div>
          )}

          {/* Progress Section */}
          {!isExternalPrerequisite && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Độ thành thạo</h3>
                <span className={`text-sm font-bold ${statusStyle.text}`}>{masteryPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    masteryPercentage > 70 ? 'bg-emerald-500' :
                    masteryPercentage > 40 ? 'bg-cyan-500' :
                    masteryPercentage > 20 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {prerequisiteDetails.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Kiến thức tiên quyết</h3>
              <div className="space-y-2">
                {prerequisiteDetails.map((prereq, index) => (
                  <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg mr-3 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-blue-900">{prereq.title}</div>
                      {prereq.id !== prereq.title && (
                        <div className="text-xs text-blue-600">{prereq.id}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependent Skills */}
          {dependentNodes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Kỹ năng phụ thuộc</h3>
              <div className="space-y-2">
                {dependentNodes.map((dependent, index) => (
                  <div key={index} className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg mr-3 flex items-center justify-center text-white text-sm font-bold">
                      →
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-purple-900">{dependent.data.title}</div>
                      <div className="text-xs text-purple-600">Cần kỹ năng này để học</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isExternalPrerequisite && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hành động học tập</h3>
              
              <button
                onClick={() => handleAction('practice')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-200 text-left border border-blue-200 hover:border-blue-300 group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-xl mr-4 flex items-center justify-center text-white text-xl group-hover:scale-105 transition-transform">
                  📚
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 mb-1">Luyện tập với ISY</div>
                  <div className="text-xs text-blue-700 leading-relaxed">Tạo bài tập cá nhân hóa về chủ đề này</div>
                </div>
                <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => handleAction('video')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all duration-200 text-left border border-green-200 hover:border-green-300 group"
              >
                <div className="w-12 h-12 bg-green-500 rounded-xl mr-4 flex items-center justify-center text-white text-xl group-hover:scale-105 transition-transform">
                  🎬
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900 mb-1">Xem video bài giảng</div>
                  <div className="text-xs text-green-700 leading-relaxed">Video hướng dẫn chi tiết về kỹ năng này</div>
                </div>
                <svg className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => handleAction('chat')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 rounded-xl transition-all duration-200 text-left border border-purple-200 hover:border-purple-300 group"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-xl mr-4 flex items-center justify-center text-white text-xl group-hover:scale-105 transition-transform">
                  💬
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-purple-900 mb-1">Hỏi ISY về chủ đề này</div>
                  <div className="text-xs text-purple-700 leading-relaxed">Bắt đầu hội thoại với trợ lý AI</div>
                </div>
                <svg className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* External Note */}
          {isExternalPrerequisite && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-amber-500 mr-3 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Kiến thức tiên quyết</h4>
                  <p className="text-sm text-amber-700">
                    Đây là kiến thức từ chương khác cần thiết để hiểu chủ đề hiện tại. 
                    Bạn nên ôn lại kiến thức này trước khi tiếp tục.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DetailPanel;
