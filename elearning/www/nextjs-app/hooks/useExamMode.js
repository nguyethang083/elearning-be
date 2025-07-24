import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";
import { useFlashcards } from "./useFlashcards";

/**
 * Custom hook to manage Exam Mode
 * @param {string} topicId - The topic ID for the exam
 * @returns {{ 
 *   currentAttemptName, 
 *   examFlashcards, 
 *   currentQuestionIndex, 
 *   userAnswers,
 *   aiFeedbacks,
 *   detailedExplanations,
 *   isLoadingExam,
 *   isLoadingFeedback,
 *   isLoadingExplanation,
 *   isExamCompleted,
 *   activeQuestionFlashcardName,
 *   startExam,
 *   submitAnswer,
 *   completeExam,
 *   restartExam,
 *   goToNextQuestion,
 *   goToPreviousQuestion,
 *   resetQuestion,
 *   loadingFlashcards,
 *   flashcardsError,
 *   submitSelfAssessment,
 *   getDetailedExplanation
 * }}
 */
export function useExamMode(topicId) {
  // Get flashcards using the existing hook
  const { flashcards, loading: loadingFlashcards, error: flashcardsError } = useFlashcards(topicId);
  
  // State variables
  const [currentAttemptName, setCurrentAttemptName] = useState(null);
  const [examFlashcards, setExamFlashcards] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [aiFeedbacks, setAiFeedbacks] = useState({});
  const [detailedExplanations, setDetailedExplanations] = useState({});
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  
  // Derived state
  const activeQuestionFlashcardName = examFlashcards[currentQuestionIndex]?.name || null;
  
  // Initialize flashcards when they load from the API
  useEffect(() => {
    if (flashcards && flashcards.length > 0 && !isExamCompleted) {
      setExamFlashcards(flashcards);
    }
  }, [flashcards, isExamCompleted]);
  
  // Listen for settings changes and reset exam when flashcard type filter changes
  useEffect(() => {
    const handleSettingsChange = (event) => {
      // Convert both to strings for comparison
      const currentTopicId = String(topicId);
      const eventTopicId = String(event.detail.topicId);
      
      // Only process events for this topic
      if (eventTopicId === currentTopicId) {
        console.log('useExamMode: Detected settings change');
        console.log('useExamMode: Current exam state - hasAttempt:', !!currentAttemptName, 'hasFlashcards:', examFlashcards.length);
        
        // If there's an active exam, reset it to use new settings
        if (currentAttemptName || examFlashcards.length > 0) {
          console.log('useExamMode: Resetting exam due to settings change');
          
          // Reset the exam state
          setCurrentAttemptName(null);
          setExamFlashcards([]);
          setCurrentQuestionIndex(0);
          setUserAnswers({});
          setAiFeedbacks({});
          setDetailedExplanations({});
          setIsExamCompleted(false);
          
          // The useEffect that initializes flashcards will automatically set the new flashcards
          // when the useFlashcards hook updates with the new settings
        }
      }
    };

    window.addEventListener('flashcardSettingsChanged', handleSettingsChange);
    
    return () => {
      window.removeEventListener('flashcardSettingsChanged', handleSettingsChange);
    };
  }, [topicId, currentAttemptName, examFlashcards.length]);
  
  // Start a new exam attempt
  const startExam = useCallback(async () => {
    if (!topicId || isLoadingExam) return;
    
    // Reset any existing exam state first
    setCurrentAttemptName(null);
    setExamFlashcards([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setAiFeedbacks({});
    setDetailedExplanations({});
    setIsExamCompleted(false);
    
    setIsLoadingExam(true);
    
    try {
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.start_exam_attempt",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId,
          }),
        }
      );
      
      if (!responseData?.message?.success) {
        throw new Error(responseData?.message?._error_message || "Failed to start exam");
      }
      
      // Save the attempt name for future API calls
      setCurrentAttemptName(responseData.message.attempt.name);
      
      // Always use flashcards from the response to ensure consistency with backend filtering
      if (responseData.message.attempt.flashcards && responseData.message.attempt.flashcards.length > 0) {
        setExamFlashcards(responseData.message.attempt.flashcards);
        console.log("Exam started with", responseData.message.attempt.flashcards.length, "flashcards from backend");
      } else if (flashcards && flashcards.length > 0) {
        // Fallback to frontend flashcards if backend doesn't provide them
        setExamFlashcards(flashcards);
        console.log("Exam started with", flashcards.length, "flashcards from frontend");
      } else {
        throw new Error("No flashcards available for exam");
      }
      
      console.log("Exam started with attempt ID:", responseData.message.attempt.name);
      
    } catch (error) {
      console.error("Error starting exam:", error);
      // Keep the error state in the component that uses this hook
    } finally {
      setIsLoadingExam(false);
    }
  }, [topicId, isLoadingExam, flashcards]);
  
  // Submit an answer and get AI feedback
  const submitAnswer = useCallback(async (flashcardName, userAnswer) => {
    if (!currentAttemptName || !flashcardName || isLoadingFeedback) return null;
    
    setIsLoadingFeedback(true);
    
    try {
      // Save the user's answer in local state first
      setUserAnswers(prev => ({
        ...prev,
        [flashcardName]: userAnswer
      }));
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.submit_exam_answer_and_get_feedback",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
            flashcard_name: flashcardName,
            user_answer: userAnswer,
          }),
        }
      );
      
      // Log the full response to debug
      console.log("Feedback API Response:", responseData);
      
      if (!responseData?.message?.success) {
        // Handle API error
        console.error("API error:", responseData?.message?._error_message || "Unknown error");
        
        // Still provide feedback so UI can display something
        const errorFeedback = {
          ai_feedback_what_was_correct: "We couldn't generate feedback at this time.",
          ai_feedback_what_was_incorrect: responseData?.message?._error_message || "There was an error processing your answer.",
          ai_feedback_what_to_include: "Please try again later or contact support.",
          is_correct: false
        };
        
        setAiFeedbacks(prev => ({
          ...prev,
          [flashcardName]: errorFeedback
        }));
        
        return errorFeedback;
      }
      
      // Debug log the message structure
      console.log("Response message structure:", Object.keys(responseData.message));
      
      // Parse feedback data based on the API response structure
      let feedbackData;
      
      // Try different possible structures
      if (responseData.message.ai_feedback_what_was_correct !== undefined) {
        // Direct structure
        feedbackData = {
          ai_feedback_what_was_correct: responseData.message.ai_feedback_what_was_correct || "",
          ai_feedback_what_was_incorrect: responseData.message.ai_feedback_what_was_incorrect || "",
          ai_feedback_what_to_include: responseData.message.ai_feedback_what_to_include || "",
          is_correct: responseData.message.is_correct
        };
      } else if (responseData.message.feedback) {
        // Nested under 'feedback'
        feedbackData = {
          ai_feedback_what_was_correct: responseData.message.feedback.ai_feedback_what_was_correct || "",
          ai_feedback_what_was_incorrect: responseData.message.feedback.ai_feedback_what_was_incorrect || "",
          ai_feedback_what_to_include: responseData.message.feedback.ai_feedback_what_to_include || "",
          is_correct: responseData.message.is_correct || responseData.message.feedback.is_correct
        };
      } else {
        // Fallback with error messages
        console.warn("Feedback structure not recognized");
        feedbackData = {
          ai_feedback_what_was_correct: "We couldn't parse the feedback correctly.",
          ai_feedback_what_was_incorrect: "There might be an issue with the feedback format.",
          ai_feedback_what_to_include: "Please try again or submit a different answer.",
          is_correct: false
        };
      }
      
      // Check for empty or error messages in feedback
      if (
        (feedbackData.ai_feedback_what_was_correct && feedbackData.ai_feedback_what_was_correct.includes("error")) ||
        (feedbackData.ai_feedback_what_was_incorrect && feedbackData.ai_feedback_what_was_incorrect.includes("Error:"))
      ) {
        console.warn("API returned error in feedback:", feedbackData);
      }
      
      // Log the extracted feedback data
      console.log("Extracted feedback data:", feedbackData);
      
      setAiFeedbacks(prev => ({
        ...prev,
        [flashcardName]: feedbackData
      }));
      
      return feedbackData;
      
    } catch (error) {
      console.error("Error submitting answer:", error);
      
      // Provide fallback feedback for UI
      const errorFeedback = {
        ai_feedback_what_was_correct: "We encountered a technical issue.",
        ai_feedback_what_was_incorrect: `Error: ${error.message || "Unknown error"}`,
        ai_feedback_what_to_include: "Please try again later or contact support.",
        is_correct: false
      };
      
      setAiFeedbacks(prev => ({
        ...prev,
        [flashcardName]: errorFeedback
      }));
      
      return errorFeedback;
    } finally {
      setIsLoadingFeedback(false);
    }
  }, [currentAttemptName, isLoadingFeedback]);
  
  // Complete the exam
  const completeExam = useCallback(async () => {
    if (!currentAttemptName) return;
    
    try {
      // Set the state to completed first to ensure UI updates even if there's an API delay
      setIsExamCompleted(true);
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.complete_exam_attempt",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
          }),
        }
      );
      
      // Even if the API call fails, we keep the UI in completed state
      // since all answers have been recorded already
      if (!responseData?.message?.success) {
        console.warn("API call to complete exam returned an error, but the exam is still considered complete");
        console.warn(responseData?.message?._error_message || "Unknown error");
      }
      
      console.log("Exam completed successfully");
      
    } catch (error) {
      console.error("Error completing exam:", error);
      // We still consider the exam completed from the UI perspective
      // even if the API call fails
    }
  }, [currentAttemptName]);
  
  // Restart the exam
  const restartExam = useCallback(async () => {
    console.log('useExamMode: Restarting exam');
    
    // Clear all exam state
    setCurrentAttemptName(null);
    setExamFlashcards([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setAiFeedbacks({});
    setDetailedExplanations({});
    setIsExamCompleted(false);
    
    // Start a new exam with fresh settings
    await startExam();
  }, [startExam]);
  
  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < examFlashcards.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, examFlashcards.length]);
  
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);
  
  // Reset the current question (clear answer and feedback)
  const resetQuestion = useCallback((flashcardName) => {
    if (!flashcardName) return;
    
    // Create new objects without the keys for the current flashcard
    const newUserAnswers = { ...userAnswers };
    const newAiFeedbacks = { ...aiFeedbacks };
    
    delete newUserAnswers[flashcardName];
    delete newAiFeedbacks[flashcardName];
    
    setUserAnswers(newUserAnswers);
    setAiFeedbacks(newAiFeedbacks);
  }, [userAnswers, aiFeedbacks]);
  
  // Submit self-assessment and initialize SRS progress
  const submitSelfAssessment = useCallback(async (flashcardName, selfAssessmentValue) => {
    if (!currentAttemptName || !flashcardName || !selfAssessmentValue) return null;
    
    try {
      const response = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.submit_self_assessment_and_init_srs",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
            flashcard_name: flashcardName,
            self_assessment_value: selfAssessmentValue,
          }),
        }
      );
      
      // The backend returns { success: true/false, message: "..." } directly in response.message
      if (!response?.message?.success) {
        throw new Error(response?.message?.message || "Failed to submit self-assessment");
      }
      
      console.log("Submitted self-assessment for card:", flashcardName);
      return true;
      
    } catch (error) {
      console.error("Error submitting self-assessment:", error);
      return false;
    }
  }, [currentAttemptName]);
  
  // Get detailed explanation for a flashcard
  const getDetailedExplanation = useCallback(async (flashcardName) => {
    if (!flashcardName || isLoadingExplanation) return null;
    
    // Check if we already have the explanation cached
    if (detailedExplanations[flashcardName]) {
      return detailedExplanations[flashcardName];
    }
    
    setIsLoadingExplanation(true);
    
    try {
      // Find the current flashcard from our list
      const currentFlashcard = examFlashcards.find(card => card.name === flashcardName);
      
      if (!currentFlashcard) {
        throw new Error("Flashcard not found");
      }
      
      // Get user's answer and AI feedback for context
      const userAnswer = userAnswers[flashcardName] || "";
      const aiFeedback = aiFeedbacks[flashcardName] || {};
      
      console.log("Calling API for detailed explanation with:", {
        flashcard_name: flashcardName,
        question: currentFlashcard.question,
        answer: currentFlashcard.answer,
        user_answer: userAnswer,
        flashcard_type: currentFlashcard.flashcard_type
      });
      
      // Call API to get detailed explanation using LLM
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.get_detailed_explanation",
        {
          method: "POST",
          body: JSON.stringify({
            flashcard_name: flashcardName,
            question: currentFlashcard.question,
            answer: currentFlashcard.answer,
            user_answer: userAnswer,
            flashcard_type: currentFlashcard.flashcard_type,
            ai_feedback: JSON.stringify(aiFeedback)  // Convert object to string to avoid issues
          }),
        }
      );
      
      console.log("Detailed explanation response:", responseData);
      
      let explanationData = null;
      
      if (responseData?.message?.success) {
        explanationData = responseData.message.detailed_explanation || currentFlashcard.answer;
        console.log("Successfully received detailed explanation from LLM");
      } else {
        // Fallback to the original answer if API fails
        explanationData = currentFlashcard.answer;
        console.warn("Failed to get detailed explanation from LLM, using original answer");
        console.warn("Error:", responseData?.message?.error || "Unknown error");
      }
      
      // Cache the explanation
      setDetailedExplanations(prev => ({
        ...prev,
        [flashcardName]: explanationData
      }));
      
      return explanationData;
      
    } catch (error) {
      console.error("Error getting detailed explanation:", error);
      
      // Try to use the original answer as fallback
      const currentFlashcard = examFlashcards.find(card => card.name === flashcardName);
      const fallbackExplanation = currentFlashcard?.answer || "Không thể tải lời giải chi tiết.";
      
      // Cache the fallback explanation
      setDetailedExplanations(prev => ({
        ...prev,
        [flashcardName]: fallbackExplanation
      }));
      
      return fallbackExplanation;
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [examFlashcards, userAnswers, aiFeedbacks, detailedExplanations, isLoadingExplanation]);
  
  return {
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
    getDetailedExplanation
  };
} 