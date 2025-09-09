"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startPlacementTest, submitPlacementAnswer } from "@/lib/placement-api";
import { PlacementQuestionCard } from "./PlacementQuestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart2 } from "lucide-react";
import InstructionsScreen from "./InstructionsScreen";
import ResultsScreen from "./ResultsScreen";
import PersonalizedPathway from "./PersonalizedPathway";
import WelcomeSection from "@/components/test/welcome-section";
import PerformanceSection from "@/components/test/performance-section";

export default function PlacementTest() {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("instructions"); // 'instructions', 'testing', 'results', 'welcome', 'pathway'
  const [userData, setUserData] = useState({
    name: "Hang",
    level: "Sơ cấp",
    progress: 20,
    mathLevel: 45,
  });
  const [topicAbilities, setTopicAbilities] = useState([]);
  const [progress, setProgress] = useState(0);

  const handleStartTest = async () => {
    setView("testing");
    setIsLoading(true);
    setProgress(0);
    try {
      const response = await startPlacementTest();
      if (response.message) {
        setSession(response.message);
        setCurrentQuestion(response.message.question);
        setTopicAbilities(response.message.topic_abilities || []);
      }
    } catch (err) {
      setError("Không thể bắt đầu bài test. Vui lòng tải lại trang.");
    } finally {
      setIsLoading(false);
    }
  };

  // const handleInstructions = () => setView("instructions");
  const handleBackToWelcome = () => setView("instructions");

  const handleAnswer = async (questionId, isCorrect) => {
    if (!session?.session_id) return;
    setIsLoading(true);
    try {
      const response = await submitPlacementAnswer(
        session.session_id,
        questionId,
        isCorrect
      );
      const message = response.message;
      if (message.topic_abilities && Array.isArray(message.topic_abilities)) {
        setTopicAbilities(message.topic_abilities);
      } else if (
        message.last_feedback &&
        message.last_feedback.all_topic_abilities
      ) {
        setTopicAbilities(message.last_feedback.all_topic_abilities);
      }
      if (message.status === "completed") {
        setResults(message.results);
        setView("results");
      } else if (message.status === "in_progress") {
        setCurrentQuestion(message.question);
        setProgress((prev) => prev + 1);
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi nộp câu trả lời.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    setSession(null);
    setCurrentQuestion(null);
    setResults(null);
    setIsLoading(false);
    setError(null);
    setView("instructions");
    setTopicAbilities([]);
    setProgress(0);
  };

  const handleContinueLearning = () => {
    setView("pathway");
  };

  const renderContent = () => {
    if (view === "instructions")
      return (
        <InstructionsScreen
          onStart={handleStartTest}
          onBack={handleBackToWelcome}
        />
      );
    if (view === "results" && results) {
      return (
        <ResultsScreen
          results={results}
          onRetake={handleRetake}
          onContinueLearning={handleContinueLearning}
        />
      );
    }
    if (view === "welcome") {
      return (
        <div className="flex-grow p-6">
          <WelcomeSection userName={userData.name} />
          <PerformanceSection userData={userData} />
        </div>
      );
    }
    if (view === "pathway") {
      return (
        <PersonalizedPathway
          sessionId={session?.session_id}
          testResult={results}
          onBackToWelcome={() => setView("welcome")}
        />
      );
    }
    if (isLoading && !currentQuestion) {
      return (
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Đang tải câu hỏi...</p>
          </CardContent>
        </Card>
      );
    }
    if (error) {
      return (
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (view === "testing" && currentQuestion) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <div className="w-full max-w-3xl flex flex-col justify-center">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Tiến độ bài kiểm tra
                </span>
                <span className="text-sm text-gray-500">
                  {progress} câu hỏi đã trả lời
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((progress / 40) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <PlacementQuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              isLoading={isLoading}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}
