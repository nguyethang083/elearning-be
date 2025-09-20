import React from "react";
import { TableCell, TableRow } from "@/components/ui/table"; // Adjust path if needed
import { Badge } from "@/components/ui/badge"; // Adjust path if needed
import { Clock, BarChart2, Play } from "lucide-react";
import Link from "next/link"; // Keep Link for navigation
import slugify from "slugify"; // Keep slugify
// Assume containsVietnamese is defined in utils, adjust path if needed
import { containsVietnamese } from "@/utils/stringUtils";
// Removed useRouter as Link handles navigation

// Helper function for difficulty color (can be moved to utils)
// NOTE: This function is defined here based on your provided code.
// If PracticeTestList passes it as a prop, you can remove this definition.
const getDifficultyColor = (difficulty) => {
  // Use the 'difficulty' text field from the 'tests' table schema
  const lowerDifficulty = difficulty?.toLowerCase() || "unknown";
  switch (lowerDifficulty) {
    case "dễ": // Vietnamese for Easy
    case "easy":
    case "th": // From your enum example TH, VD, VDC
      return "bg-green-100 text-green-800";
    case "trung bình": // Vietnamese for Medium
    case "medium":
    case "vd":
      return "bg-blue-100 text-blue-800";
    case "khó": // Vietnamese for Hard
    case "hard":
    case "vdc":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Renders a single row in the test list table.
 * @param {object} props
 * @param {object} props.test - The test object fetched from the API (id, title, difficulty, time_limit_minutes).
 */
export default function TestRow({ test }) {
  // Removed getDifficultyColor from props if defined locally above
  // Removed getStatusInfo as it's not used for the list row

  if (!test) return null;

  // Check if title contains Vietnamese characters
  const isVietnameseTest = containsVietnamese(test.title || "");

  // Format the title to a slug for the URL
  const slugifiedTitle = slugify(test.title || "test", {
    // Fallback title for slugify
    lower: true, // Convert to lowercase
    strict: true, // Remove special characters (!, @, #, etc.)
    locale: "vi", // Handle Vietnamese characters correctly
  });

  // Construct the URL for the test description page using the test ID
  const testUrl = `/test/${slugifiedTitle}?id=${test.id}`;

  // Placeholder for question count - adjust if backend provides it
  // Your schema has 'total', but the API might not return it in the list view.
  // Let's assume 'total' exists on the test object for now based on your original code.
  const questionCount = test.question_count ?? "N/A";

  return (
    // Use test.id (UUID from database) as the key
    <TableRow key={test.id} className="hover:bg-gray-50 border-b">
      {/* Test Title Cell with Link */}
      <TableCell className="font-medium py-4 px-6">
        <Link
          href={testUrl}
          className={`hover:text-blue-600 hover:underline ${
            isVietnameseTest ? "vietnamese-text" : "" // Keep your custom class if needed
          }`}
        >
          {test.title || "Untitled Test"} {/* Display test title */}
        </Link>
      </TableCell>

      {/* Difficulty Cell */}
      <TableCell className="py-4 px-6">
        <Badge
          // Use 'difficulty' field from schema
          className={`${getDifficultyColor(
            test.difficulty_level
          )} px-3 py-1 text-xs`} // Adjusted padding/text size
        >
          {test.difficulty_level || "Unknown"} {/* Display difficulty */}
        </Badge>
      </TableCell>

      {/* Duration Cell */}
      <TableCell className="py-4 px-6">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />{" "}
          {/* Adjusted spacing/color */}
          {/* Use 'time_limit_minutes' field from schema */}
          {test.time_limit_minutes
            ? `${test.time_limit_minutes} min`
            : "No limit"}
        </div>
      </TableCell>

      {/* Questions Cell */}
      <TableCell className="py-4 px-6">
        <div className="flex items-center text-sm text-gray-600">
          <BarChart2 className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />{" "}
          {/* Adjusted spacing/color */}
          {/* Use 'total' if available, otherwise 'N/A' */}
          {questionCount}
        </div>
      </TableCell>

      {/* Status Cell */}
      <TableCell className="py-4 px-6">
        {test.latestAttempt ? (
          (() => {
            const attempt = test.latestAttempt;
            const normalizedStatus = attempt.status?.toLowerCase();

            if (normalizedStatus === "in progress") {
              return (
                <span className="text-blue-600 font-medium">Đang làm</span>
              );
            }

            const totalPossibleScore = test.total_possible_score;
            const hasEssayQuestion = test.has_essay_question;
            const canCalculatePercentage =
              attempt.final_score !== null &&
              typeof attempt.final_score === "number" &&
              totalPossibleScore !== null &&
              totalPossibleScore !== undefined &&
              typeof totalPossibleScore === "number" &&
              totalPossibleScore > 0;

            if (canCalculatePercentage) {
              const scorePercentage =
                (attempt.final_score / totalPossibleScore) * 100;
              const scoreOnScale10 = scorePercentage / 10;
              return (
                <span className="font-medium text-green-600">
                  {scoreOnScale10.toFixed(1)}/10
                </span>
              );
            } else {
              return <span className="text-gray-500">N/A</span>;
            }
          })()
        ) : (
          <span className="text-gray-500">Chưa làm</span>
        )}
      </TableCell>
    </TableRow>
  );
}
