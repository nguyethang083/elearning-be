import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { Layout, BellRing } from "lucide-react"; // Import the collapsible sidebar icon and bell icon
import { useSRSNotifications } from "@/hooks/useSRSNotifications";

const DashboardNavbar = ({
  toggleSidebar,
  isSidebarOpen,
  setIsSidebarOpen,
  isCollapsed,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Use the custom hook for SRS notifications
  const {
    notifications,
    notificationCount,
    upcomingCount,
    totalCount,
    loading: notificationsLoading,
  } = useSRSNotifications();

  const handleLogout = async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    if (session) {
      await signOut({ redirect: false });
    }

    router.push("/login");
  };

  // Automatically close the sidebar if the route is "/test"
  useEffect(() => {
    if (router.pathname === "/test") {
      setIsSidebarOpen(false);
    }
  }, [router.pathname, setIsSidebarOpen]);

  const navigateToSRS = (topicId) => {
    router.push(`/learn/${topicId}?mode=srs`);
    setShowNotifications(false);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center h-16 w-full">
        {/* Toggle Button - Always visible and positioned correctly */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ${
            isSidebarOpen ? "ml-64 md:ml-52" : "ml-20"
          }`}
        >
          <button
            onClick={() => {
              toggleSidebar();
            }}
            className="text-gray-500 hover:text-gray-700 p-2 transition-all duration-300"
          >
            <Layout className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Search Bar - Responsive with proper spacing */}
        <div className="flex-1 px-2 sm:px-4 max-w-lg mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm chuyên đề, bài học..."
              className="w-full py-1.5 sm:py-2 px-3 sm:px-4 pl-8 sm:pl-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Navigation - Fixed flex-shrink */}
        <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0 pr-2 sm:pr-4">
          {/* Settings - Hidden on very small screens */}
          <button className="text-gray-500 hover:text-gray-700 p-1 sm:p-2 hidden sm:block">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              className="text-gray-500 hover:text-gray-700 relative p-1"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <BellRing className="h-5 w-5 sm:h-6 sm:w-6" />
              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown - Responsive positioning with proper z-index */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-md shadow-lg overflow-hidden z-50">
                <div className="py-2 px-3 bg-indigo-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">
                    Flashcards cần ôn tập
                  </h3>
                  {totalCount > 0 && (
                    <div className="flex space-x-2 mt-1 text-xs text-gray-500">
                      {notificationCount > 0 && (
                        <span className="inline-flex items-center">
                          <span className="h-2 w-2 rounded-full bg-red-500 mr-1"></span>
                          {notificationCount} thẻ đến hạn
                        </span>
                      )}
                      {upcomingCount > 0 && (
                        <span className="inline-flex items-center">
                          <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                          {upcomingCount} thẻ sắp đến hạn
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="py-3 px-4 text-center text-sm text-gray-500">
                      Đang tải...
                    </div>
                  ) : notifications.length > 0 ? (
                    <div>
                      {notifications.map((topic) => (
                        <div
                          key={topic.topic_id}
                          className="py-2 px-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                          onClick={() => navigateToSRS(topic.topic_id)}
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-800 truncate mr-2">
                              {topic.topic_name}
                            </p>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {topic.due_count > 0 && (
                                <span className="flex items-center text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                                  {topic.due_count}
                                </span>
                              )}
                              {topic.upcoming_count > 0 && (
                                <span className="flex items-center text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                  {topic.upcoming_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {topic.due_count > 0 && (
                              <span className="font-semibold text-red-600">
                                {topic.due_count} thẻ cần ôn tập ngay
                              </span>
                            )}
                            {topic.due_count > 0 &&
                              topic.upcoming_count > 0 && (
                                <span className="mx-1">•</span>
                              )}
                            {topic.upcoming_count > 0 && (
                              <span>
                                {topic.upcoming_count} thẻ sắp đến hạn
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                      <div className="py-2 px-4 bg-gray-50 text-center">
                        <button
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                          onClick={() => router.push("/learn")}
                        >
                          Xem tất cả chủ đề
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 px-4 text-center text-sm text-gray-500">
                      Không có thẻ nào cần ôn tập
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;