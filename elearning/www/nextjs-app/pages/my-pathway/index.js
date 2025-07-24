import { useEffect, useState } from 'react';
import { getKnowledgeConstellation } from "@/pages/api/helper";
import KnowledgeConstellation from '../../components/learn/KnowledgeConstellation';
import { useRouter } from 'next/router';

export default function MyPathway() {
  const [constellationData, setConstellationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        const transformedData = response.message.map(topic => ({
          topic_id: topic.topic_id,
          topic_name: topic.topic_name,
          description: topic.description,
          weakness_score: topic.weakness_score || 0,
          components: {
            accuracy: topic.components?.accuracy || 0,
            pacing: topic.components?.pacing || 0,
            decay: topic.components?.decay || 0
          },
          last_updated: topic.last_updated
        }));
        setConstellationData(transformedData);
      } else {
        console.error('Invalid response format:', response);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error loading constellation data:', err);
      setError('Failed to load your learning pathway. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topicId) => {
    router.push(`/learn/${topicId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">🌟</div>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Đang tải chòm sao tri thức...</h2>
          <p className="text-gray-300 text-sm">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-6">💥</div>
          <h2 className="text-2xl font-bold mb-4">Oops! Có lỗi xảy ra</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            🌟 Chòm Sao Tri Thức
          </h1>
          <p className="text-gray-300 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
            Khám phá thiên hà kiến thức cá nhân của bạn. Mỗi ngôi sao đại diện cho một chủ đề học tập - 
            <span className="text-yellow-300 font-semibold"> ngôi sao càng lớn và sáng, càng cần được chinh phục!</span>
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 backdrop-blur-sm p-4 rounded-xl text-white text-sm z-20 border border-gray-600">
        <div className="font-bold mb-3 text-center">📊 Chú thích</div>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-3 shadow-lg"></div>
            <span className="text-gray-200">Cần tập trung (&gt;60%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3 shadow-lg"></div>
            <span className="text-gray-200">Cần luyện tập (30-60%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full mr-3 shadow-lg"></div>
            <span className="text-gray-200">Thành thạo (&lt;30%)</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {constellationData && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-60 backdrop-blur-sm p-4 rounded-xl text-white text-sm z-20 border border-gray-600">
          <div className="font-bold mb-3 text-center">📈 Tổng quan</div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-gray-300">Tổng chủ đề:</span>
              <span className="ml-2 font-semibold text-blue-300">{constellationData.length}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-300">Cần tập trung:</span>
              <span className="ml-2 font-semibold text-red-300">
                {constellationData.filter(t => t.weakness_score > 0.6).length}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-300">Đã thành thạo:</span>
              <span className="ml-2 font-semibold text-green-300">
                {constellationData.filter(t => t.weakness_score < 0.3).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main constellation visualization */}
      <div className="relative z-10 px-4 pb-8" style={{ height: 'calc(100vh - 100px)' }}>
        <KnowledgeConstellation
          data={constellationData}
          onTopicClick={handleTopicClick}
        />
      </div>
    </div>
  );
}