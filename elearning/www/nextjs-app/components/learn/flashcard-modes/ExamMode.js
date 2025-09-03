import { useState, useEffect } from "react";
import { useExamMode } from "@/hooks/useExamMode";
import { useFlashcardSession } from "@/hooks/useFlashcardSession";
import MathRenderer from "../MathRenderer";
import { RefreshCw, Lightbulb, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Play } from "lucide-react";
import { useRouter } from "next/router";

// Component to format and display text with better structure
const FormattedTextDisplay = ({ content, className = "" }) => {
  if (!content) return null;

  // Function to check if a line contains LaTeX
  const containsLatex = (text) => {
    return /\\[a-zA-Z]+\{|\\[a-zA-Z]+\s|\\[()[\]{}]|\$.*\$|\\text\{|\\frac\{|\\sqrt\{|\\sum|\\int|\\leftarrow|\\rightarrow|\\Leftrightarrow|\\ne|\\leq|\\geq/.test(
      text
    );
  };

  // Temporarily replace LaTeX expressions with placeholders to protect them
  const latexExpressions = [];
  let protectedContent = content;

  // Protect inline LaTeX expressions like \text{...}, \frac{...}, etc.
  protectedContent = protectedContent.replace(
    /\\[a-zA-Z]+\{[^}]*\}/g,
    (match) => {
      const placeholder = `__LATEX_EXPR_${latexExpressions.length}__`;
      latexExpressions.push(match);
      return placeholder;
    }
  );

  // Protect LaTeX commands like \Leftrightarrow, \ne, etc.
  protectedContent = protectedContent.replace(/\\[a-zA-Z]+/g, (match) => {
    const placeholder = `__LATEX_CMD_${latexExpressions.length}__`;
    latexExpressions.push(match);
    return placeholder;
  });

  // Pre-process content to remove excessive asterisks and trailing numbers
  let processedContent = protectedContent
    // Remove standalone asterisks that aren't part of markdown formatting
    .replace(/^\s*\*\s*$/gm, "")
    // Remove trailing numbers at end of lines (like "2.", "3.")
    .replace(/\s+\d+\.\s*$/gm, "")
    // More aggressive asterisk cleaning (but protect LaTeX placeholders)
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove double asterisks but keep content
    .replace(/\*([^*\n]+)\*/g, "$1") // Remove single asterisks but keep content
    // Remove excessive asterisks at start/end of lines
    .replace(/^\*+\s*/gm, "")
    .replace(/\s*\*+$/gm, "")
    // Clean up multiple consecutive empty lines
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    // Normalize whitespace
    .trim();

  // Restore LaTeX expressions
  latexExpressions.forEach((expr, index) => {
    processedContent = processedContent.replace(
      new RegExp(`__LATEX_EXPR_${index}__`, "g"),
      expr
    );
    processedContent = processedContent.replace(
      new RegExp(`__LATEX_CMD_${index}__`, "g"),
      expr
    );
  });

  // Split content into lines and process each one
  const lines = processedContent.split("\n");
  const processedLines = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines, lines with only markdown symbols, or very short meaningless lines
    if (
      !trimmedLine ||
      trimmedLine === "**" ||
      trimmedLine === "*" ||
      trimmedLine === "•" ||
      /^[\*\s•\d\.\-_]*$/.test(trimmedLine) ||
      trimmedLine.length < 2
    ) {
      processedLines.push(<div key={index} className="h-2"></div>);
      return;
    }

    // Handle bullet points - only process if they contain meaningful content
    if (trimmedLine.startsWith("•")) {
      const bulletContent = trimmedLine.substring(1).trim();
      if (bulletContent && bulletContent.length > 2) {
        // More strict validation
        processedLines.push(
          <div key={index} className="flex items-start mb-3">
            <span className="text-emerald-600 mr-3 mt-0.5 font-medium flex-shrink-0">
              •
            </span>
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
      if (match && match[2].trim() && match[2].trim().length > 2) {
        // More strict validation
        processedLines.push(
          <div key={index} className="flex items-start mb-3">
            <div
              className="text-emerald-600 font-semibold mr-3 mt-0.5 flex-shrink-0 text-right"
              style={{ minWidth: "28px" }}
            >
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
    else if (
      /^(Phân tích|Lời giải|Bước|Giải thích|Kết luận|Tóm tắt|Nhận xét)/i.test(
        trimmedLine
      )
    ) {
      // Clean any remaining asterisks from headers but preserve LaTeX
      const cleanHeader = containsLatex(trimmedLine)
        ? trimmedLine
        : trimmedLine.replace(/\*+/g, "").trim();
      if (cleanHeader && cleanHeader.length > 3) {
        processedLines.push(
          <div
            key={index}
            className="font-bold text-gray-800 mb-4 mt-6 text-base border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-lg"
          >
            <MathRenderer content={cleanHeader} />
          </div>
        );
      }
    }
    // Handle traditional bold text (titles/headers) - but with more cleaning
    else if (
      (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) ||
      (trimmedLine.includes("**") && trimmedLine.length > 6)
    ) {
      // More aggressive cleaning of asterisks but preserve LaTeX
      const cleanText = containsLatex(trimmedLine)
        ? trimmedLine.replace(/^\*+|\*+$/g, "").trim()
        : trimmedLine.replace(/\*+/g, "").trim();
      if (
        cleanText &&
        cleanText.length > 3 &&
        !/^[\s\d\.\-_]*$/.test(cleanText)
      ) {
        processedLines.push(
          <div
            key={index}
            className="font-bold text-gray-800 mb-4 mt-6 text-base border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-lg"
          >
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
          .replace(/\*+/g, "") // Remove ALL asterisks only if no LaTeX
          .replace(/^\s*\d+\.\s*/, "") // Remove leading numbers
          .replace(/\s+\d+\.\s*$/, "") // Remove trailing numbers like "2." or "3."
          .trim();
      } else {
        // For lines with LaTeX, only remove leading/trailing asterisks carefully
        cleanedLine = trimmedLine
          .replace(/^\*+\s*/, "") // Remove leading asterisks
          .replace(/\s*\*+$/, "") // Remove trailing asterisks
          .trim();
      }

      // Only process if there's meaningful content left
      if (
        cleanedLine &&
        cleanedLine.length > 3 &&
        !/^[\s\d\.\-_]*$/.test(cleanedLine)
      ) {
        processedLines.push(
          <div key={index} className="mb-3 leading-relaxed text-gray-700">
            <MathRenderer content={cleanedLine} />
          </div>
        );
      }
    }
  });

  return (
    <div
      className={`space-y-1 ${className}`}
      style={{
        animation: "fadeIn 0.3s ease-in-out",
      }}
    >
      {processedLines}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default function ExamMode({ topicId }) {
  const {
    currentAttemptName,
    examFlashcards,
    currentQuestionIndex,
    userAnswers,
    aiFeedbacks,
    detailedExplanations,
    isLoadingExam,
    isLoadingFeedback,
    isLoadingExplanation,
    isExamCompleted,
    activeQuestionFlashcardName,
    startExam,
    submitAnswer,
    completeExam,
    restartExam,
    goToNextQuestion,
    goToPreviousQuestion,
    resetQuestion,
    loadingFlashcards,
    flashcardsError,
    submitSelfAssessment,
    getDetailedExplanation,
  } = useExamMode(topicId);

  // Track flashcard session for Exam mode learning time
  const { isSessionActive, totalTimeSpent, sessionError } = useFlashcardSession(
    topicId,
    "Exam",
    !!currentAttemptName && !isExamCompleted
  );

  // Log session tracking info for debugging
  useEffect(() => {
    if (isSessionActive) {
      console.log(`ExamMode: Session active for Exam mode, topic: ${topicId}`);
    }
    if (sessionError) {
      console.error(`ExamMode: Session error:`, sessionError);
    }
  }, [isSessionActive, sessionError, topicId]);

  // Local state for user input
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [selfAssessment, setSelfAssessment] = useState("");
  const [isSubmittingSelfAssessment, setIsSubmittingSelfAssessment] =
    useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [isLoadingCurrentExplanation, setIsLoadingCurrentExplanation] =
    useState(false);
  // State for completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const router = useRouter();

  // Initialize exam on first render
  useEffect(() => {
    if (!currentAttemptName && !isLoadingExam && examFlashcards.length === 0) {
      startExam();
    }
  }, [currentAttemptName, isLoadingExam, startExam, examFlashcards.length]);

  // Update current answer when changing questions or if there's a saved answer
  useEffect(() => {
    if (activeQuestionFlashcardName) {
      if (userAnswers[activeQuestionFlashcardName]) {
        setCurrentAnswer(userAnswers[activeQuestionFlashcardName]);
        setHasSubmitted(!!aiFeedbacks[activeQuestionFlashcardName]);
      } else {
        setCurrentAnswer("");
        setHasSubmitted(false);
      }

      // Check if detailed explanation exists for this question and show it
      if (detailedExplanations[activeQuestionFlashcardName]) {
        setShowDetailedExplanation(true);
      } else {
        setShowDetailedExplanation(false);
      }

      // Only show self-assessment if user has submitted an answer and received feedback
      if (aiFeedbacks[activeQuestionFlashcardName]) {
        setShowSelfAssessment(true);
      } else {
        setShowSelfAssessment(false);
      }
    }
  }, [
    activeQuestionFlashcardName,
    userAnswers,
    aiFeedbacks,
    detailedExplanations,
  ]);

  // Effect to detect exam completion and show modal
  useEffect(() => {
    if (isExamCompleted && !showCompletionModal) {
      console.log("ExamMode: Exam completed, showing completion modal");
      setShowCompletionModal(true);
    }
  }, [isExamCompleted, showCompletionModal]);

  // Loading state
  if (isLoadingExam || loadingFlashcards) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Đang tải bài kiểm tra...</p>
      </div>
    );
  }

  // Error state
  if (flashcardsError) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">
        {flashcardsError}
      </div>
    );
  }

  // No flashcards
  if (!examFlashcards || examFlashcards.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-600">
          Không có thẻ ghi nhớ nào cho chủ đề này. Vui lòng kiểm tra lại sau.
        </p>
      </div>
    );
  }

  // Format content with newlines for Identify the Error
  const formatContent = (content) => {
    if (!content) return "";
    return content.replace(/\\n/g, "\n");
  };

  // Get flashcard type tag color
  const getTagColor = (type) => {
    const typeColors = {
      "Concept/Theorem/Formula": "bg-blue-100 text-blue-800",
      "Fill in the Blank": "bg-green-100 text-green-800",
      "Ordering Steps": "bg-purple-100 text-purple-800",
      "What's the Next Step?": "bg-amber-100 text-amber-800",
      "Short Answer/Open-ended": "bg-indigo-100 text-indigo-800",
      "Identify the Error": "bg-red-100 text-red-800",
    };
    return typeColors[type] || "bg-gray-100 text-gray-800";
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (
      !currentAnswer.trim() ||
      !activeQuestionFlashcardName ||
      hasSubmitted ||
      isLoadingFeedback
    ) {
      return;
    }

    console.log("Submitting answer...");
    await submitAnswer(activeQuestionFlashcardName, currentAnswer.trim());
    console.log(
      "Answer submitted, setting hasSubmitted and showSelfAssessment to true"
    );
    setHasSubmitted(true);
    setShowSelfAssessment(true);
  };

  // Handle self-assessment submission
  const handleSubmitSelfAssessment = async () => {
    if (
      !selfAssessment ||
      !activeQuestionFlashcardName ||
      isSubmittingSelfAssessment
    ) {
      return;
    }

    console.log("Submitting self-assessment:", selfAssessment);
    setIsSubmittingSelfAssessment(true);
    try {
      const success = await submitSelfAssessment(
        activeQuestionFlashcardName,
        selfAssessment
      );
      console.log("Self-assessment submission result:", success);
      if (success) {
        setShowSelfAssessment(false);
        setSelfAssessment("");

        // After submitting self-assessment, show detailed explanation
        console.log("Getting detailed explanation...");
        setIsLoadingCurrentExplanation(true);
        setShowDetailedExplanation(true);

        try {
          // Gọi API để lấy lời giải chi tiết từ LLM
          const explanation = await getDetailedExplanation(
            activeQuestionFlashcardName
          );
          console.log(
            "Detailed explanation loaded:",
            explanation ? "success" : "failed"
          );
        } catch (error) {
          console.error("Error getting detailed explanation:", error);
        } finally {
          setIsLoadingCurrentExplanation(false);
        }
      }
    } catch (error) {
      console.error("Error submitting self-assessment:", error);
    } finally {
      setIsSubmittingSelfAssessment(false);
    }
  };

  // Reset current question
  const handleResetQuestion = () => {
    if (activeQuestionFlashcardName) {
      resetQuestion(activeQuestionFlashcardName);
      setCurrentAnswer("");
      setHasSubmitted(false);
      setShowSelfAssessment(false);
    }
  };

  // Complete the exam
  const handleCompleteExam = async () => {
    await completeExam();
  };

  // Handle restart exam
  const handleRestartExam = async () => {
    await restartExam();
  };

  // Calculate progress
  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = examFlashcards.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Current flashcard
  const currentFlashcard = examFlashcards[currentQuestionIndex];

  // Exam complete view
  if (isExamCompleted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-3xl mx-auto">
        {/* Main completion card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full text-center">
          {/* Success icon */}
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Hoàn thành bài kiểm tra
          </h2>

          {/* Description */}
          <div className="mb-8">
            <p className="text-gray-700 text-lg mb-3">
              Chúc mừng! Bạn đã hoàn thành tất cả{" "}
              <span className="font-semibold text-emerald-600">
                {totalQuestions} thẻ ghi nhớ
              </span>{" "}
              trong bộ này.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
              <p className="text-blue-800 text-sm leading-relaxed">
                Bạn đã đánh giá mức độ hiểu của mình cho từng thẻ, và hệ thống
                đã tự động đưa những thẻ bạn cần ôn tập vào chế độ SRS.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() =>
                (window.location.href = `/learn/${topicId}?mode=srs`)
              }
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Chuyển sang chế độ SRS để ôn tập
            </button>

            <button
              onClick={handleRestartExam}
              className="bg-white border-2 border-indigo-300 text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 w-full sm:w-auto"
            >
              Bắt đầu lại
            </button>
          </div>

          {/* Footer note */}
          <div className="bg-gray-50 rounded-lg p-4 mx-auto max-w-lg">
            <p className="text-gray-600 text-sm flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Hệ thống SRS sẽ nhắc nhở bạn ôn tập các thẻ này vào thời điểm tối
              ưu để tăng cường khả năng ghi nhớ dài hạn.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      {/* Progress bar */}
      <div className="mb-6 px-4 sm:px-0">
        <div className="mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800">Bài kiểm tra</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {answeredCount} / {totalQuestions} đã trả lời
            </span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-8 min-h-[400px] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                Câu hỏi {currentQuestionIndex + 1} / {examFlashcards.length}
              </span>
              {currentFlashcard?.flashcard_type && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(
                    currentFlashcard.flashcard_type
                  )}`}
                >
                  {currentFlashcard.flashcard_type}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentFlashcard?.hint && (
                <div className="relative">
                  <button
                    className="w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                    onMouseEnter={() => setShowHint(true)}
                    onMouseLeave={() => setShowHint(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint(!showHint);
                    }}
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>

                  {showHint && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 text-sm z-20">
                      <div className="font-medium text-gray-700 mb-1">
                        Hint:
                      </div>
                      <div className="text-gray-600">
                        <MathRenderer content={currentFlashcard.hint} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleResetQuestion}
                disabled={!hasSubmitted}
                className={`flex items-center text-sm ${
                  hasSubmitted
                    ? "text-indigo-600 hover:text-indigo-800"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Làm lại
              </button>
            </div>
          </div>

          <div className="prose max-w-none mb-6 whitespace-pre-line">
            {currentFlashcard?.flashcard_type === "Ordering Steps" ? (
              <div>
                <MathRenderer content={currentFlashcard?.question || ""} />
                {!hasSubmitted && currentFlashcard?.ordering_steps_items && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Sắp xếp các bước theo thứ tự đúng:
                    </p>
                    <div className="space-y-2">
                      {currentFlashcard.ordering_steps_items.map(
                        (step, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-md"
                          >
                            <div className="flex items-center">
                              <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full text-sm mr-3">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <MathRenderer content={step.step_content} />
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      Hãy viết danh sách các bước theo thứ tự đúng vào khung trả
                      lời phía dưới.
                    </p>
                  </div>
                )}
                {hasSubmitted && currentFlashcard?.ordering_steps_items && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-gray-700 font-medium mb-2">
                      Thứ tự đúng:
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      {currentFlashcard.ordering_steps_items
                        .sort((a, b) => a.correct_order - b.correct_order)
                        .map((step) => (
                          <li key={step.correct_order} className="pl-2">
                            <div className="prose prose-sm max-w-none">
                              <MathRenderer content={step.step_content} />
                            </div>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : currentFlashcard?.flashcard_type === "Identify the Error" ? (
              <MathRenderer
                content={formatContent(currentFlashcard?.question || "")}
              />
            ) : (
              <MathRenderer content={currentFlashcard?.question || ""} />
            )}
          </div>

          <div className="mt-6">
            <label
              htmlFor="answer"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Câu trả lời của bạn
            </label>
            <textarea
              id="answer"
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Nhập câu trả lời của bạn"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              readOnly={hasSubmitted}
            ></textarea>
          </div>

          {hasSubmitted && aiFeedbacks[activeQuestionFlashcardName] && (
            <div className="mt-6 space-y-4">
              {/* Tutor feedback - consolidated all feedback into one beautiful section */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-blue-800 font-semibold text-lg">
                    Phản hồi của gia sư
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* What was correct */}
                  {aiFeedbacks[activeQuestionFlashcardName]
                    .ai_feedback_what_was_correct && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                      <h4 className="text-green-700 font-medium mb-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Những gì bạn đã làm đúng
                      </h4>
                      <div className="text-green-700">
                        <FormattedTextDisplay
                          content={
                            aiFeedbacks[activeQuestionFlashcardName]
                              .ai_feedback_what_was_correct
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* What was incorrect */}
                  {aiFeedbacks[activeQuestionFlashcardName]
                    .ai_feedback_what_was_incorrect && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                      <h4 className="text-red-700 font-medium mb-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Những gì bạn đã làm sai
                      </h4>
                      <div className="text-red-700">
                        <FormattedTextDisplay
                          content={
                            aiFeedbacks[activeQuestionFlashcardName]
                              .ai_feedback_what_was_incorrect
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* What to include */}
                  {aiFeedbacks[activeQuestionFlashcardName]
                    .ai_feedback_what_to_include && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                      <h4 className="text-purple-700 font-medium mb-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Những gì bạn có thể bổ sung thêm
                      </h4>
                      <div className="text-purple-700">
                        <FormattedTextDisplay
                          content={
                            aiFeedbacks[activeQuestionFlashcardName]
                              .ai_feedback_what_to_include
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Handle case when all feedback sections are empty or missing */}
                  {!aiFeedbacks[activeQuestionFlashcardName]
                    .ai_feedback_what_was_correct &&
                    !aiFeedbacks[activeQuestionFlashcardName]
                      .ai_feedback_what_was_incorrect &&
                    !aiFeedbacks[activeQuestionFlashcardName]
                      .ai_feedback_what_to_include && (
                      <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
                        <h4 className="text-yellow-700 font-medium mb-2 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                          Không có phản hồi
                        </h4>
                        <div className="text-yellow-700">
                          <p>
                            Chúng tôi không thể tạo phản hồi cho câu trả lời của
                            bạn lúc này. Vui lòng thử lại sau.
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Self-assessment section - ALWAYS show after feedback */}
              {!detailedExplanations[activeQuestionFlashcardName] && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-blue-700 font-medium mb-2">
                    Đánh giá mức độ hiểu của bạn
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["Chưa hiểu", "Mơ hồ", "Khá ổn", "Rất rõ"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelfAssessment(level)}
                        className={`py-2 px-3 rounded-md text-sm ${
                          selfAssessment === level
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleSubmitSelfAssessment}
                      disabled={!selfAssessment}
                      className={`px-4 py-2 rounded text-sm ${
                        !selfAssessment
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Gửi & Xem lời giải chi tiết
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed explanation section */}
              {(showDetailedExplanation ||
                detailedExplanations[activeQuestionFlashcardName]) && (
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <BookOpen className="h-6 w-6 text-emerald-700 mr-3" />
                      <h3 className="text-emerald-700 font-semibold text-lg">
                        Lời giải chi tiết
                      </h3>
                    </div>
                    <button
                      onClick={() =>
                        setShowDetailedExplanation(!showDetailedExplanation)
                      }
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {showDetailedExplanation ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          Ẩn lời giải
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          Xem lời giải
                        </>
                      )}
                    </button>
                  </div>

                  {showDetailedExplanation && (
                    <div
                      className={`transition-all duration-300 ease-in-out ${
                        isLoadingCurrentExplanation
                          ? "opacity-50"
                          : "opacity-100"
                      }`}
                    >
                      {isLoadingCurrentExplanation ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4"></div>
                          <p className="text-emerald-600 text-sm font-medium">
                            Đang tải lời giải chi tiết...
                          </p>
                          <p className="text-emerald-500 text-xs mt-1">
                            Vui lòng đợi trong giây lát
                          </p>
                        </div>
                      ) : detailedExplanations[activeQuestionFlashcardName] ? (
                        <div className="bg-white rounded-lg p-4 border border-emerald-100">
                          <FormattedTextDisplay
                            content={
                              detailedExplanations[activeQuestionFlashcardName]
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <BookOpen className="w-8 h-8 text-emerald-600" />
                          </div>
                          <p className="text-emerald-600 italic">
                            Không có lời giải chi tiết.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {showDetailedExplanation && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setShowDetailedExplanation(false);
                          // Auto advance to next question if not the last one
                          if (
                            currentQuestionIndex <
                            examFlashcards.length - 1
                          ) {
                            goToNextQuestion();
                          }
                        }}
                        className="px-4 py-2 rounded text-sm bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {currentQuestionIndex < examFlashcards.length - 1
                          ? "Tiếp tục câu tiếp theo"
                          : "Hoàn thành"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`flex items-center justify-center w-12 h-12 rounded-full border ${
            currentQuestionIndex === 0
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="flex space-x-4">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || isLoadingFeedback}
              className={`bg-indigo-600 text-white px-4 py-2 rounded-md font-medium ${
                !currentAnswer.trim() || isLoadingFeedback
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-700"
              } transition-colors`}
            >
              {isLoadingFeedback
                ? "Đang lấy phản hồi..."
                : "Gửi câu trả lời & Nhận phản hồi"}
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === examFlashcards.length - 1}
              className={`bg-indigo-600 text-white px-4 py-2 rounded-md font-medium ${
                currentQuestionIndex === examFlashcards.length - 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-700"
              } transition-colors`}
            >
              Câu hỏi tiếp theo
            </button>
          )}

          {answeredCount === totalQuestions && (
            <button
              onClick={handleCompleteExam}
              className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              Hoàn thành bài kiểm tra
            </button>
          )}
        </div>

        <button
          onClick={goToNextQuestion}
          disabled={currentQuestionIndex === examFlashcards.length - 1}
          className={`flex items-center justify-center w-12 h-12 rounded-full border ${
            currentQuestionIndex === examFlashcards.length - 1
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50">
          <DialogHeader className="text-center pb-2">
            {/* Animated celebration container */}
            <div className="relative mb-6">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-rose-600 rounded-full blur-xl opacity-20 animate-pulse"></div>

              {/* Main trophy with animation */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Trophy className="h-10 w-10 text-white" />
                </div>

                {/* Floating stars */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-400 rounded-full animate-ping opacity-75"></div>
                <div
                  className="absolute -bottom-1 -left-2 w-4 h-4 bg-pink-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute top-1/2 -right-3 w-3 h-3 bg-rose-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              🎉 Hoàn thành bài kiểm tra! 🎉
            </DialogTitle>

            <DialogDescription className="text-gray-700 text-base leading-relaxed px-4">
              <span className="font-semibold text-purple-600">Xuất sắc!</span>{" "}
              Bạn đã hoàn thành tất cả câu hỏi trong bài kiểm tra!
              <br />
              <br />
              📊{" "}
              <span className="font-medium">
                Kết quả của bạn đã được ghi nhận
              </span>
              <br />
              Hãy thử sức với bài kiểm tra khác để củng cố kiến thức thêm nữa!
            </DialogDescription>
          </DialogHeader>

          {/* Achievement stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mx-4 mb-6 border border-white/50">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {examFlashcards.length}
                </div>
                <div className="text-xs text-gray-600">Câu hỏi hoàn thành</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-xs text-gray-600">Đã nộp bài</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">🎯</div>
                <div className="text-xs text-gray-600">
                  Sẵn sàng thử thách mới
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <Button
              onClick={() => {
                setShowCompletionModal(false);
                router.push(`/test?mode=practice-test&topicId=${topicId}`);
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Play className="h-5 w-5 mr-2" />
              🚀 Làm bài kiểm tra khác!
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
              className="w-full border-2 border-purple-200 text-purple-600 hover:bg-purple-50 font-medium py-3 text-base transition-all duration-200"
            >
              📚 Tiếp tục ôn tập
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
