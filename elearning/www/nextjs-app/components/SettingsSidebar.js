import Link from "next/link";
import React from "react";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  PieChart,
  Compass,
} from "lucide-react";

const SettingsSidebar = ({ isCollapsed }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    if (session) {
      await signOut({ redirect: false });
    }

    router.push("/login");
  };

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard /> },
    { label: "Learn", href: "/learn", icon: <GraduationCap /> },
    { label: "My Pathway", href: "/my-pathway", icon: <Compass /> },
    { label: "Test", href: "/test", icon: <FileText /> },
    { label: "Report", href: "/report", icon: <PieChart /> },
    { label: "Analytics", href: "/analysis", icon: <BarChart3 /> },
  ];

  const settingsItems = [
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogOut />,
      className: "text-red-500 hover:bg-red-50",
    },
  ];

  return (
    <aside className="h-full flex flex-col bg-white">
      <div className="flex-grow p-3">
        <div className="mb-8">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`flex items-center ${
                    isCollapsed ? "justify-center" : "px-4"
                  } py-2.5 rounded-lg transition-all duration-200 ${
                    router.pathname === item.href
                      ? "bg-indigo-50 text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>
                    {React.cloneElement(item.icon, {
                      className: `w-5 h-5 ${
                        router.pathname === item.href
                          ? "stroke-indigo-600"
                          : "stroke-current"
                      }`,
                    })}
                  </span>
                  {!isCollapsed && (
                    <span className="ml-3 font-medium text-sm">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <ul className="space-y-2">
            {settingsItems.map((item, index) => (
              <li key={index}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`flex items-center ${
                      isCollapsed ? "justify-center" : "px-4"
                    } py-2.5 rounded-lg transition-all duration-200 ${
                      router.pathname === item.href
                        ? "bg-indigo-50 text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    } ${item.className || ""}`}
                  >
                    <span>
                      {React.cloneElement(item.icon, {
                        className: `w-5 h-5 ${
                          router.pathname === item.href
                            ? "stroke-indigo-600"
                            : "stroke-current"
                        }`,
                      })}
                    </span>
                    {!isCollapsed && (
                      <span className="ml-3 font-medium text-sm">
                        {item.label}
                      </span>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    className={`flex items-center ${
                      isCollapsed ? "justify-center" : "px-4"
                    } py-2.5 rounded-lg transition-all duration-200 w-full text-left ${
                      item.className ||
                      "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>
                      {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                    </span>
                    {!isCollapsed && (
                      <span className="ml-3 font-medium text-sm">
                        {item.label}
                      </span>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default SettingsSidebar;