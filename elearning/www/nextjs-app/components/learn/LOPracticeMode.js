import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle, XCircle, Target, Lightbulb, Send, AlertTriangle } from 'lucide-react';
import { submitLOAnswerAndGetFeedback } from '@/pages/api/helper';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Component to format and display text with LaTeX support
const FormattedTextDisplay = ({ content, className = "" }) => {
  if (!content) return null;

  // Function to check if a line contains LaTeX
  const containsLatex = (text) => {
    return /\\\(|\\\[|\$\$|\$/.test(text);
  };

  // Function to process text and convert LaTeX
  const processText = (text) => {
    if (!text) return null;

    try {
      // Step 1: Clean up LaTeX line breaks
      let cleanText = text
        .replace(/\\\\\\\\/g, '\n\n') // Replace \\\\ with paragraph break
        .replace(/\\\\/g, '\n')       // Replace \\ with line break  
        .replace(/\n{3,}/g, '\n\n')   // Clean up excessive newlines
        .replace(/[ \t]+/g, ' ')      // Normalize spaces
        .split('\n')
        .map(line => line.trim())
        .join('\n');

      // Step 2: Extract math expressions
      const mathExpressions = [];
      
      // Handle block math $$...$$
      cleanText = cleanText.replace(/\$\$(.*?)\$\$/gs, (match, math) => {
        const index = mathExpressions.length;
        mathExpressions.push({ type: 'block', math: math.trim() });
        return `__MATH_${index}__`;
      });
      
      // Handle inline math $...$
      cleanText = cleanText.replace(/\$([^$\n]+)\$/g, (match, math) => {
        const index = mathExpressions.length;
        mathExpressions.push({ type: 'inline', math: math.trim() });
        return `__MATH_${index}__`;
      });

      // Step 3: Split into paragraphs and process
      const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
      
      return (
        <div className="space-y-4">
          {paragraphs.map((paragraph, pIndex) => {
            // Split paragraph into sentences, keeping math on separate lines
            const lines = paragraph.split('\n').filter(line => line.trim());
            
            // Check if this paragraph has standalone math expressions
            const hasStandaloneMath = lines.some(line => 
              line.trim().startsWith('__MATH_') && 
              mathExpressions[parseInt(line.trim().match(/\d+/)[0])]?.type === 'block'
            );

            if (hasStandaloneMath) {
              // Handle paragraphs with standalone math expressions
              return (
                <div key={pIndex} className="space-y-2">
                  {lines.map((line, lIndex) => {
                    const trimmedLine = line.trim();
                    
                    // Check if this line is just a math expression
                    if (trimmedLine.startsWith('__MATH_') && trimmedLine.match(/^__MATH_\d+__$/)) {
                      const mathIndex = parseInt(trimmedLine.match(/\d+/)[0]);
                      const mathExpr = mathExpressions[mathIndex];
                      
                      return (
                        <div key={lIndex} className="text-center my-3">
                          <BlockMath math={mathExpr.math} />
                        </div>
                      );
                    } else {
                      // Process line with mixed content
                      return renderMixedLine(line, lIndex, mathExpressions);
                    }
                  })}
                </div>
              );
            } else {
              // Handle regular paragraphs - join lines and process as flowing text
              const fullParagraph = lines.join(' ');
              return (
                <div key={pIndex}>
                  {renderMixedLine(fullParagraph, pIndex, mathExpressions)}
                </div>
              );
            }
          })}
        </div>
      );
    } catch (error) {
      console.error('Text processing error:', error);
      return (
        <div className="text-red-600 p-2 bg-red-50 rounded">
          <p>Error processing content</p>
        </div>
      );
    }
  };

  // Helper function to render a line with mixed text and math
  const renderMixedLine = (line, key, mathExpressions) => {
    const parts = line.split(/(__MATH_\d+__)/);
    
    return (
      <div key={key} className="leading-relaxed">
        {parts.map((part, partIndex) => {
          if (part.startsWith('__MATH_')) {
            const mathIndex = parseInt(part.match(/\d+/)[0]);
            const mathExpr = mathExpressions[mathIndex];
            
            try {
              if (mathExpr.type === 'block') {
                return (
                  <div key={partIndex} className="text-center my-3">
                    <BlockMath math={mathExpr.math} />
                  </div>
                );
              } else {
                return (
                  <InlineMath key={partIndex} math={mathExpr.math} />
                );
              }
            } catch (e) {
              return (
                <span key={partIndex} className="text-red-600 bg-red-50 px-1 rounded">
                  ${mathExpr.math}$
                </span>
              );
            }
          } else if (part.trim()) {
            return <span key={partIndex}>{part}</span>;
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {processText(content)}
    </div>
  );
};

export default function LOPracticeMode({ questions, learningObject, loading }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState(new Set());
  const [userProgress, setUserProgress] = useState({
    completed: 0,
    total: 0
  });
  
  // New states for answer submission and feedback
  const [userAnswers, setUserAnswers] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showFeedback, setShowFeedback] = useState({});

  // Update progress when questions change
  useEffect(() => {
    if (questions && questions.length > 0) {
      setUserProgress({
        completed: completedQuestions.size,
        total: questions.length
      });
    }
  }, [questions, completedQuestions]);

  // Reset state when questions change
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setShowSolution(false);
    setCompletedQuestions(new Set());
    setUserAnswers({});
    setFeedbacks({});
    setShowFeedback({});
  }, [questions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
          <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
          <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4">
          <Target className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có câu hỏi luyện tập
        </h3>
        <p className="text-gray-500">
          {learningObject 
            ? `Chưa có câu hỏi luyện tập cho "${learningObject.title}"`
            : 'Không tìm thấy câu hỏi luyện tập cho learning object này'
          }
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = questions.length > 0 ? (userProgress.completed / questions.length) * 100 : 0;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowSolution(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowSolution(false);
    }
  };

  const handleMarkAsCompleted = () => {
    const newCompleted = new Set(completedQuestions);
    if (completedQuestions.has(currentQuestionIndex)) {
      newCompleted.delete(currentQuestionIndex);
    } else {
      newCompleted.add(currentQuestionIndex);
    }
    setCompletedQuestions(newCompleted);
  };

  const toggleSolution = () => {
    setShowSolution(!showSolution);
  };

  // New functions for answer submission
  const handleAnswerChange = (value) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: value
    }));
  };

  const handleSubmitAnswer = async () => {
    const currentAnswer = userAnswers[currentQuestionIndex];
    if (!currentAnswer || !currentAnswer.trim()) {
      alert('Vui lòng nhập câu trả lời trước khi gửi!');
      return;
    }

    setSubmittingAnswer(true);
    try {
      const response = await submitLOAnswerAndGetFeedback(
        currentQuestion.name,
        currentAnswer
      );

      console.log('Response from API:', response); // Debug log
      
      // Check if response is successful (both direct response and nested in message)
      const responseData = response.message || response;
      
      if (responseData && responseData.success) {
        setFeedbacks(prev => ({
          ...prev,
          [currentQuestionIndex]: {
            correct: responseData.ai_feedback_what_was_correct,
            incorrect: responseData.ai_feedback_what_was_incorrect,
            suggestions: responseData.ai_feedback_what_to_include
          }
        }));
        setShowFeedback(prev => ({
          ...prev,
          [currentQuestionIndex]: true
        }));
        
        // Mark as completed when feedback is received
        const newCompleted = new Set(completedQuestions);
        newCompleted.add(currentQuestionIndex);
        setCompletedQuestions(newCompleted);
      } else {
        console.error('Response format issue:', response);
        alert(`Có lỗi xảy ra: ${responseData?.message || 'Vui lòng thử lại!'}`);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Có lỗi xảy ra khi gửi câu trả lời. Vui lòng thử lại!');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const toggleFeedback = () => {
    setShowFeedback(prev => ({
      ...prev,
      [currentQuestionIndex]: !prev[currentQuestionIndex]
    }));
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Nhận biết':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Thông hiểu':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Vận dụng':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Vận dụng cao':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQuestionTypeIcon = (type) => {
    return type === 'Trắc nghiệm' ? '🔘' : '✍️';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Tiến độ luyện tập
          </span>
          <span className="text-sm text-gray-500">
            {userProgress.completed}/{userProgress.total} câu đã hoàn thành
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-amber-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Câu trước</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Câu {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>

        <button
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Câu tiếp</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {/* Question Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getQuestionTypeIcon(currentQuestion.question_type)}</span>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Câu hỏi {currentQuestionIndex + 1}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentQuestion.question_type}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Difficulty Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
              
              {/* Completion Status */}
              <button
                onClick={handleMarkAsCompleted}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  completedQuestions.has(currentQuestionIndex)
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {completedQuestions.has(currentQuestionIndex) ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Đã hoàn thành</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Đánh dấu hoàn thành</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="px-6 py-6">
          <FormattedTextDisplay 
            content={currentQuestion.question_text}
            className="text-gray-900 mb-6"
          />

          {/* Answer Input Section */}
          <div className="mb-6">
            <label htmlFor="user-answer" className="block text-sm font-medium text-gray-700 mb-2">
              Câu trả lời của bạn:
            </label>
            <textarea
              id="user-answer"
              value={userAnswers[currentQuestionIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Nhập câu trả lời của bạn tại đây..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={4}
            />
            
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={handleSubmitAnswer}
                disabled={submittingAnswer || !userAnswers[currentQuestionIndex]?.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAnswer ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Gửi câu trả lời</span>
                  </>
                )}
              </button>
              
              {feedbacks[currentQuestionIndex] && (
                <button
                  onClick={toggleFeedback}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showFeedback[currentQuestionIndex]
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{showFeedback[currentQuestionIndex] ? 'Ẩn phản hồi' : 'Xem phản hồi'}</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Feedback Section */}
          {feedbacks[currentQuestionIndex] && showFeedback[currentQuestionIndex] && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Phản hồi từ AI
              </h4>
              
              <div className="space-y-4">
                {feedbacks[currentQuestionIndex].correct && (
                  <div>
                    <h5 className="font-medium text-green-800 mb-1">✅ Phần làm tốt:</h5>
                    <p className="text-sm text-green-700">{feedbacks[currentQuestionIndex].correct}</p>
                  </div>
                )}
                
                {feedbacks[currentQuestionIndex].incorrect && (
                  <div>
                    <h5 className="font-medium text-red-800 mb-1">❌ Phần cần cải thiện:</h5>
                    <p className="text-sm text-red-700">{feedbacks[currentQuestionIndex].incorrect}</p>
                  </div>
                )}
                
                {feedbacks[currentQuestionIndex].suggestions && (
                  <div>
                    <h5 className="font-medium text-amber-800 mb-1">💡 Gợi ý cải thiện:</h5>
                    <p className="text-sm text-amber-700">{feedbacks[currentQuestionIndex].suggestions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solution Section */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={toggleSolution}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showSolution
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {showSolution ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span>Ẩn lời giải</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Xem lời giải</span>
                </>
              )}
            </button>

            {showSolution && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  <h4 className="font-medium text-amber-900">Lời giải gợi ý</h4>
                </div>
                <FormattedTextDisplay 
                  content={currentQuestion.suggested_solution}
                  className="text-amber-900"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Grid Navigation */}
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Điều hướng câu hỏi
        </h4>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentQuestionIndex(index);
                setShowSolution(false);
              }}
              className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-amber-600 text-white'
                  : completedQuestions.has(index)
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center">
          <div className="text-2xl font-bold text-amber-600">{questions.length}</div>
          <div className="text-sm text-gray-600">Tổng câu hỏi</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center">
          <div className="text-2xl font-bold text-green-600">{userProgress.completed}</div>
          <div className="text-sm text-gray-600">Đã hoàn thành</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(progressPercentage)}%
          </div>
          <div className="text-sm text-gray-600">Tiến độ</div>
        </div>
      </div>
    </div>
  );
}
