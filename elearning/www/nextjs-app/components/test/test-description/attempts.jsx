import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDurationFromSeconds } from "@/lib/utils";
import { AttemptStatus } from "./AttemptStatus";

export default function PreviousAttempts({
  attempts = [],
  onAttemptClick,
  totalPossibleScore,
  hasEssayQuestion = false,
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3">Lịch sử bài làm</h2>

      <Card>
        <CardContent className="p-0">
          {attempts && attempts.length > 0 ? (
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead className="py-3 px-4">Ngày bắt đầu</TableHead>
                  <TableHead className="py-3 px-4 text-center">
                    Điểm số
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center">
                    Thời gian làm bài
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center">
                    Trạng thái
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const isClickable = attempt.status !== "In Progress";
                  const canCalculatePercentage =
                    attempt.status !== "In Progress" &&
                    attempt.final_score !== null &&
                    typeof attempt.final_score === "number" && // Ensure score is a number
                    totalPossibleScore !== null &&
                    totalPossibleScore !== undefined &&
                    typeof totalPossibleScore === "number" && // Ensure total is a number
                    totalPossibleScore > 0; // Avoid division by zero

                  // Calculate percentage based on test type
                  let scorePercentage = 0;
                  if (canCalculatePercentage) {
                    if (hasEssayQuestion) {
                      // For Essay tests: use final_score / totalPossibleScore * 100
                      scorePercentage =
                        (attempt.final_score / totalPossibleScore) * 100;
                      console.log("Total Possible Score:", totalPossibleScore);
                    } else {
                      // For Multiple Choice tests: use final_score / totalPossibleScore * 100
                      // Note: For multiple choice, final_score already represents the score
                      scorePercentage =
                        (attempt.final_score / totalPossibleScore) * 100;
                      console.log("Total Possible Score1:", totalPossibleScore);
                    }
                  }

                  // Convert percentage to scale of 10
                  const scoreOnScale10 = scorePercentage / 10;

                  return (
                    <TableRow
                      key={attempt.id}
                      className={
                        isClickable
                          ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          : "opacity-70"
                      }
                      onClick={() => {
                        if (isClickable) {
                          onAttemptClick(attempt.id);
                        }
                      }}
                      aria-disabled={!isClickable}
                      title={
                        isClickable
                          ? "Click to view results"
                          : "Attempt in progress"
                      }
                    >
                      {/* Date Cell */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500 shrink-0" />
                          <span>
                            {attempt.start_time
                              ? format(
                                  new Date(attempt.start_time),
                                  "dd/MM/yy hh:mm a"
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      {/* Score Cell */}
                      <TableCell className="py-3 px-4 text-center">
                        {canCalculatePercentage ? (
                          <span className="font-medium">
                            {/* Display score on scale of 10 */}
                            {scoreOnScale10.toFixed(1)}
                            {/* Optional: Show raw score as well */}
                            {/* <span className="text-xs text-gray-500 ml-1">
                ({attempt.final_score}/{totalPossibleScore})
              </span> */}
                          </span>
                        ) : attempt.status === "In Progress" ? (
                          // Fallback for 'in_progress'
                          <span className="text-gray-500 italic text-xs">
                            Chưa có
                          </span>
                        ) : (
                          // Fallback for N/A (score is null, totalPossibleScore missing, etc.)
                          <span className="text-gray-500 text-xs">N/A</span>
                        )}
                      </TableCell>
                      {/* Time Taken Cell */}
                      <TableCell className="py-3 px-4 text-center text-sm">
                        {formatDurationFromSeconds(attempt.time_taken_seconds)}
                      </TableCell>
                      {/* Status Cell */}
                      <TableCell className="py-3 px-4 text-center">
                        {/* Renders based on modified AttemptStatus component */}
                        <AttemptStatus
                          status={attempt.status}
                          passed={attempt.is_passed}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No previous attempts found for this test.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
