import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const ProfileSetting = ({ user }) => {
  // Calendar state - use current date
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const todoItems = [
    {
      id: 1,
      text: "Đánh giá chương: Tam giác vuông",
      subject: "Toán",
      deadline: "08:00 AM",
      completed: false,
    },
    { id: 2, text: "Làm bài tập 1", completed: true },
    { id: 3, text: "Làm bài tập 2", completed: false },
    {
      id: 4,
      text: "Hoàn thành 10 bài tập về Hàm số",
      subject: "Toán",
      deadline: "02:40 PM",
      completed: false,
    },
    {
      id: 5,
      text: "Hoàn thành bài kiểm tra thực hành số 1",
      subject: "Toán",
      deadline: "04:50 PM",
      completed: true,
    },
  ];

  // Helper to generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;
    const currentDay = today.getDate();

    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-6 w-6"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === currentDay;

      calendarDays.push(
        <div
          key={day}
          className={`h-6 w-6 flex items-center justify-center text-xs rounded-full cursor-pointer transition-colors
                     ${
                       isToday
                         ? "bg-indigo-600 text-white"
                         : "hover:bg-gray-100"
                     }`}
        >
          {day}
        </div>
      );
    }

    return calendarDays;
  };

  // Previous month
  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  // Next month
  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="h-full">
      {/* Profile section */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Hồ sơ cá nhân</h2>
          <Link href="/profile" className="text-gray-400 hover:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </Link>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative">
            {/* Circular background with blue edge */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
              >
                <circle cx="50" cy="50" r="48" fill="#E6F7FF" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4FD1C5"
                  strokeWidth="3"
                  strokeDasharray="283"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>

              {/* Profile Image */}
              <div className="w-16 h-16 rounded-full overflow-hidden z-10 bg-blue-50">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user?.name || "Student"}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized={user.avatar.includes("googleusercontent.com")}
                  />
                ) : (
                  <Image
                    src="/images/student_image.png"
                    alt={user?.name || "Student"}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                )}
              </div>
            </div>

            <div className="absolute -bottom-1 right-1">
              <span className="flex h-5 w-5">
                <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-2.5 w-2.5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </span>
            </div>
          </div>
          <h3 className="mt-2 text-sm font-medium">
            {user?.name || "Quý Lê Minh"}
          </h3>
          <p className="text-xs text-gray-500">Học sinh</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {currentMonth.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={prevMonth}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center mb-1 mt-3">
          {days.map((day) => (
            <div key={day} className="text-[10px] font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 justify-items-center">
          {generateCalendarDays()}
        </div>
      </div>

      {/* To Do List */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          Danh sách công việc
        </h2>

        <div className="space-y-3">
          {todoItems.map((item) => (
            <div key={item.id} className="flex items-start space-x-2.5">
              <input
                type="checkbox"
                checked={item.completed}
                className={`mt-0.5 h-4 w-4 rounded ${
                  item.completed
                    ? "text-green-500 border-green-500"
                    : "text-indigo-600 border-gray-300"
                }`}
                readOnly
              />
              <div
                className={`flex-1 ${
                  item.completed
                    ? "line-through text-gray-400"
                    : "text-gray-800"
                }`}
              >
                <p className="text-xs font-medium">{item.text}</p>
                {item.subject && (
                  <div className="flex items-center mt-1">
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded mr-1.5">
                      {item.subject}
                    </span>
                    {item.deadline && (
                      <span className="text-[10px] text-gray-400">
                        {item.deadline}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetting;
