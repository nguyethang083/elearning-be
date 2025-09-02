import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { getKnowledgeConstellation } from "@/pages/api/helper";
import KnowledgeConstellation from "./learn/KnowledgeConstellation";

// Simple localStorage key for tutorial mode
const TUTORIAL_KEY = "dashboard_tutorial_done";

const DashboardContent = ({ user }) => {
  const router = useRouter();

  // Knowledge constellation data
  const [constellationData, setConstellationData] = useState(null);
  const [constellationLoading, setConstellationLoading] = useState(true);
  const [constellationError, setConstellationError] = useState(null);

  // Mock data
  const leaderboardData = [
    { id: 1, name: user?.name || "Tony Adam", points: 8966, rank: "1ST" },
    {
      id: 2,
      name: "Nguyễn Minh Anh",
      points: 7550,
      rank: "2ND",
      initials: "JM",
    },
    { id: 3, name: "Dương Huy Lân", points: 7230, rank: "3RD", initials: "HL" },
    { id: 4, name: "Nguyễn Văn Tú", points: 6980, rank: "4TH", initials: "MS" },
  ];

  const lessonsProgress = [
    { id: 1, name: "Lũy thừa, căn và logarit", progress: 55 },
    { id: 2, name: "Hình học và tư duy không gian", progress: 75 },
    { id: 3, name: "Lý thuyết số", progress: 70 },
    { id: 4, name: "Hàm số và phương trình", progress: 90 },
  ];

  // Performance data for tabs
  const [activeTab, setActiveTab] = useState("points");

  // Tutorial mode state
  const [tutorialMode, setTutorialMode] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get first name
  const firstName = user?.name ? user.name.split(" ")[0] : "Tony";

  // Check if tutorial should be shown (first time only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(TUTORIAL_KEY);
      if (!done) {
        setTutorialMode(true);
        setShowTooltip(true);
      }
    }
  }, []);

  // Load constellation data
  useEffect(() => {
    loadConstellationData();
  }, []);

  const loadConstellationData = async () => {
    try {
      setConstellationLoading(true);
      const response = await getKnowledgeConstellation();

      // Transform API response into the format KnowledgeConstellation expects
      if (response && Array.isArray(response.message)) {
        const transformedData = response.message.map((topic) => ({
          topic_id: topic.topic_id,
          topic_name: topic.topic_name,
          description: topic.description,
          weakness_score: topic.weakness_score || 0,
          is_unlocked: topic.is_unlocked, // <-- include unlock status
          components: {
            accuracy: topic.components?.accuracy || 0,
            pacing: topic.components?.pacing || 0,
            decay: topic.components?.decay || 0,
          },
          last_updated: topic.last_updated,
        }));
        setConstellationData(transformedData);
      } else {
        console.error("Invalid response format:", response);
        setConstellationError("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error loading constellation data:", err);
      setConstellationError(
        "Failed to load your learning pathway. Please try again later."
      );
    } finally {
      setConstellationLoading(false);
    }
  };

  const handleTopicClick = (topicId) => {
    router.push(`/learn/${topicId}`);
  };

  // Handler for finishing tutorial (when user clicks 'Bắt đầu ngay')
  const handleStartTest = (e) => {
    if (tutorialMode) {
      localStorage.setItem(TUTORIAL_KEY, "1");
      setTutorialMode(false);
      setShowTooltip(false);
    }
    // Allow navigation
  };

  return (
    <div className="h-full relative">
      {/* Overlay for tutorial mode */}
      {tutorialMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 pointer-events-auto transition-opacity" />
      )}

      {/* Greeting section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Hello, <span className="text-indigo-600">{firstName}</span>{" "}
          <span className="text-amber-400">👋</span>
        </h1>
        <p className="text-gray-600 text-sm">Hãy học điều gì đó mới hôm nay!</p>
      </div>

      {/* Learning cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* Skill Assessment - Highlighted in tutorial mode */}
        <div
          className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative ${
            tutorialMode ? "z-50" : ""
          }`}
        >
          <div className="p-4 flex items-start space-x-4">
            <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/images/skill1.jpg"
                alt="Skill Assessment"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow relative">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">
                Đánh giá kỹ năng
              </h3>
              <p className="text-xs text-gray-500 mb-2.5">
                Đánh giá nhanh chóng kiến thức hiện tại của bạn
              </p>
              <Link
                href="/test"
                className={`inline-block whitespace-nowrap text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition relative ${
                  tutorialMode ? "z-50 cursor-pointer hover:shadow-lg" : ""
                }`}
                style={
                  tutorialMode
                    ? { pointerEvents: "auto", cursor: "pointer" }
                    : {}
                }
                onClick={tutorialMode ? handleStartTest : undefined}
                tabIndex={0}
              >
                Bắt đầu ngay
              </Link>
            </div>
          </div>
          {/* Highlight border for tutorial mode */}
          {tutorialMode && (
            <div
              className="absolute inset-0 border-4 border-indigo-400 rounded-xl pointer-events-none animate-pulse z-40"
              style={{ boxShadow: "0 0 0 8px rgba(99,102,241,0.15)" }}
            />
          )}
        </div>

        {/* Today's Review - Always shown but dimmed in tutorial */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
          <div className="p-4 flex items-start space-x-4">
            <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/images/skill2.jpg"
                alt="Today's Review"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">
                Đánh giá hôm nay
              </h3>
              <p className="text-xs text-gray-500 mb-2.5">
                Flashcards sẵn sàng thông qua phương pháp lập trình học tập
              </p>
              <Link
                href="/learn"
                className="inline-block whitespace-nowrap text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-100 transition"
              >
                Đánh giá ngay
              </Link>
            </div>
          </div>
        </div>

        {/* Topic Practice - Always shown but dimmed in tutorial */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
          <div className="p-4 flex items-start space-x-4">
            <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/images/skill3.jpg"
                alt="Topic Practice"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">
                Làm bài tập chủ đề
              </h3>
              <p className="text-xs text-gray-500 mb-2.5">
                Bài tập cho chủ đề Toán lớp 9
              </p>
              <button className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition">
                Làm bài tập ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Constellation Section - Compact version */}
      {(constellationLoading ||
        constellationError ||
        (constellationData &&
          constellationData.filter((t) => t.is_unlocked).length > 0)) && (
        <div
          className={`bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6 ${
            tutorialMode ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-1">
                🌟 Chòm Sao Tri Thức
              </h2>
              <p className="text-xs text-gray-500">
                Tổng quan về điểm yếu học tập của bạn
              </p>
            </div>
            <Link
              href="/my-pathway"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Xem chi tiết →
            </Link>
          </div>

          {constellationLoading ? (
            <div className="h-48 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-400 mx-auto mb-2"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs">🌟</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Đang tải chòm sao tri thức...
                </p>
              </div>
            </div>
          ) : constellationError ? (
            <div className="h-48 flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 rounded-lg">
              <div className="text-center">
                <div className="text-red-400 text-2xl mb-2">💥</div>
                <p className="text-xs text-gray-600 mb-2">
                  {constellationError}
                </p>
                <button
                  onClick={loadConstellationData}
                  className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  🔄 Thử lại
                </button>
              </div>
            </div>
          ) : constellationData ? (
            <div className="relative h-48 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg overflow-hidden">
              <KnowledgeConstellation
                data={constellationData}
                onTopicClick={handleTopicClick}
                compact={true} // Add a prop to indicate this is the compact dashboard version
              />
              {/* Compact stats overlay */}
              <div className="absolute top-2 left-2 bg-white bg-opacity-90 backdrop-blur-sm rounded px-2 py-1 text-gray-800 text-xs border border-gray-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span>Tổng:</span>
                    <span className="font-semibold text-blue-600">
                      {constellationData.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔥 Khẩn cấp:</span>
                    <span className="font-semibold text-red-600">
                      {
                        constellationData.filter(
                          (t) => t.weakness_score >= 0.75
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Leaderboard and Performance in same row */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 ${
          tutorialMode ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* Leaderboard section */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-medium uppercase text-gray-400">
              BẢNG XẾP HẠNG
            </h2>
            <button className="text-blue-400 hover:text-blue-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <h3 className="text-lg font-bold mb-6 text-center text-indigo-600">
            Điểm cao nhất
          </h3>

          {/* First place user */}
          <div className="mb-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={64}
                      height={64}
                      className="object-cover"
                      unoptimized={user.avatar.includes(
                        "googleusercontent.com"
                      )}
                    />
                  ) : (
                    <Image
                      src="/images/student_image.png"
                      alt="Tony Adam"
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="absolute -right-1 -bottom-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Image
                      src="/images/badge.png"
                      alt="First Place"
                      width={20}
                      height={20}
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-indigo-600">
                {user?.name || "Tony Adam"}
              </h4>
              <p className="text-md font-bold text-indigo-600">
                {leaderboardData[0].points.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Other users */}
          <div className="space-y-3">
            {leaderboardData.slice(1).map((leader, index) => (
              <div
                key={leader.id}
                className="flex items-center justify-between text-gray-800"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold w-7 text-gray-500">
                    {leader.rank}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs text-gray-500">
                      <span className="text-xs">{leader.initials}</span>
                    </div>
                    <span className="text-sm">{leader.name}</span>
                  </div>
                </div>
                <span className="font-semibold text-sm">
                  {leader.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance section */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Hiệu suất
          </h2>

          <div className="flex space-x-3 mb-6">
            <button
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                activeTab === "points"
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setActiveTab("points")}
            >
              Tiến độ điểm
            </button>
            <button
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                activeTab === "monthly"
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setActiveTab("monthly")}
            >
              Tháng
            </button>
          </div>

          {/* Circular Progress */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
              {/* Circular progress background */}
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <linearGradient
                    id="progressGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  strokeDasharray="283"
                  strokeDashoffset="45"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="283"
                    to="45"
                    dur="1.5s"
                    begin="0s"
                    fill="freeze"
                    calcMode="spline"
                    keySplines="0.42 0 0.58 1"
                  />
                </circle>
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">8,966</span>
                <span className="text-xs text-gray-500">Điểm của bạn</span>
              </div>
            </div>

            {/* Additional info */}
            <div className="mt-4 text-center">
              <span className="text-sm text-green-600 font-medium flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
                21% từ tháng trước
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My lessons */}
      <div
        className={`bg-white rounded-xl shadow-sm p-5 border border-gray-100 ${
          tutorialMode ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-gray-800 mb-5">
          Bài học của tôi
        </h2>

        <div className="space-y-4">
          {lessonsProgress.map((lesson) => (
            <div key={lesson.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-700">{lesson.name}</span>
                <span className="font-medium text-gray-800">
                  {lesson.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className={`h-1 rounded-full ${
                    lesson.name.includes("Hình học")
                      ? "bg-pink-500"
                      : lesson.name.includes("Lũy thừa")
                      ? "bg-blue-500"
                      : lesson.name.includes("Số học")
                      ? "bg-indigo-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${lesson.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-right mt-4">
          <button className="text-gray-400 hover:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
