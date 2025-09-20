// src/hooks/usePracticeTests.js (or your path)

import { useState, useEffect } from "react";
// Ensure fetchWithAuth is correctly configured for Frappe (cookie auth, base URL)
import { fetchWithAuth } from "@/pages/api/helper"; // Adjust path as needed

/**
 * Custom hook to fetch tests from Frappe backend, optionally filtered.
 * Handles loading and error states.
 *
 * @param {object} [filters={}] - Optional filter parameters.
 * @param {string|number|null} [filters.topicId] - The ID of the topic to filter by.
 * @param {string|null} [filters.gradeLevel] - The grade level to filter by.
 * @returns {{ tests: Array, loading: boolean, error: string|null }}
 */
export function usePracticeTests(filters = {}) {
  const { topicId, gradeLevel } = filters;

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadPracticeTests = async () => {
      if (!isMounted) return;

      setLoading(true);
      setError(null);
      setTests([]);

      try {
        const frappeMethodPathSuffix = "test.test.find_all_active_tests";

        // *** Prepare parameters for Frappe function (using snake_case) ***
        const params = {};
        const testTypeToFetch = topicId ? "Assessment" : "Practice"; // Your existing logic
        params.test_type = testTypeToFetch; // Matches Python arg test_type

        if (topicId) {
          params.topic_id = String(topicId); // Matches Python arg topic_id
        }
        if (gradeLevel) {
          params.grade_level = gradeLevel; // Matches Python arg grade_level
        }

        const responseData = await fetchWithAuth(frappeMethodPathSuffix, {
          method: "GET", // Explicitly GET
          params: params, // Pass params to be converted to query string
        });

        if (!isMounted) return;

        // *** Extract data from Frappe's 'message' wrapper ***
        const fetchedTestsFromFrappe = responseData?.message;

        if (!Array.isArray(fetchedTestsFromFrappe)) {
          if (responseData?._error_message) {
            throw new Error(responseData._error_message);
          }
          console.warn(
            "usePracticeTests: Received non-array data for tests, setting to empty array.",
            fetchedTestsFromFrappe
          );
          throw new Error(
            "Received invalid data format for tests from Frappe."
          );
        }

        // *** Adapt Frappe data structure to what PracticeTestList/TestRow expect ***
        // The Python function returns:
        // "name", "title", "topic", "grade_level", "test_type",
        // "time_limit_minutes", "instructions", "difficulty_level", "question_count"
        const adaptedTests = fetchedTestsFromFrappe.map((test) => ({
          id: test.name, // Use Frappe's 'name' as 'id'
          title: test.title,
          topic: test.topic, // Keep if needed, or remove if TestRow doesn't use it
          grade_level: test.grade_level,
          test_type: test.test_type,
          time_limit_minutes: test.time_limit_minutes,
          instructions: test.instructions,
          difficulty_level: test.difficulty_level, // This is what 'Difficulty' header will use
          question_count: test.question_count, // This is what 'Questions' header will use
          // Add any other transformations if your TestRow expects different prop names
        }));

        // Fetch test details and latest attempt for each test
        const testsWithDetails = await Promise.all(
          adaptedTests.map(async (test) => {
            try {
              // Fetch test details
              const detailsResponse = await fetchWithAuth(
                "test.test.get_test_details",
                {
                  method: "GET",
                  params: { test_id: test.id },
                }
              );
              const testDetails = detailsResponse?.message || {};

              // Fetch attempts
              const attemptsResponse = await fetchWithAuth(
                "test_attempt.test_attempt.get_user_attempts_for_test",
                {
                  method: "GET",
                  params: { test_id: test.id },
                }
              );
              const attempts = attemptsResponse?.message || [];
              // Sort attempts by start_time descending to get the latest
              attempts.sort(
                (a, b) => new Date(b.start_time) - new Date(a.start_time)
              );
              const latestAttempt = attempts.length > 0 ? attempts[0] : null;

              return {
                ...test,
                total_possible_score: testDetails.total_possible_score,
                has_essay_question: testDetails.has_essay_question,
                latestAttempt,
              };
            } catch (err) {
              console.error(
                `Failed to fetch details/attempts for test ${test.id}:`,
                err
              );
              return {
                ...test,
                total_possible_score: null,
                has_essay_question: false,
                latestAttempt: null,
              };
            }
          })
        );

        setTests(testsWithDetails);
      } catch (err) {
        console.error(
          "usePracticeTests: Failed to fetch tests from Frappe:",
          err
        );
        if (isMounted) {
          setError(err.message || "Could not load practice tests.");
          setTests([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPracticeTests();

    return () => {
      isMounted = false;
    };
  }, [topicId, gradeLevel]);

  return { tests, loading, error };
}
