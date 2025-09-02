"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";
import { studentPerformanceData } from "@/lib/analysis-data";
import SpiderChart from "@/components/analysis/SpiderChart";
import PerformanceTrend from "@/components/analysis/PerformanceTrend";
import KnowledgeGaps from "@/components/analysis/KnowledgeGaps";
import RecommendedActions from "@/components/analysis/RecommendedAction";
import LearningPathwayComponent from "@/components/shared/LearningPathwayComponent";

export default function AnalysisPage() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pathwayData, setPathwayData] = useState(null);
  const [pathwayLoading, setPathwayLoading] = useState(true);
  const [pathwayError, setPathwayError] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);

  // Handle chapter start navigation
  const handleChapterStart = (chapter) => {
    // Check if chapter is unlocked
    if (chapter.is_unlocked === false) {
      // Don't allow starting locked chapters
      return;
    }

    // Navigate to /learn/X and open Tổng quan modal (same as placement test)
    const topicId = chapter.id;
    router.push(`/learn/${topicId}?openOverview=true`);
  };

  useEffect(() => {
    // Simulate API call to fetch student data
    const fetchData = async () => {
      setLoading(true);
      setTimeout(() => {
        setStudentData(studentPerformanceData);
        setLoading(false);
      }, 500);
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Fetch personalized pathway from backend DocType
    const fetchPathway = async () => {
      setPathwayLoading(true);
      setPathwayError(null);
      try {
        const res = await fetch(
          "/api/method/elearning.elearning.doctype.test.learning_pathway.get_latest_student_pathway_snapshot"
        );
        const data = await res.json();
        if (data.message) {
          setPathwayData(data.message);
        } else {
          setPathwayError("Không lấy được dữ liệu lộ trình học tập");
        }
      } catch (err) {
        setPathwayError(err.message);
      } finally {
        setPathwayLoading(false);
      }
    };
    fetchPathway();
  }, []);

  useEffect(() => {
    // Fetch performance trend from backend
    const fetchTrend = async () => {
      setTrendLoading(true);
      setTrendError(null);
      try {
        const res = await fetch(
          "/api/method/elearning.elearning.doctype.test.analysis_processor.get_performance_trend"
        );
        const data = await res.json();
        console.log("Trend data fetched:", data);
        if (data.message) {
          setTrendData(data.message);
        } else {
          setTrendError("Không lấy được dữ liệu xu hướng");
        }
      } catch (err) {
        setTrendError(err.message);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrend();
  }, []);

  // --- Helper functions for topic descriptions and mock topics ---
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

  // --- Map pathwayData to include mock topics and descriptions ---
  let mappedChapters = [];
  if (pathwayData && Array.isArray(pathwayData.pathway)) {
    mappedChapters = pathwayData.pathway.map((chapter) => {
      const percent = Math.round((chapter.mastery_weight || 0) / 10);
      return {
        ...chapter,
        progress: percent,
        percent,
        topics: getMockTopicsForChapter(chapter.id, percent),
        description: getTopicDescription(chapter.id),
      };
    });
    mappedChapters = mappedChapters
      .slice()
      .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  }

  if (loading || !studentData || pathwayLoading || trendLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (pathwayError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg">
          Lỗi khi lấy lộ trình học tập: {pathwayError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">
          Phân tích kết quả học tập
        </h1>
        <div className="flex items-center space-x-4">
          <Tabs defaultValue="skills" className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="skills">Kỹ năng</TabsTrigger>
              <TabsTrigger value="progress">Tiến độ</TabsTrigger>
              <TabsTrigger value="recommendations">Đề xuất</TabsTrigger>
            </TabsList>
          </Tabs>
          <select
            className="border rounded-md p-2 text-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="current">Giai đoạn hiện tại</option>
            <option value="lastMonth">Tháng trước</option>
            <option value="lastQuarter">Quý trước</option>
            <option value="lastYear">Năm trước</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ Kỹ năng */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Đánh giá kỹ năng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <SpiderChart data={studentData.skillsData} />
            </div>
          </CardContent>
        </Card>

        {/* Tổng kết hiệu suất */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Tổng kết hiệu suất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Tiến độ tổng thể</span>
                  <span className="text-sm font-medium">
                    {studentData.overallProgress}%
                  </span>
                </div>
                <Progress value={studentData.overallProgress} className="h-2" />
              </div>

              {studentData.skillsData.categories.map((category, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-sm font-medium">
                      {studentData.skillsData.currentPeriod[index]}%
                    </span>
                  </div>
                  <Progress
                    value={studentData.skillsData.currentPeriod[index]}
                    className={`h-2 ${
                      studentData.skillsData.currentPeriod[index] < 50
                        ? "bg-red-200"
                        : studentData.skillsData.currentPeriod[index] < 70
                        ? "bg-yellow-200"
                        : "bg-green-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lộ trình học tập cá nhân hóa - use the exact same component as placement test */}
      <Card className="my-6">
        <CardHeader>
          <CardTitle className="text-xl font-sora">
            Lộ trình học tập cá nhân hóa
          </CardTitle>
          <CardDescription>
            Theo dõi tiến trình học và tập trung vào những gì cần học tiếp theo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappedChapters.length > 0 ? (
            <LearningPathwayComponent
              chapters={mappedChapters}
              variant="analysis"
              showEncouragement={false}
              onChapterStart={handleChapterStart}
            />
          ) : (
            <div className="text-gray-500">
              Không có dữ liệu lộ trình học tập.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Tabs defaultValue="performance-trend">
          <TabsList className="mb-4">
            <TabsTrigger value="performance-trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="knowledge-gaps">Lỗ hổng kiến thức</TabsTrigger>
            <TabsTrigger value="recommended-actions">
              Hành động đề xuất
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance-trend">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Xu hướng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PerformanceTrend
                    data={trendData || studentData.performanceTrend}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge-gaps">
            <KnowledgeGaps data={studentData.knowledgeGaps} />
          </TabsContent>

          <TabsContent value="recommended-actions">
            <RecommendedActions data={studentData.recommendedActions} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl   text-blue-600">
              Cần cải thiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {studentData.areasForImprovement.map((area, index) => (
                <div
                  key={index}
                  className="border-l-4 border-red-400 pl-4 py-2"
                >
                  <h3 className="font-medium text-lg mb-2">
                    Gặp khó khăn: {area.title}
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {area.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-gray-600 mb-1">
                      Nên tập trung vào:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {area.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="mr-2 font-medium text-sm">
                        Mức độ thành thạo:
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= area.masteryLevel
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Luyện tập ngay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl   text-green-600">Thế mạnh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {studentData.strengths.map((strength, index) => (
                <div
                  key={index}
                  className="border-l-4 border-green-400 pl-4 py-2"
                >
                  <h3 className="font-medium text-lg mb-2">
                    Nổi bật: {strength.title}
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {strength.skills.map((skill, i) => (
                      <li key={i}>{skill}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="mr-2 font-medium text-sm">
                        Mức độ thành thạo:
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= strength.masteryLevel
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Luyện tập nâng cao
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
