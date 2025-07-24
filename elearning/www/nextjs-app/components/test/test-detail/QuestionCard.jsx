"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  XCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { AnswerInput } from "./AnswerInput";
import { parseLatex } from "@/lib/utils";
import { DrawingArea } from "./DrawingArea";
import { decodeHtmlEntities, formatFileSize } from "@/utils/test-utils";

export function QuestionCard({
  questionData,
  currentDisplayNumber,
  testQuestionId,
  testAttemptId,
  markedForReview = {},
  completedQuestions = {},
  onToggleMarkForReview,
  onMarkComplete, // Corrected signature: () => void
  multipleChoiceAnswer,
  onMultipleChoiceChange,
  shortAnswer,
  onShortAnswerChange,
  longAnswer,
  onLongAnswerChange,
  canvasState,
  setCanvasStates,
  currentFiles = [],
  onAddFiles, // Corrected signature: (files, testQuestionId) => void
  onRemoveFile,
  processingFiles = {},
  blockDrawingAreaInteraction,
}) {
  const [showHint, setShowHint] = useState(false);

  const isMarkedForReview = !!markedForReview[testQuestionId];
  const isMarkedComplete = !!completedQuestions[testQuestionId];
  console.log("QuestionCard props:", {
    questionData,
  });

  useEffect(() => {
    setShowHint(false);
  }, [testQuestionId]);

  const questionContentForDisplay = useMemo(() => {
    if (!questionData) return null;

    let formattedOptions = [];
    if (
      questionData.question_type === "Multiple Choice" &&
      Array.isArray(questionData.options)
    ) {
      formattedOptions = questionData.options.map((opt, index) => ({
        id: opt.id || `${testQuestionId}-option-${opt.option_text || index}`,
        text: opt.text || opt.option_text || `Option ${index + 1}`,
        label: opt.label || String.fromCharCode(65 + index),
      }));
    }

    return {
      id: testQuestionId,
      type: questionData.question_type || "multiple_choice",
      question: questionData.content || "Question content is missing.",
      imageUrl: questionData.image_url || questionData.image,
      options: formattedOptions,
      hint: questionData.hint || "",
      explanation: questionData.explanation || "",
      points: questionData.point_value || questionData.marks || 0,
      color: "bg-indigo-500",
    };
  }, [questionData, testQuestionId]);

  const handleToggleReview = () => {
    if (testQuestionId && onToggleMarkForReview) {
      onToggleMarkForReview(testQuestionId);
    }
  };

  const handleFileSelectionChange = (event) => {
    if (
      event.target.files &&
      event.target.files.length > 0 &&
      onAddFiles &&
      testQuestionId
    ) {
      onAddFiles(testQuestionId, event.target.files);
      event.target.value = null;
    }
  };

  const handleDrawingCapturedAsFile = useCallback(
    (capturedFileInfo) => {
      if (onAddFiles && testQuestionId && capturedFileInfo) {
        onAddFiles(testQuestionId, capturedFileInfo);
      }
    },
    [onAddFiles, testQuestionId]
  );
  if (!questionData || !questionContentForDisplay) {
    return (
      <Card className="p-6 mb-6 border shadow-sm bg-white text-center">
        <p className="text-gray-500">Đang tải dữ liệu câu hỏi...</p>
      </Card>
    );
  }
  console.log("Explanation:", questionContentForDisplay.explanation);

  const showFileUploadSection =
    questionContentForDisplay.type === "Essay" ||
    questionContentForDisplay.type === "long_answer";

  return (
    <Card
      key={testQuestionId}
      className="p-4 sm:p-6 mb-6 relative overflow-hidden border shadow-sm bg-white"
    >
      <div
        className={`w-1.5 h-full ${questionContentForDisplay.color} absolute left-0 top-0 bottom-0 rounded-l-md`}
        aria-hidden="true"
      ></div>
      <div className="pl-4 sm:pl-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold whitespace-nowrap">
              Câu hỏi {currentDisplayNumber}
            </h2>
            <Badge
              variant="outline"
              className="font-normal capitalize text-xs sm:text-sm"
            >
              {questionContentForDisplay.type.replace(/_/g, " ")}
            </Badge>
            {/* <Badge
              variant="secondary"
              className="font-normal text-xs sm:text-sm"
            >
              {questionContentForDisplay.points} Điểm
            </Badge> */}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMarkedForReview ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleReview}
                    className={`transition-colors ${
                      isMarkedForReview
                        ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={isMarkedForReview}
                  >
                    <AlertCircle
                      className={`h-4 w-4 mr-1 ${
                        isMarkedForReview ? "" : "text-yellow-600"
                      }`}
                    />
                    Xem lại
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Đánh dấu để xem lại sau</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Simplified this call for cleaner code */}
                  <Button
                    variant={isMarkedComplete ? "default" : "outline"}
                    size="sm"
                    onClick={onMarkComplete}
                    className={`transition-colors ${
                      isMarkedComplete
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={isMarkedComplete}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 mr-1 ${
                        isMarkedComplete ? "" : "text-green-600"
                      }`}
                    />
                    {isMarkedComplete ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isMarkedComplete
                      ? "Bỏ đánh dấu hoàn thành"
                      : "Đánh dấu câu này đã hoàn thành"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {questionContentForDisplay.hint && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHint(!showHint)}
                      className="text-gray-700 hover:bg-gray-50"
                      aria-pressed={showHint}
                    >
                      <Lightbulb className="h-4 w-4 mr-1 text-blue-600" /> Gợi ý
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showHint ? "Ẩn" : "Hiện"} gợi ý</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {questionContentForDisplay.explanation && (
              <Dialog>
                <DialogTrigger asChild>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-700 hover:bg-gray-50"
                        >
                          <HelpCircle className="h-4 w-4 mr-1 text-purple-600" />
                          Giải thích
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Xem lời giải chi tiết</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Lời giải - Câu hỏi {currentDisplayNumber}
                    </DialogTitle>
                    <DialogDescription>
                      Lời giải chi tiết từng bước cho câu hỏi này.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-md text-sm leading-relaxed">
                      {parseLatex(questionContentForDisplay.explanation)}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="text-base md:text-lg mb-6 leading-relaxed">
          {parseLatex(questionContentForDisplay.question)}
          {}
        </div>

        {/* Image Display */}
        {questionContentForDisplay.imageUrl && (
          <div className="mb-6 flex justify-center">
            {/* Ensure your API endpoint for images is correct and handles auth if needed */}
            <img
              src={`/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(
                questionContentForDisplay.imageUrl
              )}`}
              alt={`Illustration for question ${currentDisplayNumber}`}
              className="max-h-64 w-auto rounded shadow border object-contain"
            />
          </div>
        )}

        <AnswerInput
          questionContent={questionContentForDisplay}
          multipleChoiceAnswer={multipleChoiceAnswer}
          shortAnswer={shortAnswer}
          longAnswer={longAnswer}
          onMultipleChoiceChange={onMultipleChoiceChange}
          onShortAnswerChange={onShortAnswerChange}
          onLongAnswerChange={onLongAnswerChange}
          parseLatex={parseLatex}
        />

        {showFileUploadSection && (
          <>
            <div className="mt-6 p-4 border border-dashed rounded-md bg-slate-50">
              <h3 className="text-md font-semibold mb-3 text-gray-700">
                Đính kèm hình ảnh bài làm
              </h3>
              <label
                htmlFor={`file-upload-${testQuestionId}`}
                className="block mb-3"
              >
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-sm"
                >
                  <span>
                    <Paperclip className="inline h-4 w-4 mr-2 text-blue-600" />
                    Thêm ảnh...
                  </span>
                </Button>
                <input
                  id={`file-upload-${testQuestionId}`}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/gif"
                  className="hidden"
                  onChange={handleFileSelectionChange}
                />
              </label>

              {currentFiles && currentFiles.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Các ảnh đã chọn:
                  </h4>
                  <ul className="space-y-2">
                    {currentFiles.map((fileInfo, index) => {
                      const processingKey = `${testQuestionId}-${
                        fileInfo.originalFilename
                      }-${
                        fileInfo.lastModifiedTimeToken || fileInfo.size || index
                      }`;
                      const processingState = processingFiles[processingKey];

                      return (
                        <li
                          key={processingKey}
                          className="flex items-center justify-between p-2 bg-white border rounded-md text-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {fileInfo.base64Data &&
                              fileInfo.mimeType?.startsWith("image/") && (
                                <img
                                  src={`data:${fileInfo.mimeType};base64,${fileInfo.base64Data}`}
                                  alt={fileInfo.originalFilename}
                                  className="h-10 w-10 object-cover rounded-sm border"
                                />
                              )}
                            <span
                              className="truncate text-gray-700"
                              title={fileInfo.originalFilename}
                            >
                              {fileInfo.originalFilename} (
                              {formatFileSize(fileInfo.size)})
                            </span>
                            {processingState === true && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onRemoveFile &&
                              onRemoveFile(
                                testQuestionId,
                                fileInfo.originalFilename
                              )
                            }
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                            aria-label={`Xóa ${fileInfo.originalFilename}`}
                            disabled={processingState === true}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {(!currentFiles || currentFiles.length === 0) && (
                <p className="text-xs text-gray-500 mt-1">
                  Chưa có ảnh nào được đính kèm.
                </p>
              )}
            </div>

            <DrawingArea
              currentQuestionId={testQuestionId}
              testAttemptId={testAttemptId}
              canvasState={canvasState}
              setCanvasState={setCanvasStates}
              onCaptureDrawingAsFile={handleDrawingCapturedAsFile}
              isBlocked={blockDrawingAreaInteraction}
            />
          </>
        )}
      </div>
    </Card>
  );
}
