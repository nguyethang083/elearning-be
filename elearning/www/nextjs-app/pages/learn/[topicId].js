import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Settings } from "lucide-react";
import LearningModes from "@/components/learn/LearningModes";
import FlashcardSettings from "@/components/learn/FlashcardSettings";
import TopicWelcome from "@/components/learn/TopicWelcome";
import { useTopics } from "@/hooks/useTopics";
import { useFlashcards } from "@/hooks/useFlashcards";

export default function TopicFlashcards() {
  const router = useRouter();
  const { topicId, mode } = router.query;
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Initialize showWelcome based on URL params - if there's a mode, don't show welcome
  const [showWelcome, setShowWelcome] = useState(true); // Always start with welcome, then adjust based on URL
  
  // Get topics to find current topic info
  const { topics, loading: topicsLoading, error: topicsError } = useTopics();

  // Get flashcards for current topic
  const { 
    flashcards, 
    loading: flashcardsLoading, 
    error: flashcardsError,
    refreshFlashcards
  } = useFlashcards(topicId);

  // Handle authentication & user data
  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    let userData = null;

    if (loggedInUser) {
      try {
        userData = JSON.parse(loggedInUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = {
        userId: session.user.userId || session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar || session.user.image,
        roles: session.user.roles || ["Student"],
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      setUser(sessionUser);
    }

    if (!userData && status !== "loading" && status !== "authenticated") {
      router.push("/login");
    }
  }, [router, session, status]);

  // Check if user wants to skip welcome (if they have a specific mode in URL or have visited before)
  useEffect(() => {
    const { mode } = router.query;
    
    // Only hide welcome if there's a specific mode in URL
    if (mode && ['basic', 'exam', 'srs'].includes(mode)) {
      setShowWelcome(false);
    } else if (router.isReady && !mode) {
      // If router is ready and there's no mode, show welcome
      setShowWelcome(true);
    }
  }, [router.query, router.isReady]);

  const topic = topics.find(t => t.id === Number(topicId));

  // Centralized handler for settings changes
  const handleSettingsChange = () => {
    console.log("TopicPage: Settings changed, closing modal");
    // Close the settings modal
    setShowSettings(false);
    
    // NOTE: We don't need to call refreshFlashcards here because the event listener in each mode
    // will handle refreshing the data. If we call it here too, it might cause race conditions
    // where the API is called with stale settings.
  };

  // Handle starting learning from welcome screen
  const handleStartLearning = (selectedMode) => {
    // Mark topic as visited
    const visitedTopics = JSON.parse(localStorage.getItem('visitedTopics') || '{}');
    visitedTopics[topicId] = true;
    localStorage.setItem('visitedTopics', JSON.stringify(visitedTopics));
    
    // Hide welcome screen
    setShowWelcome(false);
    
    // Update URL with selected mode
    router.push(`/learn/${topicId}?mode=${selectedMode}`, undefined, { shallow: true });
  };

  // Handle closing welcome screen
  const handleCloseWelcome = () => {
    // Mark topic as visited
    const visitedTopics = JSON.parse(localStorage.getItem('visitedTopics') || '{}');
    visitedTopics[topicId] = true;
    localStorage.setItem('visitedTopics', JSON.stringify(visitedTopics));
    
    // Hide welcome screen
    setShowWelcome(false);
  };

  // Handle showing welcome screen again
  const handleShowWelcome = () => {
    setShowWelcome(true);
    // Remove mode from URL to ensure welcome stays visible
    const newUrl = `/learn/${topicId}`;
    router.replace(newUrl, undefined, { shallow: true });
  };

  if (status === "loading" || (!user && status === "authenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user && status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  // Loading state while waiting for data
  if (topicsLoading || flashcardsLoading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Show welcome screen if enabled and data is loaded
  if (showWelcome && topic && flashcards) {
    return (
      <TopicWelcome 
        topic={topic}
        flashcards={flashcards}
        onStartLearning={handleStartLearning}
        onClose={handleCloseWelcome}
      />
    );
  }

  // Show loading if welcome should be shown but data isn't ready yet
  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-full">
        {/* Header section với responsive layout cải thiện */}
        {topic && (
          <div className="mb-6 w-full">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => router.push("/learn")}
                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm md:text-base flex-shrink-0"
              >
                ← Quay lại chủ đề
              </button>
            </div>
            {/* Cải thiện layout header cho responsive tốt hơn */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0 sm:space-x-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
                  {topic.topic_name}
                </h1>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  onClick={handleShowWelcome}
                  className="inline-flex items-center px-3 py-2 border border-indigo-300 shadow-sm text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Xem giới thiệu
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                  Cài đặt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content area với responsive container - only show if all data is ready */}
        {topic && flashcards && !flashcardsLoading && (
          <div className="w-full overflow-hidden">
            <LearningModes 
              topicId={topicId} 
              flashcards={flashcards} 
              loading={flashcardsLoading} 
              error={flashcardsError}
            />
          </div>
        )}

        {/* Loading state for main content */}
        {(!topic || !flashcards || flashcardsLoading) && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Settings Modal với responsive improvements */}
        {showSettings && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <FlashcardSettings 
                topicId={topicId} 
                onClose={() => setShowSettings(false)}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}