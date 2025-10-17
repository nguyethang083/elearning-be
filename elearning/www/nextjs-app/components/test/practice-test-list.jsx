"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TestRow from "@/components/test/TestRow";
import { usePracticeTests } from "@/hooks/usePracticeTests";

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-2 mt-4">
    <div className="h-12 bg-gray-200 rounded"></div>
    <div className="h-12 bg-gray-200 rounded"></div>
    <div className="h-12 bg-gray-200 rounded"></div>
    <div className="h-12 bg-gray-200 rounded"></div>
  </div>
);

export default function PracticeTestList({
  selectedTopicId,
  selectedTopicName,
  selectedGrade,
}) {
  console.log(
    "PracticeTestList rendered with selectedTopicId:",
    selectedTopicId,
    "selectedTopicName:",
    selectedTopicName,
    "selectedGrade:",
    selectedGrade
  );
  const { tests, loading, error } = usePracticeTests({
    topicId: selectedTopicId,
    gradeLevel: selectedGrade,
  });

  return (
    <div id="practice-tests-section" className="mt-8">
      <h3 className="text-xl font-bold mb-4">
        {selectedTopicId && selectedTopicName
          ? `${selectedTopicName}`
          : selectedTopicId
          ? `Practice Tests for Selected Topic` // Fallback if name is missing but ID exists
          : "Đề luyện tập"}
      </h3>
      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Error State */}
      {error && !loading && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {/* Success State - Data Loaded */}
      {!loading && !error && (
        <>
          {tests.length === 0 ? (
            <p className="text-gray-500 mt-4">No practice tests found.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[40%] py-3 px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Đề
                    </TableHead>
                    <TableHead className="w-[15%] py-3 px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Độ khó
                    </TableHead>
                    <TableHead className="w-[15%] py-3 px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Thời gian
                    </TableHead>
                    <TableHead className="w-[15%] py-3 px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Câu hỏi
                    </TableHead>
                    <TableHead className="w-[15%] py-3 px-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Trạng thái
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Map over the tests fetched by the hook */}
                  {tests.map((test) => (
                    <TestRow
                      key={test.id} // Use the actual ID from the database
                      test={test}
                      // Pass helper functions as props if they were kept in TestRow
                      // getDifficultyColor={getDifficultyColor}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
