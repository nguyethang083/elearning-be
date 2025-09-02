import React from 'react';
import { X, Play, Pause, Loader, FileText, Music, Video } from 'lucide-react';

const AttachmentPreview = ({ attachment, onRemove, isUploading = false, compact = false }) => {
  const { name, url, contentType, type } = attachment;

  const isImage = contentType?.startsWith('image/') || type === 'image';
  const isAudio = contentType?.startsWith('audio/') || type === 'audio';
  const isVideo = contentType?.startsWith('video/') || type === 'video';
  const isPdf = contentType?.includes('pdf') || name?.endsWith('.pdf');
  const isDoc = contentType?.includes('document') || name?.match(/\.(doc|docx|txt)$/i);

  const handleRemove = () => {
    if (onRemove) {
      onRemove(attachment);
    }
  };

  // ChatGPT-style compact preview for input area
  if (compact) {
    return (
      <div className="relative inline-block">
        <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg shadow-sm relative flex items-center justify-center overflow-hidden group hover:border-gray-300 transition-colors">
          {isImage ? (
            <img
              src={url}
              alt={name || 'Image attachment'}
              className="w-full h-full object-cover rounded-md"
            />
          ) : isAudio ? (
            <Music size={16} className="text-indigo-500" />
          ) : isVideo ? (
            <Video size={16} className="text-purple-500" />
          ) : isPdf ? (
            <FileText size={16} className="text-red-500" />
          ) : isDoc ? (
            <FileText size={16} className="text-blue-500" />
          ) : (
            <FileText size={16} className="text-gray-500" />
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-md">
              <Loader size={14} className="text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Remove Button - appears on hover */}
          {onRemove && (
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 shadow-md"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Original larger preview for messages area
  return (
    <div className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-gray-100 rounded-md relative flex flex-col items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={url}
            alt={name || 'Image attachment'}
            className="rounded-md w-full h-full object-cover"
          />
        ) : isAudio ? (
          <div className="flex items-center justify-center w-full h-full">
            <Music size={20} className="text-indigo-500" />
          </div>
        ) : isVideo ? (
          <div className="flex items-center justify-center w-full h-full">
            <Video size={20} className="text-purple-500" />
          </div>
        ) : isPdf ? (
          <div className="flex items-center justify-center w-full h-full">
            <FileText size={20} className="text-red-500" />
          </div>
        ) : isDoc ? (
          <div className="flex items-center justify-center w-full h-full">
            <FileText size={20} className="text-blue-500" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <FileText size={20} className="text-gray-500" />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader size={16} className="text-white animate-spin" />
          </div>
        )}

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
      
      <div className="text-xs text-gray-500 max-w-20 truncate text-center">
        {name}
      </div>
    </div>
  );
};

export default AttachmentPreview; 