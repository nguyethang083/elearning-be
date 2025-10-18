import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getTopicsWithProgressLearn } from "../../pages/api/helper";

const STATUS = [
  {
    label: "Đã thành thạo",
    color: "bg-blue-500",
    text: "text-blue-700",
    min: 0,
    max: 15,
  },
  {
    label: "Tốt",
    color: "bg-green-500",
    text: "text-green-700",
    min: 15,
    max: 40,
  },
  {
    label: "Cần luyện tập",
    color: "bg-orange-400",
    text: "text-orange-800",
    min: 40,
    max: 70,
  },
  {
    label: "Cần ôn ngay",
    color: "bg-red-500",
    text: "text-red-700",
    min: 70,
    max: 100,
  },
];

function getStatusTag(score) {
  for (const s of STATUS) {
    if (score >= s.min && score < s.max) return s;
  }
  return STATUS[STATUS.length - 1];
}

export default function SyllabusView() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    getTopicsWithProgressLearn()
      .then((res) => {
        console.log("[DEBUG] getTopicsWithProgress response:", res);
        // Nếu trả về mảng, coi như hợp lệ
        if (Array.isArray(res)) {
          setTopics(res);
          setLoading(false);
          return;
        }
        // Nếu trả về object có message chứa topics
        if (res && res.message && Array.isArray(res.message.topics)) {
          setTopics(res.message.topics);
        } else if (
          res &&
          (res.success === true || typeof res.success === "undefined") &&
          Array.isArray(res.topics)
        ) {
          setTopics(res.topics);
        } else {
          setError(res.error || "Lỗi không xác định");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Lỗi không xác định");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        Đang tải chương trình học...
      </div>
    );
  if (error)
    return <div className="text-red-600 text-center py-8">{error}</div>;

  return (
    <div className="max-w-4xl w-full mx-auto py-6 px-2 sm:px-4 md:px-8 lg:px-12">
      <h1 className="text-center font-bold text-2xl md:text-3xl lg:text-4xl leading-tight mb-10">
        <span className="relative inline-block px-8 py-3 rounded-2xl text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 shadow-[0_6px_25px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] transition-shadow duration-500">
          <span
            className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 rounded-2xl -z-10"
            aria-hidden="true"
          ></span>
          <span className="relative drop-shadow-md">Chương trình học</span>
        </span>
      </h1>
      <div className="space-y-6 sm:space-y-8">
        {topics.slice(0, 10).map((topic, idx) => {
          const progress = 100 - Math.round((topic.weakness_score || 0) * 100);
          const status = getStatusTag((topic.weakness_score || 0) * 100);
          return (
            <div
              key={topic.topic_id}
              className="relative flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl shadow-xl border border-gradient-to-r from-indigo-100 to-purple-100 px-3 py-4 sm:px-4 sm:py-5 md:px-8 md:py-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl group w-full"
              style={{ zIndex: 1 }}
            >
              {/* Floating effect */}
              <span className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-400 opacity-20 rounded-full blur-md pointer-events-none"></span>
              <div className="flex flex-col sm:flex-row md:flex-row items-start md:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-4 w-full md:w-auto mb-2 md:mb-0">
                <div className="text-lg md:text-2xl font-extrabold text-indigo-600 w-10 md:w-12 flex-shrink-0 text-center drop-shadow mb-1 sm:mb-0">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-base md:text-lg lg:text-xl break-words leading-tight mb-1">
                    {topic.topic_name || "Chương " + (idx + 1)}
                  </div>
                  <div className="text-gray-500 text-xs md:text-sm mt-1 break-words leading-normal">
                    {topic.description}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 md:gap-0 min-w-0 md:min-w-[180px] w-full md:w-auto mt-2 sm:mt-0">
                <div className="w-full sm:w-28 md:w-40 h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full mb-0 md:mb-2 flex-shrink-0 overflow-hidden relative">
                  <div
                    className={`h-4 rounded-full transition-all duration-700 ${status.color} shadow-md`}
                    style={{ width: `${progress}%` }}
                  ></div>
                  {/* Floating shine effect */}
                  <span className="absolute top-0 left-0 h-4 w-1/3 bg-white opacity-10 rounded-full blur-sm animate-float"></span>
                </div>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold md:mb-2 ${status.text} bg-opacity-30 ${status.color} shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg w-fit sm:w-auto`}
                >
                  {status.label}
                </div>
                <button
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl whitespace-nowrap w-full sm:w-auto"
                  onClick={() => router.push(`/learn/${topic.topic_id}`)}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(20px);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-float {
          animation: float 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
