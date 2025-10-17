"use client";

import { useState, useEffect } from "react";
import { useNextStep } from "nextstepjs";
import { TEST_TOUR_STORAGE_KEY } from "@/config/testTour";
import WelcomeSection from "@/components/test/welcome-section";
import PerformanceSection from "@/components/test/performance-section";
import PlacementTest from "@/components/test/placement-test/PlacementTest";
import { LoadingScreen } from "@/components/common/LoadingScreen"; // Component sẵn có
import { checkUserProfile } from "@/lib/placement-api";

export default function Test() {
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize tour
  const { startNextStep } = useNextStep();

  // Giả sử userData được lấy từ một nguồn khác sau khi xác định đã có profile
  const [userData, setUserData] = useState({
    name: "Hang", // Sẽ cần lấy tên thật từ session/profile
    level: "Sơ cấp",
    progress: 0,
    mathLevel: 0,
  });

  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        setIsLoading(true);
        const profileExists = await checkUserProfile();
        setHasProfile(profileExists);
      } catch (err) {
        setError("Không thể kiểm tra trạng thái người dùng. Vui lòng thử lại.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileStatus();
  }, []);

  // Start test tour on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && hasProfile && !isLoading) {
      const tourCompleted = localStorage.getItem(TEST_TOUR_STORAGE_KEY);

      if (!tourCompleted) {
        const timer = setTimeout(() => {
          console.log("Starting test-page tour...");
          startNextStep("test-page");
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [hasProfile, isLoading, startNextStep]);

  if (isLoading) {
    return <LoadingScreen message="Đang kiểm tra dữ liệu..." />;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>;
  }

  if (hasProfile) {
    return (
      <div className="flex-grow p-6">
        <WelcomeSection userName={userData.name} />
        <PerformanceSection userData={userData} />
      </div>
    );
  } else {
    return <PlacementTest />;
  }
  return <PlacementTest />;
}
