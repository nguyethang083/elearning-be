import React from "react";
import { useNextStep } from "nextstepjs";
import { useRouter } from "next/router";
import { HelpCircle } from "lucide-react";

const TourHelpButton = () => {
  const { startNextStep } = useNextStep();
  const router = useRouter();

  const handleClick = () => {
    // Detect which page we're on and start appropriate tour
    const currentPath = router.pathname;

    if (currentPath === "/") {
      startNextStep("dashboard");
    } else if (currentPath === "/test") {
      startNextStep("test-page");
    } else if (currentPath === "/learn") {
      // No tour for learn list page
      return;
    } else if (currentPath === "/learn/[topicId]") {
      // Check if we're on welcome screen or learning screen
      const hasMode = router.query.mode;
      if (hasMode) {
        // Learning screen with mode selected
        startNextStep("learn-topic");
      } else {
        // Welcome screen without mode
        startNextStep("learn-topic-welcome");
      }
    } else {
      // Default to dashboard if unknown page
      startNextStep("dashboard");
    }
  };
  return (
    <button
      onClick={handleClick}
      className="text-gray-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-all duration-200 flex items-center gap-1"
      title="Hướng dẫn sử dụng"
    >
      <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      <span className="text-sm hidden lg:inline">Hướng dẫn</span>
    </button>
  );
};

export default TourHelpButton;
