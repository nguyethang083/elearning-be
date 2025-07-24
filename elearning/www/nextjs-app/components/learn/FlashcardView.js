import MathRenderer from "./MathRenderer";
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useUserFlashcardSettings } from '@/hooks/useUserFlashcardSettings';
import { useFlashcardSession } from '@/hooks/useFlashcardSession';

export default function FlashcardView({ 
  flashcards, 
  currentIndex = 0, 
  onNext, 
  onPrevious, 
  isFlipped = false, 
  onFlip,
  showExplanation = false,
  onToggleExplanation,
  customFooter = null,
  topicId
}) {
  const [orderedSteps, setOrderedSteps] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const { settings } = useUserFlashcardSettings(topicId);
  
  // Track flashcard session for Basic mode learning time
  const { 
    isSessionActive, 
    totalTimeSpent, 
    sessionError 
  } = useFlashcardSession(topicId, "Basic", !!flashcards && flashcards.length > 0);

  // Log session tracking info for debugging
  useEffect(() => {
    if (isSessionActive) {
      console.log(`FlashcardView: Session active for Basic mode, topic: ${topicId}`);
    }
    if (sessionError) {
      console.error(`FlashcardView: Session error:`, sessionError);
    }
  }, [isSessionActive, sessionError, topicId]);
  
  // Determine which side is front based on settings
  const isBackFirst = settings?.flashcard_direction === 'back_first';

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="w-full max-w-full mx-auto px-4">
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-600">Không có thẻ flashcard nào có sẵn.</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  // Check if currentCard exists
  if (!currentCard) {
    return (
      <div className="w-full max-w-full mx-auto px-4">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-gray-600">Không tìm thấy thẻ flashcard. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }
  
  const totalCards = flashcards.length;
  const isOrderingType = currentCard.flashcard_type === "Ordering Steps";
  const isIdentifyErrorType = currentCard.flashcard_type === "Identify the Error";
  
  // Get flashcard type tag color
  const getTagColor = (type) => {
    const typeColors = {
      "Concept/Theorem/Formula": "bg-blue-100 text-blue-800",
      "Fill in the Blank": "bg-green-100 text-green-800",
      "Ordering Steps": "bg-purple-100 text-purple-800",
      "What's the Next Step?": "bg-amber-100 text-amber-800",
      "Short Answer/Open-ended": "bg-indigo-100 text-indigo-800",
      "Identify the Error": "bg-red-100 text-red-800"
    };
    return typeColors[type] || "bg-gray-100 text-gray-800";
  };
  
  // Format content with newlines
  const formatContent = (content) => {
    if (!content) return "";
    return content.replace(/\\n/g, "\n");
  };
  
  // When the card changes, reset the ordering
  useEffect(() => {
    if (isOrderingType && currentCard.ordering_steps_items) {
      // Shuffle the steps for the user to arrange
      const shuffledSteps = [...currentCard.ordering_steps_items]
        .sort(() => Math.random() - 0.5)
        .map((step, index) => ({
          ...step,
          id: index,
          userOrder: index + 1
        }));
      setOrderedSteps(shuffledSteps);
    }
    // Reset hint visibility
    setShowHint(false);
  }, [currentCard, isOrderingType]);

  // Render special content for Ordering Steps
  const renderOrderingSteps = () => {
    if (!isOrderingType || !currentCard.ordering_steps_items) {
      return null;
    }
    
    return (
      <div className="mt-6 w-full">
        <div className="flex justify-between mb-3">
          <h3 className="text-sm md:text-base font-medium text-gray-700">Sắp xếp các bước theo thứ tự đúng:</h3>
        </div>
        <div className="space-y-2">
          {orderedSteps.map((step, index) => (
            <li key={step.id} className="border rounded-md p-3 bg-white shadow-sm flex items-center list-none">
              <span className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full mr-2 md:mr-3 flex-shrink-0 text-xs md:text-sm">
                {step.userOrder}
              </span>
              <div className="flex-grow min-w-0">
                <div className="prose prose-sm max-w-none">
                  <MathRenderer content={step.step_content} />
                </div>
              </div>
              <div className="flex space-x-1 ml-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOrder = [...orderedSteps];
                    if (index > 0) {
                      const temp = newOrder[index].userOrder;
                      newOrder[index].userOrder = newOrder[index - 1].userOrder;
                      newOrder[index - 1].userOrder = temp;
                      newOrder.sort((a, b) => a.userOrder - b.userOrder);
                      setOrderedSteps(newOrder);
                    }
                  }}
                  disabled={index === 0}
                  className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded text-sm ${
                    index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  ↑
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOrder = [...orderedSteps];
                    if (index < orderedSteps.length - 1) {
                      const temp = newOrder[index].userOrder;
                      newOrder[index].userOrder = newOrder[index + 1].userOrder;
                      newOrder[index + 1].userOrder = temp;
                      newOrder.sort((a, b) => a.userOrder - b.userOrder);
                      setOrderedSteps(newOrder);
                    }
                  }}
                  disabled={index === orderedSteps.length - 1}
                  className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded text-sm ${
                    index === orderedSteps.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </div>
      </div>
    );
  };

  // Get front and back content based on direction setting
  const getFrontContent = () => {
    if (isBackFirst) {
      return currentCard.answer;
    } else {
      return currentCard.flashcard_type === "Identify the Error" 
        ? formatContent(currentCard.question) 
        : currentCard.question;
    }
  };
  
  const getBackContent = () => {
    if (isBackFirst) {
      return currentCard.flashcard_type === "Identify the Error" 
        ? formatContent(currentCard.question) 
        : currentCard.question;
    } else {
      return currentCard.answer;
    }
  };

  return (
    <div className="w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 w-full">
        <div 
          className={`relative ${
            isOrderingType 
              ? "min-h-[600px] md:min-h-[700px]" 
              : "min-h-[400px] md:min-h-[450px]"
          } cursor-pointer w-full`}
          onClick={onFlip}
        >
          <div className="absolute top-4 left-4 z-10">
            <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-medium ${getTagColor(currentCard.flashcard_type)}`}>
              {currentCard.flashcard_type}
            </span>
          </div>
          
          {currentCard.hint && (
            <div className="absolute top-4 right-4 z-10">
              <div className="relative">
                <button 
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                  onMouseEnter={() => setShowHint(true)}
                  onMouseLeave={() => setShowHint(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                >
                  <Lightbulb className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                
                {showHint && (
                  <div className="absolute right-0 mt-2 w-48 md:w-64 bg-white rounded-lg shadow-lg p-3 md:p-4 text-xs md:text-sm z-20">
                    <div className="font-medium text-gray-700 mb-1">Gợi ý:</div>
                    <div className="text-gray-600">
                      <MathRenderer content={currentCard.hint} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div
            className={`p-4 md:p-6 lg:p-8 absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 overflow-y-auto ${
              isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            style={{ 
              maxHeight: isOrderingType ? "700px" : "400px", 
              paddingTop: "40px", 
              overflowY: "auto" 
            }}
          >
            <div className="w-full text-center mt-6">
              <div className="prose prose-sm md:prose-base max-w-none whitespace-pre-line">
                <MathRenderer content={getFrontContent()} />
              </div>
              {!isFlipped && isOrderingType && renderOrderingSteps()}
            </div>
          </div>

          <div
            className={`p-4 md:p-6 lg:p-8 absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 overflow-y-auto ${
              isFlipped ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ 
              maxHeight: isOrderingType ? "700px" : "400px", 
              paddingTop: "40px", 
              overflowY: "auto" 
            }}
          >
            <div className="w-full text-center mt-6">
              <div className="prose prose-sm md:prose-base max-w-none mb-6 whitespace-pre-line">
                <MathRenderer content={getBackContent()} />
              </div>
              
              {!showExplanation && currentCard.explanation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExplanation?.();
                  }}
                  className="mt-4 bg-white text-indigo-600 border border-indigo-200 px-3 py-2 md:px-4 md:py-2 rounded-md font-medium hover:bg-indigo-50 transition-colors duration-200 text-sm md:text-base"
                >
                  Xem giải thích
                </button>
              )}

              {showExplanation && currentCard.explanation && (
                <div className="mt-6 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-gray-700 font-medium mb-2 text-sm md:text-base">GIẢI THÍCH</h3>
                  <div className="prose prose-sm md:prose-base max-w-none text-gray-600 whitespace-pre-line">
                    <MathRenderer content={formatContent(currentCard.explanation)} />
                  </div>
                </div>
              )}
              
              {/* Show correct ordering on the answer side */}
              {isFlipped && isOrderingType && currentCard.ordering_steps_items && (
                <div className="mt-6 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-gray-700 font-medium mb-2 text-sm md:text-base">THỨ TỰ ĐÚNG</h3>
                  <ol className="list-decimal pl-4 md:pl-5 space-y-2 text-left">
                    {currentCard.ordering_steps_items
                      .sort((a, b) => a.correct_order - b.correct_order)
                      .map((step) => (
                        <li key={step.correct_order} className="pl-2">
                          <div className="prose prose-sm max-w-none">
                            <MathRenderer content={step.step_content} />
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {customFooter ? (
        customFooter
      ) : (
      <div className="flex justify-between items-center w-full">
        <button
            onClick={onPrevious}
          disabled={currentIndex === 0}
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border ${
            currentIndex === 0
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <div className="text-gray-600 text-sm md:text-base">
          {currentIndex + 1} / {totalCards}
        </div>

        <button
            onClick={onNext}
          disabled={currentIndex === flashcards.length - 1}
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border ${
            currentIndex === flashcards.length - 1
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
      )}
    </div>
  );
} 