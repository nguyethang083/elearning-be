import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../pages/api/helper";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

// Dữ liệu mẫu để hiển thị khi không thể tải dữ liệu thực
const sampleData = [
  {
    id: "SAMPLE-TEST-1",
    title: "Sample Test",
    subtitle: "Multiple Choice Test",
    date: "01/01/2025",
    time: "10:00 AM - 11:00 AM",
    duration: "1h",
    marks: "8.5",
    result: "A",
    resultColor: "bg-green-500",
    type: "mcq_test",
    testId: "sample-test",
    status: "Completed",
  },
  {
    id: "UEA-SAMPLE-1",
    title: "Sample Flashcard Exam",
    subtitle: "20 questions",
    date: "02/01/2025",
    time: "2:00 PM - 3:00 PM",
    duration: "1h",
    type: "flashcard_exam",
    topicId: "sample-topic",
    status: "Completed",
  },
];

const AssignmentTable = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examType, setExamType] = useState("all"); // 'all', 'flashcard', 'test'
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchAllAssessmentHistory = async () => {
      try {
        setLoading(true);

        // Fetch both types of assessments
        const [examResponse, testAttemptsResponse] = await Promise.all([
          fetchWithAuth(
            "user_exam_attempt.user_exam_attempt.get_user_exam_history"
          ),
          fetchWithAuth(
            "test_attempt.test_attempt.get_user_attempts_for_all_tests"
          ),
        ]);

        let formattedData = [];

        // Process User Exam Attempts (Flashcard Exams)
        if (
          examResponse &&
          examResponse.message &&
          examResponse.message.attempts &&
          examResponse.message.attempts.length > 0
        ) {
          console.log(
            `Processing ${examResponse.message.attempts.length} flashcard exam attempts`
          );
          const examAttempts = await Promise.all(
            examResponse.message.attempts.map(async (attempt) => {
              // Calculate duration from creation to completion timestamp
              let duration = "N/A";
              if (attempt.time_spent_seconds) {
                const durationMinutes = Math.round(
                  attempt.time_spent_seconds / 60
                );
                if (durationMinutes >= 60) {
                  const hours = Math.floor(durationMinutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${durationMinutes || 1}m`;
                }
              } else if (attempt.end_time) {
                const startTime = new Date(
                  attempt.start_time || attempt.creation
                );
                const endTime = new Date(attempt.end_time);
                const durationMinutes = Math.round(
                  (endTime - startTime) / (1000 * 60)
                );

                if (durationMinutes >= 60) {
                  const hours = Math.floor(durationMinutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${durationMinutes || 1}m`;
                }
              } else {
                // Default minimal duration for exams without time info
                duration = "1m";
              }

              // Format date and time
              const examDate = new Date(attempt.start_time || attempt.creation);
              const formattedDate = examDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              const startTime = examDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              let endTime = "";
              if (attempt.end_time || attempt.completion_timestamp) {
                const completionDate = new Date(
                  attempt.end_time || attempt.completion_timestamp
                );
                endTime = completionDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
              } else {
                // For exams without an end time, calculate an estimated end time
                // Add at least 1 minute to the start time
                const estimatedEnd = new Date(
                  examDate.getTime() + (attempt.time_spent_seconds || 60) * 1000
                );
                endTime = estimatedEnd.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
              }

              return {
                id: attempt.name,
                title: attempt.topic_name || `Bài kiểm tra: ${attempt.topic}`,
                subtitle: `${attempt.total_questions || 0} câu hỏi`,
                date: formattedDate,
                time: `${startTime}${endTime ? ` - ${endTime}` : ""}`,
                duration: duration,
                type: "flashcard_exam",
                topicId: attempt.topic,
                status: "Completed",
              };
            })
          );

          formattedData = [...formattedData, ...examAttempts];
        } else if (
          examResponse &&
          examResponse.success &&
          examResponse.attempts &&
          examResponse.attempts.length > 0
        ) {
          // Hỗ trợ cấu trúc API cũ
          console.log(
            `Processing ${examResponse.attempts.length} flashcard exam attempts`
          );
          const examAttempts = await Promise.all(
            examResponse.attempts.map(async (attempt) => {
              // Tương tự xử lý như trên
              let duration = "N/A";
              if (attempt.time_spent_seconds) {
                const durationMinutes = Math.round(
                  attempt.time_spent_seconds / 60
                );
                if (durationMinutes >= 60) {
                  const hours = Math.floor(durationMinutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${durationMinutes || 1}m`;
                }
              } else if (attempt.end_time || attempt.completion_timestamp) {
                const startTime = new Date(
                  attempt.start_time || attempt.creation
                );
                const endTime = new Date(
                  attempt.end_time || attempt.completion_timestamp
                );
                const durationMinutes = Math.round(
                  (endTime - startTime) / (1000 * 60)
                );

                if (durationMinutes >= 60) {
                  const hours = Math.floor(durationMinutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${durationMinutes || 1}m`;
                }
              } else {
                // Default minimal duration for exams without time info
                duration = "1m";
              }

              const examDate = new Date(attempt.start_time || attempt.creation);
              const formattedDate = examDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              const startTime = examDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              let endTime = "";
              if (attempt.end_time || attempt.completion_timestamp) {
                const completionDate = new Date(
                  attempt.end_time || attempt.completion_timestamp
                );
                endTime = completionDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
              } else {
                // For exams without an end time, calculate an estimated end time
                // Add at least 1 minute to the start time
                const estimatedEnd = new Date(
                  examDate.getTime() + (attempt.time_spent_seconds || 60) * 1000
                );
                endTime = estimatedEnd.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
              }

              return {
                id: attempt.name,
                title: attempt.topic_name || `Flashcard Exam: ${attempt.topic}`,
                subtitle: `${attempt.total_questions || 0} câu hỏi`,
                date: formattedDate,
                time: `${startTime}${endTime ? ` - ${endTime}` : ""}`,
                duration: duration,
                type: "flashcard_exam",
                topicId: attempt.topic,
                status: "Completed",
              };
            })
          );

          formattedData = [...formattedData, ...examAttempts];
        }

        // Process Test Attempts (Multiple Choice Tests)
        if (
          testAttemptsResponse &&
          testAttemptsResponse.message &&
          Array.isArray(testAttemptsResponse.message) &&
          testAttemptsResponse.message.length > 0
        ) {
          console.log(
            `Processing ${testAttemptsResponse.message.length} test attempts`
          );
          const testAttempts = testAttemptsResponse.message.map((attempt) => {
            // Tính điểm theo thang điểm 10
            let score = "N/A";
            let resultGrade = "N/A";
            let resultColor = "bg-gray-400";

            if (attempt.final_score !== null) {
              // Điều chỉnh: Giả sử final_score là số câu đúng trên tổng 50 câu
              const totalQuestions = 5;
              const correctAnswers = attempt.final_score;

              // Chuyển đổi sang thang điểm 10
              score = (correctAnswers / totalQuestions) * 10;
              score = parseFloat(score.toFixed(1)); // Làm tròn 1 chữ số thập phân

              // Xác định grade dựa trên thang điểm 10
              if (score >= 8.5) {
                resultGrade = "A";
                resultColor = "bg-green-500";
              } else if (score >= 7) {
                resultGrade = "B";
                resultColor = "bg-yellow-500";
              } else if (score >= 5.5) {
                resultGrade = "C";
                resultColor = "bg-orange-400";
              } else {
                resultGrade = "D";
                resultColor = "bg-red-500";
              }
            }

            // Format date and time
            const startDate = new Date(attempt.start_time);
            const formattedDate = startDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            const startTime = startDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            let endTime = "";
            let duration = "N/A";

            if (attempt.end_time) {
              const endDate = new Date(attempt.end_time);
              endTime = endDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              // Calculate duration
              if (attempt.time_taken_seconds) {
                const minutes = Math.round(attempt.time_taken_seconds / 60);
                if (minutes >= 60) {
                  const hours = Math.floor(minutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${minutes}m`;
                }
              }
            }

            return {
              id: attempt.id,
              title: attempt.test_title || `Test: ${attempt.test_id}`,
              subtitle: "Multiple Choice Test",
              date: formattedDate,
              time: `${startTime}${endTime ? ` - ${endTime}` : ""}`,
              duration: duration,
              marks: score,
              result: resultGrade,
              resultColor: resultColor,
              type: "mcq_test",
              testId: attempt.test_id,
              status: attempt.status,
            };
          });

          formattedData = [...formattedData, ...testAttempts];
        } else if (
          testAttemptsResponse &&
          Array.isArray(testAttemptsResponse) &&
          testAttemptsResponse.length > 0
        ) {
          // Cấu trúc API mới - trực tiếp mảng (không được bọc trong message)
          console.log(
            `Processing ${testAttemptsResponse.length} test attempts`
          );
          const testAttempts = testAttemptsResponse.map((attempt) => {
            // Tính điểm theo thang điểm 10
            let score = "N/A";
            let resultGrade = "N/A";
            let resultColor = "bg-gray-400";

            if (attempt.final_score !== null) {
              // Điều chỉnh: Giả sử final_score là số câu đúng trên tổng 50 câu
              const totalQuestions = 50;
              const correctAnswers = attempt.final_score;

              // Chuyển đổi sang thang điểm 10
              score = (correctAnswers / totalQuestions) * 10;
              score = parseFloat(score.toFixed(1)); // Làm tròn 1 chữ số thập phân

              // Xác định grade dựa trên thang điểm 10
              if (score >= 8.5) {
                resultGrade = "A";
                resultColor = "bg-green-500";
              } else if (score >= 7) {
                resultGrade = "B";
                resultColor = "bg-yellow-500";
              } else if (score >= 5.5) {
                resultGrade = "C";
                resultColor = "bg-orange-400";
              } else {
                resultGrade = "D";
                resultColor = "bg-red-500";
              }
            }

            // Format date and time
            const startDate = new Date(attempt.start_time);
            const formattedDate = startDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            const startTime = startDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            let endTime = "";
            let duration = "N/A";

            if (attempt.end_time) {
              const endDate = new Date(attempt.end_time);
              endTime = endDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              // Calculate duration
              if (attempt.time_taken_seconds) {
                const minutes = Math.round(attempt.time_taken_seconds / 60);
                if (minutes >= 60) {
                  const hours = Math.floor(minutes / 60);
                  duration = `${hours} hr`;
                } else {
                  duration = `${minutes}m`;
                }
              }
            }

            return {
              id: attempt.id,
              title: attempt.test_title || `Test: ${attempt.test_id}`,
              subtitle: "Multiple Choice Test",
              date: formattedDate,
              time: `${startTime}${endTime ? ` - ${endTime}` : ""}`,
              duration: duration,
              marks: score,
              result: resultGrade,
              resultColor: resultColor,
              type: "mcq_test",
              testId: attempt.test_id,
              status: attempt.status || "Completed",
            };
          });

          formattedData = [...formattedData, ...testAttempts];
        }

        // Check if we have any data after processing
        if (formattedData.length === 0) {
          console.log("No real data found");
        } else {
          console.log(`Found ${formattedData.length} real exam/test records`);
        }

        // Sort all data by date (newest first)
        formattedData.sort((a, b) => {
          const dateA = new Date(a.date.split("/").reverse().join("-"));
          const dateB = new Date(b.date.split("/").reverse().join("-"));
          return dateB - dateA;
        });

        setAssignments(formattedData);
        setFilteredAssignments(formattedData);
      } catch (error) {
        console.error("Error fetching assessment history:", error);

        setAssignments(sampleData);
        setFilteredAssignments(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAssessmentHistory();
  }, []);

  useEffect(() => {
    if (examType === "all") {
      setFilteredAssignments(assignments);
    } else {
      const filtered = assignments.filter((assignment) => {
        if (examType === "flashcard") {
          const isFlashcard = assignment.id.startsWith("UEA");
          return isFlashcard;
        } else if (examType === "test") {
          const isTest = !assignment.id.startsWith("UEA");
          return isTest;
        }
        return true;
      });

      setFilteredAssignments(filtered);
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [examType, assignments]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Chuyển hướng đến trang chi tiết
  const handleViewDetails = (assignment) => {
    if (assignment.id.startsWith("UEA")) {
      // Flashcard exam - ID bắt đầu bằng UEA
      window.location.href = `/report/exam-details/${assignment.id}`;
    } else {
      // Multiple choice test - ID không bắt đầu bằng UEA
      window.location.href = `/test/${assignment.testId}/test-result/${assignment.id}`;
    }
  };

  // Hiển thị các cột phù hợp với loại exam
  const getColumns = () => {
    if (examType === "flashcard") {
      // Flashcard exams không hiển thị Marks và Result
      return [
        { id: "exam", label: "Bài kiểm tra", width: "28%" },
        { id: "date", label: "Ngày & Giờ", width: "28%" },
        { id: "duration", label: "Thời gian", width: "14%" },
        { id: "status", label: "Trạng thái", width: "15%" },
        { id: "actions", label: "Hành động", width: "15%" },
      ];
    } else if (examType === "test") {
      // Multiple choice tests hiển thị đầy đủ các cột trừ Result
      return [
        { id: "exam", label: "Bài kiểm tra", width: "23%" },
        { id: "date", label: "Ngày & Giờ", width: "18%" },
        { id: "duration", label: "Thời gian", width: "9%" },
        { id: "marks", label: "Điểm", width: "8%" },
        { id: "status", label: "Trạng thái", width: "12%" },
        { id: "actions", label: "Hành động", width: "15%" },
      ];
    } else {
      // Mặc định (All) - động dựa trên loại dữ liệu hiển thị
      return [
        { id: "exam", label: "Bài kiểm tra", width: "23%" },
        { id: "date", label: "Ngày & Giờ", width: "18%" },
        { id: "duration", label: "Thời gian", width: "9%" },
        ...(filteredAssignments.some((a) => !a.id.startsWith("UEA"))
          ? [{ id: "marks", label: "Điểm", width: "8%" }]
          : []),
        { id: "status", label: "Trạng thái", width: "12%" },
        { id: "actions", label: "Hành động", width: "15%" },
      ];
    }
  };

  const columns = getColumns();

  // Hiển thị trạng thái (Status)
  const renderStatus = (assignment) => {
    // Always show "Hoàn thành" for flashcard exams (UEA)
    if (assignment.id.startsWith("UEA")) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
          Hoàn thành
        </span>
      );
    } else if (assignment.status === "Completed") {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
          Hoàn thành
        </span>
      );
    } else if (assignment.status === "In Progress") {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
          Đang tiến hành
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200 shadow-sm">
          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2"></div>
          {assignment.status || "Không xác định"}
        </span>
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-medium">Bài kiểm tra</div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Lọc theo:</span>
          <select
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 shadow-sm"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
          >
            <option value="all">Tất cả bài kiểm tra</option>
            <option value="flashcard">Flashcard Exams</option>
            <option value="test">Multiple Choice Tests</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Không có lịch sử bài kiểm tra. Hoàn thành bài kiểm tra để xem kết
            quả ở đây.
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="pb-3 text-left text-xs font-normal text-gray-500"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="py-4 pr-8">
                    <div>
                      <div className="text-sm font-medium">
                        {assignment.title}
                      </div>
                      {assignment.subtitle && (
                        <div className="text-xs text-gray-500">
                          {assignment.subtitle}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 pl-8">
                    <div className="text-sm">{assignment.date}</div>
                    <div className="text-xs text-gray-500">
                      {assignment.time}
                    </div>
                  </td>
                  <td className="py-4 text-sm">{assignment.duration}</td>

                  {/* Marks column - chỉ hiển thị cho Multiple Choice Tests */}
                  {columns.some((col) => col.id === "marks") && (
                    <td className="py-4 text-sm">
                      {!assignment.id.startsWith("UEA")
                        ? assignment.marks
                        : "-"}
                    </td>
                  )}

                  {/* Status column */}
                  <td className="py-4">{renderStatus(assignment)}</td>

                  {/* Actions column */}
                  <td className="py-4">
                    <button
                      onClick={() => handleViewDetails(assignment)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Eye className="h-4 w-4" />
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Hiển thị {startIndex + 1}-
            {Math.min(endIndex, filteredAssignments.length)} của{" "}
            {filteredAssignments.length} kết quả
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      page === currentPage
                        ? "text-blue-600 bg-blue-50 border border-blue-300"
                        : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentTable;
