import { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { fetchWithAuth } from "@/pages/api/helper";

const AUTO_SAVE_INTERVAL_MS = 10000;

export function useAutoSave({
  testAttemptId,
  currentQuestionData, // contains testQuestionId
  questionsFromAttempt,
  currentSessionQuestionFiles,
  getAnswersForSubmission, // Function to get formatted answers
  countdown, // Remaining time
  savedStatus, // Current saved status from useTestAnswers ('idle', 'unsaved', 'saving', 'saved', 'error')
  setSavedStatus, // To update saved status
  isSubmitting, // To prevent saving during submission
}) {
  const [isSaving, setIsSaving] = useState(false);

  const saveProgress = useCallback(
    async (reason = "auto") => {
      if (
        !testAttemptId ||
        isSaving ||
        isSubmitting ||
        savedStatus === "saving"
      )
        return;

      const currentTestQuestionDetailId =
        currentQuestionData?.test_question_detail_id;
      if (!currentTestQuestionDetailId) {
        // Use the detail_id which seems to be the key
        console.warn(
          "AutoSave: Save progress skipped: No current test_question_detail_id."
        );
        return;
      }

      setIsSaving(true);
      setSavedStatus("saving");

      const currentAnswersForSave = getAnswersForSubmission(
        questionsFromAttempt,
        currentSessionQuestionFiles
      );

      const progressPayloadForBackend = {
        answers: currentAnswersForSave.answers || currentAnswersForSave,
        remainingTimeSeconds: countdown,
        lastViewedTestQuestionId: currentQuestionData?.question_id, // Use question_id for backend reference
        markedForReview: currentAnswersForSave.markedForReview || {},
      };

      const payload = {
        attempt_id: testAttemptId,
        progress_data: JSON.stringify(progressPayloadForBackend),
      };
      console.log(`Saving progress (${reason}):`, payload);

      try {
        await fetchWithAuth(`test_attempt.test_attempt.save_attempt_progress`, {
          method: "PATCH",
          body: payload,
          // Removed Content-Type, fetchWithAuth handles it
        });
        setSavedStatus("saved");
      } catch (error) {
        console.error(`Error saving progress (${reason}):`, error);
        setSavedStatus("error");
      } finally {
        setIsSaving(false);
      }
    },
    [
      testAttemptId,
      isSaving,
      isSubmitting,
      savedStatus,
      currentQuestionData,
      getAnswersForSubmission,
      questionsFromAttempt,
      currentSessionQuestionFiles,
      countdown,
      setSavedStatus,
    ]
  );

  const debouncedSaveProgress = useDebouncedCallback(
    saveProgress,
    500 // Reduced debounce time for better responsiveness on mark for review
  );

  // Immediate save function for critical actions (no debounce)
  const immediateSaveProgress = useCallback(
    async (reason = "immediate") => {
      return saveProgress(reason);
    },
    [saveProgress]
  );

  // Auto-save on interval
  useEffect(() => {
    if (
      !testAttemptId ||
      !currentQuestionData?.test_question_detail_id ||
      questionsFromAttempt.length === 0 ||
      isSubmitting
    )
      return;
    const intervalId = setInterval(
      () => debouncedSaveProgress("interval"),
      AUTO_SAVE_INTERVAL_MS
    );
    return () => clearInterval(intervalId);
  }, [
    debouncedSaveProgress,
    testAttemptId,
    currentQuestionData,
    questionsFromAttempt,
    isSubmitting,
  ]);

  // Auto-save when savedStatus changes to 'unsaved' - use debounced save for mark for review
  useEffect(() => {
    console.log("savedStatus changed to:", savedStatus);
    if (
      savedStatus === "unsaved" &&
      testAttemptId &&
      questionsFromAttempt.length > 0 &&
      !isSubmitting
    ) {
      console.log("Triggering debounced save for unsaved status (including mark for review changes)");
      // Use debounced save to handle rapid changes, but with shorter delay
      debouncedSaveProgress("mark_for_review_change");
    }
  }, [
    savedStatus,
    testAttemptId,
    questionsFromAttempt,
    isSubmitting,
    debouncedSaveProgress,
  ]);

  // Auto-save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        testAttemptId &&
        questionsFromAttempt.length > 0 &&
        !isSubmitting
      ) {
        debouncedSaveProgress("visibility");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    debouncedSaveProgress,
    testAttemptId,
    questionsFromAttempt,
    isSubmitting,
  ]);

  return { isSaving, debouncedSaveProgress, immediateSaveProgress };
}
