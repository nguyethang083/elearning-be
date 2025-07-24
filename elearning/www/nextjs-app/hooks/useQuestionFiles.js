"use client";

import { useState, useCallback } from "react";
import { readFileAsBase64 } from "@/utils/test-utils";

export function useQuestionFiles(
  initialFilesData = {},
  questionsFromAttempt = [],
  onFilesChanged
) {
  const [currentSessionQuestionFiles, setCurrentSessionQuestionFiles] =
    useState(() => {
      // Logic khởi tạo state của bạn đã đúng, giữ nguyên
      if (
        initialFilesData &&
        typeof initialFilesData === "object" &&
        questionsFromAttempt.length > 0
      ) {
        try {
          const initialFiles = {};
          for (const tq_detail_id_backend in initialFilesData) {
            const answerData = initialFilesData[tq_detail_id_backend];
            const question = questionsFromAttempt.find(
              (q) => q.test_question_detail_id === tq_detail_id_backend
            );
            if (
              question &&
              (question.question_type === "Essay" ||
                question.question_type === "long_answer")
            ) {
              if (
                Array.isArray(answerData.base64_images) &&
                answerData.base64_images.length > 0
              ) {
                initialFiles[tq_detail_id_backend] =
                  answerData.base64_images.map((img) => ({
                    base64Data: img.data,
                    originalFilename: img.filename,
                    mimeType: img.mime_type,
                    size: img.data ? img.data.length * (3 / 4) : 0,
                  }));
              }
            }
          }
          return initialFiles;
        } catch (error) {
          console.error(
            "Error initializing files from saved data in hook:",
            error
          );
          return {};
        }
      }
      return {};
    });

  const [processingFiles, setProcessingFiles] = useState({});

  const handleAddFileOrDrawing = useCallback(
    async (testQuestionDetailId, filesOrCapturedInfo) => {
      if (!testQuestionDetailId) {
        console.warn(
          "handleAddFileOrDrawing: testQuestionDetailId is missing."
        );
        return;
      }

      onFilesChanged?.();

      let filesToProcessArray = [];
      let isCapture = false;

      // Logic chuẩn hóa input đã đúng
      if (filesOrCapturedInfo instanceof FileList) {
        filesToProcessArray = Array.from(filesOrCapturedInfo);
      } else if (
        typeof filesOrCapturedInfo === "object" &&
        filesOrCapturedInfo.base64Data
      ) {
        filesToProcessArray = [filesOrCapturedInfo];
        isCapture = true;
      } else {
        console.warn(
          "handleAddFileOrDrawing: Invalid input for filesOrCapturedInfo.",
          filesOrCapturedInfo
        );
        return;
      }

      if (filesToProcessArray.length === 0) return;

      // Get current files for this question
      const existingFilesForQuestion =
        currentSessionQuestionFiles[testQuestionDetailId] || [];

      if (isCapture) {
        // For captured drawings, add directly to state
        setCurrentSessionQuestionFiles((currentFiles) => {
          return {
            ...currentFiles,
            [testQuestionDetailId]: [
              ...existingFilesForQuestion,
              ...filesToProcessArray,
            ],
          };
        });
      } else {
        // For regular file uploads, process them asynchronously
        const newFileInfosThisBatch = [];

        for (const fileInput of filesToProcessArray) {
          const originalFilename = fileInput.name;

          // Check for duplicates
          if (
            existingFilesForQuestion.some(
              (uiFile) =>
                uiFile.originalFilename === originalFilename &&
                uiFile.size === fileInput.size
            )
          ) {
            console.log(`File ${originalFilename} đã tồn tại. Bỏ qua.`);
            continue; // Skip duplicate file
          }

          try {
            const fileInfoWithBase64 = await readFileAsBase64(fileInput);
            newFileInfosThisBatch.push(fileInfoWithBase64);
          } catch (error) {
            console.error(`Error reading file ${originalFilename}:`, error);
          }
        }

        // Add all processed files to state at once
        if (newFileInfosThisBatch.length > 0) {
          setCurrentSessionQuestionFiles((currentFiles) => {
            return {
              ...currentFiles,
              [testQuestionDetailId]: [
                ...(currentFiles[testQuestionDetailId] || []),
                ...newFileInfosThisBatch,
              ],
            };
          });
        }
      }
    },
    [onFilesChanged, currentSessionQuestionFiles]
  );

  const handleRemoveFileFromState = useCallback(
    (testQuestionDetailId, originalFilenameToRemove) => {
      if (!testQuestionDetailId || !originalFilenameToRemove) return;
      setCurrentSessionQuestionFiles((prevQF) => {
        const filesForQuestion = prevQF[testQuestionDetailId] || [];
        const updatedFiles = filesForQuestion.filter(
          (fileInfo) => fileInfo.originalFilename !== originalFilenameToRemove
        );

        const newState = { ...prevQF };
        if (updatedFiles.length === 0) {
          delete newState[testQuestionDetailId];
        } else {
          newState[testQuestionDetailId] = updatedFiles;
        }
        return newState;
      });
      onFilesChanged?.();
    },
    [onFilesChanged]
  );

  const resetQuestionFiles = useCallback(() => {
    setCurrentSessionQuestionFiles({});
    setProcessingFiles({});
  }, []);

  return {
    currentSessionQuestionFiles,
    processingFiles,
    handleAddFileOrDrawing,
    handleRemoveFileFromState,
    setCurrentSessionQuestionFiles,
    resetQuestionFiles,
  };
}
