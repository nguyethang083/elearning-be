"use client";

import React, { useState, useEffect, useMemo } from "react";
import "katex/dist/katex.min.css";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter,
  AlertCircle,
  ChevronLeft,
  ClipboardCheck,
} from "lucide-react";
import { parseLatex } from "@/lib/utils";

const renderContentItem = (item, defaultText = "N/A") => {
  if (
    item === null ||
    item === undefined ||
    (typeof item === "string" && item.trim() === "")
  ) {
    if (defaultText === "N/A") {
      return <span className="text-gray-500 italic">{defaultText}</span>;
    }
    return parseLatex(defaultText);
  }
  return parseLatex(String(item));
};

const renderQuestionContent = (content) => {
  return parseLatex(content);
};
const renderAnswer = (answerData, question, isCorrectAnswerKey = false) => {
  // --- 1. Xử lý hiển thị cho "Correct Answer" (answer_key_display) ---
  if (isCorrectAnswerKey) {
    if (
      question.q_type === "Essay" &&
      Array.isArray(question.answer_key_display)
    ) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 mb-1">
            Thang điểm gốc của câu hỏi:
          </p>
          <ol className="list-decimal ml-5 space-y-1 text-xs">
            {question.answer_key_display.map((rubric_item, idx) => (
              <li key={rubric_item.id || idx} className="py-1">
                <div className="font-medium">
                  {renderContentItem(rubric_item.description, "Không có mô tả")}
                </div>
                {typeof rubric_item.max_score === "number" && (
                  <div className="text-gray-500 ml-4">
                    (Điểm tối đa: {rubric_item.max_score})
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if (
      question.q_type === "Multiple Choice" &&
      typeof question.answer_key_display === "string" &&
      Array.isArray(question.options)
    ) {
      const correctOption = question.options.find(
        (opt) => opt.id === question.answer_key_display
      );
      return renderContentItem(
        correctOption
          ? correctOption.text
          : `ID: ${question.answer_key_display}`,
        "Không tìm thấy đáp án"
      );
    }
    if (typeof question.answer_key_display === "string") {
      return renderContentItem(question.answer_key_display, "Không có đáp án");
    }
    return <span className="text-gray-500 italic">Không có đáp án</span>;
  }

  // --- 2. Xử lý hiển thị cho "Your Answer" (user_answer hoặc ai_rubric_scores) ---
  if (question.q_type === "Essay") {
    // Nếu không có bài làm (user_answer_text, user_submitted_images, ai_rubric_scores đều rỗng)
    const noText =
      !question.user_answer_text || question.user_answer_text.trim() === "";
    const noImages =
      !Array.isArray(question.user_submitted_images) ||
      question.user_submitted_images.length === 0;
    const noRubricScores =
      !Array.isArray(question.ai_rubric_scores) ||
      question.ai_rubric_scores.length === 0;
    if (noText && noImages && noRubricScores) {
      return <span className="text-gray-500 italic">Bài làm trống</span>;
    }
    return (
      <div className="space-y-3">
        {question.user_answer_text && (
          <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Bài làm của học sinh (văn bản):
            </p>
            {renderContentItem(
              question.user_answer_text,
              "Không có nội dung văn bản."
            )}
          </div>
        )}
        {Array.isArray(question.user_submitted_images) &&
          question.user_submitted_images.length > 0 && (
            <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Hình ảnh học sinh đã nộp:
              </p>
              <div className="flex flex-wrap gap-2">
                {question.user_submitted_images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    {img.name || `Ảnh ${idx + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

        <p className="text-xs font-semibold text-gray-700 mb-1">
          Đánh giá chi tiết:
        </p>
        <ol className="list-none space-y-2 text-xs">
          {(() => {
            // Sort ai_rubric_scores based on the order in answer_key_display
            const sortedRubricScores = Array.isArray(
              question.answer_key_display
            )
              ? question.answer_key_display
                  .map((answerKeyItem) => {
                    // Find the corresponding score item for this answer key item
                    return question.ai_rubric_scores.find(
                      (score_item) =>
                        score_item.rubric_item_id === answerKeyItem.id
                    );
                  })
                  .filter(Boolean) // Remove any undefined items
              : question.ai_rubric_scores;

            return sortedRubricScores.map((score_item, idx) => {
              // Find the corresponding description from answer_key_display
              const answerKeyItem = Array.isArray(question.answer_key_display)
                ? question.answer_key_display.find(
                    (item) => item.id === score_item.rubric_item_id
                  )
                : null;

              const displayDescription = answerKeyItem
                ? answerKeyItem.description
                : score_item.criterion_description;

              return (
                <li
                  key={score_item.rubric_score_item_doc_name || idx}
                  className="p-2 border rounded shadow-sm bg-white"
                >
                  <div className="font-medium text-gray-800">
                    {idx + 1}.{" "}
                    {renderContentItem(
                      displayDescription,
                      "Không có mô tả tiêu chí"
                    )}
                  </div>
                  <div className="text-green-600 font-semibold ml-4 my-1">
                    Điểm: {score_item.points_awarded_by_ai} /{" "}
                    {score_item.criterion_max_score ?? "?"}
                  </div>
                  {score_item.ai_comment && (
                    <div className="text-gray-600 ml-4 italic">
                      Nhận xét: "{renderContentItem(score_item.ai_comment, "")}"
                    </div>
                  )}
                </li>
              );
            });
          })()}
        </ol>
        {question.ai_overall_feedback_for_question && (
          <div className="mt-3 pt-2 border-t">
            <h5 className="text-xs font-semibold text-gray-700 mb-1">
              Nhận xét tổng quan cho câu này:
            </h5>
            <p className="text-xs text-gray-600 italic">
              "
              {renderContentItem(question.ai_overall_feedback_for_question, "")}
              "
            </p>
          </div>
        )}
      </div>
    );
  }

  if (
    question.q_type === "Multiple Choice" &&
    typeof answerData === "string" &&
    Array.isArray(question.options)
  ) {
    const selectedOption = question.options.find(
      (opt) => opt.id === answerData
    );
    if (selectedOption) {
      return renderContentItem(selectedOption.text, "Không tìm thấy lựa chọn");
    } else {
      return (
        <span className="text-orange-600 italic">
          ID Lựa chọn: {answerData} (Không tìm thấy nội dung)
        </span>
      );
    }
  }

  if (
    answerData === null ||
    answerData === undefined ||
    (typeof answerData === "string" && answerData.trim() === "")
  ) {
    // Nếu không có bài làm, hiển thị "Bài làm trống"
    return <span className="text-gray-500 italic">Bài làm trống</span>;
  }

  if (typeof answerData === "string") {
    return renderContentItem(answerData);
  }

  return <span className="text-xs font-mono">[Dữ liệu phức tạp]</span>;
};
export default function TestResultsTable({ questions = [], searchQuery = "" }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "index",
    direction: "asc",
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  console.log("TestResultsTable received questions prop:", questions);

  const questionsWithIndex = useMemo(
    () => questions.map((q, index) => ({ ...q, index: index + 1 })),
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    return questionsWithIndex.filter((question) => {
      const content = question.q_content || "";
      const matchesSearch = content
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === "all") return true;

      if (question.q_type === "Essay") {
        const feedback = question.ai_overall_feedback_for_question || "";
        const hasAiScore =
          typeof question.ai_total_score_for_question === "number";

        if (
          filterStatus === "graded_essay" &&
          hasAiScore &&
          !feedback.includes("Cần chấm thủ công") &&
          !feedback.includes("Lỗi trong quá trình chấm điểm bằng AI")
        )
          return true;
        if (
          filterStatus === "needs_grading_essay" &&
          (feedback.includes("Cần chấm thủ công") ||
            feedback.includes("Lỗi trong quá trình chấm điểm bằng AI") ||
            (!hasAiScore && !feedback))
        )
          return true;
      } else {
        if (filterStatus === "correct" && question.is_correct === 1)
          return true;
        if (filterStatus === "incorrect" && question.is_correct === 0)
          return true;
        if (
          filterStatus === "not_graded_other" &&
          (question.is_correct === null || question.is_correct === undefined)
        )
          return true;
      }
      return false;
    });
  }, [questionsWithIndex, searchQuery, filterStatus]);

  const sortedQuestions = useMemo(() => {
    return [...filteredQuestions].sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === "status") {
        const getSortableStatus = (q) => {
          if (q.q_type === "Essay") {
            const feedback = q.ai_overall_feedback_for_question || "";
            const hasAiScore =
              typeof q.ai_total_score_for_question === "number";
            if (
              feedback.includes("Cần chấm thủ công") ||
              feedback.includes("Lỗi trong quá trình chấm điểm bằng AI")
            )
              return 4;
            if (hasAiScore) return 3;
            return 5;
          } else {
            if (q.is_correct === 1) return 1;
            if (q.is_correct === 0) return 2;
            return 6;
          }
        };
        aValue = getSortableStatus(a);
        bValue = getSortableStatus(b);
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredQuestions, sortConfig]);

  const totalPages = Math.ceil(sortedQuestions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setCurrentPage(1);
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (status) => {
    setCurrentPage(1);
    setFilterStatus(status);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedRows({});
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return (
        <span className="ml-1 opacity-30 group-hover:opacity-60 transition-opacity">
          ↕
        </span>
      );
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const filterOptions = [
    { value: "all", label: "Tất cả" },
    { value: "correct", label: "Đúng (Trắc nghiệm/Điền từ)" },
    { value: "incorrect", label: "Sai (Trắc nghiệm/Điền từ)" },
    { value: "graded_essay", label: "Tự luận: Đã chấm" },
    { value: "needs_grading_essay", label: "Tự luận: Cần chấm/Chờ" },
    { value: "not_graded_other", label: "Khác: Chưa chấm" },
  ];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">
        Chi tiết câu hỏi
      </h2>
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm text-gray-500">
          {filteredQuestions.length} câu hỏi{" "}
          {searchQuery ? `khớp với "${searchQuery}"` : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Lọc trạng thái:{" "}
              {filterOptions.find((opt) => opt.value === filterStatus)?.label ||
                "Tất cả"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {filterOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table className="bg-white">
          <TableHeader className="bg-white border-b">
            <TableRow>
              <TableHead className="w-12 px-2"></TableHead>
              <TableHead
                className="w-16 px-3 py-3 cursor-pointer group"
                onClick={() => requestSort("index")}
              >
                <div className="flex items-center">
                  STT {getSortIcon("index")}
                </div>
              </TableHead>
              <TableHead className="min-w-[300px] px-4 py-3">Câu hỏi</TableHead>
              <TableHead
                className="w-48 px-4 py-3 cursor-pointer group"
                onClick={() => requestSort("status")}
              >
                <div className="flex items-center">
                  Trạng thái {getSortIcon("status")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuestions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-gray-500"
                >
                  {questions.length === 0
                    ? "Không có câu hỏi nào trong kết quả này."
                    : "Không tìm thấy câu hỏi nào khớp với tiêu chí của bạn."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedQuestions.map((question) => {
                let statusDisplay;
                if (question.q_type === "Essay") {
                  const feedback =
                    question.ai_overall_feedback_for_question || "";
                  const hasAiScore =
                    typeof question.ai_total_score_for_question === "number";

                  if (
                    feedback.includes("Cần chấm thủ công") ||
                    feedback.includes("Lỗi trong quá trình chấm điểm bằng AI")
                  ) {
                    statusDisplay = (
                      <div className="flex items-center text-orange-500 font-medium">
                        <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>Cần chấm thủ công</span>
                      </div>
                    );
                  } else if (hasAiScore) {
                    statusDisplay = (
                      <div className="flex items-center text-blue-600 font-medium">
                        <ClipboardCheck className="h-4 w-4 mr-1.5 shrink-0" />
                        {/* THAY ĐỔI: Bỏ chữ "(AI)" */}
                        <span>Đã chấm</span>
                      </div>
                    );
                  } else {
                    statusDisplay = (
                      <div className="flex items-center text-gray-500 font-medium">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 mr-1.5 shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm8-5.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm0 10.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Chờ chấm</span>
                      </div>
                    );
                  }
                } else {
                  if (question.is_correct === 1) {
                    statusDisplay = (
                      <div className="flex items-center text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>Đúng</span>
                      </div>
                    );
                  } else if (question.is_correct === 0) {
                    statusDisplay = (
                      <div className="flex items-center text-red-600 font-medium">
                        <XCircle className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>Sai</span>
                      </div>
                    );
                  } else {
                    statusDisplay = (
                      <div className="flex items-center text-amber-600 font-medium">
                        <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>Chưa chấm</span>
                      </div>
                    );
                  }
                }

                return (
                  <React.Fragment key={question.test_question_id}>
                    <TableRow className="hover:bg-gray-50 text-sm border-b">
                      <TableCell className="px-2 py-2 align-top">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleRow(question.test_question_id)}
                          aria-label={
                            expandedRows[question.test_question_id]
                              ? "Thu gọn"
                              : "Mở rộng"
                          }
                        >
                          {expandedRows[question.test_question_id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium px-3 py-3 align-top">
                        {question.index}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        {renderQuestionContent(question.q_content)}
                        {/* Image Display */}
                        {question.q_image_url && (
                          <div className="mt-2 flex">
                            <img
                              src={`/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(
                                question.q_image_url
                              )}`}
                              alt={`Illustration for question ${question.index}`}
                              className="max-h-44 w-auto rounded shadow border object-contain"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        {statusDisplay}
                      </TableCell>
                    </TableRow>
                    {expandedRows[question.test_question_id] && (
                      <TableRow className="bg-white hover:bg-gray-50 text-sm">
                        <TableCell
                          colSpan={4}
                          className="p-4 space-y-4 text-xs border-t border-gray-200"
                        >
                          <div>
                            <h4 className="font-semibold mb-1.5 text-gray-600">
                              Câu trả lời của bạn:
                            </h4>
                            <div
                              className={`p-3 rounded border text-gray-800 ${
                                question.q_type !== "Essay" &&
                                question.is_correct === 1
                                  ? "border-green-300 bg-green-50"
                                  : question.q_type !== "Essay" &&
                                    question.is_correct === 0
                                  ? "border-red-300 bg-red-50"
                                  : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              {renderAnswer(
                                question.q_type === "Essay"
                                  ? question.ai_rubric_scores
                                  : question.user_answer_text,
                                question,
                                false
                              )}
                            </div>
                          </div>

                          {question.q_type !== "Essay" &&
                            question.is_correct !== 1 && (
                              <div>
                                <h4 className="font-semibold mb-1.5 text-gray-600">
                                  Đáp án đúng:
                                </h4>
                                <div className="p-3 rounded border border-blue-200 bg-blue-50 text-gray-800">
                                  {renderAnswer(
                                    question.answer_key_display,
                                    question,
                                    true
                                  )}
                                </div>
                              </div>
                            )}
                          {question.q_type === "Essay" && (
                            <div>
                              <h4 className="font-semibold mb-1.5 text-gray-600">
                                Thang điểm gốc:
                              </h4>
                              <div className="p-3 rounded border border-blue-200 bg-blue-50 text-gray-800">
                                {renderAnswer(
                                  question.answer_key_display,
                                  question,
                                  true
                                )}
                              </div>
                            </div>
                          )}

                          {question.explanation && (
                            <div>
                              <h4 className="font-semibold mb-1.5 text-gray-600">
                                Giải thích:
                              </h4>
                              <div className="p-3 rounded border border-gray-200 bg-gray-50 prose prose-sm max-w-none">
                                {renderQuestionContent(question.explanation)}
                              </div>
                            </div>
                          )}

                          <div className="text-gray-500 pt-1">
                            Điểm đạt được:{" "}
                            <span className="font-medium text-gray-700">
                              {typeof question.points_awarded_final === "number"
                                ? question.points_awarded_final
                                : "N/A"}{" "}
                              / {question.q_marks}
                            </span>
                            {/* Giờ đây, chúng ta chỉ hiển thị points_awarded_final mà không so sánh hay ghi chú thêm về ai_total_score_for_question ở đây */}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Trước
          </Button>
          <span className="text-sm text-gray-500 font-medium">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Trang sau"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            Sau <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
