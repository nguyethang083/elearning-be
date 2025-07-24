import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";

/**
 * Custom hook to fetch and manage user's exam history
 * @param {string} [topicId] - Optional topic ID to filter the history
 * @returns {{ 
 *   examHistory,
 *   selectedAttempt,
 *   attemptDetails,
 *   isLoadingHistory,
 *   isLoadingDetails,
 *   error,
 *   fetchExamHistory,
 *   fetchAttemptDetails,
 *   selectAttempt
 * }}
 */
export function useExamHistory(topicId = null) {
  // State variables
  const [examHistory, setExamHistory] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  
  // New state for detailed explanations
  const [detailedExplanations, setDetailedExplanations] = useState({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  
  // Fetch exam history
  const fetchExamHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setError(null);
    
    try {
      const apiPath = "user_exam_attempt.user_exam_attempt.get_user_exam_history";
      const body = {};
      
      // Only add topic_name if it's provided and valid
      if (topicId) {
        body.topic_name = String(topicId);
      }
      
      console.log("useExamHistory: Fetching exam history", topicId ? `for topic: ${topicId}` : "for all topics");
      
      const responseData = await fetchWithAuth(
        apiPath,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      
      console.log("useExamHistory: API response:", responseData);
      
      // Handle different API response formats
      if (responseData?.message?.success) {
        console.log("useExamHistory: Found data in message.attempts:", responseData.message.attempts);
        const attempts = responseData.message.attempts || [];
        
        // Process date formats and ensure all required fields are present
        const processedAttempts = attempts
          .filter(attempt => {
            // Skip attempts that don't have questions or self-assessment
            if (!attempt.total_questions || attempt.total_questions === 0) {
              console.log(`Filtering out attempt ${attempt.name}: no questions`);
              return false;
            }
            
            return true;
          })
          .map(attempt => {
            // Ensure we have date fields
            const creation = attempt.creation || new Date().toISOString();
            const end_time = attempt.end_time || attempt.completion_timestamp || null;
            
            console.log("Processing attempt:", attempt.name, 
              "topic:", attempt.topic_name, 
              "end_time:", end_time, 
              "time_spent_seconds:", attempt.time_spent_seconds,
              "total_questions:", attempt.total_questions);
            
            return {
              ...attempt,
              creation,
              end_time,
              date: end_time || creation,  // Use completion time if available, otherwise creation date
              formatted_time: attempt.formatted_time || "0m 0s",
              total_questions: attempt.total_questions || 0
            };
          });
        
        console.log("useExamHistory: Processed attempts:", processedAttempts);
        setExamHistory(processedAttempts);
      } else if (responseData?.success) {
        // Alternative format where success is at top level
        console.log("useExamHistory: Found data in attempts:", responseData.attempts);
        const attempts = responseData.attempts || [];
        
        // Process date formats
        const processedAttempts = attempts
          .filter(attempt => {
            // Skip attempts that don't have questions or self-assessment
            if (!attempt.total_questions || attempt.total_questions === 0) {
              console.log(`Filtering out attempt ${attempt.name}: no questions`);
              return false;
            }
            
            return true;
          })
          .map(attempt => {
            const creation = attempt.creation || new Date().toISOString();
            const end_time = attempt.end_time || attempt.completion_timestamp || null;
            
            console.log("Processing attempt (format 2):", attempt.name, 
              "topic:", attempt.topic_name, 
              "end_time:", end_time, 
              "time_spent_seconds:", attempt.time_spent_seconds,
              "total_questions:", attempt.total_questions);
            
            return {
              ...attempt,
              creation,
              end_time,
              date: end_time || creation,
              formatted_time: attempt.formatted_time || "0m 0s",
              total_questions: attempt.total_questions || 0
            };
          });
        
        console.log("useExamHistory: Processed attempts (format 2):", processedAttempts);
        setExamHistory(processedAttempts);
      } else if (Array.isArray(responseData)) {
        // Direct array response
        console.log("useExamHistory: Received direct array with", responseData.length, "items");
        
        // Process date formats
        const processedAttempts = responseData
          .filter(attempt => {
            // Skip attempts that don't have questions or self-assessment
            if (!attempt.total_questions || attempt.total_questions === 0) {
              console.log(`Filtering out attempt ${attempt.name}: no questions`);
              return false;
            }
            
            return true;
          })
          .map(attempt => {
            const creation = attempt.creation || new Date().toISOString();
            const end_time = attempt.end_time || attempt.completion_timestamp || null;
            
            console.log("Processing attempt (format 3):", attempt.name, 
              "topic:", attempt.topic_name, 
              "end_time:", end_time, 
              "time_spent_seconds:", attempt.time_spent_seconds,
              "total_questions:", attempt.total_questions);
            
            return {
              ...attempt,
              creation,
              end_time,
              date: end_time || creation,
              formatted_time: attempt.formatted_time || "0m 0s",
              total_questions: attempt.total_questions || 0
            };
          });
        
        console.log("useExamHistory: Processed attempts (format 3):", processedAttempts);
        setExamHistory(processedAttempts);
      } else {
        console.error("useExamHistory: Unexpected API response format:", responseData);
        throw new Error("Invalid response format from server");
      }
      
    } catch (error) {
      console.error("Error fetching exam history:", error);
      setError("Failed to load exam history. Please try again later.");
      setExamHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [topicId]);
  
  // Fetch details for a specific attempt
  const fetchAttemptDetails = useCallback(async (attemptName) => {
    if (!attemptName) return;
    
    setIsLoadingDetails(true);
    setError(null);
    
    try {
      console.log("useExamHistory: Fetching details for attempt:", attemptName);
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.get_exam_attempt_details",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: attemptName,
          }),
        }
      );
      
      console.log("useExamHistory: Attempt details response:", responseData);
      
      // Handle different API response formats
      let attemptData = null;
      
      if (responseData?.message?.success) {
        console.log("useExamHistory: Found attempt details in message.attempt");
        attemptData = responseData.message.attempt;
      } else if (responseData?.success) {
        // Alternative format where success is at top level
        console.log("useExamHistory: Found attempt details in attempt");
        attemptData = responseData.attempt;
      } else if (responseData?.attempt) {
        // Direct attempt object
        console.log("useExamHistory: Found direct attempt object");
        attemptData = responseData.attempt;
      } else {
        console.error("useExamHistory: Unexpected API response format for attempt details:", responseData);
        throw new Error("Invalid response format from server");
      }
      
      // Process the attempt data to ensure all fields are present
      if (attemptData) {
        // Ensure all date fields exist and format them correctly
        attemptData.start_time = attemptData.start_time || attemptData.creation || new Date().toISOString();
        
        // Calculate end time based on start time + duration if not available
        if (!attemptData.end_time && !attemptData.completion_timestamp) {
          const startTime = new Date(attemptData.start_time);
          const endTime = new Date(startTime.getTime() + (attemptData.time_spent_seconds || 60) * 1000);
          attemptData.end_time = endTime.toISOString();
        }
        
        // Use end_time if completion_timestamp is not available
        attemptData.completion_timestamp = attemptData.completion_timestamp || attemptData.end_time;
        
        // Ensure formatted time exists
        if (!attemptData.formatted_time && attemptData.time_spent_seconds) {
          const mins = Math.floor(attemptData.time_spent_seconds / 60);
          const secs = Math.floor(attemptData.time_spent_seconds % 60);
          attemptData.formatted_time = `${mins}m ${secs}s`;
        } else if (!attemptData.formatted_time) {
          attemptData.formatted_time = "1m 0s";
        }
        
        // Ensure details array exists
        if (!attemptData.details) {
          attemptData.details = [];
        }
        
        // Check for self assessment status - auto-complete in the background if needed
        if (attemptData.details.length > 0) {
          // Count how many questions have self-assessment
          const assessedCount = attemptData.details.filter(
            detail => detail.user_self_assessment && detail.user_self_assessment !== "Chưa hiểu"
          ).length;
          
          console.log(`useExamHistory: Found ${assessedCount}/${attemptData.details.length} assessed questions`);
          
          // If all questions have been assessed, mark as implicitly completed
          if (assessedCount > 0 && assessedCount >= attemptData.details.length) {
            console.log("useExamHistory: All questions have been assessed, attempt should be marked complete");
            
            // Attempt to auto-complete via API in the background
            fetchWithAuth(
              "user_exam_attempt.user_exam_attempt.complete_exam_attempt",
              {
                method: "POST",
                body: JSON.stringify({
                  attempt_name: attemptName,
                }),
              }
            ).then(completeResponse => {
              console.log("useExamHistory: Auto-complete response:", completeResponse);
              // Update history list after completion
              fetchExamHistory();
            }).catch(error => {
              console.error("Error auto-completing attempt:", error);
            });
          }
        }
        
        console.log("useExamHistory: Processed attempt details:", attemptData);
      }
      
      setAttemptDetails(attemptData);
      
    } catch (error) {
      console.error("Error fetching attempt details:", error);
      setError("Failed to load attempt details. Please try again later.");
      setAttemptDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [fetchExamHistory]);
  
  // Select an attempt and fetch its details
  const selectAttempt = useCallback((attemptName) => {
    setSelectedAttempt(attemptName);
    fetchAttemptDetails(attemptName);
  }, [fetchAttemptDetails]);
  
  // Function to get detailed explanation for a specific flashcard
  const getDetailedExplanation = useCallback(async (flashcardName, questionData) => {
    if (!flashcardName || detailedExplanations[flashcardName]) {
      return detailedExplanations[flashcardName];
    }

    setIsLoadingExplanation(true);
    
    try {
      console.log("useExamHistory: Getting detailed explanation for flashcard:", flashcardName);
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.get_detailed_explanation",
        {
          method: "POST",
          body: JSON.stringify({
            flashcard_name: flashcardName,
            question: questionData?.question,
            answer: questionData?.answer,
            user_answer: questionData?.user_answer,
            flashcard_type: questionData?.flashcard_type,
            ai_feedback: questionData?.ai_feedback || {}
          }),
        }
      );

      console.log("useExamHistory: Detailed explanation response:", responseData);

      if (responseData?.success && responseData?.detailed_explanation) {
        const explanation = responseData.detailed_explanation;
        setDetailedExplanations(prev => ({
          ...prev,
          [flashcardName]: explanation
        }));
        return explanation;
      } else {
        console.error("useExamHistory: Failed to get detailed explanation:", responseData);
        return null;
      }
    } catch (error) {
      console.error("useExamHistory: Error getting detailed explanation:", error);
      return null;
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [detailedExplanations]);
  
  // Fetch exam history on initial load
  useEffect(() => {
    fetchExamHistory();
  }, [fetchExamHistory]);
  
  return {
    examHistory,
    selectedAttempt,
    attemptDetails,
    isLoadingHistory,
    isLoadingDetails,
    error,
    fetchExamHistory,
    fetchAttemptDetails,
    selectAttempt,
    getDetailedExplanation,
    detailedExplanations,
    isLoadingExplanation
  };
} 