import { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import { fetchWithAuth } from "@/pages/api/helper"; // Adjust path as needed

export function useTestAttempt(testId, isReadyToStart) {
  const [attemptStartData, setAttemptStartData] = useState(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [attemptError, setAttemptError] = useState(null);

  // Add a ref to track if a request is in progress
  const requestInProgressRef = useRef(false);

  // This function now accepts an AbortSignal
  const startOrResume = useCallback(async (currentTestId, signal) => {
    // Skip if already in progress to prevent duplicate calls
    requestInProgressRef.current = true;

    try {
      const frappeMethodPathSuffix =
        "test_attempt.test_attempt.start_or_resume_test_attempt";

      const responseData = await fetchWithAuth(frappeMethodPathSuffix, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        params: { test_id: currentTestId }, // Pass test_id as snake_case
        signal, // Pass the abort signal from useEffect
      });

      const actualData = responseData?.message;

      if (
        actualData &&
        actualData.attempt &&
        actualData.test &&
        actualData.questions && // questions can be an empty array
        typeof actualData.saved_answers === "object" // saved_answers can be an empty object
      ) {
        setAttemptStartData(actualData);
        setAttemptError(null); // Clear any previous error on success
      } else {
        console.error(
          "useTestAttempt: Invalid data structure received from Frappe start/resume endpoint.",
          { requestedTestId: currentTestId, receivedData: actualData }
        );
        if (responseData?._error_message) {
          // Check for Frappe's error message wrapper
          throw new Error(responseData._error_message);
        }
        throw new Error(
          "Received invalid data from server when starting attempt."
        );
      }
    } catch (error) {
      // AbortError will be caught by the calling useEffect's catch block.
      // Re-throw other errors to be caught and handled by the useEffect.
      if (error.name !== "AbortError") {
        console.error(
          `useTestAttempt: Error inside startOrResume for Test ID ${currentTestId}:`,
          error
        );
      }
      throw error; // Re-throw for useEffect to handle state updates (e.g., setError)
    } finally {
      // Reset the request flag regardless of success/failure
      requestInProgressRef.current = false;
    }
  }, []); // Empty dependency array: startOrResume is stable and gets testId/signal as args

  useEffect(() => {
    // Create an AbortController for this specific effect execution
    const controller = new AbortController();

    if (testId && isReadyToStart && !requestInProgressRef.current) {
      const fetchData = async () => {
        setLoadingAttempt(true);
        setAttemptStartData(null); // Reset data before new fetch
        setAttemptError(null); // Reset error before new fetch

        try {
          await startOrResume(testId, controller.signal);
          // If successful, attemptStartData is set within startOrResume
        } catch (error) {
          if (error.name === "AbortError") {
            console.log(
              "useTestAttempt: Fetch aborted in useEffect for testId:",
              testId
            );
            // Don't set error state if it was an intentional abort
          } else {
            // Handle actual fetch errors
            console.error(
              "useTestAttempt: useEffect caught error for testId:",
              testId,
              error
            );
            setAttemptError(
              error.message || "Failed to start or resume test attempt."
            );
          }
        } finally {
          // Only set loading to false if the fetch wasn't aborted by this controller's signal.
          // If it was aborted, it means the component unmounted or a new effect run (with a new controller) started.
          if (!controller.signal.aborted) {
            setLoadingAttempt(false);
          }
        }
      };

      fetchData();
    } else {
      // Reset if not ready or no ID, or if testId/isReadyToStart becomes falsy
      setLoadingAttempt(false);
      setAttemptStartData(null);
      setAttemptError(null);
    }

    // Cleanup function for useEffect
    return () => {
      controller.abort(); // Abort the fetch associated with this specific effect run
    };
  }, [testId, isReadyToStart, startOrResume]); // Dependencies for the effect

  return { attemptStartData, loadingAttempt, attemptError };
}
