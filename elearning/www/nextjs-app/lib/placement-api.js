import { fetchWithAuth } from "@/pages/api/helper";

const API_PATH = "test.placement_test.";

export const checkUserProfile = async () => {
  try {
    const response = await fetchWithAuth(
      `${API_PATH}check_student_profile_exists`
    );
    return response.message.exists;
  } catch (error) {
    console.error("Error checking user profile:", error);
    // Giả định là chưa có profile nếu có lỗi, hoặc bạn có thể xử lý lỗi khác
    return false;
  }
};

export const startPlacementTest = async (testProfileId) => {
  return fetchWithAuth(`${API_PATH}start_test`, {
    method: "POST",
    body: {
      test_profile_id: testProfileId,
    },
  });
};

export const submitPlacementAnswer = async (
  sessionId,
  questionId,
  isCorrect
) => {
  return fetchWithAuth(`${API_PATH}submit_answer_and_get_next`, {
    method: "POST",
    body: {
      session_id: sessionId,
      question_id: questionId,
      is_correct: isCorrect,
    },
  });
};
