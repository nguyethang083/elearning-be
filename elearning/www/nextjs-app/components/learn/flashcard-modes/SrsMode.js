import { useState, useEffect } from "react";
import { useSrsMode } from "@/hooks/useSrsMode";
import { useUserFlashcardSettings } from "@/hooks/useUserFlashcardSettings";
import { useFlashcardSession } from "@/hooks/useFlashcardSession";
import MathRenderer from "../MathRenderer";
import {
  XCircle,
  CheckCircle,
  Printer,
  Download,
  Info,
  ArrowRightCircle,
  FileText,
  Lightbulb,
  BookOpen,
  RefreshCw,
} from "lucide-react";
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

export default function SrsMode({ topicId }) {
  // Track reviewed cards for the session
  const [reviewedCards, setReviewedCards] = useState({});
  // State for hint display
  const [showHint, setShowHint] = useState(false);
  // State for completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const router = useRouter();

  // Custom hooks for SRS functionality and user settings
  const {
    cards,
    currentCard,
    currentCardIndex,
    currentAnswer,
    setCurrentAnswer,
    isAnswerVisible,
    isLoadingCards,
    isProcessingRating,
    isSubmittingAnswer,
    isRoundCompleted,
    feedback,
    detailedExplanation,
    showDetailedExplanation,
    setShowDetailedExplanation,
    isLoadingExplanation,
    error,
    srsStats,
    noExamsMessage,
    noAssessmentsMessage,
    fetchReviewCards,
    submitAnswer,
    processRating,
    startNewRound,
    goToNextCard,
    goToPreviousCard,
    resetCurrentCard,
    getDetailedExplanation,
  } = useSrsMode(topicId);

  const { settings, isLoadingSettings } = useUserFlashcardSettings(topicId);

  // Track flashcard session for SRS mode learning time
  const { isSessionActive, totalTimeSpent, sessionError } = useFlashcardSession(
    topicId,
    "SRS",
    !isLoadingCards &&
      cards &&
      cards.length > 0 &&
      !noExamsMessage &&
      !noAssessmentsMessage
  );

  // Log session tracking info for debugging
  useEffect(() => {
    if (isSessionActive) {
      console.log(`SrsMode: Session active for SRS mode, topic: ${topicId}`);
    }
    if (sessionError) {
      console.error(`SrsMode: Session error:`, sessionError);
    }
  }, [isSessionActive, sessionError, topicId]);

  // Effect to listen for SRS reset events
  useEffect(() => {
    const handleSettingsChange = (event) => {
      // Ensure it's for this topic
      if (String(event.detail.topicId) === String(topicId)) {
        console.log("SrsMode: Detected settings change, refreshing data");
        // Force refresh the SRS data
        fetchReviewCards();
      }
    };

    // Listen for both settings changes and explicit SRS reset
    window.addEventListener("flashcardSettingsChanged", handleSettingsChange);
    window.addEventListener("srsProgressReset", (event) => {
      if (String(event.detail.topicId) === String(topicId)) {
        console.log("SrsMode: SRS progress reset detected, refreshing data");
        fetchReviewCards();
      }
    });

    return () => {
      window.removeEventListener(
        "flashcardSettingsChanged",
        handleSettingsChange
      );
      window.removeEventListener("srsProgressReset", handleSettingsChange);
    };
  }, [topicId, fetchReviewCards]);

  // Effect to load detailed explanation when showing it
  useEffect(() => {
    if (showDetailedExplanation && currentCard?.name && !detailedExplanation) {
      getDetailedExplanation(currentCard.name);
    }
  }, [
    showDetailedExplanation,
    currentCard?.name,
    getDetailedExplanation,
    detailedExplanation,
  ]);

  // Effect to detect round completion and show modal
  useEffect(() => {
    if (isRoundCompleted && !showCompletionModal) {
      console.log("SrsMode: Round completed, showing completion modal");
      setShowCompletionModal(true);
    }
  }, [isRoundCompleted, showCompletionModal]);

  // Track card ratings in the session
  const handleProcessRating = (flashcardName, rating) => {
    // Update the reviewedCards state
    setReviewedCards((prev) => ({
      ...prev,
      [flashcardName]: rating,
    }));

    // Call the actual processRating function
    processRating(flashcardName, rating);
  };

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

  // Initial loading state
  if (isLoadingCards || isLoadingSettings) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Đang tải dữ liệu SRS...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>;
  }

  // Show message if there are no exam attempts
  if (noExamsMessage) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Chưa có thẻ để ôn tập</h2>
          <p className="text-gray-600 mb-6">
            Bạn chưa có flashcard nào cần ôn tập. Hãy vào 'Exam Mode' để luyện
            tập, nhận feedback, và tự đánh giá. Những thẻ bạn cần củng cố sẽ
            được tự động thêm vào đây để ôn tập nhé!
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() =>
                (window.location.href = `/learn/${topicId}?mode=exam`)
              }
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Chuyển đến Exam Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if there are no self-assessments
  if (noAssessmentsMessage) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Chưa đánh giá mức độ hiểu
          </h2>
          <p className="text-gray-600 mb-6">
            Bạn chưa có flashcard nào được đưa vào hệ thống ôn tập SRS. Sau khi
            trả lời các câu hỏi trong Exam Mode, hãy đánh giá mức độ hiểu của
            bạn để hệ thống tự động thêm các thẻ vào lịch ôn tập!
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() =>
                (window.location.href = `/learn/${topicId}?mode=exam`)
              }
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Chuyển đến Exam Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Round completed view
  if (isRoundCompleted) {
    // Calculate statistics
    const totalReviewed = Object.keys(reviewedCards).length;
    const correctAnswers = Object.values(reviewedCards).filter(
      (rating) => rating === "correct" || rating === "good"
    ).length;
    const wrongAnswers = Object.values(reviewedCards).filter(
      (rating) => rating === "wrong" || rating === "again"
    ).length;
    const hardAnswers = Object.values(reviewedCards).filter(
      (rating) => rating === "hard"
    ).length;

    // Calculate percent of cards that are known
    // Use the percentage of correct answers in this session instead of overall stats
    const correctPercent =
      totalReviewed > 0
        ? Math.round((correctAnswers / totalReviewed) * 100)
        : 0;

    // Calculate how many new cards are remaining (total new cards minus the reviewed new cards)
    const totalNewCards = srsStats.new || 0;
    const reviewedNewCards = srsStats.reviewed?.new || 0;
    const remainingNewCards = Math.max(0, totalNewCards - reviewedNewCards);

    // Show "Start Next Round" button if there are any wrong answers in this session
    const showStartNextRound = wrongAnswers > 0;

    return (
      <div className="w-full max-w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Round Complete</h2>
          <p className="text-gray-600 mb-8">
            Great job! Keep studying to reach 100%
          </p>

          {/* Progress Donut */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e0e0fe"
                strokeWidth="10"
              />

              {/* Progress arc */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#6366f1"
                strokeWidth="10"
                strokeDasharray={`${correctPercent * 2.83} ${
                  283 - correctPercent * 2.83
                }`}
                strokeDashoffset="70.75"
                transform="rotate(-90 50 50)"
              />

              {/* Percentage text */}
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill="#4f46e5"
              >
                {correctPercent}%
              </text>
              <text
                x="50"
                y="70"
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                Know
              </text>
            </svg>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-lg mx-auto">
            <div className="bg-purple-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-purple-200 rounded text-xs font-medium mb-1">
                Mới
              </span>
              <p className="text-xl font-bold text-purple-800">
                {remainingNewCards}
              </p>
              <p className="text-xs text-purple-600">thẻ còn lại để học</p>
            </div>

            <div className="bg-amber-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-amber-200 rounded text-xs font-medium mb-1">
                Không biết
              </span>
              <p className="text-xl font-bold text-amber-800">{wrongAnswers}</p>
              <p className="text-xs text-amber-600">thẻ còn lại để học lại</p>
            </div>

            <div className="bg-green-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-green-200 rounded text-xs font-medium mb-1">
                Đã học
              </span>
              <p className="text-xl font-bold text-green-800">
                {correctAnswers}
              </p>
              <p className="text-xs text-green-600">thẻ đã học đúng</p>
            </div>

            <div className="bg-red-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-red-200 rounded text-xs font-medium mb-1">
                Khó
              </span>
              <p className="text-xl font-bold text-red-800">{hardAnswers}</p>
              <p className="text-xs text-red-600">thẻ được đánh dấu là khó</p>
            </div>
          </div>

          {/* Only show Start Next Round if there are any wrong answers */}
          {showStartNextRound ? (
            <div className="flex justify-center">
              <button
                onClick={startNewRound}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
              >
                Bắt đầu vòng tiếp theo
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <p className="text-green-700 font-medium">
                Tất cả thẻ đã hoàn thành! Kiểm tra lại sau để có thêm thẻ để ôn
                tập.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No cards to review
  if (cards.length === 0) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Không có thẻ để ôn tập</h2>
          <p className="text-gray-600 mb-6">
            Bạn đã hoàn thành tất cả các ôn tập của bạn. Kiểm tra lại sau để có
            thêm thẻ để ôn tập.
          </p>
        </div>
      </div>
    );
  }

  // Regular SRS mode view with card
  return (
    <div className="w-full max-w-full">
      {/* Current card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-8">
          {/* Card content */}
          <div className="min-h-[300px] mb-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              {currentCard?.flashcard_type && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(
                    currentCard.flashcard_type
                  )}`}
                >
                  {currentCard.flashcard_type}
                </span>
              )}

              {currentCard?.hint && (
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
                        Gợi ý:
                      </div>
                      <div className="text-gray-600">
                        <MathRenderer content={currentCard.hint} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="whitespace-pre-line">
              {currentCard?.flashcard_type === "Ordering Steps" ? (
                <div>
                  <MathRenderer content={currentCard?.question || ""} />
                  {currentCard?.ordering_steps_items && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Sắp xếp các bước theo thứ tự đúng:
                      </p>
                      <div className="space-y-2">
                        {currentCard.ordering_steps_items.map((step, index) => (
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
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : currentCard?.flashcard_type === "Identify the Error" ? (
                <MathRenderer
                  content={formatContent(currentCard?.question || "")}
                />
              ) : (
                <MathRenderer content={currentCard?.question || ""} />
              )}
            </div>

            {/* Answer input section */}
            {!isAnswerVisible && (
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
                  disabled={isSubmittingAnswer}
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || isSubmittingAnswer}
                    className={`relative px-4 py-2 rounded-md font-medium flex items-center ${
                      !currentAnswer.trim() || isSubmittingAnswer
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isSubmittingAnswer ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Đang gửi...</span>
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-emerald-400 animate-pulse rounded-b-md"
                          style={{ width: "100%" }}
                        ></div>
                      </>
                    ) : (
                      "Gửi câu trả lời"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Feedback section */}
            {isAnswerVisible && feedback && (
              <div className="mt-6 space-y-4">
                {/* Tutor feedback */}
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
                  <div className="text-blue-700">
                    <FormattedTextDisplay content={feedback} />
                  </div>
                </div>

                {/* Detailed explanation section */}
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
                        isLoadingExplanation ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      {isLoadingExplanation ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4"></div>
                          <p className="text-emerald-600 text-sm font-medium">
                            Đang tải lời giải chi tiết...
                          </p>
                          <p className="text-emerald-500 text-xs mt-1">
                            Vui lòng đợi trong giây lát
                          </p>
                        </div>
                      ) : detailedExplanation ? (
                        <div className="bg-white rounded-lg p-4 border border-emerald-100">
                          <FormattedTextDisplay content={detailedExplanation} />
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
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={resetCurrentCard}
                    className="flex items-center px-5 py-3 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 rounded-xl font-medium hover:from-amber-200 hover:to-orange-200 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Làm lại
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={() =>
                        handleProcessRating(currentCard?.name, "wrong")
                      }
                      disabled={isProcessingRating}
                      className="flex items-center px-5 py-3 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 rounded-xl font-medium hover:from-red-200 hover:to-pink-200 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Quên
                    </button>
                    <button
                      onClick={() =>
                        handleProcessRating(currentCard?.name, "hard")
                      }
                      disabled={isProcessingRating}
                      className="flex items-center px-5 py-3 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-xl font-medium hover:from-amber-200 hover:to-yellow-200 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Khó
                    </button>
                    <button
                      onClick={() =>
                        handleProcessRating(currentCard?.name, "correct")
                      }
                      disabled={isProcessingRating}
                      className="flex items-center px-5 py-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-xl font-medium hover:from-green-200 hover:to-emerald-200 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Nhớ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card footer with progress */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-purple-300 rounded-full mr-2"></span>
              <span className="text-sm text-gray-600">
                {currentCardIndex + 1} / {cards.length}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {currentCard?.status === "new" ? (
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                    Mới
                  </span>
                ) : currentCard?.status === "learning" ||
                  currentCard?.status === "lapsed" ? (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                    Đang học
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                    Ôn tập
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              className={`p-1 rounded-full ${
                currentCardIndex === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNextCard}
              disabled={currentCardIndex === cards.length - 1}
              className={`p-1 rounded-full ${
                currentCardIndex === cards.length - 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Review Stats */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Ôn tập hiện tại</h3>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mt-2">
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-lg font-semibold text-purple-700">
              {srsStats.current_review?.new || 0}
            </div>
            <div className="text-xs text-purple-600">Mới</div>
          </div>
          <div className="bg-amber-50 p-2 rounded">
            <div className="text-lg font-semibold text-amber-700">
              {(srsStats.current_review?.learning || 0) +
                (srsStats.current_review?.lapsed || 0)}
            </div>
            <div className="text-xs text-amber-600">Đang học</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-semibold text-green-700">
              {srsStats.current_review?.review || 0}
            </div>
            <div className="text-xs text-green-600">Ôn tập</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-lg font-semibold text-blue-700">
              {srsStats.due || 0}
            </div>
            <div className="text-xs text-blue-600">Tổng số</div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Thống kê tổng
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-purple-50 p-2 rounded">
              <div className="text-lg font-semibold text-purple-700">
                {srsStats.new || 0}
              </div>
              <div className="text-xs text-purple-600">Mới</div>
            </div>
            <div className="bg-amber-50 p-2 rounded">
              <div className="text-lg font-semibold text-amber-700">
                {srsStats.learning || 0}
              </div>
              <div className="text-xs text-amber-600">Đang học</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-lg font-semibold text-green-700">
                {srsStats.review || 0}
              </div>
              <div className="text-xs text-green-600">Ôn tập</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="text-lg font-semibold text-red-700">
                {srsStats.lapsed || 0}
              </div>
              <div className="text-xs text-red-600">Đã học</div>
            </div>
          </div>
        </div>

        {/* Upcoming Reviews */}
        {srsStats && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Thẻ sắp đến hạn ôn tập
            </h4>
            {srsStats.upcoming && srsStats.upcoming > 0 ? (
              <div className="flex items-center justify-between bg-amber-50 p-3 rounded">
                <div>
                  <span className="text-amber-800 font-medium">
                    {srsStats.upcoming}
                  </span>
                  <span className="text-amber-700 text-sm ml-1">
                    thẻ sắp đến hạn ôn tập
                  </span>
                </div>
                <div className="text-xs text-amber-600">Trong 2 ngày tới</div>
              </div>
            ) : (
              <div className="flex items-center justify-center bg-gray-50 p-3 rounded">
                <span className="text-gray-600 text-sm">
                  Không có thẻ nào sắp đến hạn ôn tập
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl bg-gradient-to-br from-white via-emerald-50 to-green-50">
          <DialogHeader className="text-center pb-2">
            {/* Animated celebration container */}
            <div className="relative mb-6">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-600 rounded-full blur-xl opacity-20 animate-pulse"></div>

              {/* Main trophy with animation */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Trophy className="h-10 w-10 text-white" />
                </div>

                {/* Floating stars */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                <div
                  className="absolute -bottom-1 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute top-1/2 -right-3 w-3 h-3 bg-indigo-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
              🎉 Hoàn thành xuất sắc! 🎉
            </DialogTitle>

            <DialogDescription className="text-gray-700 text-base leading-relaxed px-4">
              <span className="font-semibold text-emerald-600">Tuyệt vời!</span>{" "}
              Bạn đã hoàn thành vòng ôn tập SRS!
              <br />
              <br />
              🔄{" "}
              <span className="font-medium">
                Hệ thống SRS đã ghi nhận tiến bộ của bạn
              </span>
              <br />
              Hãy củng cố kiến thức với bài kiểm tra để đạt hiệu quả học tập tối
              ưu!
            </DialogDescription>
          </DialogHeader>

          {/* Achievement stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mx-4 mb-6 border border-white/50">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">SRS</div>
                <div className="text-xs text-gray-600">Chế độ hoàn thành</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-xs text-gray-600">Đã ôn tập</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">🎯</div>
                <div className="text-xs text-gray-600">Sẵn sàng kiểm tra</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <Button
              onClick={() => {
                setShowCompletionModal(false);
                router.push(`/test?mode=practice-test&topicId=${topicId}`);
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Play className="h-5 w-5 mr-2" />
              🚀 Làm bài kiểm tra ngay!
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
              className="w-full border-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium py-3 text-base transition-all duration-200"
            >
              📚 Tiếp tục ôn tập SRS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
