"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { parseLatex } from "@/lib/utils"; // Giả định bạn có hàm này

export function PlacementQuestionCard({ question, onAnswer, isLoading }) {
  // State để lưu lựa chọn của người dùng trước khi nộp
  const [selectedValue, setSelectedValue] = useState(null);

  // Xử lý khi người dùng nhấn nút "Trả lời"
  const handleSubmit = () => {
    if (!selectedValue) return; // Không làm gì nếu chưa chọn

    // Xác định câu trả lời là đúng hay sai dựa trên dữ liệu từ backend
    const isCorrect = selectedValue === question.correct_answer;
    onAnswer(question.id, isCorrect);
  };

  // Xử lý khi người dùng nhấn "Tôi không biết"
  const handleIKnowNot = () => {
    onAnswer(question.id, false);
  };

  return (
    <Card className="w-full max-w-3xl shadow-xl border-t-4 border-t-blue-600 animate-fade-in">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Bài kiểm tra đầu vào
          </h2>
          <p className="text-sm text-gray-500">
            Hãy chọn câu trả lời bạn cho là đúng nhất.
          </p>
        </div>

        {/* Nội dung câu hỏi */}
        <div className="text-base md:text-lg mb-8 leading-relaxed prose prose-lg max-w-none">
          {parseLatex(question.text)}
        </div>

        {/* Các lựa chọn trả lời */}
        <RadioGroup
          value={selectedValue}
          onValueChange={setSelectedValue}
          className="space-y-3"
        >
          {question.options.map((option, index) => (
            <Label
              key={index}
              htmlFor={`option-${index}`}
              className={`flex items-start p-4 rounded-lg border-2 transition-all cursor-pointer 
                ${
                  selectedValue === option.text
                    ? "bg-blue-50 border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
            >
              <RadioGroupItem
                value={option.text}
                id={`option-${index}`}
                className="border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:text-blue-600 mt-1 mr-4 flex-shrink-0"
              />
              <div className="flex-1 text-base">
                <strong className="mr-2">
                  {String.fromCharCode(65 + index)}.
                </strong>
                {parseLatex(option.text)}
              </div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex justify-between items-center bg-gray-50 p-4 border-t">
        <Button
          variant="ghost"
          className="text-gray-500 hover:text-gray-800"
          onClick={handleIKnowNot}
          disabled={isLoading}
        >
          Tôi không biết
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedValue || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 h-auto text-base"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Trả lời"}
        </Button>
      </CardFooter>
    </Card>
  );
}
