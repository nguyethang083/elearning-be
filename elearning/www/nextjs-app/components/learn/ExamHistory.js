import { useState } from 'react';
import { useExamHistory } from '@/hooks/useExamHistory';
import { format } from 'date-fns';
import MathRenderer from './MathRenderer';
import { BookOpen, Lightbulb } from 'lucide-react';

// Component to format and display text with better structure
const FormattedTextDisplay = ({ content, className = "" }) => {
  if (!content) return null;

  // Function to check if a line contains LaTeX
  const containsLatex = (text) => {
    return /\\[a-zA-Z]+\{|\\[a-zA-Z]+\s|\\[()[\]{}]|\$.*\$|\\text\{|\\frac\{|\\sqrt\{|\\sum|\\int|\\leftarrow|\\rightarrow|\\Leftrightarrow|\\ne|\\leq|\\geq/.test(text);
  };

  // Temporarily replace LaTeX expressions with placeholders to protect them
  const latexExpressions = [];
  let protectedContent = content;
  
  // Protect inline LaTeX expressions like \text{...}, \frac{...}, etc.
  protectedContent = protectedContent.replace(/\\[a-zA-Z]+\{[^}]*\}/g, (match) => {
    const placeholder = `__LATEX_EXPR_${latexExpressions.length}__`;
    latexExpressions.push(match);
    return placeholder;
  });
  
  // Protect LaTeX commands like \Leftrightarrow, \ne, etc.
  protectedContent = protectedContent.replace(/\\[a-zA-Z]+/g, (match) => {
    const placeholder = `__LATEX_CMD_${latexExpressions.length}__`;
    latexExpressions.push(match);
    return placeholder;
  });

  // Pre-process content to remove excessive asterisks and trailing numbers
  let processedContent = protectedContent
    // Remove standalone asterisks that aren't part of markdown formatting
    .replace(/^\s*\*\s*$/gm, '')
    // Remove trailing numbers at end of lines (like "2.", "3.")
    .replace(/\s+\d+\.\s*$/gm, '')
    // More aggressive asterisk cleaning (but protect LaTeX placeholders)
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove double asterisks but keep content
    .replace(/\*([^*\n]+)\*/g, '$1') // Remove single asterisks but keep content
    // Remove excessive asterisks at start/end of lines
    .replace(/^\*+\s*/gm, '')
    .replace(/\s*\*+$/gm, '')
    // Clean up multiple consecutive empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Normalize whitespace
    .trim();

  // Restore LaTeX expressions
  latexExpressions.forEach((expr, index) => {
    processedContent = processedContent.replace(new RegExp(`__LATEX_EXPR_${index}__`, 'g'), expr);
    processedContent = processedContent.replace(new RegExp(`__LATEX_CMD_${index}__`, 'g'), expr);
  });

  // Split content into lines and process each one
  const lines = processedContent.split('\n');
  const processedLines = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines, lines with only markdown symbols, or very short meaningless lines
    if (!trimmedLine || 
        trimmedLine === '**' || 
        trimmedLine === '*' || 
        trimmedLine === '•' ||
        /^[\*\s•\d\.\-_]*$/.test(trimmedLine) ||
        trimmedLine.length < 2) {
      processedLines.push(<div key={index} className="h-2"></div>);
      return;
    }
    
    // Handle bullet points - only process if they contain meaningful content
    if (trimmedLine.startsWith('•')) {
      const bulletContent = trimmedLine.substring(1).trim();
      if (bulletContent && bulletContent.length > 2) { // More strict validation
        processedLines.push(
          <div key={index} className="flex items-start mb-3">
            <span className="text-emerald-600 mr-3 mt-0.5 font-medium flex-shrink-0">•</span>
            <div className="flex-1 text-gray-700 leading-relaxed">
              <MathRenderer content={bulletContent} />
            </div>
          </div>
        );
      }
    }
    // Handle numbered lists - stricter validation
    else if (/^\d+\.\s+\S/.test(trimmedLine)) {
      const match = trimmedLine.match(/^(\d+)\.\s*(.+)/);
      if (match && match[2].trim() && match[2].trim().length > 2) { // More strict validation
        processedLines.push(
          <div key={index} className="flex items-start mb-3">
            <div className="text-emerald-600 font-semibold mr-3 mt-0.5 flex-shrink-0 text-right" style={{ minWidth: '28px' }}>
              {match[1]}.
            </div>
            <div className="flex-1 text-gray-700 leading-relaxed">
              <MathRenderer content={match[2]} />
            </div>
          </div>
        );
      }
    }
    // Check if line looks like a header (contains words that are typically headers)
    else if (/^(Phân tích|Lời giải|Bước|Giải thích|Kết luận|Tóm tắt|Nhận xét)/i.test(trimmedLine)) {
      // Clean any remaining asterisks from headers but preserve LaTeX
      const cleanHeader = containsLatex(trimmedLine) ? trimmedLine : trimmedLine.replace(/\*+/g, '').trim();
      if (cleanHeader && cleanHeader.length > 3) {
        processedLines.push(
          <div key={index} className="font-bold text-gray-800 mb-4 mt-6 text-base border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-lg">
            <MathRenderer content={cleanHeader} />
          </div>
        );
      }
    }
    // Handle traditional bold text (titles/headers) - but with more cleaning
    else if ((trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) || 
             (trimmedLine.includes('**') && trimmedLine.length > 6)) {
      // More aggressive cleaning of asterisks but preserve LaTeX
      const cleanText = containsLatex(trimmedLine) ? trimmedLine.replace(/^\*+|\*+$/g, '').trim() : trimmedLine.replace(/\*+/g, '').trim();
      if (cleanText && cleanText.length > 3 && !/^[\s\d\.\-_]*$/.test(cleanText)) {
        processedLines.push(
          <div key={index} className="font-bold text-gray-800 mb-4 mt-6 text-base border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-lg">
            <MathRenderer content={cleanText} />
          </div>
        );
      }
    }
    // Regular paragraphs - enhanced cleaning and validation
    else if (!/^[\*\s•\d\.\-_]*$/.test(trimmedLine) && trimmedLine.length > 3) {
      // More careful cleaning for regular paragraphs - preserve LaTeX
      let cleanedLine = trimmedLine;
      
      if (!containsLatex(trimmedLine)) {
        cleanedLine = trimmedLine
          .replace(/\*+/g, '') // Remove ALL asterisks only if no LaTeX
          .replace(/^\s*\d+\.\s*/, '') // Remove leading numbers
          .replace(/\s+\d+\.\s*$/, '') // Remove trailing numbers like "2." or "3."
          .trim();
      } else {
        // For lines with LaTeX, only remove leading/trailing asterisks carefully
        cleanedLine = trimmedLine
          .replace(/^\*+\s*/, '') // Remove leading asterisks
          .replace(/\s*\*+$/, '') // Remove trailing asterisks
          .trim();
      }
      
      // Only process if there's meaningful content left
      if (cleanedLine && cleanedLine.length > 3 && !/^[\s\d\.\-_]*$/.test(cleanedLine)) {
        processedLines.push(
          <div key={index} className="mb-3 leading-relaxed text-gray-700">
            <MathRenderer content={cleanedLine} />
          </div>
        );
      }
    }
  });

  return (
    <div className={`space-y-1 ${className}`} style={{
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      {processedLines}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default function ExamHistory({ topicId }) {
  const {
    examHistory,
    isLoading: isLoadingHistory,
    error,
    selectedAttempt,
    attemptDetails,
    isLoadingDetails,
    selectAttempt,
    detailedExplanations,
    isLoadingExplanation,
    getDetailedExplanation,
  } = useExamHistory(topicId);
  
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [showingExplanation, setShowingExplanation] = useState({});
  
  if (isLoadingHistory && !examHistory.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Đang tải lịch sử bài kiểm tra...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
    );
  }
  
  if (!examHistory.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-600">Không tìm thấy lịch sử bài kiểm tra. Hãy thử làm bài kiểm tra trước!</p>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    console.log("Formatting date:", dateString);
    
    try {
      // Try to parse as ISO date
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.log("Invalid date format:", dateString);
        return 'N/A';
      }
      
      // Format similar to AssignmentTable for consistency
      const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
      console.error("Date formatting error:", e, "for dateString:", dateString);
      return 'N/A';
    }
  };
  
  // Debug the exam history data received
  console.log("ExamHistory component received:", examHistory);
  console.log("Selected attempt:", selectedAttempt);
  console.log("Attempt details:", attemptDetails);
  
  // Toggle a question's expanded state
  const toggleQuestion = (questionId) => {
    if (expandedQuestions.has(questionId)) {
      const newSet = new Set(expandedQuestions);
      newSet.delete(questionId);
      setExpandedQuestions(newSet);
    } else {
      const newSet = new Set(expandedQuestions);
      newSet.add(questionId);
      setExpandedQuestions(newSet);
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Lịch sử bài kiểm tra của bạn</h2>
        
        {/* History list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chủ đề
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Câu hỏi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {examHistory.map((attempt) => (
                <tr 
                  key={attempt.name}
                  className={selectedAttempt === attempt.name ? "bg-indigo-50" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(attempt.date || attempt.end_time || attempt.creation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.topic_name || 'Unknown Topic'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.total_questions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.formatted_time || '1m 0s'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => selectAttempt(attempt.name)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Details view */}
      {selectedAttempt && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Chi tiết bài kiểm tra</h3>
          
          {isLoadingDetails ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">Đang tải chi tiết bài kiểm tra...</p>
            </div>
          ) : attemptDetails ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Attempt summary */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Chủ đề:</p>
                    <p className="font-medium">{attemptDetails.topic_name || 'Không xác định'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bắt đầu:</p>
                    <p className="font-medium">{formatDate(attemptDetails.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hoàn thành:</p>
                    <p className="font-medium">
                      {formatDate(attemptDetails.completion_timestamp || 
                        (attemptDetails.start_time ? 
                          new Date(new Date(attemptDetails.start_time).getTime() + (attemptDetails.time_spent_seconds || 60) * 1000) 
                          : new Date()))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Thời gian:</p>
                    <p className="font-medium">{attemptDetails.formatted_time || '1m 0s'}</p>
                  </div>
                </div>
              </div>
              
              {/* Questions and answers */}
              {attemptDetails.details && attemptDetails.details.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {attemptDetails.details.map((detail, index) => (
                    <div key={index} className="p-6">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleQuestion(index)}
                      >
                        <h4 className="text-md font-medium">Question {index + 1}</h4>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 transition-transform ${expandedQuestions.has(index) ? 'transform rotate-180' : ''}`} 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      {expandedQuestions.has(index) && (
                        <div className="mt-4 space-y-4">
                          {/* Question */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2">Question:</h5>
                            <div className="bg-gray-50 p-3 rounded">
                              <MathRenderer content={detail.question} />
                            </div>
                          </div>
                          
                          {/* User's answer */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2">Your Answer:</h5>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="whitespace-pre-wrap">{detail.user_answer}</p>
                            </div>
                          </div>
                          
                          {/* AI Feedback */}
                          {detail.ai_feedback_what_was_correct && (
                            <div className="space-y-4">
                              <h5 className="text-sm font-medium text-gray-500">AI Feedback:</h5>
                              
                              {/* What was correct */}
                              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <h6 className="text-green-700 font-medium mb-2 text-sm">What was correct</h6>
                                <div className="text-green-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_was_correct} />
                                </div>
                              </div>
                              
                              {/* What was incorrect */}
                              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <h6 className="text-red-700 font-medium mb-2 text-sm">What was incorrect</h6>
                                <div className="text-red-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_was_incorrect} />
                                </div>
                              </div>
                              
                              {/* What to include */}
                              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h6 className="text-purple-700 font-medium mb-2 text-sm">What you could have included</h6>
                                <div className="text-purple-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_to_include} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Detailed Explanation Section */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-500 flex items-center">
                                <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                                Detailed Explanation
                              </h5>
                              <button
                                onClick={() => {
                                  const questionKey = `${selectedAttempt}_${index}`;
                                  if (!detailedExplanations[detail.flashcard]) {
                                    getDetailedExplanation(detail.flashcard, {
                                      question: detail.question,
                                      answer: detail.answer,
                                      user_answer: detail.user_answer,
                                      flashcard_type: detail.flashcard_type || 'qa',
                                      ai_feedback: {
                                        what_was_correct: detail.ai_feedback_what_was_correct,
                                        what_was_incorrect: detail.ai_feedback_what_was_incorrect,
                                        what_to_include: detail.ai_feedback_what_to_include
                                      }
                                    });
                                  }
                                  setShowingExplanation(prev => ({
                                    ...prev,
                                    [questionKey]: !prev[questionKey]
                                  }));
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                                disabled={isLoadingExplanation}
                              >
                                {isLoadingExplanation ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                    Loading...
                                  </span>
                                ) : showingExplanation[`${selectedAttempt}_${index}`] ? (
                                  'Hide Explanation'
                                ) : (
                                  'Show Detailed Explanation'
                                )}
                              </button>
                            </div>
                            
                            {showingExplanation[`${selectedAttempt}_${index}`] && (
                              <div className="mt-3">
                                {detailedExplanations[detail.flashcard] ? (
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <FormattedTextDisplay 
                                      content={detailedExplanations[detail.flashcard]} 
                                      className="text-sm text-blue-800"
                                    />
                                  </div>
                                ) : detail.detailed_explanation ? (
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <FormattedTextDisplay 
                                      content={detail.detailed_explanation} 
                                      className="text-sm text-blue-800"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600">No detailed explanation available for this question.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Correct answer */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2">Correct Answer:</h5>
                            <div className="bg-gray-50 p-3 rounded">
                              <MathRenderer content={detail.answer} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Không có chi tiết cho bài kiểm tra này.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">Không thể tải chi tiết bài kiểm tra.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 