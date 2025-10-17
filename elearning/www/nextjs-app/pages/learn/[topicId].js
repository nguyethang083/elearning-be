import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Settings, Target, BookOpen } from "lucide-react";
import LearningModes from "@/components/learn/LearningModes";
import FlashcardSettings from "@/components/learn/FlashcardSettings";
import TopicWelcome from "@/components/learn/TopicWelcome";
import LOPracticeMode from "@/components/learn/LOPracticeMode";
import { useTopics } from "@/hooks/useTopics";
import { useFlashcards } from "@/hooks/useFlashcards";
import { getPracticeQuestionsForLO } from "@/pages/api/helper";

export default function LearnPage() {
  const router = useRouter();
  const { topicId, mode, lo_id } = router.query; // Lấy cả topic_id và lo_id từ URL
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // State for practice modes
  const [practiceMode, setPracticeMode] = useState("loading");
  const [loQuestions, setLoQuestions] = useState([]);
  const [learningObject, setLearningObject] = useState(null);
  const [pageTitle, setPageTitle] = useState("Đang tải...");
  const [loading, setLoading] = useState(true);

  // Initialize showWelcome based on URL params - if there's a mode or lo_id, don't show welcome
  const [showWelcome, setShowWelcome] = useState(true);

  // Get topics to find current topic info
  const { topics, loading: topicsLoading, error: topicsError } = useTopics();

  // Get flashcards for current topic (only when in Topic Mode)
  const {
    flashcards,
    loading: flashcardsLoading,
    error: flashcardsError,
    refreshFlashcards,
  } = useFlashcards(practiceMode === "Topic Mode" ? topicId : null);

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

  // Determine practice mode based on URL parameters
  useEffect(() => {
    if (!router.isReady) return;

    setLoading(true);

    if (lo_id) {
      // --- CHẾ ĐỘ MỚI: LUYỆN TẬP TẬP TRUNG ---
      setPracticeMode("LO Mode");
      setPageTitle("Luyện tập Kỹ năng Chuyên sâu");
      setShowWelcome(false); // Không hiển thị welcome trong LO Mode

      // Gọi API mới để lấy câu hỏi cho LO
      getPracticeQuestionsForLO(lo_id)
        .then((response) => {
          console.log("LO Questions API Response:", response);
          if (response && response.message) {
            setLoQuestions(response.message.questions || []);
            setLearningObject(response.message.learning_object || null);
            setPageTitle(
              `Luyện tập: ${
                response.message.learning_object?.title || "Kỹ năng Chuyên sâu"
              }`
            );
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching LO questions:", error);
          setLoQuestions([]);
          setLearningObject(null);
          setLoading(false);
        });
    } else if (topicId) {
      // --- CHẾ ĐỘ CŨ: LUYỆN TẬP THEO CHƯƠNG ---
      setPracticeMode("Topic Mode");

      // Check if user wants to skip welcome
      const { mode } = router.query;
      if (mode && ["basic", "exam", "srs"].includes(mode)) {
        setShowWelcome(false);
      } else {
        setShowWelcome(true);
      }

      setLoading(false);
    } else {
      setPracticeMode("none");
      setPageTitle("Vui lòng chọn một chủ đề");
      setLoading(false);
    }
  }, [router.isReady, topicId, lo_id, router.query]);

  // Update page title when topic data loads (for Topic Mode)
  useEffect(() => {
    if (practiceMode === "Topic Mode" && topics && topicId) {
      const topic = topics.find((t) => t.name === Number(topicId));
      if (topic) {
        setPageTitle(`Ôn tập: ${topic.topic_name}`);
      }
    }
  }, [practiceMode, topics, topicId]);

  const topic = topics.find((t) => t.name === Number(topicId));

  // Centralized handler for settings changes
  const handleSettingsChange = () => {
    console.log("LearnPage: Settings changed, closing modal");
    setShowSettings(false);
  };

  // Handle starting learning from welcome screen
  const handleStartLearning = (selectedMode) => {
    const visitedTopics = JSON.parse(
      localStorage.getItem("visitedTopics") || "{}"
    );
    visitedTopics[topicId] = true;
    localStorage.setItem("visitedTopics", JSON.stringify(visitedTopics));

    setShowWelcome(false);
    router.push(`/learn/${topicId}?mode=${selectedMode}`, undefined, {
      shallow: true,
    });
  };

  // Handle closing welcome screen
  const handleCloseWelcome = () => {
    const visitedTopics = JSON.parse(
      localStorage.getItem("visitedTopics") || "{}"
    );
    visitedTopics[topicId] = true;
    localStorage.setItem("visitedTopics", JSON.stringify(visitedTopics));

    setShowWelcome(false);
  };

  // Handle showing welcome screen again (only for Topic Mode)
  const handleShowWelcome = () => {
    if (practiceMode === "Topic Mode") {
      setShowWelcome(true);
      const newUrl = `/learn/${topicId}`;
      router.replace(newUrl, undefined, { shallow: true });
    }
  };

  // Loading state for authentication
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

  // Loading state while determining practice mode
  if (loading || practiceMode === "loading") {
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

  // LO Mode: Render focused practice interface
  if (practiceMode === "LO Mode") {
    return (
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-full">
          {/* Header for LO Mode */}
          <div className="mb-6 w-full">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => router.push("/my-pathway")}
                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm md:text-base flex-shrink-0"
              >
                ← Quay lại Cây tri thức
              </button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                  {pageTitle}
                </h1>
                {learningObject && (
                  <p className="text-gray-600 text-sm md:text-base">
                    {learningObject.description}
                  </p>
                )}
              </div>
            </div>

            {/* Mode indicator */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-amber-600" />
                <p className="text-amber-800 font-medium">
                  Chế độ Luyện tập Tập trung
                </p>
              </div>
              <p className="text-amber-700 text-sm mt-1">
                Tập trung vào kỹ năng cụ thể để nâng cao hiệu quả học tập
              </p>
            </div>
          </div>

          {/* LO Practice Content */}
          <LOPracticeMode
            questions={loQuestions}
            learningObject={learningObject}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // Topic Mode: Original flashcard interface
  // Loading state while waiting for topic data
  if (topicsLoading || (!topic && practiceMode === "Topic Mode")) {
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

  // Show welcome screen if enabled and data is loaded (Topic Mode only)
  if (showWelcome && topic && flashcards && practiceMode === "Topic Mode") {
    return (
      <TopicWelcome
        topic={topic}
        flashcards={flashcards}
        onStartLearning={handleStartLearning}
        onClose={handleCloseWelcome}
      />
    );
  }

  // Show loading if welcome should be shown but data isn't ready yet (Topic Mode)
  if (showWelcome && practiceMode === "Topic Mode") {
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

  // Topic Mode: Main interface
  if (practiceMode === "Topic Mode") {
    return (
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-full">
          {/* Header section for Topic Mode */}
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

              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0 sm:space-x-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
                      {topic.topic_name}
                    </h1>
                  </div>

                  {/* Mode indicator for Topic Mode */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <p className="text-blue-800 font-medium text-sm">
                        Chế độ Ôn tập Chương
                      </p>
                    </div>
                    <p className="text-blue-700 text-xs mt-1">
                      Ôn tập toàn bộ kiến thức của chương với flashcards
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={handleShowWelcome}
                    className="inline-flex items-center px-3 py-2 border border-indigo-300 shadow-sm text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Xem giới thiệu
                  </button>
                  <button
                    id="flashcard-settings-button"
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

          {/* Main content area for Topic Mode */}
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

          {/* Loading state for Topic Mode main content */}
          {(!topic || !flashcards || flashcardsLoading) && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse flex space-x-2">
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Settings Modal (for Topic Mode only) */}
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

  // No practice mode selected
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{pageTitle}</h1>
        <button
          onClick={() => router.push("/learn")}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Chọn chủ đề học tập
        </button>
      </div>
    </div>
  );
}
