import { useState, useEffect, useRef, useCallback } from 'react';
import { startFlashcardSession, updateFlashcardSessionTime, endFlashcardSession } from '@/pages/api/helper';

/**
 * Custom hook to track flashcard session time
 * @param {string} topicId - The topic ID
 * @param {string} mode - Learning mode (Basic, SRS, Exam)
 * @param {boolean} isActive - Whether the session is currently active
 * @returns {object} Session tracking methods and state
 */
export function useFlashcardSession(topicId, mode = "Basic", isActive = false) {
  const [sessionId, setSessionId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [sessionError, setSessionError] = useState(null);
  
  // Refs to track time
  const sessionStartTime = useRef(null);
  const lastUpdateTime = useRef(null);
  const updateInterval = useRef(null);
  const timeAccumulator = useRef(0); // Track time between updates
  const startSessionTimeout = useRef(null); // For debouncing

  // Start a new session
  const startSession = useCallback(async () => {
    if (!topicId || isSessionActive) return;
    
    // Clear any pending timeout
    if (startSessionTimeout.current) {
      clearTimeout(startSessionTimeout.current);
    }
    
    // Debounce the session start
    startSessionTimeout.current = setTimeout(async () => {
      try {
        console.log(`FlashcardSession: Starting session for topic ${topicId}, mode ${mode}`);
        
        const res = await startFlashcardSession(topicId, mode);
        console.log("[DEBUG] API response from startFlashcardSession:", res);
        
        if (!res.message?.success) {
          throw new Error(res.message?.error || res.error || "Failed to start session");
        }
        
        setSessionId(res.message.session_id);
        setIsSessionActive(true);
        setSessionError(null);
        
        // Initialize timing
        sessionStartTime.current = Date.now();
        lastUpdateTime.current = Date.now();
        timeAccumulator.current = 0;
        
        console.log(`FlashcardSession: ${res.message.existing ? 'Resumed' : 'Started'} session ${res.message.session_id}`);
        
        // Start periodic updates every 30 seconds
        updateInterval.current = setInterval(() => {
          updateSessionTime();
        }, 30000);
        
        return res.message.session_id;
      } catch (error) {
        console.error("Session error:", error, error?.data);
        setSessionError(error?.data?.error || error.message || "Failed to start session");
        return null;
      }
    }, 300); // 300ms debounce
  }, [topicId, mode, isSessionActive]);

  // Update session time
  const updateSessionTime = useCallback(async () => {
    if (!sessionId || !isSessionActive || !lastUpdateTime.current) return;
    
    try {
      const now = Date.now();
      const timeDiff = Math.floor((now - lastUpdateTime.current) / 1000); // seconds
      
      if (timeDiff > 0) {
        timeAccumulator.current += timeDiff;
        setTotalTimeSpent(prev => prev + timeDiff);
        
        // Update backend every 30 seconds or when manually called
        if (timeAccumulator.current >= 30) {
          console.log(`FlashcardSession: Updating session ${sessionId} with ${timeAccumulator.current} seconds`);
          
          await updateFlashcardSessionTime(sessionId, timeAccumulator.current);
          timeAccumulator.current = 0; // Reset accumulator
        }
        
        lastUpdateTime.current = now;
      }
    } catch (error) {
      console.error('Error updating flashcard session time:', error);
      setSessionError(error.message);
    }
  }, [sessionId, isSessionActive]);

  // End the current session
  const endSession = useCallback(async () => {
    if (!sessionId || !isSessionActive) return;
    
    try {
      // Final time update
      await updateSessionTime();
      
      // Send any remaining accumulated time
      if (timeAccumulator.current > 0) {
        await updateFlashcardSessionTime(sessionId, timeAccumulator.current);
      }
      
      console.log(`FlashcardSession: Ending session ${sessionId}`);
      
      const response = await endFlashcardSession(sessionId);
      
      if (response?.success) {
        console.log(`FlashcardSession: Successfully ended session ${sessionId}`);
      }
      
      // Clean up
      setIsSessionActive(false);
      setSessionId(null);
      
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
      
      // Reset timing refs
      sessionStartTime.current = null;
      lastUpdateTime.current = null;
      timeAccumulator.current = 0;
      
    } catch (error) {
      console.error('Error ending flashcard session:', error);
      setSessionError(error.message);
    }
  }, [sessionId, isSessionActive, updateSessionTime]);

  // Handle session activation/deactivation
  useEffect(() => {
    if (isActive && !isSessionActive && topicId && !sessionId) {
      startSession();
    } else if (!isActive && isSessionActive && sessionId) {
      endSession();
    }
    // eslint-disable-next-line
  }, [isActive, isSessionActive, topicId, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (startSessionTimeout.current) {
        clearTimeout(startSessionTimeout.current);
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      if (isSessionActive) {
        endSession();
      }
    };
  }, [isSessionActive, endSession]);

  // Update time when component is focused (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isSessionActive) {
        // Reset last update time to current time to avoid counting time when tab was hidden
        lastUpdateTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSessionActive]);

  return {
    sessionId,
    isSessionActive,
    totalTimeSpent,
    sessionError,
    startSession,
    endSession,
    updateSessionTime
  };
} 