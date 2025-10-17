import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const TourCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative"
    >
      {/* Enhanced tooltip-like design with better styling */}
      <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-300 max-w-sm overflow-hidden font-sans backdrop-blur-sm">
        {/* Speech bubble pointer */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-300"></div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent border-t-white"></div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {step.icon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center text-xl shadow-sm border border-orange-200"
              >
                {step.icon}
              </motion.div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-tight font-sans">
                {step.title}
              </h3>

              {/* Progress indicator */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-gray-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 leading-none shadow-sm">
                  Bước {currentStep + 1}/{totalSteps}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "bg-orange-500 w-6 shadow-sm"
                          : i < currentStep
                          ? "bg-orange-400 w-2"
                          : "bg-gray-200 w-2"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content with enhanced styling */}
        <div className="px-6 py-5 bg-gradient-to-br from-orange-50/30 to-white">
          <div className="text-xs text-gray-700 leading-relaxed font-medium font-sans">
            {step.content}
          </div>
        </div>

        {/* Footer with enhanced styling */}
        <div className="px-6 py-5 bg-white border-t border-orange-100">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={skipTour}
              className="group flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 font-medium transition-colors leading-none hover:bg-orange-50 px-2 py-1 rounded-md"
            >
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
              Bỏ qua
            </button>

            <div className="flex gap-2">
              <AnimatePresence>
                {currentStep > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    onClick={prevStep}
                    className="group px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-lg transition-all duration-200 flex items-center gap-1.5 leading-none shadow-sm hover:shadow-md"
                  >
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Quay lại
                  </motion.button>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextStep}
                className="group px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg flex items-center gap-1.5 leading-none transform hover:scale-105"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Hoàn thành
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    Tiếp theo
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Arrow (hidden since we use custom pointer) */}
        <div className="absolute" style={{ zIndex: 10000, opacity: 0 }}>
          {arrow}
        </div>
      </div>
    </motion.div>
  );
};

export default TourCard;
