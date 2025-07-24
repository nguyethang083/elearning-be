"use client";

import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, AlertCircle } from "lucide-react"; // Import AlertCircle
import Link from "next/link";
import slugify from "slugify";
import TestLoading from "@/components/test/test-description/test-loading";
import TestInformation from "@/components/test/test-description/test-info";
import PreviousAttempts from "@/components/test/test-description/attempts"; // Ensure path is correct
import { useTestDetails } from "@/hooks/useTestDetails";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { getButtonText } from "@/utils/test-utils";
import { useState } from "react";

export default function TestDescription() {
  const router = useRouter();
  const { id } = router.query;
  const [isStarting, setIsStarting] = useState(false);
  // Use the hook, now returns attempts and attemptsError as well
  const { test, attemptStatus, attempts, loading, error, attemptsError } =
    useTestDetails(id);

  const totalScore = test?.total_possible_score ?? "N/A";
  const navigateToAttemptResult = (attemptId) => {
    if (!test || !test.title || !attemptId) return;
    const slugifiedTitle = slugify(test.title, {
      lower: true,
      strict: true,
      locale: "vi",
    });
    router.push(`/test/${id}/test-result/${attemptId}`);
  };

  // --- Button Click Handler ---
  const handlePlayButtonClick = () => {
    if (isStarting) return; // Prevent multiple clicks

    if (!test || !test.id || !test.title || loading || attemptStatus === null) {
      console.error("Cannot start/continue test, data missing or loading.");
      return;
    }

    setIsStarting(true); // Set loading state

    const slugifiedTitle = slugify(test.title, {
      lower: true,
      strict: true,
      locale: "vi",
    });

    router.push(`/test/${test.id}/test-detail`);
  };

  // --- Render Logic ---
  if (loading && !test && !error) {
    // Show full page loading only initially
    return <TestLoading />;
  }

  if (error && !test) {
    // Show main error only if test details failed critically
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <p className="text-red-600 mb-4 text-lg">Error loading test:</p>
        <p className="text-red-500 mb-6">{error}</p>
        <Link href="/test?mode=practice-test" passHref>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Practice Tests
          </Button>
        </Link>
      </div>
    );
  }

  // Handle case where loading finished but test is still null (e.g., 404 error caught)
  if (!loading && !test) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <p className="text-gray-600 mb-6 text-lg">
          {error || "Test not found."}
        </p>
        <Link href="/test?mode=practice-test" passHref>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Practice Tests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    // Use container for better spacing on larger screens
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/test" // Adjust as necessary
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay trở lại Test
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {" "}
          {/* Add spacing between elements */}
          <h1 className="text-2xl font-bold mb-4 font-sora">{test.title}</h1>
          <div>
            <h2 className="text-xl font-semibold mb-3">Hướng dẫn</h2>
            <div
              className="prose dark:prose-invert max-w-none" // Apply prose styling
              dangerouslySetInnerHTML={{
                __html:
                  test.instructions ||
                  "Chọn một đáp án đúng duy nhất. Mỗi câu 1 điểm. Chọn sai không bị trừ điểm.",
              }}
            />
          </div>
          {/* Previous Attempts Section */}
          <div>
            {/* Show loading indicator *while* loading is true, even if test data exists */}
            {loading && (
              <div className="text-center p-4">Loading attempts...</div>
            )}

            {/* Show error specific to attempts */}
            {!loading && attemptsError && (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Attempts</AlertTitle>
                <AlertDescription>
                  {attemptsError} {/* Display the specific error */}
                </AlertDescription>
              </Alert>
            )}

            {!loading && !attemptsError && (
              <PreviousAttempts
                attempts={attempts}
                onAttemptClick={navigateToAttemptResult}
                totalPossibleScore={totalScore}
                hasEssayQuestion={test?.has_essay_question}
              />
            )}
          </div>
          {/* Action Button Area */}
          <div className="flex justify-center items-center pt-4">
            <Button
              size="lg" // Use larger button size
              className="px-8 py-3 text-lg shadow-md hover:shadow-lg transition-shadow" // Styling
              onClick={handlePlayButtonClick}
              disabled={loading || attemptStatus === null} // Disable while loading status
            >
              <Play className="h-5 w-5 mr-2" />
              {getButtonText(attemptStatus)}
            </Button>
            {/* Subtle message if status check failed but didn't block main load */}
            {attemptStatus === "error" &&
              !error?.includes("status") && ( // Check if main error doesn't already mention status
                <p
                  className="text-xs text-yellow-600 ml-4 self-center"
                  title="Could not verify current attempt status."
                >
                  Status Unavailable
                </p>
              )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Ensure test data exists before rendering sidebar info */}
          {test && <TestInformation test={test} />}
        </div>
      </div>
    </div>
  );
}
