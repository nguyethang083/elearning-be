"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Pagination } from "@/components/test/pagination"; // Adjust path if needed
import { useTopics } from "@/hooks/useTopics"; // Import the custom hook (adjust path)
import TopicItem from "@/pages/test/TopicItem"; // Adjust path if needed

export default function TopicsSection({ onTopicSelect }) {
  // Use the custom hook to get topics, loading state, and error state
  const { topics, loading, error } = useTopics();

  // State for pagination remains in this component
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsPerPage] = useState(5); // Or set to 10 if you want to show all by default

  // Pagination logic
  const indexOfLastTopic = currentPage * topicsPerPage;
  const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
  // Slice the topics array provided by the hook
  const currentTopics = topics.slice(indexOfFirstTopic, indexOfLastTopic);

  // Change page function
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Mock recommended skills and progress for each topic
  const mockTopicDetails = {
    2: {
      progress: 200,
      max: 1000,
      skills: [
        { name: "Số nguyên tố và hợp số (Đại số)", url: "#", code: "8PL" },
        { name: "Số nguyên tố đến 20 (Đại số)", url: "#", code: "TNF" },
      ],
    },
    4: {
      progress: 0,
      max: 1000,
      skills: [
        {
          name: "Hoàn thành dãy số theo quy luật (Đại số)",
          url: "#",
          code: "5P2",
        },
        { name: "So sánh số bằng phép nhân (Đại số)", url: "#", code: "GGE" },
      ],
    },
    9: {
      progress: 0,
      max: 1000,
      skills: [
        {
          name: "Nhận diện phân số tương đương (Đại số)",
          url: "#",
          code: "GSG",
        },
      ],
    },
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading Topics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
        role="alert"
      >
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline ml-2">{error}</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 mt-8">Chuyên đề</h3>
      {topics.length === 0 && !loading ? (
        <p className="text-gray-500">Không tìm thấy chuyên đề nào.</p>
      ) : (
        <div className="space-y-4">
          {currentTopics.map((topic) => {
            // Use mock details for demonstration
            const details = mockTopicDetails[topic.id] || {
              progress: 0,
              max: 1000,
              skills: [],
            };
            return (
              <div key={topic.id}>
                <TopicItem topic={topic} onTopicSelect={onTopicSelect} />
                {/* Compact progress bar and recommended skills below each topic */}
                <div className="mt-2 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    {details.progress > 0 && (
                      <span className="text-xs text-gray-500">
                        Tiến độ: {details.progress} / {details.max}
                      </span>
                    )}
                    {details.skills.length > 0 && (
                      <span className="text-xs text-indigo-700 font-medium">
                        {details.skills.length} kỹ năng được đề xuất
                      </span>
                    )}
                  </div>
                  {details.progress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                      <div
                        className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                        style={{
                          width: `${(details.progress / details.max) * 100}%`,
                        }}
                      ></div>
                    </div>
                  )}
                  <ul className="mt-1 space-y-1">
                    {details.skills.map((skill, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-gray-300"
                          readOnly
                        />
                        <a
                          href={skill.url}
                          className="text-indigo-600 hover:underline"
                        >
                          {skill.name}
                        </a>
                        <span className="text-gray-400">{skill.code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pagination */}
      {/* Only show pagination if there are more topics than fit on one page */}
      {topics.length > topicsPerPage && (
        <div className="mt-8">
          <Pagination
            itemsPerPage={topicsPerPage}
            totalItems={topics.length} // Use the total number of topics from the hook
            paginate={paginate}
            currentPage={currentPage}
          />
        </div>
      )}
    </div>
  );
}
