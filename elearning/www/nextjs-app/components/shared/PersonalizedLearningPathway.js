"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Target,
  CheckCircle,
  Lock,
  Unlock,
  AlertCircle,
  Trophy,
  Clock,
} from "lucide-react";

const PersonalizedLearningPathway = ({
  pathwayData,
  onTopicStart,
  showEncouragement = true,
}) => {
  const [expandedPhases, setExpandedPhases] = useState(new Set([0])); // Expand first phase by default

  if (!pathwayData || !pathwayData.pathway) {
    return <div>No pathway data available</div>;
  }

  const togglePhase = (phaseIndex) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseIndex)) {
      newExpanded.delete(phaseIndex);
    } else {
      newExpanded.add(phaseIndex);
    }
    setExpandedPhases(newExpanded);
  };

  const getMasteryColor = (masteryLevel) => {
    switch (masteryLevel) {
      case "weak":
        return "bg-red-100 text-red-800 border-red-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "strong":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "learn":
        return <BookOpen className="w-4 h-4" />;
      case "practice":
        return <Target className="w-4 h-4" />;
      case "review":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "learn":
        return "text-red-600";
      case "practice":
        return "text-yellow-600";
      case "review":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getPhaseIcon = (phaseType) => {
    switch (phaseType) {
      case "learn":
        return "📚";
      case "practice":
        return "💪";
      case "review":
        return "✅";
      default:
        return "📖";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            📊 Tổng quan lộ trình
          </h3>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {pathwayData.overall_level}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {pathwayData.studyPlan?.weakTopics || 0}
            </div>
            <div className="text-sm text-gray-600">Cần học lại</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {pathwayData.studyPlan?.partialTopics || 0}
            </div>
            <div className="text-sm text-gray-600">Cần luyện tập</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {pathwayData.studyPlan?.strongTopics || 0}
            </div>
            <div className="text-sm text-gray-600">Đã thành thạo</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {pathwayData.studyPlan?.progressOverview}
        </div>
      </div>

      {/* Learning Phases */}
      {pathwayData.pathway.map((phase, phaseIndex) => {
        const isExpanded = expandedPhases.has(phaseIndex);
        const phaseIcon = getPhaseIcon(phase.phase_type);

        return (
          <div
            key={phase.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Phase Header */}
            <div
              className={`p-6 cursor-pointer transition-colors ${
                isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
              onClick={() => togglePhase(phaseIndex)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{phaseIcon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {phase.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {phase.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {phase.topics.length} chủ đề
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <span className="text-gray-400">Thu gọn ▲</span>
                  ) : (
                    <span className="text-gray-400">Xem chi tiết ▼</span>
                  )}
                </div>
              </div>
            </div>

            {/* Phase Content */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                <div className="p-6 space-y-4">
                  {phase.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`p-4 rounded-lg border transition-all ${
                        topic.is_unlocked
                          ? "border-gray-200 bg-white hover:shadow-md"
                          : "border-gray-100 bg-gray-50 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`${getActionColor(topic.action)}`}>
                              {getActionIcon(topic.action)}
                            </div>
                            <h4 className="font-semibold text-gray-800">
                              {topic.name}
                            </h4>
                            {!topic.is_unlocked && (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-3">
                            {topic.description}
                          </p>

                          <div className="flex items-center space-x-3">
                            <Badge
                              variant="outline"
                              className={getMasteryColor(topic.mastery_level)}
                            >
                              {topic.mastery_level === "weak" && "🔴 Yếu"}
                              {topic.mastery_level === "partial" &&
                                "🟡 Trung bình"}
                              {topic.mastery_level === "strong" && "🟢 Mạnh"}
                            </Badge>

                            <div className="text-sm text-gray-500">
                              Điểm: {topic.score}/1000
                            </div>

                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    topic.mastery_level === "weak"
                                      ? "bg-red-400"
                                      : topic.mastery_level === "partial"
                                      ? "bg-yellow-400"
                                      : "bg-green-400"
                                  }`}
                                  style={{ width: `${topic.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            size="sm"
                            disabled={!topic.is_unlocked}
                            onClick={() => onTopicStart && onTopicStart(topic)}
                            className={`${
                              topic.is_unlocked
                                ? topic.action === "learn"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : topic.action === "practice"
                                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {topic.is_unlocked ? (
                              <>
                                {topic.action === "learn" && "Học ngay"}
                                {topic.action === "practice" && "Luyện tập"}
                                {topic.action === "review" && "Ôn tập"}
                              </>
                            ) : (
                              "Đã khóa"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Encouragement Message */}
      {showEncouragement && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-start space-x-3">
            <Trophy className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h4 className="font-bold text-gray-800 mb-2">
                🎯 Lời khuyên học tập
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  • <strong>Học tuần tự:</strong> Hoàn thành các chủ đề theo thứ
                  tự được đề xuất để đảm bảo nền tảng vững chắc.
                </p>
                <p>
                  • <strong>Luyện tập thường xuyên:</strong> Các chủ đề màu vàng
                  cần được luyện tập đều đặn để củng cố kiến thức.
                </p>
                <p>
                  • <strong>Ôn tập định kỳ:</strong> Các chủ đề màu xanh nên
                  được ôn lại để duy trì độ thành thạo.
                </p>
                <p>
                  • <strong>Kiên trì:</strong> Học tập là một quá trình, hãy
                  kiên nhẫn và học một cách có hệ thống!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedLearningPathway;
