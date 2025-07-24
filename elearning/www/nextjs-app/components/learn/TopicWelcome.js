import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Clock, 
  Target, 
  Zap, 
  ArrowRight, 
  X, 
  CheckCircle, 
  BarChart3, 
  TrendingUp,
  Percent,
  Brain,
  Gamepad2,
  Timer,
  Trophy,
  PlayCircle,
  Play,
  Lightbulb,
  Award,
  ChevronRight,
  Sparkles,
  Info,
  FileText,
  List,
  Star
} from 'lucide-react';
import { fetchWithAuth } from '@/pages/api/helper';
// Import topic descriptions data directly
import topicDescriptionsData from './des.json';

const TopicWelcome = ({ topic, flashcards, onStartLearning, onClose }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [userProgress, setUserProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [showContentModal, setShowContentModal] = useState(false);

  // Load user's progress for this topic
  const loadUserProgress = async () => {
    if (!topic?.name) return;
    
    setLoadingProgress(true);
    // Reset userProgress immediately when starting new load
    setUserProgress(null);
    
    console.log(`TopicWelcome: Loading progress for topic "${topic.name}" (ID: ${topic.id})`);
    console.log(`TopicWelcome: Full topic object:`, topic);
    
    try {
      const topicIdentifier = topic.name || topic.topic_name || topic.id;
      console.log(`TopicWelcome: Using topic identifier: "${topicIdentifier}"`);
      
      // FIXED: get_due_srs_summary doesn't accept topic_name parameter
      // It returns ALL topics for the user, we need to filter on frontend
      const srsResponse = await fetchWithAuth(
        "user_srs_progress.user_srs_progress.get_due_srs_summary",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}) // No parameters needed
        }
      );

      // Get exam history with correct parameters
      const examResponse = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.get_user_exam_history",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic_name: String(topicIdentifier)
          })
        }
      );

      console.log(`TopicWelcome: Raw SRS Response (all topics):`, srsResponse);
      console.log(`TopicWelcome: Raw Exam Response for topic "${topicIdentifier}":`, examResponse);

      // Process SRS data and filter for current topic
      const allSrsData = srsResponse?.message || {};
      let currentTopicSrsData = {
        success: true,
        due_count: 0,
        upcoming_count: 0,
        total_count: 0,
        topics: []
      };

      // Filter SRS data for current topic
      if (allSrsData.topics && Array.isArray(allSrsData.topics)) {
        console.log(`TopicWelcome: All SRS topics:`, allSrsData.topics.map(t => ({name: t.topic_name, id: t.topic_id})));
        
        // Find the topic that matches our current topic
        const matchingTopic = allSrsData.topics.find(srsTopicItem => {
          const srsTopicName = srsTopicItem.topic_name;
          const srsTopicId = srsTopicItem.topic_id;
          
          // Try different matching strategies
          // 1. Direct name match
          if (srsTopicName === topicIdentifier) {
            console.log(`TopicWelcome: Found SRS topic by exact name match: "${srsTopicName}"`);
            return true;
          }
          
          // 2. Topic ID match (if available)
          if (srsTopicId && String(srsTopicId) === String(topic.id)) {
            console.log(`TopicWelcome: Found SRS topic by ID match: ${srsTopicId}`);
            return true;
          }
          
          // 3. Partial name match
          if (srsTopicName && topicIdentifier) {
            const srsNameLower = String(srsTopicName).toLowerCase();
            const topicNameLower = String(topicIdentifier).toLowerCase();
            
            if (srsNameLower.includes(topicNameLower) || topicNameLower.includes(srsNameLower)) {
              console.log(`TopicWelcome: Found SRS topic by partial name match: "${srsTopicName}" contains "${topicIdentifier}"`);
              return true;
            }
          }
          
          return false;
        });

        if (matchingTopic) {
          console.log(`TopicWelcome: Using SRS data for matching topic:`, matchingTopic);
          currentTopicSrsData = {
            success: true,
            due_count: matchingTopic.due_count || 0,
            upcoming_count: matchingTopic.upcoming_count || 0,
            total_count: matchingTopic.total_count || 0,
            topics: [matchingTopic]
          };
        } else {
          console.log(`TopicWelcome: No SRS data found for topic "${topicIdentifier}"`);
          // Keep the empty data structure
        }
      }

      // Process exam response with validation
      let examData = [];
      if (examResponse?.message?.attempts) {
        // Direct access to attempts array in message object
        examData = examResponse.message.attempts;
      } else if (examResponse?.attempts) {
        // Fallback if attempts is directly on response
        examData = examResponse.attempts;
      } else if (Array.isArray(examResponse)) {
        // Last fallback if response is array
        examData = examResponse;
      }

      console.log(`TopicWelcome: Processed exam attempts:`, examData);

      // Filter exam attempts to ensure they belong to the current topic
      const processedAttempts = examData
        .filter(attempt => {
          // Check if attempt belongs to current topic - using both topic and topic_name fields
          const attemptTopic = attempt.topic || attempt.topic_name;
          const topicMatches = String(attemptTopic) === String(topicIdentifier);
          
          if (!topicMatches) {
            console.warn(`TopicWelcome: Filtering out exam attempt for wrong topic: "${attemptTopic}" (expected: "${topicIdentifier}")`);
            return false;
          }
          
          return true;
        })
        .map(attempt => {
          const creation = attempt.creation || new Date().toISOString();
          const end_time = attempt.end_time || attempt.completion_timestamp || null;
          
          return {
            ...attempt,
            creation,
            end_time,
            date: end_time || creation,
            formatted_time: attempt.formatted_time || "0m 0s",
            total_questions: attempt.total_questions || 0
          };
        });

      console.log(`TopicWelcome: Final processed exam attempts for topic "${topicIdentifier}":`, processedAttempts);
      console.log(`TopicWelcome: Final SRS data for topic "${topicIdentifier}":`, currentTopicSrsData);

      // Set the validated data
      setUserProgress({
        srs: currentTopicSrsData,
        examAttempts: processedAttempts
      });

      // Additional verification log
      console.log(`TopicWelcome: Successfully loaded data for topic "${topicIdentifier}":`, {
        srsCardCount: currentTopicSrsData.total_count || 0,
        examAttemptCount: processedAttempts.length,
        dueCards: currentTopicSrsData.due_count || 0
      });

    } catch (error) {
      console.error(`TopicWelcome: Error loading user progress for topic "${topic.name}":`, error);
      // Set empty progress instead of null to show 0% progress
      setUserProgress({
        srs: {
          success: true,
          due_count: 0,
          upcoming_count: 0,
          total_count: 0,
          topics: []
        },
        examAttempts: []
      });
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    // Reset state immediately when topic changes
    setUserProgress(null);
    setLoadingProgress(true);

    console.log(`TopicWelcome: Topic changed to "${topic?.name}" (ID: ${topic?.id}), resetting state...`);
    console.log('TopicWelcome: Clearing any cached data and reloading...');
    
    // Add a small delay to ensure state is fully reset
    setTimeout(() => {
      loadUserProgress();
    }, 100);
  }, [topic?.name, topic?.id]); // Add topic.id as dependency for better tracking
  
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
      setCurrentTipIndex((prev) => (prev + 1) % studyTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [studyTips.length]);

  // Calculate topic stats
  const totalFlashcards = flashcards?.length || 0;
  const conceptCards = flashcards?.filter(f => f.flashcard_type === "Concept/Theorem/Formula")?.length || 0;
  const practiceCards = totalFlashcards - conceptCards;

  // Calculate learning progress percentage
  const calculateProgress = () => {
    if (!userProgress?.srs || !userProgress?.examAttempts) return 0;
    
    // Fix field names to match API response
    const totalCards = userProgress.srs.total_count || 0;
    const dueCards = userProgress.srs.due_count || 0;
    const examAttempts = userProgress.examAttempts.length || 0;
    
    if (totalCards === 0 && examAttempts === 0) return 0;
    
    // Better progress calculation for SRS system:
    // 1. If user has taken exams but no SRS cards yet -> small progress
    // 2. If user has SRS cards -> calculate based on SRS progression
    // 3. Having cards in SRS means they've been assessed and are being learned
    
    if (totalCards === 0) {
      // No SRS cards yet, but has exam attempts
      return examAttempts > 0 ? 10 : 0; // 10% for starting exams
    }
    
    // SRS progress calculation:
    // - Having cards in SRS means learning has started
    // - Base progress for having SRS cards: 20%
    // - Additional progress based on cards that don't need review today
    const baseProgress = 20; // Base 20% for having SRS cards
    const nonDueCards = Math.max(0, totalCards - dueCards);
    const additionalProgress = totalCards > 0 ? (nonDueCards / totalCards) * 80 : 0;
    
    return Math.min(100, Math.round(baseProgress + additionalProgress));
  };

  // Fix hasProgress calculation with correct field names
  const hasProgress = userProgress && 
    ((userProgress.srs?.total_count > 0) || 
     (userProgress.examAttempts?.length > 0));

  const progressPercentage = calculateProgress();

  // Get topic content from imported data
  const getTopicContent = () => {
    // Find the topic data by matching topic name - with safe string comparison
    const topicName = topic?.name || topic?.topic_name || '';
    const topicId = topic?.id || topic?.name;
    
    // Try different matching strategies
    let topicData = null;
    
    // Strategy 1: Direct ID match (topic.name might be "1", "2", etc.)
    if (topicId) {
      topicData = topicDescriptionsData.find(item => {
        const itemId = item.id;
        if (String(itemId) === String(topicId)) {
          console.log('Found ID match:', item.topic_name, 'ID:', itemId);
          return true;
        }
        return false;
      });
    }
    
    // Strategy 2: Name-based matching if ID matching failed
    if (!topicData && topicName) {
      topicData = topicDescriptionsData.find(item => {
      if (!topicName || !item.topic_name) return false;
      
      const itemName = String(item.topic_name).toLowerCase();
      const searchName = String(topicName).toLowerCase();
      
        // Strategy 2a: Exact match
        if (itemName === searchName) {
          console.log('Found exact name match:', item.topic_name);
          return true;
        }
        
        // Strategy 2b: Contains match
        if (itemName.includes(searchName) || searchName.includes(itemName)) {
          console.log('Found contains match:', item.topic_name);
          return true;
        }
        
        // Strategy 2c: Match by chapter number (if topic name contains "chương" or roman numerals)
        const extractChapterNumber = (str) => {
          const romanMatch = str.match(/chương\s+([ivx]+)/i);
          if (romanMatch) {
            const romanToArabic = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10};
            return romanToArabic[romanMatch[1].toLowerCase()];
          }
          
          const arabicMatch = str.match(/chương\s+(\d+)/i);
          if (arabicMatch) return parseInt(arabicMatch[1]);
          
          const numberMatch = str.match(/(\d+)/);
          if (numberMatch) return parseInt(numberMatch[1]);
          
          return null;
        };
        
        const searchChapter = extractChapterNumber(searchName);
        const itemChapter = extractChapterNumber(itemName);
        
        if (searchChapter && itemChapter && searchChapter === itemChapter) {
          console.log('Found chapter number match:', item.topic_name, 'Chapter:', itemChapter);
          return true;
        }
        
        return false;
      });
    }

    if (topicData) {
      return {
        overview: topicData.detail, // Use 'detail' field from des.json
        estimatedTime: "4-6 tuần", // Common for all 10 topics as requested
        difficulty: "Trung bình", // Common for all 10 topics as requested
        totalFlashcards: flashcards?.length || 0,
        learningObjectives: topicData.learningObjectives,
        keyTopics: topicData.keyTopics,
        prerequisites: topicData.prerequisites
      };
    }

    // Fallback to basic info if no match found
    console.log('No match found, using fallback data');
    return {
      overview: topic?.description || "Chương học này cung cấp kiến thức cơ bản và nâng cao về chủ đề được chọn.",
      estimatedTime: "4-6 tuần",
      difficulty: "Trung bình", 
      totalFlashcards: flashcards?.length || 0,
      learningObjectives: [
        "Nắm vững các khái niệm cơ bản của chương",
        "Vận dụng kiến thức vào giải bài tập",
        "Phát triển tư duy logic và phân tích",
        "Chuẩn bị tốt cho các chương tiếp theo"
      ],
      keyTopics: [
        "Khái niệm cơ bản",
        "Định lý và tính chất",
        "Phương pháp giải bài tập",
        "Ứng dụng thực tế"
      ],
      prerequisites: [
        "Kiến thức toán học cơ bản",
        "Các chương trước đó",
        "Kỹ năng tính toán"
      ]
    };
  };

  // Content Modal Component - Memoized to prevent re-renders
  const ContentModal = useMemo(() => {
    const content = getTopicContent();
    
    return () => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl">
          {/* Modal Header - Fixed */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 sm:p-6 rounded-t-3xl flex-shrink-0 z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 mr-3 flex-shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold line-clamp-1">{topic?.topic_name}</h2>
                  <p className="text-white/80 text-sm">Nội dung chương học</p>
                </div>
              </div>
              <button
                onClick={() => setShowContentModal(false)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Overview */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Tổng quan</h3>
                </div>
                <div className="text-gray-600 leading-relaxed bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-100">
                  {content.overview}
                </div>
            </div>

            {/* Quick Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <Clock className="w-5 h-5 text-emerald-600 mr-2" />
                    <span className="font-semibold text-emerald-800 text-sm sm:text-base">Thời gian học</span>
                  </div>
                  <p className="text-emerald-700 font-medium">{content.estimatedTime}</p>
              </div>
              
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-amber-600 mr-2" />
                    <span className="font-semibold text-amber-800 text-sm sm:text-base">Độ khó</span>
                  </div>
                  <p className="text-amber-700 font-medium">{content.difficulty}</p>
              </div>
              
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                <div className="flex items-center mb-2">
                  <FileText className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="font-semibold text-purple-800 text-sm sm:text-base">Số thẻ học</span>
                  </div>
                  <p className="text-purple-700 font-medium">{flashcards?.length || 0} flashcards</p>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Mục tiêu học tập</h3>
              </div>
              <div className="space-y-3">
                {content.learningObjectives.map((objective, index) => (
                    <div key={index} className="flex items-start bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-100 hover:shadow-sm transition-shadow">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{objective}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Topics */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <List className="w-5 h-5 text-indigo-600" />
                </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Nội dung chính</h3>
              </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {content.keyTopics.map((topic, index) => (
                    <div key={index} className="flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 p-3 sm:p-4 rounded-xl border border-indigo-100 hover:shadow-sm transition-shadow">
                    <div className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-indigo-700 text-sm font-semibold">{index + 1}</span>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">{topic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <Brain className="w-5 h-5 text-amber-600" />
                </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Kiến thức cần có</h3>
              </div>
              <div className="space-y-2">
                {content.prerequisites.map((prereq, index) => (
                    <div key={index} className="flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 p-3 sm:p-4 rounded-xl border border-amber-100 hover:shadow-sm transition-shadow">
                      <div className="w-2 h-2 bg-amber-400 rounded-full mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm sm:text-base">{prereq}</span>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer - Fixed */}
          <div className="bg-gradient-to-r from-gray-50 to-white p-4 sm:p-6 rounded-b-3xl border-t flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setShowContentModal(false);
                  onStartLearning('exam');
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Bắt đầu học ngay
              </button>
              <button
                onClick={() => setShowContentModal(false)}
                className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%);
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
          }
        `}</style>
      </div>
    );
  }, [topic?.topic_name, flashcards?.length]); // Only re-create when topic or flashcard count changes

  // Memoized tip rotation to prevent unnecessary updates
  const studyTipDisplay = useMemo(() => studyTips[currentTipIndex], [currentTipIndex]);

  // Auto-rotate tips - Only run when modal is NOT open
  useEffect(() => {
    if (showContentModal) return; // Stop rotation when modal is open
    
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % studyTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [studyTips.length, showContentModal]); // Added showContentModal dependency

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-md mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm font-medium text-gray-600">Chào mừng bạn đến với</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
              {topic?.topic_name}
            </h1>
            <button
              onClick={() => setShowContentModal(true)}
              className="ml-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-all duration-200 group"
              title="Xem nội dung chương học"
            >
              <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Khám phá kiến thức mới, luyện tập và ôn tập một cách khoa học với các chế độ học tập thông minh
          </p>
          <div className="mt-4">
            <button
              onClick={() => setShowContentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Info className="w-4 h-4 mr-2" />
              Xem nội dung chương học chi tiết
            </button>
          </div>
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
                <div className="text-2xl font-bold mb-1">{userProgress.examAttempts.length}</div>
                <div className="text-sm text-white/80">Lần kiểm tra đã hoàn thành</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">{userProgress.srs.total_count}</div>
                <div className="text-sm text-white/80">Thẻ đã được đưa vào SRS</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">{userProgress.srs.due_count}</div>
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


        {/* Alternative Progress Display - Show even with no progress */}
        {!hasProgress && !loadingProgress && userProgress && (
          <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl p-6 text-white mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                <h3 className="text-xl font-semibold">Bắt đầu hành trình học tập</h3>
              </div>
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <Percent className="w-4 h-4 mr-1" />
                <span className="font-bold">0%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">0</div>
                <div className="text-sm text-white/80">Lần kiểm tra đã hoàn thành</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">0</div>
                <div className="text-sm text-white/80">Thẻ đã được đưa vào SRS</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold mb-1">0</div>
                <div className="text-sm text-white/80">Thẻ cần ôn tập hôm nay</div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-white/90">Hãy bắt đầu học để xây dựng tiến độ của bạn!</p>
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
                {studyTipDisplay.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{studyTipDisplay.title}</h3>
                <p className="text-white/90 leading-relaxed">{studyTipDisplay.description}</p>
              </div>
            </div>
            
            {/* Tip indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {studyTips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTipIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTipIndex ? 'bg-white w-6' : 'bg-white/50'
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

      {/* Content Modal */}
      {showContentModal && <ContentModal />}
    </div>
  );
};

export default TopicWelcome; 