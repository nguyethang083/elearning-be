import React from 'react';
import { Handle, Position } from 'reactflow';

const LearningObjectNode = ({ data }) => {
  const {
    id,
    title,
    description,
    difficulty_level,
    weakness_score = 0,
    hasKnowledgeGap = false,
    isExternalPrerequisite = false,
    externalTopicName = null,
    prerequisites = [],
    onClick
  } = data;

  // Get node styling based on status
  const getNodeStyle = () => {
    if (isExternalPrerequisite) {
      return {
        borderColor: '#94a3b8',
        borderStyle: 'dashed',
        backgroundColor: '#f8fafc',
        textColor: '#64748b',
        opacity: '0.7',
        icon: '📚',
        statusLabel: 'Tiên quyết ngoài',
        statusColor: '#64748b'
      };
    }

    if (hasKnowledgeGap) {
      return {
        borderColor: '#dc2626',
        borderStyle: 'solid',
        backgroundColor: '#fef2f2',
        textColor: '#1f2937',
        opacity: '1',
        icon: '🚨',
        statusLabel: 'Cần ôn ngay',
        statusColor: '#dc2626'
      };
    }

    const weaknessPercentage = weakness_score * 100;
    
    if (weaknessPercentage > 70) {
      return {
        borderColor: '#d97706',
        borderStyle: 'solid',
        backgroundColor: '#fffbeb',
        textColor: '#1f2937',
        opacity: '1',
        icon: '⚠️',
        statusLabel: 'Nên ôn tập',
        statusColor: '#d97706'
      };
    } else if (weaknessPercentage > 40) {
      return {
        borderColor: '#0891b2',
        borderStyle: 'solid',
        backgroundColor: '#f0fdfa',
        textColor: '#1f2937',
        opacity: '1',
        icon: '📖',
        statusLabel: 'Ổn định',
        statusColor: '#0891b2'
      };
    } else {
      return {
        borderColor: '#059669',
        borderStyle: 'solid',
        backgroundColor: '#f0fdf4',
        textColor: '#1f2937',
        opacity: '1',
        icon: '✅',
        statusLabel: 'Thành thạo',
        statusColor: '#059669'
      };
    }
  };

  const style = getNodeStyle();
  const weaknessPercentage = Math.round(weakness_score * 100);

  const handleNodeClick = () => {
    if (onClick) {
      onClick(data);
    }
  };

  return (
    <div
      className="relative bg-white rounded-xl shadow-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 min-w-64 max-w-80"
      style={{
        borderColor: style.borderColor,
        borderStyle: style.borderStyle,
        backgroundColor: style.backgroundColor,
        opacity: style.opacity
      }}
      onClick={handleNodeClick}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* External Topic Badge */}
      {isExternalPrerequisite && externalTopicName && (
        <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          {externalTopicName}
        </div>
      )}

      {/* Knowledge Gap Alert Badge */}
      {hasKnowledgeGap && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
          ⚠️ Ưu tiên cao
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Header with Icon and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{style.icon}</div>
            <div>
              <div 
                className="text-sm font-medium px-2 py-1 rounded-md"
                style={{ 
                  backgroundColor: `${style.statusColor}20`,
                  color: style.statusColor 
                }}
              >
                {style.statusLabel}
              </div>
            </div>
          </div>
          {!isExternalPrerequisite && (
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {difficulty_level || 'Trung bình'}
            </div>
          )}
        </div>

        {/* Title - Full display without truncation */}
        <h3 
          className="font-bold text-base leading-tight mb-2"
          style={{ color: style.textColor }}
        >
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">
          {description}
        </p>

        {/* Stats Row */}
        {!isExternalPrerequisite && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">Mức độ yếu:</span>
                <span 
                  className="font-semibold"
                  style={{ color: style.statusColor }}
                >
                  {weaknessPercentage}%
                </span>
              </div>
              {prerequisites.length > 0 && (
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">Tiên quyết:</span>
                  <span className="font-semibold text-blue-600">{prerequisites.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar for non-external nodes */}
        {!isExternalPrerequisite && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${100 - weaknessPercentage}%`,
                  backgroundColor: style.statusColor
                }}
              />
            </div>
          </div>
        )}

        {/* Action Hint */}
        <div className="text-xs text-center text-indigo-600 mt-3 py-1">
          <span className="animate-pulse">👆</span> Nhấp để xem chi tiết
        </div>
      </div>
    </div>
  );
};

export default LearningObjectNode;
