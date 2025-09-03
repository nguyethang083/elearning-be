import { useState, useEffect } from "react";
import FlashcardView from "../FlashcardView";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useRouter } from "next/router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Play } from "lucide-react";

export default function BasicMode({
  flashcards: initialFlashcards,
  loading: initialLoading,
  error: initialError,
  topicId,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const router = useRouter();

  // Use the hook to get flashcards with filtering and refreshing capability
  const { flashcards, loading, error, refreshFlashcards } = initialFlashcards
    ? {
        flashcards: initialFlashcards,
        loading: initialLoading,
        error: initialError,
        refreshFlashcards: () => {},
      }
    : useFlashcards(topicId);

  // Check for completion when user flips the last card
  useEffect(() => {
    if (
      flashcards &&
      flashcards.length > 0 &&
      currentIndex === flashcards.length - 1 &&
      isFlipped &&
      !showCompletionModal
    ) {
      // Small delay to let user see the answer before showing modal
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 1000);
    }
  }, [currentIndex, isFlipped, flashcards]);

  const handleGoToTest = () => {
    setShowCompletionModal(false);
    router.push(`/test?mode=practice-test&topicId=${topicId}`);
  };

  // Note: We don't need a listener for 'flashcardSettingsChanged' event
  // because useFlashcards.js now handles this directly

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex justify-center items-center h-64">
          <p>Đang tải thẻ flashcard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-gray-600">
            Không có thẻ flashcard nào có sẵn cho chủ đề này. Vui lòng kiểm tra
            lại sau.
          </p>
        </div>
      </div>
    );
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    // Reset explanation when flipping to front
    if (isFlipped) {
      setShowExplanation(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowExplanation(false);
    }
  };

  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  return (
    <div className="w-full max-w-full">
      {/* Progress bar */}
      <div className="mb-6 px-4 sm:px-0">
        <div className="mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">
            Chế độ cơ bản
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {currentIndex + 1} / {flashcards.length}
            </span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{
              width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <FlashcardView
        flashcards={flashcards}
        currentIndex={currentIndex}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        showExplanation={showExplanation}
        onToggleExplanation={toggleExplanation}
        topicId={topicId}
      />

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-indigo-50">
          <DialogHeader className="text-center pb-2">
            {/* Animated celebration container */}
            <div className="relative mb-6">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>

              {/* Main trophy with animation */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Trophy className="h-10 w-10 text-white" />
                </div>

                {/* Floating stars */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                <div
                  className="absolute -bottom-1 -left-2 w-4 h-4 bg-pink-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute top-1/2 -right-3 w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-75"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🎉 Chúc mừng bạn! 🎉
            </DialogTitle>

            <DialogDescription className="text-gray-700 text-base leading-relaxed px-4">
              <span className="font-semibold text-indigo-600">Xuất sắc!</span>{" "}
              Bạn đã hoàn thành tất cả{" "}
              <span className="font-bold text-indigo-600">
                {flashcards.length} thẻ flashcard
              </span>{" "}
              trong chế độ Cơ bản!
              <br />
              <br />
              🎯{" "}
              <span className="font-medium">
                Bạn đã sẵn sàng để thử sức với bài kiểm tra chưa?
              </span>
              <br />
              Hãy củng cố kiến thức và đạt điểm cao hơn nữa!
            </DialogDescription>
          </DialogHeader>

          {/* Achievement stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mx-4 mb-6 border border-white/50">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {flashcards.length}
                </div>
                <div className="text-xs text-gray-600">Thẻ đã học</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-xs text-gray-600">Hoàn thành</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">🏆</div>
                <div className="text-xs text-gray-600">Thành tích</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <Button
              onClick={handleGoToTest}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Play className="h-5 w-5 mr-2" />
              🚀 Làm bài kiểm tra ngay!
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
              className="w-full border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium py-3 text-base transition-all duration-200"
            >
              📚 Tiếp tục ôn tập thêm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
