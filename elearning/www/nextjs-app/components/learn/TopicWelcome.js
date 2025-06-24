import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Target, 
  Lightbulb, 
  Clock, 
  TrendingUp, 
  Users, 
  Award, 
  ChevronRight,
  Play,
  CheckCircle,
  Brain,
  Zap,
  BarChart3,
  Sparkles,
  Percent
} from 'lucide-react';
import { useFrappeApi } from '@/hooks/useFrappeApi';

const TopicWelcome = ({ topic, flashcards, onStartLearning, onClose }) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [userProgress, setUserProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const { callApi } = useFrappeApi();
  
  // Load user's progress for this topic
  useEffect(() => {
    const loadUserProgress = async () => {
      if (!topic?.id) return;
      
      try {
        // Get SRS progress
        const srsResponse = await callApi('/api/method/elearning.elearning.doctype.user_srs_progress.user_srs_progress.get_due_srs_summary', {
          method: 'GET'
        });
        
        // Get exam attempts
        const examResponse = await callApi('/api/method/elearning.elearning.doctype.user_exam_attempt.user_exam_attempt.get_exam_attempts_by_topic', {
          method: 'POST',
          data: { topic_id: topic.id }
        });
        
        if (srsResponse?.message) {
          const topicSrs = srsResponse.message.topics.find(t => t.topic_id === topic.id);
          const examAttempts = examResponse?.message || [];
          
          setUserProgress({
            srs: topicSrs || { total_cards: 0, due_cards: 0, new_cards: 0, learning_cards: 0, review_cards: 0 },
            examAttempts: examAttempts.length || 0,
            lastExamDate: examAttempts.length > 0 ? examAttempts[0].creation : null
          });
        }
      } catch (error) {
        console.error('Error loading user progress:', error);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadUserProgress();
  }, [topic?.id, callApi]);
  
  // Study tips for better learning
  const studyTips = [
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Học đều đặn mỗi ngày",
      description: "Dành 15-30 phút mỗi ngày để ôn tập sẽ hiệu quả hơn học dồn 3-4 tiếng/tuần."
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Sử dụng kỹ thuật Active Recall",
      description: "Thử nhớ lại kiến thức trước khi xem đáp án để tăng cường khả năng ghi nhớ."
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Từ dễ đến khó",
      description: "Bắt đầu với Exam Mode để làm quen, sau đó chuyển sang SRS để ôn tập lâu dài."
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Đánh giá thành thật",
      description: "Hãy đánh giá mức độ hiểu một cách chân thực để hệ thống đưa ra lịch ôn tập phù hợp."
    }
  ];

  // Learning modes with all three modes
  const learningModes = [
    {
      id: 'basic',
      title: 'Basic Mode',
      description: 'Chế độ cơ bản để xem và ôn tập flashcards',
      features: [
        'Xem câu hỏi và câu trả lời',
        'Lật thẻ để xem đáp án',
        'Điều hướng qua từng thẻ',
        'Phù hợp cho việc làm quen với nội dung'
      ],
      icon: '📚',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'exam',
      title: 'Exam Mode', 
      description: 'Chế độ kiểm tra để luyện tập và nhận phản hồi',
      features: [
        'Trả lời câu hỏi và nhận feedback từ AI',
        'Tự đánh giá mức độ hiểu bài',
        'Lời giải chi tiết cho từng câu',
        'Tự động thêm thẻ khó vào SRS'
      ],
      icon: '📝',
      bgColor: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200', 
      textColor: 'text-emerald-700',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      id: 'srs',
      title: 'SRS Mode',
      description: 'Hệ thống ôn tập ngắt quãng thông minh',
      features: [
        'Ôn tập theo thuật toán spaced repetition',
        'Điều chỉnh tần suất dựa trên độ khó',
        'Tối ưu hóa khả năng ghi nhớ lâu dài',
        'Nhắc nhở ôn tập đúng thời điểm'
      ],
      icon: '🧠',
      bgColor: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700', 
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % studyTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [studyTips.length]);

  // Calculate topic stats
  const totalFlashcards = flashcards?.length || 0;
  const conceptCards = flashcards?.filter(f => f.flashcard_type === "Concept/Theorem/Formula")?.length || 0;
  const practiceCards = totalFlashcards - conceptCards;

  // Calculate learning progress percentage
  const calculateProgress = () => {
    if (!userProgress || !userProgress.srs) return 0;
    const { total_cards, due_cards } = userProgress.srs;
    if (total_cards === 0) return 0;
    return Math.round(((total_cards - due_cards) / total_cards) * 100);
  };

  const progressPercentage = calculateProgress();
  const hasProgress = userProgress && (userProgress.srs.total_cards > 0 || userProgress.examAttempts > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-md mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm font-medium text-gray-600">Chào mừng bạn đến với</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
            {topic?.topic_name}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Khám phá kiến thức mới, luyện tập và ôn tập một cách khoa học với các chế độ học tập thông minh
          </p>
        </div>

        {/* Progress Overview (if user has progress) */}
        {hasProgress && !loadingProgress && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                <h3 className="text-xl font-semibold">Tiến độ học tập của bạn</h3>
              </div>
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <Percent className="w-4 h-4 mr-1" />
                <span className="font-bold">{progressPercentage}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">{userProgress.examAttempts}</div>
                <div className="text-sm text-white/80">Lần kiểm tra đã hoàn thành</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">{userProgress.srs.total_cards}</div>
                <div className="text-sm text-white/80">Thẻ đã được đưa vào SRS</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">{userProgress.srs.due_cards}</div>
                <div className="text-sm text-white/80">Thẻ cần ôn tập hôm nay</div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Topic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{totalFlashcards}</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Tổng số thẻ học</h3>
            <p className="text-sm text-gray-600">Flashcards để bạn học tập</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{conceptCards}</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Khái niệm lý thuyết</h3>
            <p className="text-sm text-gray-600">Công thức và định lý quan trọng</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{practiceCards}</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Bài tập thực hành</h3>
            <p className="text-sm text-gray-600">Câu hỏi áp dụng và rèn luyện</p>
          </div>
        </div>

        {/* Learning Outcomes */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-4">
              <Award className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Kết quả học tập mong đợi</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Nắm vững kiến thức cơ bản</h3>
                  <p className="text-gray-600 text-sm">Hiểu rõ các khái niệm, công thức và định lý quan trọng trong chủ đề</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Áp dụng vào bài tập</h3>
                  <p className="text-gray-600 text-sm">Vận dụng kiến thức để giải quyết các dạng bài tập khác nhau</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Ghi nhớ lâu dài</h3>
                  <p className="text-gray-600 text-sm">Sử dụng hệ thống SRS để duy trì kiến thức trong bộ nhớ dài hạn</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Tự đánh giá năng lực</h3>
                  <p className="text-gray-600 text-sm">Nhận biết điểm mạnh, điểm yếu và cải thiện phương pháp học tập</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Modes */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🎓 Chọn phương thức học
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {learningModes.map((mode, index) => (
              <div key={mode.id} className={`bg-gradient-to-br ${mode.bgColor} rounded-2xl p-6 border ${mode.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-white/70 rounded-lg flex items-center justify-center mr-3 text-xl">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{mode.title}</h3>
                    <p className={`text-xs font-medium ${mode.textColor}`}>{mode.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-5">
                  {mode.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span className="text-gray-700 text-xs leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => onStartLearning(mode.id)}
                  className={`w-full py-2.5 px-4 ${mode.buttonColor} text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center group text-sm`}
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Bắt đầu {mode.title}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Study Tips */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center mb-6">
            <Lightbulb className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Mẹo học tập hiệu quả</h2>
          </div>
          
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                {studyTips[currentTip].icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{studyTips[currentTip].title}</h3>
                <p className="text-white/90 leading-relaxed">{studyTips[currentTip].description}</p>
              </div>
            </div>
            
            {/* Tip indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {studyTips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTip(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTip ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onStartLearning('exam')}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center group"
          >
            <BookOpen className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            {hasProgress ? 'Tiếp tục với Exam Mode' : 'Bắt đầu học với Exam Mode'}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            Khám phá sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicWelcome; 