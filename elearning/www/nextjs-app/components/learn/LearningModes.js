import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import BasicMode from "./flashcard-modes/BasicMode";
import SrsMode from "./flashcard-modes/SrsMode";
import ExamMode from "./flashcard-modes/ExamMode";
import ExamHistory from "./ExamHistory";
import {
  ClockIcon,
  BookOpenIcon,
  BrainIcon,
  PencilLineIcon,
} from "lucide-react";
import { useNextStep } from "nextstepjs";
import { LEARN_MODE_DETAIL_TOUR_STORAGE_KEY } from "@/config/learnTour";

export default function LearningModes({ topicId, flashcards, loading, error }) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState("basic");
  const [showHistory, setShowHistory] = useState(false);
  const { startNextStep } = useNextStep();

  // Set active mode based on query parameter if available
  useEffect(() => {
    if (router.query.mode) {
      const validModes = ["basic", "exam", "srs"];
      if (validModes.includes(router.query.mode)) {
        setActiveMode(router.query.mode);
      }
    }
  }, [router.query.mode]);

  // Auto-start tour when entering a mode for the first time
  useEffect(() => {
    // Only start tour if we have a mode selected and tour hasn't been shown
    if (activeMode && !loading && !error) {
      const tourCompleted = localStorage.getItem(
        LEARN_MODE_DETAIL_TOUR_STORAGE_KEY
      );

      if (!tourCompleted) {
        // Small delay to ensure UI is rendered
        const timer = setTimeout(() => {
          startNextStep("learn-mode-detail");
          localStorage.setItem(LEARN_MODE_DETAIL_TOUR_STORAGE_KEY, "true");
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [activeMode, loading, error, startNextStep]);

  const modes = [
    {
      id: "basic",
      name: "Chế độ cơ bản",
      description: "Đọc và ôn tập thẻ flashcard",
      icon: (
        <BookOpenIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 mb-2 flex-shrink-0" />
      ),
    },
    {
      id: "exam",
      name: "Chế độ kiểm tra",
      description:
        "Trả lời câu hỏi mô phỏng kiểm tra và nhận phản hồi thông minh từ AI",
      icon: (
        <PencilLineIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 mb-2 flex-shrink-0" />
      ),
    },
    {
      id: "srs",
      name: "Chế độ ôn tập cách quãng",
      description:
        "Tối ưu hóa việc ghi nhớ lâu dài bằng thuật toán ôn tập cách quãng (SRS)",
      icon: (
        <BrainIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mb-2 flex-shrink-0" />
      ),
    },
  ];

  // Update URL when changing modes
  const handleModeChange = (modeId) => {
    setActiveMode(modeId);

    // Update the URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set("mode", modeId);
    router.replace(url.pathname + url.search, undefined, { shallow: true });
  };

  if (showHistory) {
    return (
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">
            🕒 Lịch sử kiểm tra
          </h2>
          <button
            onClick={() => setShowHistory(false)}
            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ⬅ Quay lại chế độ học
          </button>
        </div>
        <ExamHistory topicId={topicId} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">
          🎓 Chọn chế độ học của bạn
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowHistory(true)}
            id="exam-history-button"
            className="inline-flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ClockIcon className="w-4 h-4 mr-2" />
            Xem lịch sử kiểm tra
          </button>
          <button
            onClick={() => {
              startNextStep("learn-mode-detail");
            }}
            className="inline-flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-orange-600 bg-white border border-orange-300 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Hướng dẫn
          </button>
        </div>
      </div>

      <div className="mb-6 md:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              id={`learning-mode-${mode.id}`}
              onClick={() => handleModeChange(mode.id)}
              className={`p-3 sm:p-4 lg:p-5 rounded-lg border shadow-sm transition-all duration-200 ${
                activeMode === mode.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
              } text-left hover:scale-[1.02] min-h-[100px] sm:min-h-[120px]`}
            >
              <div className="flex flex-col items-start h-full">
                <div className="mb-2">{mode.icon}</div>
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 leading-tight">
                  {mode.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-snug flex-1">
                  {mode.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeMode === "basic" && (
        <BasicMode
          flashcards={flashcards}
          loading={loading}
          error={error}
          topicId={topicId}
        />
      )}
      {activeMode === "exam" && <ExamMode topicId={topicId} />}
      {activeMode === "srs" && <SrsMode topicId={topicId} />}
    </div>
  );
}
