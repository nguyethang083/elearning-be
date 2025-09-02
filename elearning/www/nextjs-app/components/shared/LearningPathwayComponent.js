"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  BookOpen,
  Target,
  ChevronRight,
  Circle,
  Lock,
} from "lucide-react";

const LearningPathwayComponent = ({
  chapters,
  onChapterStart,
  showEncouragement = false,
  variant = "default", // "default" | "analysis"
}) => {
  // Auto-expand the first chapter only when showing encouragement
  const [expandedChapter, setExpandedChapter] = useState(
    showEncouragement && chapters.length > 0 ? chapters[0].id : null
  );

  const toggleChapter = (id) => {
    if (expandedChapter === id) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(id);
    }
  };

  const getStatusIcon = (status, isLocked = false) => {
    if (isLocked) {
      return <Lock className="h-5 w-5 text-gray-400" />;
    }

    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <Circle className="h-5 w-5 text-blue-500 fill-blue-100" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStatusBadge = (status, isLocked = false) => {
    if (variant === "analysis") {
      if (isLocked) {
        return (
          <Badge className="bg-gray-100 text-gray-600 border border-gray-200">
            Chưa mở khoá
          </Badge>
        );
      }

      switch (status) {
        case "completed":
          return (
            <Badge className="bg-green-100 text-green-800 border border-green-200">
              Hoàn thành
            </Badge>
          );
        case "in-progress":
          return (
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              Đang học
            </Badge>
          );
        default:
          return (
            <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
              Chưa bắt đầu
            </Badge>
          );
      }
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Encouragement message for first chapter - only in placement test variant */}
      {showEncouragement && chapters.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              Bắt đầu hành trình học tập của bạn!
            </h3>
          </div>
          <p className="text-gray-600 mb-3">
            Chúng tôi khuyến khích bạn bắt đầu với{" "}
            <strong>{chapters[0].name}</strong> - đây là nền tảng quan trọng cho
            việc học toán.
          </p>
          <div className="flex items-center space-x-4">
            {chapters[0].is_unlocked === false ? (
              <Button
                disabled
                className="bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
              >
                Chưa mở khoá
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (onChapterStart) {
                    onChapterStart(chapters[0]);
                  }
                }}
              >
                Bắt đầu ngay
              </Button>
            )}
          </div>
        </div>
      )}

      {chapters.map((chapter, index) => (
        <div
          key={chapter.id}
          className={`border rounded-lg overflow-hidden ${
            showEncouragement && index === 0
              ? "border-green-300 shadow-lg"
              : "border-gray-200"
          }`}
        >
          <div
            className={`flex items-center justify-between p-4 cursor-pointer ${
              expandedChapter === chapter.id ? "bg-gray-50" : "bg-white"
            } ${showEncouragement && index === 0 ? "bg-green-50" : ""}`}
            onClick={() => toggleChapter(chapter.id)}
          >
            <div className="flex items-center">
              {getStatusIcon(chapter.status, chapter.is_unlocked === false)}
              <span
                className={`ml-3 font-medium ${
                  showEncouragement && index === 0
                    ? "text-green-800 font-semibold"
                    : chapter.is_unlocked === false
                    ? "text-gray-500"
                    : ""
                }`}
              >
                {chapter.name}
              </span>
              {showEncouragement && index === 0 && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Được khuyến nghị
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(chapter.status, chapter.is_unlocked === false)}
              {(chapter.mastery_percentage !== undefined ||
                chapter.progress !== undefined) && (
                <div className="flex items-center">
                  {(() => {
                    const masteryPercent =
                      chapter.mastery_percentage !== undefined
                        ? chapter.mastery_percentage
                        : chapter.progress;
                    return (
                      <>
                        <div className="w-12 h-2 bg-gray-200 rounded-full mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              masteryPercent >= 80
                                ? "bg-green-500"
                                : masteryPercent >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.max(masteryPercent, 2)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">
                          {masteryPercent}%
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
              <ChevronRight
                className={`h-5 w-5 transition-transform ${
                  expandedChapter === chapter.id ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>
          {expandedChapter === chapter.id && (
            <div className="p-4 border-t bg-gray-50">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Tổng quan chương</h3>
                <p className="text-sm text-gray-600">{chapter.description}</p>

                {/* Mastery Progress Bar */}
                {(chapter.mastery_percentage !== undefined ||
                  chapter.progress !== undefined) && (
                  <div className="mt-3">
                    {(() => {
                      const masteryPercent =
                        chapter.mastery_percentage !== undefined
                          ? chapter.mastery_percentage
                          : chapter.progress;
                      return (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Mức độ thành thạo
                            </span>
                            <span className="text-sm text-gray-600">
                              {masteryPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                masteryPercent >= 80
                                  ? "bg-green-500"
                                  : masteryPercent >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.max(masteryPercent, 2)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {chapter.mastery_level === "strong" &&
                              "🎯 Thành thạo cao"}
                            {chapter.mastery_level === "partial" &&
                              "📚 Cần luyện tập thêm"}
                            {chapter.mastery_level === "weak" &&
                              "🔰 Cần học từ đầu"}
                            {!chapter.mastery_level &&
                              masteryPercent >= 80 &&
                              "🎯 Thành thạo cao"}
                            {!chapter.mastery_level &&
                              masteryPercent >= 50 &&
                              masteryPercent < 80 &&
                              "📚 Cần luyện tập thêm"}
                            {!chapter.mastery_level &&
                              masteryPercent > 0 &&
                              masteryPercent < 50 &&
                              "🔰 Cần học từ đầu"}
                            {!chapter.mastery_level &&
                              masteryPercent === 0 &&
                              "⭕ Chưa đánh giá"}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {variant === "default" && (
                  <div className="mt-4">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm">
                        {chapter.topics?.length || 0} Bài học
                      </span>
                    </div>
                  </div>
                )}
                {variant === "analysis" && (
                  <div className="mt-4">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm">
                        {chapter.topics?.length || 0} Bài học
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Các bài học</h3>
                <div className="space-y-2">
                  {chapter.topics?.map((topic, topicIndex) => (
                    <div
                      key={topicIndex}
                      className="flex items-center justify-between bg-white p-2 rounded border"
                    >
                      <div className="flex items-center">
                        {getStatusIcon(topic.status)}
                        <span className="ml-2 text-sm">{topic.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {chapter.status === "completed" ? (
                    <Button variant="outline" className="bg-transparent">
                      Ôn tập chương
                    </Button>
                  ) : chapter.status === "in-progress" ? (
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Tiếp tục học
                    </Button>
                  ) : chapter.is_unlocked === false ? (
                    <Button
                      disabled
                      className="bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                    >
                      Chưa mở khoá
                    </Button>
                  ) : (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onChapterStart) {
                          onChapterStart(chapter);
                        }
                      }}
                    >
                      Bắt đầu chương
                    </Button>
                  )}
                </div>
                {variant === "default" && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Làm bài kiểm tra
                    </Button>
                    {chapter.testScore && (
                      <Badge className="bg-green-100 text-green-800 border border-green-200">
                        Điểm: {chapter.testScore}%
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LearningPathwayComponent;
