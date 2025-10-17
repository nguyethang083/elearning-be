import { useEffect, useState } from "react";
import { getKnowledgeConstellation } from "@/pages/api/helper";
import KnowledgeConstellation from "../../components/learn/KnowledgeConstellation";
import { useRouter } from "next/router";

export default function MyPathway() {
  const [constellationData, setConstellationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);
  const [currentView, setCurrentView] = useState('topics'); // Track current view
  const [selectedTopicName, setSelectedTopicName] = useState(''); // Track selected topic name
  const router = useRouter();

  useEffect(() => {
    loadConstellationData();
  }, []);

  const loadConstellationData = async () => {
    try {
      setLoading(true);
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
        setError("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error loading constellation data:", err);
      setError("Failed to load your learning pathway. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topicId) => {
    router.push(`/learn/${topicId}`);
  };

  // Handle view changes from KnowledgeConstellation component
  const handleViewChange = (view, topicData = null) => {
    setCurrentView(view);
    if (view === 'learning-objects' && topicData) {
      setSelectedTopicName(topicData.topic_name || '');
    } else if (view === 'topics') {
      setSelectedTopicName('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-gray-800 text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">🌟</div>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            Đang tải chòm sao tri thức...
          </h2>
          <p className="text-gray-600 text-sm">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-gray-800 text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-6">💥</div>
          <h2 className="text-2xl font-bold mb-4">Oops! Có lỗi xảy ra</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={loadConstellationData}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-3">
            {currentView === 'topics' ? (
              <>🌟 Chòm Sao Tri Thức</>
            ) : (
              <>🌳 Cây Tri Thức - {selectedTopicName}</>
            )}
          </h1>
          <p className="text-gray-600 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
            {currentView === 'topics' ? (
              <>
                Khám phá thiên hà kiến thức cá nhân của bạn. Mỗi ngôi sao đại diện
                cho một chủ đề học tập -
                <span className="text-blue-600 font-semibold">
                  {" "}
                  ngôi sao càng lớn và sáng, càng cần được chinh phục!
                </span>
              </>
            ) : (
              <>
                Khám phá các đối tượng học tập và mối quan hệ giữa chúng trong chủ đề này.
                <span className="text-blue-600 font-semibold">
                  {" "}
                  Nhấp vào từng đỉnh của cây để xem chi tiết và thực hành!
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Legend - Collapsible */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl text-gray-800 text-sm z-20 border border-gray-300 max-w-xs transition-all duration-300">
        {/* Header with toggle button */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 hover:bg-opacity-50 rounded-t-xl transition-colors"
          onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
        >
          <div className="font-bold flex items-center">
            <span className="mr-2">🎯</span>
            Thang đánh giá ưu tiên
          </div>
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isLegendCollapsed ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Collapsible content */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            isLegendCollapsed ? "max-h-0" : "max-h-[500px]"
          }`}
        >
          <div className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg animate-pulse border-2" style={{backgroundColor: '#991b1b', borderColor: '#dc2626'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#991b1b'}}>
                    💀 Cực kỳ khẩn cấp
                  </div>
                  <div className="text-xs text-gray-600">
                    85-100% - Nguy hiểm!
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg animate-pulse border-2" style={{backgroundColor: '#c2410c', borderColor: '#ea580c'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#c2410c'}}>
                    🔥 Rất khẩn cấp
                  </div>
                  <div className="text-xs text-gray-600">75-84% - Ôn gấp</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#d97706', borderColor: '#f59e0b'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#d97706'}}>
                    ⚡ Khẩn cấp
                  </div>
                  <div className="text-xs text-gray-600">
                    65-74% - Cần ôn ngay
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#ca8a04', borderColor: '#eab308'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#ca8a04'}}>
                    ⚠️ Cần chú ý
                  </div>
                  <div className="text-xs text-gray-600">55-64% - Ôn sớm</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#65a30d', borderColor: '#84cc16'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#65a30d'}}>
                    📚 Cần luyện tập
                  </div>
                  <div className="text-xs text-gray-600">45-54% - Ôn thêm</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#0891b2', borderColor: '#06b6d4'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#0891b2'}}>
                    📖 Ôn nhẹ
                  </div>
                  <div className="text-xs text-gray-600">
                    35-44% - Ôn theo dõi
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#2563eb', borderColor: '#3b82f6'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#2563eb'}}>
                    👍 Khá tốt
                  </div>
                  <div className="text-xs text-gray-600">
                    25-34% - Đã nắm khá vững
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg border-2" style={{backgroundColor: '#059669', borderColor: '#10b981'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#059669'}}>
                    ✅ Tốt
                  </div>
                  <div className="text-xs text-gray-600">
                    15-24% - Thành thạo
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3 shadow-lg animate-pulse border-2" style={{backgroundColor: '#d97706', borderColor: '#f59e0b'}}></div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center text-xs" style={{color: '#d97706'}}>
                    ⭐ Xuất sắc
                  </div>
                  <div className="text-xs text-gray-600">0-14% - Hoàn hảo</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-center text-gray-600">
              Ngôi sao lớn hơn = ưu tiên cao hơn
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview - Collapsible - Only show in topics view */}
      {constellationData && currentView === 'topics' && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl text-gray-800 text-sm z-20 border border-gray-300 transition-all duration-300">
          {/* Header with toggle button */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 hover:bg-opacity-50 rounded-t-xl transition-colors"
            onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
          >
            <div className="font-bold flex items-center">
              <span className="mr-2">📊</span>
              Phân tích học tập
            </div>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  isStatsCollapsed ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Collapsible content */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              isStatsCollapsed ? "max-h-0" : "max-h-64"
            }`}
          >
            <div className="px-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng chủ đề:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {constellationData.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    💀🔥 <span className="ml-1">Khẩn cấp:</span>
                  </span>
                  <span className="ml-2 font-semibold text-red-600">
                    {
                      constellationData.filter((t) => t.weakness_score >= 0.75)
                        .length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    ⚡⚠️ <span className="ml-1">Cần chú ý:</span>
                  </span>
                  <span className="ml-2 font-semibold text-orange-600">
                    {
                      constellationData.filter(
                        (t) =>
                          t.weakness_score >= 0.55 && t.weakness_score < 0.75
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    📚📖 <span className="ml-1">Cần ôn:</span>
                  </span>
                  <span className="ml-2 font-semibold text-yellow-600">
                    {
                      constellationData.filter(
                        (t) =>
                          t.weakness_score >= 0.35 && t.weakness_score < 0.55
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    ✅⭐ <span className="ml-1">Thành thạo:</span>
                  </span>
                  <span className="ml-2 font-semibold text-emerald-600">
                    {
                      constellationData.filter((t) => t.weakness_score < 0.35)
                        .length
                    }
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-xs text-center text-gray-600 mb-2">
                  Điểm yếu trung bình
                </div>
                <div className="text-center text-lg font-bold text-yellow-300">
                  {Math.round(
                    (constellationData.reduce(
                      (sum, t) => sum + t.weakness_score,
                      0
                    ) /
                      constellationData.length) *
                      100
                  )}
                  %
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main constellation visualization */}
      <div
        className="relative z-10 px-4 pb-8"
        style={{ height: "calc(100vh - 100px)" }}
      >
        <KnowledgeConstellation
          data={constellationData}
          onTopicClick={handleTopicClick}
          onViewChange={handleViewChange}
        />
      </div>
    </div>
  );
}