import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/DashboardNavbar";
import Footer from "@/components/Footer";
import SettingsSidebar from "../SettingsSidebar";
import { BookOpen } from "lucide-react"; // Import the logo icon

export default function DashboardLayout({ children, user, isCollapsed }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isCollapsed); // Initialize based on isCollapsed prop

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Sync the sidebar state with the isCollapsed prop when it changes
  useEffect(() => {
    setIsSidebarOpen(!isCollapsed);
  }, [isCollapsed]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <DashboardNavbar
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen} // Pass setIsSidebarOpen here
      />
      {/* Main layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`${
            isSidebarOpen ? "w-64 md:w-48" : "w-16"
          } bg-white text-gray-800 flex-shrink-0 transition-all duration-300 border-r border-gray-200 fixed top-0 h-screen z-40`}
        >
          {/* Sidebar Logo */}
          <div className="flex items-center justify-center h-16 border-b px-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#1A21BC] text-white p-1 rounded">
                <BookOpen className="h-5 w-5" />
              </div>
              {/* Make the text fixed width when visible, and use visibility instead of max-width */}
              <span
                className={`text-xl font-bold whitespace-nowrap transition-opacity duration-300 ${
                  isSidebarOpen
                    ? "opacity-100 visible"
                    : "opacity-0 invisible absolute"
                }`}
              >
                E-learning<span className="text-indigo-600">•</span>
              </span>
            </div>
          </div>
          <SettingsSidebar isCollapsed={!isSidebarOpen} />{" "}
          {/* Pass collapse state */}
        </div>
        {/* Main content */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto ${
            isSidebarOpen ? "ml-64 md:ml-48" : "ml-16"
          }`}
        >
          <div className="flex-1 p-6 bg-gray-50">{children}</div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
