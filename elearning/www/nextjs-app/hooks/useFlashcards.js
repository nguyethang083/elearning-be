import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";
import { useUserFlashcardSettings } from "./useUserFlashcardSettings";

/**
 * Custom hook to fetch flashcards by topic, with loading/error states
 * @param {string} topicId - The topic ID to fetch flashcards for
 * @returns {{ flashcards, loading, error, metrics, filteredFlashcards, refreshFlashcards }}
 */
export function useFlashcards(topicId) {
  const [flashcards, setFlashcards] = useState([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({});
  
  // Get user settings for the topic
  const { 
    settings, 
    isLoadingSettings 
  } = useUserFlashcardSettings(topicId);

  // Function to fetch flashcards with specific settings
  const fetchFlashcardsWithSettings = useCallback(async (settingsToUse) => {
    if (!topicId) return;
    
    // Ensure topicId is in the format server expects (string)
    const formattedTopicId = String(topicId);
    
    console.log("useFlashcards: Fetching flashcards for topic:", formattedTopicId);
    console.log("useFlashcards: Using settings:", settingsToUse);
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth(
        "flashcard.flashcard.get_flashcards_for_type",
        {
          method: "POST",
          body: JSON.stringify({
            topic_id: formattedTopicId,
            flashcard_type: settingsToUse?.study_exam_flashcard_type_filter !== "All" ? 
              settingsToUse?.study_exam_flashcard_type_filter : undefined
          })
        }
      );
      
      console.log("useFlashcards: API response:", response);
      
      if (response?.message) {
        const fetchedFlashcards = response.message;
        
        if (!Array.isArray(fetchedFlashcards)) {
          throw new Error("Received invalid data format for flashcards.");
        }
        
        // Process flashcards data
        const processedFlashcards = fetchedFlashcards.map(card => ({
          ...card,
          id: card.name || card.id,
        }));
        
        // Apply arrange_mode from settings
        let arrangedFlashcards = [...processedFlashcards];
        if (settingsToUse?.flashcard_arrange_mode === "random") {
          // Shuffle the array in place
          arrangedFlashcards = shuffleArray(arrangedFlashcards);
          console.log("useFlashcards: Applied random arrangement to flashcards");
        } else {
          console.log("useFlashcards: Using chronological order for flashcards");
        }
        
        // Set basic metrics
        const flashcardMetrics = {
          totalCards: processedFlashcards.length,
          filteredType: settingsToUse?.study_exam_flashcard_type_filter || "All",
          arrangeMode: settingsToUse?.flashcard_arrange_mode || "chronological"
        };
        
        setFlashcards(arrangedFlashcards);
        setFilteredFlashcards(arrangedFlashcards);
        setMetrics(flashcardMetrics);
        console.log("useFlashcards: Loaded", arrangedFlashcards.length, "flashcards");
      } else {
        throw new Error("Failed to fetch flashcards");
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      setError(error.message || "Failed to fetch flashcards");
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  // Helper function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Function to manually reapply the current arrangement mode to flashcards
  const reapplyArrangement = useCallback(() => {
    if (!flashcards.length || !settings) return;
    
    console.log("useFlashcards: Reapplying arrangement mode:", settings.flashcard_arrange_mode);
    
    let arrangedFlashcards = [...flashcards];
    if (settings.flashcard_arrange_mode === "random") {
      arrangedFlashcards = shuffleArray(flashcards);
    }
    
    setFilteredFlashcards(arrangedFlashcards);
    console.log("useFlashcards: Arrangement reapplied to", arrangedFlashcards.length, "flashcards");
  }, [flashcards, settings]);

  // Function that exposes refreshFlashcards using current settings
  const refreshFlashcards = useCallback(() => {
    return fetchFlashcardsWithSettings(settings);
  }, [fetchFlashcardsWithSettings, settings]);

  // Load flashcards when component mounts or when settings change
  useEffect(() => {
    refreshFlashcards();
  }, [refreshFlashcards]);

  // Listen for settings changed event
  useEffect(() => {
    const handleSettingsChange = (event) => {
      // Convert both to strings for comparison
      const currentTopicId = String(topicId);
      const eventTopicId = String(event.detail.topicId);
      
      // Only process events for this topic
      if (eventTopicId === currentTopicId) {
        console.log('useFlashcards: Received flashcardSettingsChanged event');
        console.log('useFlashcards: Using settings from event:', event.detail.settings);
        
        // Check if arrange_mode changed but type filter didn't
        const currentArrangeMode = settings?.flashcard_arrange_mode;
        const newArrangeMode = event.detail.settings.flashcard_arrange_mode;
        const currentTypeFilter = settings?.study_exam_flashcard_type_filter;
        const newTypeFilter = event.detail.settings.study_exam_flashcard_type_filter;
        
        if (currentArrangeMode !== newArrangeMode && currentTypeFilter === newTypeFilter && flashcards.length > 0) {
          // If only the arrangement changed, we can just reapply without fetching
          console.log('useFlashcards: Only arrangement mode changed, reapplying without fetch');
          
          let arrangedFlashcards = [...flashcards];
          if (newArrangeMode === "random") {
            arrangedFlashcards = shuffleArray(flashcards);
            console.log("useFlashcards: Applied random arrangement to existing flashcards");
          }
          
          setFilteredFlashcards(arrangedFlashcards);
          
          // Update metrics
          setMetrics(prev => ({
            ...prev,
            arrangeMode: newArrangeMode
          }));
        } else {
          // Use the settings directly from the event instead of waiting for state update
          fetchFlashcardsWithSettings(event.detail.settings);
        }
      }
    };
    
    window.addEventListener('flashcardSettingsChanged', handleSettingsChange);
    
    return () => {
      window.removeEventListener('flashcardSettingsChanged', handleSettingsChange);
    };
  }, [topicId, fetchFlashcardsWithSettings, flashcards, settings]);

  return { 
    flashcards: filteredFlashcards,
    allFlashcards: flashcards,
    loading: loading || isLoadingSettings, 
    error, 
    metrics,
    refreshFlashcards,
    reapplyArrangement,
    // Useful methods
    reset: () => {
      setFlashcards([]);
      setFilteredFlashcards([]);
      setLoading(true);
      setError(null);
    }
  };
} 