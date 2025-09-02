import React from 'react';
import { Calculator, Thermometer } from 'lucide-react';

const ToolResult = ({ tool, result }) => {
  const getToolIcon = (toolName) => {
    switch (toolName) {
      case 'calculator':
        return <Calculator size={16} />;
      case 'weather':
        return <Thermometer size={16} />;
      default:
        return null;
    }
  };

  const getToolColor = (toolName) => {
    switch (toolName) {
      case 'calculator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'weather':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getToolColor(tool)}`}>
      {getToolIcon(tool)}
      <span className="capitalize">{tool}</span>
    </div>
  );
};

export default ToolResult; 