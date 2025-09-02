"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import LearningPathwayComponent from "@/components/shared/LearningPathwayComponent";
import { useTopics } from "@/hooks/useTopics";

export default function PersonalizedPathway({
  sessionId,
  testResult,
  onBackToWelcome,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pathwayData, setPathwayData] = useState(null);
  // Extract studentId from testResult
  const studentId = testResult?.session_id || sessionId;

  useEffect(() => {
    const fetchPlacementData = async () => {
      try {
        if (!studentId) {
          throw new Error("Không tìm thấy thông tin phiên test");
        }
        const response = await fetch(
          `/api/method/elearning.elearning.doctype.test.learning_pathway.get_learning_pathway?session_id=${studentId}`
        );
        if (!response.ok) {
          throw new Error(`Failed to generate pathway: ${response.status}`);
        }
        const result = await response.json();
        if (result.message) {
          setPathwayData(result.message);
          setLoading(false);
        } else {
          throw new Error("Invalid placement data received");
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
      fetchPlacementData();
  }, [studentId]);

  // Helper function for topic descriptions
  const getTopicDescription = (topicId) => {
    const descriptions = {
      1: "Nắm vững các khái niệm cơ bản về phương trình bậc nhất và hệ phương trình - nền tảng cho tất cả các chủ đề khác",
      2: "Học cách giải và chứng minh bất đẳng thức - tiếp theo từ phương trình bậc nhất",
      3: "Nắm vững các phép toán với căn thức - phát triển từ kiến thức phương trình cơ bản",
      4: "Tìm hiểu về hệ thức lượng trong tam giác vuông - ứng dụng phương trình trong hình học",
      5: "Khám phá các tính chất của đường tròn - xây dựng từ kiến thức tam giác vuông",
      6: "Tìm hiểu về xác suất và các phương pháp thống kê cơ bản - ứng dụng độc lập",
      7: "Nắm vững hàm số bậc hai y = ax² và phương trình bậc hai - phát triển từ bất đẳng thức",
      8: "Học về đường tròn ngoại tiếp và nội tiếp - nâng cao từ kiến thức đường tròn",
      9: "Khám phá đa giác đều - ứng dụng cao cấp của đường tròn ngoại tiếp và nội tiếp",
      10: "Hình học trực quan và không gian - ứng dụng thực tế từ kiến thức cơ bản",
    };
    return (
      descriptions[String(topicId)] ||
      "Học các khái niệm cơ bản và nâng cao kỹ năng giải toán."
    );
  };

  const handleChapterStart = useCallback(
    (chapter) => {
      // Check if chapter is unlocked
      if (chapter.is_unlocked === false) {
        // Don't allow starting locked chapters
        return;
      }

      // Navigate to /learn/X and open Tổng quan modal
      const topicId = chapter.id;
      router.push(`/learn/${topicId}?openOverview=true`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tạo lộ trình học tập cá nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <p className="text-red-600 mb-4">Có lỗi xảy ra: {error}</p>
          <Button
            onClick={onBackToWelcome}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  if (!pathwayData) return null;

  // Helper function for topic descriptions
    const getMockTopicsForChapter = (chapterId, progress) => {
      const mockTopicsMap = {
        1: [
          {
            name: "Phương trình bậc nhất một ẩn",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Hệ phương trình bậc nhất hai ẩn",
            status:
              progress >= 50
                ? "completed"
                : progress >= 20
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Giải bài toán bằng cách lập phương trình",
            status: progress >= 80 ? "completed" : "not-started",
          },
          {
            name: "Ứng dụng thực tế",
            status: progress >= 90 ? "completed" : "not-started",
          },
        ],
        2: [
          {
            name: "Khái niệm bất đẳng thức",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Bất phương trình bậc nhất",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Hệ bất phương trình",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        3: [
          {
            name: "Khái niệm căn bậc hai",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Phép toán với căn thức",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Rút gọn biểu thức chứa căn",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        4: [
          {
            name: "Tỉ số lượng giác của góc nhọn",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Hệ thức lượng trong tam giác vuông",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Ứng dụng thực tế",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        5: [
          {
            name: "Phương trình đường tròn",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Vị trí tương đối của đường thẳng và đường tròn",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Góc nội tiếp và góc ở tâm",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        6: [
          {
            name: "Bảng tần số và biểu đồ",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Số trung bình và trung vị",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Xác suất của biến cố",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        7: [
          {
            name: "Hàm số bậc hai y = ax²",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Đồ thị hàm số y = ax²",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Phương trình bậc hai",
            status: progress >= 80 ? "completed" : "not-started",
          },
          {
            name: "Định lý Viète",
            status: progress >= 90 ? "completed" : "not-started",
          },
        ],
        8: [
          {
            name: "Đường tròn ngoại tiếp tam giác",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Đường tròn nội tiếp tam giác",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Tứ giác nội tiếp",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        9: [
          {
            name: "Khái niệm đa giác đều",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Diện tích đa giác đều",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Đường tròn ngoại tiếp và nội tiếp đa giác đều",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
        10: [
          {
            name: "Hình khối cơ bản",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Thể tích và diện tích bề mặt",
            status: progress >= 50 ? "completed" : "not-started",
          },
          {
            name: "Ứng dụng trong thực tế",
            status: progress >= 80 ? "completed" : "not-started",
          },
        ],
      };
      return (
        mockTopicsMap[chapterId] || [
          {
            name: "Khái niệm cơ bản",
            status:
              progress >= 70
                ? "completed"
                : progress >= 30
                ? "in-progress"
                : "not-started",
          },
          {
            name: "Bài tập thực hành",
            status: progress >= 50 ? "completed" : "not-started",
          },
        ]
      );
    };

  // Merge backend chapters with mock topics and description
  // Debug: log pathwayData to console
  if (pathwayData) {
    // eslint-disable-next-line no-console
    console.log("DEBUG pathwayData:", pathwayData);
  }
  // Use chapters array from get_learning_pathway response
  let chapters = Array.isArray(pathwayData?.pathway)
    ? pathwayData.pathway.map((chapter) => {
        // Use mastery_weight percent for progress bar
        const percent = Math.round((chapter.mastery_weight || 0) / 10);
      return {
          ...chapter,
          progress: percent, // for progress bar UI
          percent, // for pie chart or percent display
          topics: getMockTopicsForChapter(chapter.id, percent),
          description: getTopicDescription(chapter.id),
        };
      })
    : [];
  // Sort chapters numerically by topic id (always 1-10)
  if (chapters.length > 0) {
    chapters = chapters
      .slice()
      .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  }

  return (
    <div
      className="font-sans"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-8 py-8 text-gray-800">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-2">
                    Lộ trình học tập cá nhân
                  </h1>
                  <p className="text-gray-600">
                    Dựa trên kết quả đánh giá năng lực của bạn
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Path Content */}
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Lộ trình học tập được đề xuất
                </h2>
                <p className="text-gray-600">
                  Dựa trên kết quả đánh giá của bạn (trình độ{" "}
                  {pathwayData.overall_level}), chúng tôi đã tạo một lộ trình
                  học tập cá nhân để giúp bạn đạt được mục tiêu.
                </p>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Không có chủ đề nào trong lộ trình học tập. Vui lòng kiểm tra
                  lại kết quả đánh giá hoặc liên hệ hỗ trợ.
                </div>
              ) : (
              <LearningPathwayComponent
                chapters={chapters}
                onChapterStart={handleChapterStart}
                showEncouragement={true}
                variant="default"
              />
              )}

              {/* Action Buttons */}
              <div className="flex justify-center mt-8 pt-6 border-t">
                <Button
                  onClick={onBackToWelcome}
                  className="py-4 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Về Trang chủ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
