"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import {
  Pencil as TitleIcon,
  Camera,
  Eraser as ClearIcon,
  Info,
  AlertTriangle, // Import AlertTriangle for error toasts
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const toastStyles = {
  base: {
    background: "#FFFFFF",
    color: "#020817", // slate-950
    border: "1px solid #E2E8F0", // slate-200
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  success: {
    background: "#F0FFF4", // A very light green
    borderColor: "#9AE6B4", // green-300
    color: "#276749", // green-800
  },
  warning: {
    background: "#FFFBEB", // A very light yellow
    borderColor: "#F6E05E", // yellow-400
    color: "#975A16", // yellow-800
  },
  error: {
    background: "#FFF5F5", // A very light red
    borderColor: "#FEB2B2", // red-300
    color: "#9B2C2C", // red-800
  },
};

export function DrawingArea({
  currentQuestionId,
  testAttemptId,
  onCaptureDrawingAsFile,
  isBlocked = false,
}) {
  const [editor, setEditor] = useState(null);

  const handleTldrawMount = useCallback((editorInstance) => {
    setEditor(editorInstance);
  }, []);

  // Generate a session-scoped persistence key that includes testAttemptId
  // This ensures the drawing state is only maintained during the current test attempt
  // and will be cleared when the test is submitted (handled in useTestSubmission)
  const sessionPersistenceKey =
    testAttemptId && currentQuestionId
      ? `tldraw_session_${testAttemptId}_q_${currentQuestionId}`
      : undefined;

  const handleCaptureCanvasAsFile = useCallback(async () => {
    if (isBlocked || !editor) {
      if (!editor) console.warn("tldraw editor not available for capture.");
      return;
    }
    if (!onCaptureDrawingAsFile) {
      console.warn("onCaptureDrawingAsFile prop is missing from DrawingArea.");
      return;
    }
    try {
      const allShapesOnPage = editor.getCurrentPageShapes();
      const shapeIdsToExport = allShapesOnPage.map((shape) => shape.id);

      if (shapeIdsToExport.length === 0) {
        toast.warning("Bảng vẽ đang trống", {
          description: "Vui lòng vẽ gì đó trước khi ghi lại.",
          style: { ...toastStyles.base, ...toastStyles.warning },
          icon: <Info className="h-5 w-5" />,
        });
        return;
      }

      const isEditorCurrentlyDark = editor?.instanceState?.isDarkMode ?? false;

      const exportResult = await editor.toImage(shapeIdsToExport, {
        format: "png",
        scale: 1,
        background: true,
        darkMode: isEditorCurrentlyDark,
      });

      if (!exportResult || !exportResult.blob) {
        console.error(
          "Failed to export image: editor.toImage did not return a blob.",
          exportResult
        );
        toast.error("Không thể tạo ảnh", {
          description: "API không trả về dữ liệu blob. Vui lòng thử lại.",
          style: { ...toastStyles.base, ...toastStyles.error },
          icon: <AlertTriangle className="h-5 w-5" />,
        });
        return;
      }

      const imageBlob = exportResult.blob;
      const reader = new FileReader();

      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (
          typeof dataUrl !== "string" ||
          dataUrl === "data:," ||
          dataUrl.length < 100
        ) {
          console.error(
            "Failed to generate valid PNG data URL from blob.",
            dataUrl
          );
          toast.error("Không thể tạo ảnh", {
            description: "Dữ liệu trống hoặc lỗi khi đọc blob.",
            style: { ...toastStyles.base, ...toastStyles.error },
            icon: <AlertTriangle className="h-5 w-5" />,
          });
          return;
        }
        const base64Data = dataUrl.split(",")[1];
        const sizeInBytes = imageBlob.size;
        const capturedFileInfo = {
          base64Data: base64Data,
          originalFilename: `drawing_q-${currentQuestionId}_${Date.now()}.png`,
          mimeType: "image/png",
          size: sizeInBytes,
        };
        onCaptureDrawingAsFile(capturedFileInfo);
        toast.success("Đã ghi lại bản vẽ", {
          description: "Hình ảnh sẽ được đính kèm vào bài làm của bạn.",
          style: { ...toastStyles.base, ...toastStyles.success },
          icon: <Camera className="h-5 w-5" />,
        });
      };
      reader.onerror = (error) => {
        console.error("FileReader error converting blob to data URL:", error);
        toast.error("Lỗi xử lý ảnh", {
          description: "Xảy ra lỗi khi đọc dữ liệu ảnh. Vui lòng thử lại.",
          style: { ...toastStyles.base, ...toastStyles.error },
          icon: <AlertTriangle className="h-5 w-5" />,
        });
      };
      reader.readAsDataURL(imageBlob);
    } catch (error) {
      console.error(
        "Lỗi trong quá trình chụp bản vẽ tldraw (sử dụng editor.toImage):",
        error
      );
      toast.error("Đã xảy ra lỗi không mong muốn", {
        description: "Quá trình xử lý bản vẽ thất bại. Vui lòng thử lại sau.",
        style: { ...toastStyles.base, ...toastStyles.error },
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [editor, currentQuestionId, onCaptureDrawingAsFile, isBlocked]);

  const clearDrawing = () => {
    if (isBlocked || !editor) return;
    const allShapesOnPage = editor.getCurrentPageShapes();
    if (allShapesOnPage.length > 0) {
      editor.deleteShapes(allShapesOnPage.map((shape) => shape.id));
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 sm:p-4 rounded-lg mt-6 shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <TitleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-md">
            Bảng vẽ
          </h3>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isBlocked}
              aria-label="Hướng dẫn sử dụng bảng vẽ"
            >
              <Info className="h-4 w-4 text-blue-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-auto max-w-xs sm:max-w-sm text-sm p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Hướng dẫn nhanh:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-xs">
                <li>
                  Sử dụng các công cụ vẽ có sẵn trên thanh công cụ của bảng vẽ.
                </li>
                <li>
                  Nhấn{" "}
                  <kbd className="px-1.5 py-0.5 border bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1.5 py-0.5 border bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    Z
                  </kbd>{" "}
                  (hoặc{" "}
                  <kbd className="px-1.5 py-0.5 border bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    Cmd
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1.5 py-0.5 border bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    Z
                  </kbd>{" "}
                  trên Mac) để hoàn tác.
                </li>
                <li>
                  Sau khi hoàn thành, nhấn nút "Ghi lại bản vẽ" để lưu hình ảnh.
                </li>
                <li>
                  Nút "Xóa hết" sẽ xóa toàn bộ nội dung trên bảng vẽ hiện tại.
                </li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={`
          border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900
          relative overflow-hidden
          h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px]
          transition-opacity duration-200 ease-in-out
          ${isBlocked ? "opacity-50 pointer-events-none" : "opacity-100"}
        `}
      >
        <Tldraw
          onMount={handleTldrawMount}
          persistenceKey={sessionPersistenceKey}
          forceMobile={true}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center mt-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={clearDrawing}
          disabled={!editor || isBlocked}
          className="w-full sm:w-auto dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ClearIcon className="h-4 w-4 mr-1.5" /> Xóa hết
        </Button>
        {onCaptureDrawingAsFile && (
          <Button
            variant="default"
            size="sm"
            onClick={handleCaptureCanvasAsFile}
            disabled={!editor || isBlocked}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Camera className="h-4 w-4 mr-1.5" /> Ghi lại bản vẽ
          </Button>
        )}
      </div>
    </div>
  );
}
