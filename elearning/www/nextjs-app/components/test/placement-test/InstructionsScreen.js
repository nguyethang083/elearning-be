"use client";

import { Button } from "@/components/ui/button";

export default function InstructionsScreen({ onStart, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-emerald-600 px-8 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Đánh giá năng lực
            </h1>
            <p className="text-emerald-100">Những điều bạn cần biết</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-2xl p-6 border-l-4 border-blue-500">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center font-bold mr-4">
                    1
                  </div>
                  <h3 className="font-bold text-gray-800">
                    Không giới hạn thời gian
                  </h3>
                </div>
                <p className="text-gray-600">
                  Bạn có thể làm bài mà không bị áp lực về thời gian. Hãy thoải
                  mái suy nghĩ trước khi chọn đáp án!
                </p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-6 border-l-4 border-purple-500">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center font-bold mr-4">
                    2
                  </div>
                  <h3 className="font-bold text-gray-800">Trắc nghiệm</h3>
                </div>
                <p className="text-gray-600">
                  Chọn đáp án đúng nhất trong bốn lựa chọn. Chỉ có một đáp án
                  đúng.
                </p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center font-bold mr-4">
                    3
                  </div>
                  <h3 className="font-bold text-gray-800">Câu hỏi thích ứng</h3>
                </div>
                <p className="text-gray-600">
                  Câu hỏi sẽ thay đổi phù hợp với trình độ của bạn khi làm bài.
                </p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-6 border-l-4 border-orange-500">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-bold mr-4">
                    4
                  </div>
                  <h3 className="font-bold text-gray-800">Không quay lại</h3>
                </div>
                <p className="text-gray-600">
                  Sau khi đã chọn, bạn không thể thay đổi đáp án. Hãy cân nhắc
                  kỹ!
                </p>
              </div>
            </div>
            <div className="flex pt-6">
              <Button
                onClick={onStart}
                className="w-full py-4 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                Bắt đầu làm bài
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
