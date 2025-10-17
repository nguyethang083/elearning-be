"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import TopicsSection from "@/components/test/topics-section";
import PracticeTestList from "@/components/test/practice-test-list";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useTopics } from "@/hooks/useTopics";
import { getModeFromUrl, getUrlForMode } from "@/lib/utils";

export default function PerformanceSection({ userData }) {
  const router = useRouter();
  const { mode: modeFromUrl, topicId: topicIdFromUrl } = router.query;
  const [selectedGrade, setSelectedGrade] = useState("9");
  const [selectedMode, setSelectedMode] = useState("Topics");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [mathLevel, setMathLevel] = useState(userData.mathLevel);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedTopicName, setSelectedTopicName] = useState(null);

  // Add a new state to track whether to show tests for a topic
  const [showTopicTests, setShowTopicTests] = useState(false);

  const {
    topics: allTopics,
    loading: loadingTopics,
    error: topicsError,
  } = useTopics();

  // Sử dụng mảng đối tượng để hiển thị label tiếng Việt, value tiếng Anh
  const testModes = [
    { label: "Luyện tập", value: "Practice Test" },
    { label: "Thi thử", value: "Full Exam Simulation" },
    { label: "Chuyên đề", value: "Topics" },
  ];

  // Set the mode from URL parameter if available
  useEffect(() => {
    const mode = getModeFromUrl(modeFromUrl);
    setSelectedMode(mode);

    // If we have a topicId but no mode, or mode is Topics, treat it as Practice Test mode
    const shouldShowTopicTests =
      mode === "Practice Test" ||
      (topicIdFromUrl && (mode === "Topics" || !modeFromUrl));

    if (shouldShowTopicTests) {
      setShowTopicTests(true);
      if (mode !== "Practice Test") {
        setSelectedMode("Practice Test"); // Ensure mode is set to Practice Test
      }
      if (topicIdFromUrl) {
        setSelectedTopicId(topicIdFromUrl);
        // Find topic by id (which is mapped from name in useTopics)
        if (allTopics && allTopics.length > 0) {
          const selectedTopic = allTopics.find(
            (t) => String(t.id) === String(topicIdFromUrl)
          );
          if (selectedTopic) {
            setSelectedTopicName(selectedTopic.topic_name);
          } else {
            // If topic not found, try to find by name field as fallback
            const topicByName = allTopics.find(
              (t) => String(t.name) === String(topicIdFromUrl)
            );
            if (topicByName) {
              setSelectedTopicName(topicByName.topic_name);
            }
          }
        }
      }
    } else if (mode === "Full Exam Simulation") {
      setShowTopicTests(false);
      setSelectedTopicId(null);
      setSelectedTopicName(null);
    } else {
      setShowTopicTests(false);
      setSelectedTopicId(null);
      setSelectedTopicName(null);
    }
  }, [modeFromUrl, topicIdFromUrl, allTopics]);

  useEffect(() => {
    setMathLevel(userData.mathLevel);
  }, [userData.mathLevel]);

  const handleGradeChange = (value) => {
    setSelectedGrade(value);
  };

  const handleBackToTopics = () => {
    setShowTopicTests(false);
    setSelectedTopicId(null);
    setSelectedTopicName(null);
    router.push("/test");
  };

  const handleModeSelect = (modeValue) => {
    setSelectedMode(modeValue);
    setShowModeDropdown(false);
    setShowTopicTests(false);
    setSelectedTopicId(null);
    setSelectedTopicName(null);
    router.push(getUrlForMode(modeValue));
  };

  const handleTopicSelect = (topic) => {
    if (!topic || !topic.name) return;
    setSelectedTopicId(topic.name);
    setSelectedTopicName(topic.topic_name);
    setShowTopicTests(true);
  };

  return (
    <div id="performance-section" className="mb-8">
      <h3 className="text-xl font-sora font-bold mb-4">Trình độ tổng thể</h3>

      <div className="relative h-8 bg-gray-200 rounded-full mb-6">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-300 to-blue-500 rounded-full"
          style={{ width: `${mathLevel}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full flex items-center justify-center"
          style={{ left: `${mathLevel}%`, transform: "translateX(-50%)" }}
        >
          <div className="bg-teal-500 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold">
            {mathLevel}
          </div>
        </div>

        <div className="absolute top-10 left-0 right-0 flex justify-between text-sm text-gray-500">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>60</span>
          <span>70</span>
          <span>80</span>
          <span>90</span>
          <span>100</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-12">
        <Select value={selectedGrade} onValueChange={handleGradeChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">Lớp 8</SelectItem>
            <SelectItem value="9">Lớp 9</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Button
            id="test-mode-selector"
            variant="outline"
            className="w-full sm:w-[180px] justify-between"
            onClick={() => setShowModeDropdown(!showModeDropdown)}
          >
            {testModes.find((m) => m.value === selectedMode)?.label ||
              "Chọn chế độ"}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>

          {showModeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
              {testModes.map((mode, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleModeSelect(mode.value)}
                >
                  {mode.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        {(selectedMode === "Practice Test" && showTopicTests) ||
        (selectedMode === "Topics" && showTopicTests) ? (
          <button
            className="flex items-center text-blue-600 hover:underline mb-4"
            onClick={handleBackToTopics}
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Quay trở lại Danh sách các chuyên đề</span>
          </button>
        ) : null}
      </div>

      {/* Conditionally render content based on selected mode */}
      <div className="mt-8">
        {selectedMode === "Practice Test" ||
        (selectedMode === "Topics" && showTopicTests) ? (
          <PracticeTestList
            selectedTopicId={selectedTopicId}
            selectedTopicName={selectedTopicName}
            selectedGrade={selectedGrade}
          />
        ) : selectedMode === "Topics" ? (
          <TopicsSection
            topics={allTopics}
            loading={loadingTopics}
            error={topicsError}
            onTopicSelect={handleTopicSelect}
            selectedGrade={selectedGrade}
          />
        ) : (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400 border rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-6">
            {testModes.find((m) => m.value === selectedMode)?.label ||
              selectedMode}{" "}
            đang được cập nhật.
          </div>
        )}
      </div>
    </div>
  );
}
