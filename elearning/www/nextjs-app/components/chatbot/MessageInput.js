import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Paperclip, Mic, MicOff } from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';

const MessageInput = ({ input, setInput, handleSubmit, isLoading, stop, onFileUpload, onAudioUpload, attachments = [], uploadQueue = [], onAttachmentRemove }) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [textareaKey, setTextareaKey] = useState(0);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Force refresh textarea when input is cleared
  useEffect(() => {
    if (input === '') {
      setTextareaKey(prev => prev + 1);
    }
  }, [input]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleSubmitClick = (e) => {
    console.log('🔘 Send button clicked - Input:', input, 'Length:', input.length, 'Trimmed:', input.trim().length);
    if (!isLoading && input.trim()) {
      handleSubmit(e);
    } else {
      console.log('❌ Submit blocked - isLoading:', isLoading, 'hasInput:', !!input.trim());
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
  };

  const startRecording = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported in this browser');
        alert('Voice recording is not supported in this browser. Please use a modern browser.');
        return;
      }

      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        alert('Voice recording requires a secure connection (HTTPS) or localhost. Please use HTTPS or localhost.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunks, { 
          type: recorder.mimeType || 'audio/webm' 
        });
        if (onAudioUpload) {
          onAudioUpload(audioBlob);
        }
        setRecordedChunks([]);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert('Cannot access microphone. Please check your browser permissions and try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* File Input (Hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Attachments Preview - ChatGPT Style */}
      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2 items-center">
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                key={index}
                attachment={attachment}
                onRemove={onAttachmentRemove}
                compact={true}
              />
            ))}
            
            {uploadQueue.map((filename, index) => (
              <AttachmentPreview
                key={`upload-${index}`}
                attachment={{
                  name: filename,
                  url: '',
                  contentType: '',
                  type: 'file'
                }}
                isUploading={true}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="relative flex items-end gap-3">
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 border border-gray-200"
            title="Attach file"
          >
            <Paperclip size={20} className="text-gray-600" />
          </button>

          {/* Voice Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 border ${
              isRecording 
                ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                : 'border-gray-200 hover:bg-gray-100'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? (
              <MicOff size={20} className="text-red-500" />
            ) : (
              <Mic size={20} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Text Input Container */}
        <div className="flex-1 relative">
          <div className="relative border border-gray-300 rounded-xl bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
            <textarea
              key={textareaKey}
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                console.log('📝 Textarea onChange:', e.target.value);
                setInput(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => console.log('🎯 Textarea focused, value:', input)}
              onBlur={() => console.log('👋 Textarea blurred')}
              placeholder="Bạn muốn hỏi gì không?"
              className="w-full resize-none bg-transparent border-0 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-0 text-sm min-h-[48px] max-h-[200px] leading-relaxed whitespace-pre-wrap overflow-y-auto"
              rows={1}
              disabled={isLoading}
              readOnly={false}
            />

            {/* Send/Stop Button */}
            <div className="absolute bottom-2 right-2">
              <button
                onClick={isLoading ? stop : handleSubmitClick}
                disabled={(!input.trim() && attachments.length === 0) && !isLoading}
                className={`p-2 rounded-lg transition-all ${
                  isLoading
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                    : (input.trim() || attachments.length > 0)
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={`Send button - Input: ${input.length} chars, Disabled: ${(!input.trim() && attachments.length === 0) && !isLoading}`}
              >
                {isLoading ? (
                  <StopCircle size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute -top-8 left-0 flex items-center gap-2 text-red-500 text-xs bg-red-50 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          Đang ghi âm...
        </div>
      )}
    </div>
  );
};

export default MessageInput; 