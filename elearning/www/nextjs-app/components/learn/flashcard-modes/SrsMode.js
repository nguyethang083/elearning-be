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
        {/* SRS Introduction */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-800">
                Hệ thống Ôn tập Thông minh (SRS)
              </h2>
              <p className="text-blue-600 text-sm">
                Spaced Repetition System - Tối ưu hóa quá trình ghi nhớ
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              🧠 SRS hoạt động như thế nào?
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-purple-600 font-bold text-xs">1</span>
                </div>
                <div>
                  <div className="font-medium text-purple-800">Học mới</div>
                  <div className="text-gray-600">
                    Thẻ mới xuất hiện thường xuyên để bạn làm quen
                  </div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-amber-600 font-bold text-xs">2</span>
                </div>
                <div>
                  <div className="font-medium text-amber-800">Củng cố</div>
                  <div className="text-gray-600">
                    Thẻ khó sẽ xuất hiện nhiều hơn để rèn luyện
                  </div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                  <span className="text-green-600 font-bold text-xs">3</span>
                </div>
                <div>
                  <div className="font-medium text-green-800">Duy trì</div>
                  <div className="text-gray-600">
                    Thẻ đã thuộc xuất hiện ít dần để duy trì
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Chưa có thẻ để ôn tập
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Để bắt đầu với SRS, bạn cần hoàn thành một số bài tập trong Exam
              Mode và tự đánh giá mức độ hiểu. Hệ thống sẽ tự động tạo lịch ôn
              tập phù hợp cho bạn.
            </p>
            <button
              onClick={() =>
                (window.location.href = `/learn/${topicId}?mode=exam`)
              }
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Bắt đầu với Exam Mode
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
        {/* SRS Introduction */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-800">
                Cần đánh giá mức độ hiểu
              </h2>
              <p className="text-amber-600 text-sm">
                Hệ thống cần feedback từ bạn để tối ưu lịch ôn tập
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              📊 Tại sao cần tự đánh giá?
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
                <span>
                  <strong>Cá nhân hóa:</strong> Mỗi người có tốc độ học khác
                  nhau
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
                <span>
                  <strong>Hiệu quả:</strong> Thẻ khó sẽ xuất hiện nhiều hơn, thẻ
                  dễ ít hơn
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
                <span>
                  <strong>Tiết kiệm thời gian:</strong> Chỉ ôn tập những gì thực
                  sự cần thiết
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 14.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Chưa đánh giá mức độ hiểu
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sau khi trả lời câu hỏi trong Exam Mode, hãy đánh giá mức độ hiểu
              của bạn (Quên/Khó/Nhớ) để hệ thống SRS có thể tạo lịch ôn tập tối
              ưu.
            </p>
            <button
              onClick={() =>
                (window.location.href = `/learn/${topicId}?mode=exam`)
              }
              className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Tiếp tục với Exam Mode
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
        {/* Round Completion Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-800">
                Hoàn thành phiên ôn tập!
              </h2>
              <p className="text-green-600 text-sm">
                Bạn đã ôn tập xong {totalReviewed} thẻ trong phiên này
              </p>
            </div>
          </div>
        </div>

        {/* Session Results */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Kết quả phiên ôn tập
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {totalReviewed}
              </div>
              <div className="text-sm text-gray-600">Tổng thẻ ôn</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {correctAnswers}
              </div>
              <div className="text-sm text-green-600">Nhớ rõ</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {hardAnswers}
              </div>
              <div className="text-sm text-amber-600">Khó nhớ</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {wrongAnswers}
              </div>
              <div className="text-sm text-red-600">Chưa nhớ</div>
            </div>
          </div>

          {/* Performance indicator */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Tỷ lệ nhớ rõ:
              </span>
              <span className="text-lg font-bold text-indigo-600">
                {correctPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-indigo-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${correctPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Next steps guidance */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-2">
              🎯 Bước tiếp theo:
            </h4>
            {showStartNextRound ? (
              <div className="bg-amber-50 p-3 rounded-lg mb-3">
                <p className="text-amber-800 text-sm">
                  Bạn có {wrongAnswers} thẻ cần ôn lại. Hệ thống khuyến nghị bạn
                  làm thêm một phiên nữa để củng cố kiến thức.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg mb-3">
                <p className="text-green-800 text-sm">
                  Tuyệt vời! Bạn đã nắm vững các thẻ trong phiên này. Hãy quay
                  lại vào lúc khác để ôn tập theo lịch SRS.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {showStartNextRound && (
              <button
                onClick={startNewRound}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Ôn lại thẻ khó
              </button>
            )}
            <button
              onClick={() => (window.location.href = `/learn/${topicId}`)}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Quay lại trang chủ
            </button>
          </div>
        </div>

        {/* SRS Stats for reference */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Tổng quan thẻ học
          </h3>
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
              <div className="text-xs text-red-600">Cần ôn</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No cards to review
  if (cards.length === 0) {
    return (
      <div className="w-full max-w-full">
        {/* SRS Introduction */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Chưa có thẻ cần ôn tập
              </h2>
              <p className="text-gray-600 text-sm">
                Tất cả thẻ đã được ôn tập theo lịch trình
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">✨ Tuyệt vời!</h3>
            <p className="text-gray-600 text-sm mb-3">
              Bạn đã hoàn thành tất cả các thẻ cần ôn tập hôm nay. Hệ thống SRS
              sẽ tự động lên lịch cho những thẻ cần ôn tập tiếp theo.
            </p>
            <div className="text-xs text-gray-500">
              💡 Tip: Quay lại vào ngày mai để tiếp tục với lịch ôn tập được tối
              ưu hóa!
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Hoàn thành xuất sắc!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Bạn đã ôn tập xong tất cả thẻ cần thiết. Hãy tiếp tục học thêm
              trong Exam Mode hoặc quay lại khi có thẻ mới cần ôn tập.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() =>
                  (window.location.href = `/learn/${topicId}?mode=exam`)
                }
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Tiếp tục học mới
              </button>
              <button
                onClick={() => (window.location.href = `/learn/${topicId}`)}
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Quay lại trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular SRS mode view with card
  return (
    <div className="w-full max-w-full">
      {/* SRS Mode Header with explanation */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-800">
                Chế độ Ôn tập Thông minh (SRS)
              </h1>
              <p className="text-blue-600 text-sm">
                Thẻ {currentCardIndex + 1}/{cards.length} - Ôn tập theo lịch
                trình tối ưu
              </p>
            </div>
          </div>

          {/* Quick guide toggle */}
          <button
            className="text-blue-600 hover:text-blue-700 text-xs font-medium px-3 py-1 bg-white rounded-full border border-blue-200 hover:bg-blue-50 transition-colors"
            onClick={() => {
              const guide = document.getElementById("srs-guide");
              guide.classList.toggle("hidden");
            }}
          >
            <svg
              className="w-3 h-3 inline mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Hướng dẫn
          </button>
        </div>

        {/* Collapsible guide */}
        <div id="srs-guide" className="hidden bg-white rounded-lg p-4 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                🎯 Cách sử dụng:
              </h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Đọc câu hỏi và suy nghĩ về câu trả lời</li>
                <li>2. Nhập câu trả lời của bạn</li>
                <li>3. So sánh với lời giải và đánh giá thật lòng</li>
                <li>4. Chọn mức độ hiểu: Quên/Khó/Nhớ</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                🤖 Hệ thống sẽ:
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Thẻ "Quên" → Xuất hiện lại sớm</li>
                <li>• Thẻ "Khó" → Xuất hiện với tần suất vừa</li>
                <li>• Thẻ "Nhớ" → Xuất hiện ít dần theo thời gian</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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

                {/* Enhanced Action buttons with explanations */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  {/* Rating explanation */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Đánh giá mức độ hiểu của bạn:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                        <span>
                          <strong>Quên:</strong> Sẽ xuất hiện lại sớm (1-10
                          phút)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
                        <span>
                          <strong>Khó:</strong> Xuất hiện sau 1-3 ngày
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                        <span>
                          <strong>Nhớ:</strong> Xuất hiện sau 4+ ngày
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                      onClick={resetCurrentCard}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Làm lại
                    </button>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() =>
                          handleProcessRating(currentCard?.name, "wrong")
                        }
                        disabled={isProcessingRating}
                        className="group relative flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-xl font-medium hover:from-red-200 hover:to-red-300 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md min-w-[120px]"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        <div className="text-center">
                          <div className="font-semibold">Quên</div>
                          <div className="text-xs opacity-75">1-10 phút</div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Tôi hoàn toàn không nhớ
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          handleProcessRating(currentCard?.name, "hard")
                        }
                        disabled={isProcessingRating}
                        className="group relative flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 rounded-xl font-medium hover:from-amber-200 hover:to-amber-300 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md min-w-[120px]"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <div className="text-center">
                          <div className="font-semibold">Khó</div>
                          <div className="text-xs opacity-75">1-3 ngày</div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Khó nhớ, cần xem lại
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          handleProcessRating(currentCard?.name, "correct")
                        }
                        disabled={isProcessingRating}
                        className="group relative flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-xl font-medium hover:from-green-200 hover:to-green-300 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md min-w-[120px]"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <div className="text-center">
                          <div className="font-semibold">Nhớ</div>
                          <div className="text-xs opacity-75">4+ ngày</div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Tôi nhớ rất rõ
                        </div>
                      </button>
                    </div>
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

      {/* Unified Learning Progress Dashboard */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Bảng điều khiển học tập
          </h3>
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            Cập nhật theo thời gian thực
          </div>
        </div>

        {/* Current Session Progress */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-blue-800 flex items-center">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Phiên ôn tập hiện tại
            </h4>
            <div className="text-blue-700 font-medium">
              {Object.keys(reviewedCards).length}/{cards.length} thẻ đã ôn
            </div>
          </div>

          {/* Session progress bar */}
          <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{
                width: `${Math.max(
                  8,
                  (Object.keys(reviewedCards).length / cards.length) * 100
                )}%`,
              }}
            >
              {Object.keys(reviewedCards).length > 0 && (
                <span className="text-xs text-white font-bold">
                  {Math.round(
                    (Object.keys(reviewedCards).length / cards.length) * 100
                  )}
                  %
                </span>
              )}
            </div>
          </div>

          {/* Session performance breakdown */}
          {Object.keys(reviewedCards).length > 0 ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <div className="text-green-700 text-xl font-bold">
                  {
                    Object.values(reviewedCards).filter((r) => r === "correct")
                      .length
                  }
                </div>
                <div className="text-green-600 text-xs font-medium">
                  ✅ Nhớ rõ
                </div>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <div className="text-amber-700 text-xl font-bold">
                  {
                    Object.values(reviewedCards).filter((r) => r === "hard")
                      .length
                  }
                </div>
                <div className="text-amber-600 text-xs font-medium">
                  ⚡ Hơi khó
                </div>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <div className="text-red-700 text-xl font-bold">
                  {
                    Object.values(reviewedCards).filter((r) => r === "wrong")
                      .length
                  }
                </div>
                <div className="text-red-600 text-xs font-medium">
                  🔄 Cần ôn lại
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-blue-700 py-4">
              <svg
                className="w-8 h-8 mx-auto mb-2 opacity-60"
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
              <p className="text-sm">Bắt đầu ôn tập để xem thống kê</p>
            </div>
          )}
        </div>

        {/* Learning Collection Overview */}
        <div className="border-t pt-5">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Bộ sưu tập học tập của bạn
          </h4>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {/* New Cards */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-700"
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
                </div>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                  MỚI
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-700 mb-1">
                {srsStats.new || 0}
              </div>
              <div className="text-purple-600 text-sm mb-2 font-medium">
                Thẻ mới học
              </div>
              <div className="text-purple-500 text-xs">
                Lần đầu gặp, cần làm quen
              </div>
            </div>

            {/* Learning Cards */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="text-xs bg-amber-200 text-amber-700 px-2 py-1 rounded-full">
                  HỌC
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-700 mb-1">
                {(srsStats.learning || 0) + (srsStats.lapsed || 0)}
              </div>
              <div className="text-amber-600 text-sm mb-2 font-medium">
                Đang rèn luyện
              </div>
              <div className="text-amber-500 text-xs">
                Cần lặp lại để ghi nhớ
              </div>
            </div>

            {/* Review Cards */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
                  ỔN
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700 mb-1">
                {srsStats.review || 0}
              </div>
              <div className="text-green-600 text-sm mb-2 font-medium">
                Duy trì kiến thức
              </div>
              <div className="text-green-500 text-xs">
                Ôn tập định kỳ để nhớ lâu
              </div>
            </div>

            {/* Today's Target */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-700"
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
                </div>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                  HÔM NAY
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-700 mb-1">
                {srsStats.due || 0}
              </div>
              <div className="text-blue-600 text-sm mb-2 font-medium">
                Cần ôn hôm nay
              </div>
              <div className="text-blue-500 text-xs">
                Thẻ đã đến lịch ôn tập
              </div>
            </div>
          </div>

          {/* Smart recommendations */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg
                className="w-4 h-4 text-indigo-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="font-medium text-gray-800">
                🤖 Gợi ý thông minh
              </span>
            </div>

            {(() => {
              const totalCards =
                (srsStats.new || 0) +
                (srsStats.learning || 0) +
                (srsStats.review || 0) +
                (srsStats.lapsed || 0);
              const dueCards = srsStats.due || 0;
              const reviewedToday = Object.keys(reviewedCards).length;

              if (dueCards === 0) {
                return (
                  <div className="flex items-center text-green-700 bg-green-50 p-3 rounded border border-green-200">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Tuyệt vời! Bạn đã hoàn thành xong mục tiêu học tập hôm
                      nay.
                    </span>
                  </div>
                );
              } else if (reviewedToday === 0) {
                return (
                  <div className="flex items-center text-blue-700 bg-blue-50 p-3 rounded border border-blue-200">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Hôm nay bạn có {dueCards} thẻ cần ôn tập. Hãy bắt đầu
                      ngay!
                    </span>
                  </div>
                );
              } else if (reviewedToday < dueCards) {
                const remaining = dueCards - reviewedToday;
                return (
                  <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                    <svg
                      className="w-5 h-5 mr-2"
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
                    <span className="text-sm font-medium">
                      Tốt lắm! Bạn còn {remaining} thẻ nữa để hoàn thành mục
                      tiêu hôm nay.
                    </span>
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center text-purple-700 bg-purple-50 p-3 rounded border border-purple-200">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Xuất sắc! Bạn đã vượt qua mục tiêu. Có thể học thêm hoặc
                      nghỉ ngơi.
                    </span>
                  </div>
                );
              }
            })()}
          </div>
        </div>
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
