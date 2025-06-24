import { useState, useEffect, useCallback } from "react";
// Ensure fetchWithAuth is correctly configured for Frappe (cookie auth, base URL, API prefix)
import { fetchWithAuth } from "@/pages/api/helper"; // Adjust path as needed

export function useTestDetails(testId) {
  const [test, setTest] = useState(null);
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptsError, setAttemptsError] = useState(null);

  const loadData = useCallback(async (currentTestId, signal) => {
    if (!currentTestId || typeof currentTestId !== "string") {
      setLoading(false);
      setTest(null);
      setAttemptStatus(null);
      setAttempts([]);
      setError(null);
      setAttemptsError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setAttemptsError(null);
    setTest(null);
    setAttemptStatus(null);
    setAttempts([]);

    try {
      // --- 1. Fetch Test Details ---
      const testDetailsPathSuffix = "test.test.get_test_details";
      const testDetailsResponse = await fetchWithAuth(testDetailsPathSuffix, {
        method: "GET",
        params: { test_id: currentTestId }, // Pass test_id as snake_case
        signal,
      });
      const fetchedTestData = testDetailsResponse?.message; // Extract from Frappe's 'message' wrapper

      if (!fetchedTestData || typeof fetchedTestData !== "object") {
        throw new Error(
          testDetailsResponse?._error_message ||
            "Received invalid data for test details from Frappe."
        );
      }
      setTest({ ...fetchedTestData, id: fetchedTestData.name }); // Map 'name' to 'id'

      // --- 2. Fetch Attempt Status ---
      try {
        const attemptStatusPathSuffix =
          "test_attempt.test_attempt.get_test_attempt_status";
        const statusResponse = await fetchWithAuth(attemptStatusPathSuffix, {
          method: "GET",
          params: { test_id: currentTestId }, // Pass test_id as snake_case
          signal,
        });
        const statusData = statusResponse?.message; // Extract from 'message'
        if (statusData && statusData.status) {
          setAttemptStatus(statusData.status);
        } else {
          console.warn(
            "useTestDetails: Received invalid status data from Frappe, defaulting to 'not_started'.",
            statusResponse
          );
          setAttemptStatus("not_started"); // Default or handle error
        }
      } catch (statusError) {
        if (statusError.name === "AbortError") {
          console.log("useTestDetails: Attempt status fetch aborted.");
          // Potentially re-throw or handle differently if needed
        } else {
          console.error(
            "useTestDetails: Failed to fetch Frappe attempt status:",
            statusError
          );
          setAttemptStatus("error"); // Indicate status fetch error
          setError((prevError) =>
            prevError
              ? `${prevError} Also failed to load attempt status.`
              : statusError.message || "Could not load attempt status."
          );
        }
      }

      // --- 3. Fetch Previous Attempts ---
      try {
        const userAttemptsPathSuffix =
          "test_attempt.test_attempt.get_user_attempts_for_test";
        const attemptsResponse = await fetchWithAuth(userAttemptsPathSuffix, {
          method: "GET",
          params: { test_id: currentTestId }, // Pass test_id as snake_case
          signal,
        });
        const fetchedAttempts = attemptsResponse?.message; // Extract from 'message'
        console.log(
          "useTestDetails: Fetched Frappe previous attempts:",
          fetchedAttempts
        );
        // Ensure it's an array before setting, map 'name' to 'id' if needed by components
        const adaptedAttempts = Array.isArray(fetchedAttempts)
          ? fetchedAttempts.map((att) => ({ ...att, id: att.id || att.name })) // Assuming Python already aliased 'name as id'
          : [];
        setAttempts(adaptedAttempts);
      } catch (attError) {
        if (attError.name === "AbortError") {
          console.log("useTestDetails: Previous attempts fetch aborted.");
        } else {
          console.error(
            "useTestDetails: Failed to fetch Frappe previous attempts:",
            attError
          );
          setAttemptsError(
            attError.message || "Could not load previous attempts."
          );
          setAttempts([]);
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("useTestDetails: Main data fetch aborted.");
        return;
      }
      console.error("useTestDetails: Failed during Frappe data loading:", err);
      let errorMessage = err.message || "Could not load test data.";
      if (err.data?._error_message) {
        // Check for Frappe specific error in data
        errorMessage = err.data._error_message;
      }
      // Consider checking if err.data suggests a 404 (though get_doc usually throws DoesNotExistError -> 404 by Frappe)
      // if (err.data?.exception?.includes("DoesNotExistError")) {
      //    errorMessage = `Test with ID ${currentTestId} not found.`;
      // }
      setError(errorMessage);
      setTest(null);
      setAttemptStatus(null);
      setAttempts([]);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        console.log("useTestDetails: Finished fetching Frappe data.");
      }
    }
  }, []); // Removed testId from here, will pass it to loadData directly

  useEffect(() => {
    const controller = new AbortController();
    if (testId) {
      // Only load if testId is present
      loadData(testId, controller.signal);
    } else {
      // Reset if testId becomes null/undefined
      setLoading(false);
      setTest(null);
      setAttemptStatus(null);
      setAttempts([]);
      setError(null);
      setAttemptsError(null);
    }

    return () => {
      console.log(
        "useTestDetails: Cleanup, aborting potential fetch for testId:",
        testId
      );
      controller.abort();
    };
  }, [testId, loadData]); // Re-run when testId changes (loadData is memoized)

  return { test, attemptStatus, attempts, loading, error, attemptsError };
}
