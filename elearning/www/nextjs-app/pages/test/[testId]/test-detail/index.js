"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";

// --- UI Components ---
import { TestHeader } from "@/components/test/test-detail/TestHeader";
import { ProgressBarDisplay } from "@/components/test/test-detail/ProgressBar";
import { QuestionNavigator } from "@/components/test/test-detail/QuestionNavigator";
import { QuestionCard } from "@/components/test/test-detail/QuestionCard";
import { TestNavigation } from "@/components/test/test-detail/TestNavigation";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { ErrorScreen } from "@/components/common/ErrorScreen";
import { NoTestDataScreen } from "@/components/test/test-detail/NoTestData";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

// --- Hooks ---
import { useTimer } from "@/hooks/useTimer";
import { useTestAttempt } from "@/hooks/useTestAttempt";
import { useTestAnswers } from "@/hooks/useTestAnswers";
import { useTestNavigation } from "@/hooks/useTestNavigation";
import { useQuestionFiles } from "@/hooks/useQuestionFiles";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useTestSubmission } from "@/hooks/useTestSubmission";

// --- Utils & Services ---
import { formatTime } from "@/utils/timeUtils";

export default function TestDetail() {
  const router = useRouter();
  const { testId } = router.query;

  const isReadyToStartAttempt = !!testId;

  const { attemptStartData, loadingAttempt, attemptError } = useTestAttempt(
    testId,
    isReadyToStartAttempt
  );

  const testDataFromAttempt = attemptStartData?.test;
  const questionsFromAttempt = useMemo(
    () =>
      attemptStartData?.questions?.map((q) => ({
        ...q,
        testQuestionId: q.test_question_detail_id, // Keep this mapping if UI components rely on testQuestionId
      })) ?? [],
    [attemptStartData?.questions]
  );
  const totalQuestions = questionsFromAttempt.length;
  const testAttemptId = attemptStartData?.attempt?.id;
  const initialSavedAnswers = attemptStartData?.saved_answers;
  const initialMarkedForReview = attemptStartData?.marked_for_review;
  const initialRemainingTime =
    attemptStartData?.attempt?.remaining_time_seconds;

  const initialLastViewedQuestionId = useMemo(() => {
    if (
      attemptStartData?.attempt?.last_viewed_question_id &&
      questionsFromAttempt.length > 0
    ) {
      const lastViewedQuestionDocId =
        attemptStartData.attempt.last_viewed_question_id;
      // The backend might store question_id (doc id), but internally we use test_question_detail_id for uniqueness in attempt
      const questionEntry = questionsFromAttempt.find(
        (q) => q.question_id === lastViewedQuestionDocId
      );
      return questionEntry
        ? questionEntry.test_question_detail_id
        : questionsFromAttempt[0]?.test_question_detail_id || null;
    }
    return questionsFromAttempt[0]?.test_question_detail_id || null;
  }, [
    attemptStartData?.attempt?.last_viewed_question_id,
    questionsFromAttempt,
  ]);

  const initialQuestionIndex = useMemo(() => {
    if (initialLastViewedQuestionId && questionsFromAttempt.length > 0) {
      const idx = questionsFromAttempt.findIndex(
        (q) => q.test_question_detail_id === initialLastViewedQuestionId
      );
      return idx !== -1 ? idx : 0;
    }
    return 0;
  }, [initialLastViewedQuestionId, questionsFromAttempt]);

  const {
    currentQuestionIndex,
    showQuestionNav,
    handlers: navHandlers,
    setCurrentQuestionIndexDirectly,
  } = useTestNavigation(totalQuestions, initialQuestionIndex);

  const {
    multipleChoiceAnswers,
    shortAnswers,
    longAnswers,
    canvasStates,
    completedQuestions,
    markedForReview,
    savedStatus, // 'idle', 'unsaved', 'saving', 'saved', 'error'
    handlers: answerHandlers,
    getAnswersForSubmission,
  } = useTestAnswers(); // Not passing initial answers yet

  const { initializeAnswers, setSavedStatus, handleQuestionChange } =
    answerHandlers;

  // Initialize useQuestionFiles after questionsFromAttempt and initialSavedAnswers are available
  const {
    currentSessionQuestionFiles,
    processingFiles,
    handleAddFileOrDrawing,
    handleRemoveFileFromState,
    setCurrentSessionQuestionFiles, // For initialization
    resetQuestionFiles,
  } = useQuestionFiles(
    initialSavedAnswers, // Pass the raw saved answers which might contain file data
    questionsFromAttempt,
    () => setSavedStatus("unsaved") // Callback to set status to unsaved on file changes
  );

  const handleFileAddAndMarkComplete = useCallback(
    (questionId, filesOrObject) => {
      // ✅ Đúng thứ tự: questionId, files
      handleAddFileOrDrawing(questionId, filesOrObject);
      answerHandlers.markQuestionCompleted(questionId, true);
    },
    [handleAddFileOrDrawing, answerHandlers]
  );

  const handleFileRemoveAndUpdateCompletion = useCallback(
    (questionId, fileNameToRemove) => {
      handleRemoveFileFromState(questionId, fileNameToRemove);

      const remainingFiles = currentSessionQuestionFiles[questionId] || [];
      const isRemovingTheLastFile =
        remainingFiles.some((f) => f.originalFilename === fileNameToRemove) &&
        remainingFiles.length === 1;

      const hasOtherAnswers =
        !!multipleChoiceAnswers[questionId] ||
        !!shortAnswers[questionId]?.trim() ||
        !!longAnswers[questionId]?.trim();

      if (isRemovingTheLastFile && !hasOtherAnswers) {
        answerHandlers.markQuestionCompleted(questionId, false);
      }
    },
    [
      handleRemoveFileFromState,
      currentSessionQuestionFiles,
      answerHandlers,
      multipleChoiceAnswers,
      shortAnswers,
      longAnswers,
    ]
  );

  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  useEffect(() => {
    if (initialSavedAnswers && questionsFromAttempt.length > 0) {
      initializeAnswers(
        initialSavedAnswers,
        questionsFromAttempt,
        initialMarkedForReview
      );
      // File initialization is now handled within useQuestionFiles hook constructor
    } else if (questionsFromAttempt.length > 0) {
      initializeAnswers({}, questionsFromAttempt, {});
      resetQuestionFiles(); // Ensure files are reset if no initial saved answers
    }
  }, [
    initialSavedAnswers,
    questionsFromAttempt,
    initialMarkedForReview,
    initializeAnswers,
    resetQuestionFiles,
  ]);

  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (initialRemainingTime !== undefined && initialRemainingTime !== null) {
      setTimeLeft(initialRemainingTime);
    } else if (testDataFromAttempt?.timeLimitMinutes) {
      const minutes = Number(testDataFromAttempt.timeLimitMinutes);
      setTimeLeft(!isNaN(minutes) && minutes > 0 ? minutes * 60 : null);
    } else {
      setTimeLeft(null); // No time limit
    }
  }, [initialRemainingTime, testDataFromAttempt?.timeLimitMinutes]);

  const countdown = useTimer(timeLeft !== null ? timeLeft : 0, {
    onComplete: () => {
      // Auto-submit when timer reaches zero
      console.log("Time is up! Auto-submitting test...");
      handleSubmitTest(true); // Pass true to indicate auto-submission
    },
  });

  const currentQuestionData = useMemo(
    () => questionsFromAttempt[currentQuestionIndex],
    [questionsFromAttempt, currentQuestionIndex]
  );
  const currentTestQuestionDetailId =
    currentQuestionData?.test_question_detail_id;

  const {
    isSubmitting,
    showSubmitConfirmDialog,
    submitConfirmMessage,
    showErrorDialog,
    errorDialogTitle,
    errorDialogMessage,
    handleSubmitTest,
    executeSubmit,
    closeErrorDialog,
    cancelSubmitDialog,
    setShowSubmitConfirmDialog,
    setShowErrorDialog,
  } = useTestSubmission({
    testId,
    testAttemptId,
    questionsFromAttempt,
    currentSessionQuestionFiles,
    getAnswersForSubmission,
    countdown,
    currentQuestionData,
    completedQuestions,
    totalQuestions,
    savedStatus,
    setSavedStatus,
    isSaving: false, // Will be updated below
    debouncedSaveProgress: async () => {}, // Will be updated below
  });

  const { isSaving, debouncedSaveProgress } = useAutoSave({
    testAttemptId,
    currentQuestionData,
    questionsFromAttempt,
    currentSessionQuestionFiles,
    getAnswersForSubmission,
    countdown,
    savedStatus,
    setSavedStatus,
    isSubmitting,
  });

  // Update the useTestSubmission hook with the actual isSaving and debouncedSaveProgress
  // Note: This is a bit of a hack, but necessary due to the circular dependency
  // In a better design, we might restructure these hooks

  useEffect(() => {
    if (currentTestQuestionDetailId) {
      handleQuestionChange(currentTestQuestionDetailId); // From useTestAnswers
    }
  }, [currentTestQuestionDetailId, handleQuestionChange]);

  const blockDrawingAreaInteraction =
    isSubmitting ||
    showSubmitConfirmDialog ||
    showErrorDialog ||
    showSummaryDialog;

  const handleMarkCompleteToggle = useCallback(() => {
    if (!currentTestQuestionDetailId) return;
    answerHandlers.markQuestionCompleted(
      currentTestQuestionDetailId,
      !completedQuestions[currentTestQuestionDetailId]
    );
    setSavedStatus("unsaved");
  }, [
    currentTestQuestionDetailId,
    completedQuestions,
    answerHandlers,
    setSavedStatus,
  ]);

  // --- Render Logic ---
  if (loadingAttempt)
    return <LoadingScreen message="Đang tải dữ liệu bài làm..." />;
  if (attemptError) {
    const errorMessage =
      attemptError instanceof Error
        ? attemptError.message
        : String(attemptError);
    return <ErrorScreen error={errorMessage} onRetry={() => router.reload()} />;
  }
  if (!loadingAttempt && !attemptStartData && !attemptError) {
    // This state might occur if testId is not yet available or initial fetch hasn't started/completed without error
    return <LoadingScreen message="Đang khởi tạo bài kiểm tra..." />;
  }
  if (!testAttemptId && !loadingAttempt) {
    // Attempt data loaded but no attemptId (e.g. error in starting attempt on backend)
    return (
      <ErrorScreen
        error="Không thể bắt đầu bài làm. Vui lòng thử lại."
        onRetry={() => router.reload()}
      />
    );
  }
  if (totalQuestions === 0 && !loadingAttempt && attemptStartData) {
    return (
      <NoTestDataScreen message="Không tìm thấy câu hỏi cho bài kiểm tra này." />
    );
  }

  if (!currentQuestionData && totalQuestions > 0 && !loadingAttempt) {
    // This case implies questions are loaded but currentQuestionIndex points to an invalid question.
    // This might happen if initialQuestionIndex logic has an issue or navigation leads to an invalid state.
    // Attempt to reset to the first question.
    console.warn(
      "Current question data is undefined, attempting to reset to first question."
    );
    setCurrentQuestionIndexDirectly(0); // Reset to first question
    return <LoadingScreen message="Đang điều chỉnh câu hỏi..." />; // Show a temporary loading
  }
  if (!currentQuestionData && totalQuestions > 0) {
    // Still no currentQuestionData after potential reset, or questions are loading
    return <LoadingScreen message="Đang tải nội dung câu hỏi..." />;
  }
  if (!currentQuestionData && totalQuestions === 0 && !loadingAttempt) {
    // No questions and not loading
    return (
      <NoTestDataScreen message="Không có nội dung câu hỏi để hiển thị." />
    );
  }

  const completedCount =
    Object.values(completedQuestions).filter(Boolean).length;
  const currentDisplayNumber = currentQuestionIndex + 1;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-6">
        <TestHeader
          title={testDataFromAttempt?.title || "Đang tải tên bài kiểm tra..."}
          timeLeft={timeLeft !== null ? countdown : null}
          formatTime={formatTime}
        />
        <ProgressBarDisplay
          currentQuestionDisplayNumber={currentDisplayNumber}
          totalQuestions={totalQuestions}
          completedCount={completedCount}
        />
        <div className="flex justify-end mb-4">
          <Button
            variant="link"
            size="sm"
            onClick={navHandlers.toggleNavigator}
          >
            {showQuestionNav ? "Ẩn" : "Hiện"} danh sách câu hỏi
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {showQuestionNav && (
            <div className="lg:w-1/4 order-2 lg:order-1">
              <QuestionNavigator
                totalQuestions={totalQuestions}
                currentQuestionIndex={currentQuestionIndex}
                markedForReview={markedForReview || {}}
                completedQuestions={completedQuestions || {}}
                onNavigate={navHandlers.navigateToQuestion}
                questions={questionsFromAttempt}
              />
            </div>
          )}
          <div
            className={`w-full order-1 lg:order-2 ${
              showQuestionNav ? "lg:w-3/4" : "lg:w-full"
            }`}
          >
            {currentQuestionData && (
              <QuestionCard
                key={
                  currentQuestionData.test_question_detail_id ||
                  currentQuestionIndex
                }
                questionData={currentQuestionData}
                currentDisplayNumber={currentQuestionIndex + 1} // Make sure you are passing this
                markedForReview={markedForReview} // Pass the entire 'markedForReview' object
                completedQuestions={completedQuestions} // Pass the entire 'completedQuestions' object
                onToggleMarkForReview={() =>
                  answerHandlers.toggleMarkForReview(
                    currentTestQuestionDetailId
                  )
                }
                onMarkComplete={handleMarkCompleteToggle}
                multipleChoiceAnswer={
                  multipleChoiceAnswers[currentTestQuestionDetailId]
                }
                onMultipleChoiceChange={(optionTextValue, optionFullObject) =>
                  answerHandlers.handleMultipleChoiceChange(
                    currentTestQuestionDetailId,
                    optionTextValue, // This will be _optionTextIgnored in useTestAnswers
                    optionFullObject // This is the crucial object for useTestAnswers
                  )
                }
                shortAnswer={shortAnswers[currentTestQuestionDetailId]}
                onShortAnswerChange={(value) =>
                  answerHandlers.handleShortAnswerChange(
                    currentTestQuestionDetailId,
                    value
                  )
                }
                longAnswer={longAnswers[currentTestQuestionDetailId]}
                onLongAnswerChange={(value) =>
                  answerHandlers.handleLongAnswerChange(
                    currentTestQuestionDetailId,
                    value
                  )
                }
                canvasState={
                  canvasStates
                    ? canvasStates[currentTestQuestionDetailId]
                    : undefined
                }
                setCanvasStates={(state) =>
                  answerHandlers.handleSetCanvasStates(
                    currentTestQuestionDetailId,
                    state
                  )
                }
                testQuestionId={currentTestQuestionDetailId}
                testAttemptId={testAttemptId}
                currentFiles={
                  currentSessionQuestionFiles[currentTestQuestionDetailId] || []
                }
                onAddFiles={handleFileAddAndMarkComplete}
                onRemoveFile={handleFileRemoveAndUpdateCompletion}
                processingFiles={processingFiles}
                blockDrawingAreaInteraction={blockDrawingAreaInteraction}
              />
            )}
            <TestNavigation
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              onPrevQuestion={navHandlers.handlePrevQuestion}
              onNextQuestion={navHandlers.handleNextQuestion}
              onSubmitTest={() => handleSubmitTest(false)} // Pass false for manual submission
              onNavigate={navHandlers.navigateToQuestion}
              savedStatus={savedStatus}
              submitting={isSubmitting}
              testId={testId instanceof Array ? testId[0] : testId}
              completedQuestions={completedQuestions}
              markedForReview={markedForReview}
              questions={questionsFromAttempt}
              showSummaryDialog={showSummaryDialog} // prop mới
              onSummaryDialogOpenChange={setShowSummaryDialog} // prop mới
            />
          </div>
        </div>
      </main>

      <AlertDialog
        open={showSubmitConfirmDialog}
        onOpenChange={setShowSubmitConfirmDialog} // Allows closing via Escape key or overlay click
      >
        <AlertDialogContent className="z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận nộp bài</AlertDialogTitle>
            <AlertDialogDescription>
              {submitConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSubmitDialog}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit}>
              Nộp bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog} // Allows closing
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                {errorDialogTitle}
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeErrorDialog}>
              Đã hiểu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
