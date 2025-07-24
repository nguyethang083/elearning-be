import { useState, useCallback, useRef, useEffect } from "react";

export function useTestAnswers() {
  // --- Answer State (keyed by testQuestionId - camelCase) ---
  const [multipleChoiceAnswers, setMultipleChoiceAnswers] = useState({});
  const [shortAnswers, setShortAnswers] = useState({});
  const [longAnswers, setLongAnswers] = useState({});
  const [canvasStates, setCanvasStates] = useState({});

  // --- UI/Meta State (keyed by testQuestionId - camelCase) ---
  const [completedQuestions, setCompletedQuestions] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [savedStatus, setSavedStatus] = useState("saved"); // 'saved', 'unsaved', 'saving', 'error'

  // --- Time Tracking State (keyed by testQuestionId - camelCase) ---
  const [questionTimeSpent, setQuestionTimeSpent] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(null); // Stores testQuestionId (camelCase)
  const [currentQuestionStartTime, setCurrentQuestionStartTime] =
    useState(null);

  const activeQuestionIdRef = useRef(activeQuestionId);
  const currentQuestionStartTimeRef = useRef(currentQuestionStartTime);

  useEffect(() => {
    activeQuestionIdRef.current = activeQuestionId;
  }, [activeQuestionId]);

  useEffect(() => {
    currentQuestionStartTimeRef.current = currentQuestionStartTime;
  }, [currentQuestionStartTime]);

  // --- Initialization Function ---
  const initializeAnswers = useCallback(
    (
      savedAnswersFromBackend,
      questionsWithMappedId,
      savedMarkedForReview = {}
    ) => {
      // Reset all states
      setMultipleChoiceAnswers({});
      setShortAnswers({});
      setLongAnswers({});
      setCanvasStates({});
      setCompletedQuestions({});
      setMarkedForReview({});
      setQuestionTimeSpent({});
      setActiveQuestionId(null);
      setCurrentQuestionStartTime(null);
      activeQuestionIdRef.current = null;
      currentQuestionStartTimeRef.current = null;

      if (
        !savedAnswersFromBackend ||
        typeof savedAnswersFromBackend !== "object" ||
        !Array.isArray(questionsWithMappedId)
      ) {
        console.warn(
          "useTestAnswers: Invalid input for initialization. Skipping.",
          { savedAnswersFromBackend, questionsWithMappedId }
        );
        setSavedStatus("saved"); // Assume saved if nothing to initialize from
        return;
      }

      const initialMC = {};
      const initialShort = {};
      const initialLong = {};
      const initialCanvas = {};
      const initialCompleted = {};
      const initialTimeSpent = {};
      const initialMarkedReview = {};

      // Initialize marked for review from saved data
      if (savedMarkedForReview && typeof savedMarkedForReview === "object") {
        Object.assign(initialMarkedReview, savedMarkedForReview);
      }

      for (const backendKey_snake_case in savedAnswersFromBackend) {
        const answerData = savedAnswersFromBackend[backendKey_snake_case];
        const questionForThisAnswer = questionsWithMappedId.find(
          (q) => q.test_question_detail_id === backendKey_snake_case
        );

        if (questionForThisAnswer && answerData) {
          const frontendKey_camelCase = questionForThisAnswer.testQuestionId;

          if (typeof answerData.timeSpentSeconds === "number") {
            initialTimeSpent[frontendKey_camelCase] =
              answerData.timeSpentSeconds;
          }

          if (
            answerData.userAnswer !== undefined &&
            answerData.userAnswer !== null
          ) {
            const answer = answerData.userAnswer; // This should be the option.id for MCQs
            initialCompleted[frontendKey_camelCase] = true;

            switch (questionForThisAnswer.question_type) {
              case "Multiple Choice":
              case "multiple_select":
                initialMC[frontendKey_camelCase] = answer; // Stores the option.id
                break;
              case "Self Write":
              case "short_answer":
                initialShort[frontendKey_camelCase] = answer;
                break;
              case "Essay":
              case "long_answer":
                initialLong[frontendKey_camelCase] = answer;
                break;
              case "drawing":
                try {
                  initialCanvas[frontendKey_camelCase] =
                    typeof answer === "string" ? JSON.parse(answer) : answer;
                } catch (e) {
                  console.error(
                    `Failed to parse canvas state for ${frontendKey_camelCase}:`,
                    answer,
                    e
                  );
                  initialCanvas[frontendKey_camelCase] = null;
                }
                break;
              default:
                console.warn(
                  `Unknown question type "${questionForThisAnswer.question_type}" during initialization for ${frontendKey_camelCase}`
                );
            }
          }
        }
      }

      setMultipleChoiceAnswers(initialMC);
      setShortAnswers(initialShort);
      setLongAnswers(initialLong);
      setCanvasStates(initialCanvas);
      setCompletedQuestions(initialCompleted);
      setMarkedForReview(initialMarkedReview);
      setQuestionTimeSpent(initialTimeSpent);
      setSavedStatus("saved");
    },
    []
  );

  // --- Time Tracking Handler ---
  const handleQuestionChange = useCallback((newTestQuestionId_camelCase) => {
    const previousQuestionId = activeQuestionIdRef.current;
    const previousStartTime = currentQuestionStartTimeRef.current;
    const now = Date.now();

    if (previousQuestionId && previousStartTime) {
      const durationSeconds = (now - previousStartTime) / 1000;
      setQuestionTimeSpent((prev) => ({
        ...prev,
        [previousQuestionId]: (prev[previousQuestionId] || 0) + durationSeconds,
      }));
    }

    if (newTestQuestionId_camelCase) {
      setActiveQuestionId(newTestQuestionId_camelCase);
      setCurrentQuestionStartTime(now);
    } else {
      setActiveQuestionId(null);
      setCurrentQuestionStartTime(null);
    }
  }, []);

  // --- State Update Handlers (using testQuestionId - camelCase) ---
  const updateAnswerState = useCallback(
    (setter, testQuestionId_camelCase, value) => {
      if (!testQuestionId_camelCase) {
        console.warn("updateAnswerState called with invalid testQuestionId");
        return;
      }
      setter((prev) => ({ ...prev, [testQuestionId_camelCase]: value }));
      setSavedStatus("unsaved");
    },
    []
  );

  const markQuestionCompleted = useCallback(
    (testQuestionId_camelCase, completed = true) => {
      if (!testQuestionId_camelCase) return;
      setCompletedQuestions((prev) => {
        if (!!prev[testQuestionId_camelCase] !== completed) {
          setSavedStatus("unsaved");
          return { ...prev, [testQuestionId_camelCase]: completed };
        }
        return prev;
      });
    },
    []
  );

  const handleMultipleChoiceChange = useCallback(
    (testQuestionId_camelCase, _optionTextIgnored, optionObject) => {
      // The second argument (_optionTextIgnored) is not used if we only need the ID from optionObject.
      // optionObject is expected to be like { id: "some_option_id", text: "Option text", ... }

      if (!optionObject || typeof optionObject.id === "undefined") {
        console.error(
          "handleMultipleChoiceChange: optionObject is undefined or optionObject.id is missing.",
          { testQuestionId_camelCase, optionObject }
        );
        // Mark as an attempt was made, but the answer (option ID) cannot be stored.
        // You might want to handle this error more visibly to the user or log it.
        markQuestionCompleted(testQuestionId_camelCase, true);
        return; // Prevent storing an undefined answer
      }

      updateAnswerState(
        setMultipleChoiceAnswers,
        testQuestionId_camelCase,
        optionObject.id // Store the actual ID of the selected option
      );
      markQuestionCompleted(testQuestionId_camelCase, true);
    },
    [updateAnswerState, markQuestionCompleted]
  );

  const handleShortAnswerChange = useCallback(
    (testQuestionId_camelCase, value) => {
      updateAnswerState(setShortAnswers, testQuestionId_camelCase, value);
      markQuestionCompleted(testQuestionId_camelCase, value.trim().length > 0);
    },
    [updateAnswerState, markQuestionCompleted]
  );

  const handleLongAnswerChange = useCallback(
    (testQuestionId_camelCase, value) => {
      updateAnswerState(setLongAnswers, testQuestionId_camelCase, value);
      markQuestionCompleted(testQuestionId_camelCase, value.trim().length > 0);
    },
    [updateAnswerState, markQuestionCompleted]
  );

  const handleSetCanvasStates = useCallback(
    (testQuestionId_camelCase, newState) => {
      updateAnswerState(setCanvasStates, testQuestionId_camelCase, newState);
      markQuestionCompleted(
        testQuestionId_camelCase,
        newState !== null && newState !== undefined
      );
    },
    [updateAnswerState, markQuestionCompleted]
  );

  const toggleMarkForReview = useCallback((testQuestionId_camelCase) => {
    if (!testQuestionId_camelCase) return;
    setMarkedForReview((prev) => {
      const newState = {
        ...prev,
        [testQuestionId_camelCase]: !prev[testQuestionId_camelCase],
      };
      console.log(
        "Setting savedStatus to unsaved, new marked state:",
        newState
      );
      setSavedStatus("unsaved");
      return newState;
    });
  }, []);

  // --- Payload Generation for Submission (Includes Time Spent) ---
  const getAnswersForSubmission = useCallback(
    (questionsWithMappedId, currentSessionQuestionFiles) => {
      const answersToSubmit = {};
      if (!Array.isArray(questionsWithMappedId)) {
        console.error(
          "getAnswersForSubmission: Invalid questions array received."
        );
        return answersToSubmit;
      }

      let finalTimeSpent = { ...questionTimeSpent };
      const lastActiveId = activeQuestionIdRef.current;
      const lastStartTime = currentQuestionStartTimeRef.current;

      if (lastActiveId && lastStartTime) {
        const durationSeconds = (Date.now() - lastStartTime) / 1000;
        finalTimeSpent[lastActiveId] =
          (finalTimeSpent[lastActiveId] || 0) + durationSeconds;
      }

      questionsWithMappedId.forEach((q) => {
        const tqId_camelCase = q?.testQuestionId;
        if (!tqId_camelCase) {
          console.warn(
            "getAnswersForSubmission: Skipping question with missing testQuestionId (camelCase)",
            q
          );
          return;
        }

        let userAnswer = null;
        let base64_images_for_payload = [];
        const questionTypeFromBackend = q.question_type;

        switch (questionTypeFromBackend) {
          case "Multiple Choice":
          case "multiple_select":
            // This will now correctly be the option.id stored earlier
            userAnswer = multipleChoiceAnswers[tqId_camelCase] ?? null;
            break;
          case "Self Write":
          case "short_answer":
            userAnswer = shortAnswers[tqId_camelCase] ?? null;
            break;
          case "Essay":
          case "long_answer":
            userAnswer = longAnswers[tqId_camelCase] ?? null;
            const filesForThisEssay =
              currentSessionQuestionFiles?.[tqId_camelCase] || [];
            base64_images_for_payload = filesForThisEssay.map((fileInfo) => ({
              data: fileInfo.base64Data,
              filename: fileInfo.originalFilename,
              mime_type: fileInfo.mimeType,
            }));
            break;
            break;
          case "drawing":
            const canvasState = canvasStates[tqId_camelCase];
            userAnswer = canvasState ?? null;
            break;
          default:
            console.warn(
              `Unknown question type "${questionTypeFromBackend}" during submission for ${tqId_camelCase}`
            );
            userAnswer = null;
        }

        const timeSpent = Math.round(finalTimeSpent[tqId_camelCase] || 0);
        answersToSubmit[tqId_camelCase] = {
          userAnswer: userAnswer, // For MCQs, this is now the option.id
          timeSpent: timeSpent,
        };
        if (
          (questionTypeFromBackend === "Essay" ||
            questionTypeFromBackend === "long_answer") &&
          base64_images_for_payload.length > 0
        ) {
          answersToSubmit[tqId_camelCase].base64_images =
            base64_images_for_payload;
        }
      });
      console.log(
        "getAnswersForSubmission (Base64 flow) generated:",
        answersToSubmit
      );

      return {
        answers: answersToSubmit,
        markedForReview: markedForReview,
      };
    },
    [
      multipleChoiceAnswers,
      shortAnswers,
      longAnswers,
      canvasStates,
      questionTimeSpent,
      markedForReview,
    ]
  );

  return {
    multipleChoiceAnswers,
    shortAnswers,
    longAnswers,
    canvasStates,
    completedQuestions,
    markedForReview,
    savedStatus,
    questionTimeSpent,
    handlers: {
      initializeAnswers,
      handleMultipleChoiceChange, // Now updated
      handleShortAnswerChange,
      handleLongAnswerChange,
      handleSetCanvasStates,
      toggleMarkForReview,
      markQuestionCompleted,
      setSavedStatus,
      handleQuestionChange,
    },
    getAnswersForSubmission,
  };
}
