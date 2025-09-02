"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

export default function ProgressTracker({ question, abilities }) {
  return (
    <Card className="w-full lg:w-80 shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <span>Thông số</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {question && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">
              Câu hỏi hiện tại
            </h3>
            <div className="bg-gray-50 p-3 rounded-md border">
              <p>
                <strong>Chủ đề:</strong> {question.topic_name}
              </p>
              <p>
                <strong>Độ khó:</strong> {question.difficulty}
              </p>
            </div>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">
            Năng lực các chủ đề
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {abilities &&
              abilities.map((ability) => (
                <div
                  key={ability.topic}
                  className="bg-gray-50 p-3 rounded-md border"
                >
                  <p className="font-bold text-blue-600">
                    {ability.topic_name || ability.topic}
                  </p>
                  <div className="flex flex-col gap-1 text-xs font-mono">
                    <span>
                      Theta: {Number(ability.ability_estimate).toFixed(3)}
                    </span>
                    <span>SE: {Number(ability.standard_error).toFixed(3)}</span>
                    {ability.mastery_weight !== undefined && (
                      <span>Mastery: {ability.mastery_weight}/1000</span>
                    )}
                    {ability.questions_answered !== undefined && (
                      <span>
                        Số câu đã trả lời: {ability.questions_answered}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
