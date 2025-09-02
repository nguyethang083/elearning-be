// Service to fetch learning pathway data from the backend
export class LearningPathwayService {
  static async fetchUserLearningPathway(userId) {
    try {
      // First, try to get the most recent completed placement test session
      const sessionResponse = await fetch(
        `/api/method/elearning.elearning.doctype.placement_test_session.placement_test_session.get_user_latest_session?user_id=${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Failed to fetch user's placement test session");
      }

      const sessionData = await sessionResponse.json();

      if (!sessionData.message || !sessionData.message.session_id) {
        // If no placement test session exists, return default pathway
        return this.getDefaultPathway();
      }

      // Fetch the personalized pathway based on the session
      const pathwayResponse = await fetch(
        `/api/method/elearning.elearning.doctype.test.learning_pathway.get_learning_pathway?session_id=${sessionData.message.session_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!pathwayResponse.ok) {
        throw new Error("Failed to fetch learning pathway");
      }

      const pathwayData = await pathwayResponse.json();
      return {
        pathway: pathwayData.message.pathway,
        overall_level: pathwayData.message.overall_level,
        session_id: sessionData.message.session_id,
        isPersonalized: true,
      };
    } catch (error) {
      console.error("Error fetching learning pathway:", error);
      // Return default pathway if there's an error
      return this.getDefaultPathway();
    }
  }

  static getDefaultPathway() {
    // Default pathway for users who haven't taken the placement test
    return {
      pathway: [
        {
          id: 1,
          name: "Chương I. Phương trình và Hệ phương trình bậc nhất",
          description:
            "Nắm vững các khái niệm cơ bản về phương trình bậc nhất một ẩn và hệ phương trình.",
          progress: 0,
          status: "not-started",
          estimatedTime: "2-3 tuần",
          difficulty: "Sơ cấp",
          topics: [
            {
              name: "Bài 1. Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn có đáp án",
              status: "not-started",
              duration: "30 phút",
            },
            {
              name: "Bài 2. Giải hệ hai phương trình bậc nhất hai ẩn",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Bài 3. Giải bài toán bằng cách lập hệ phương trình",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Bài 4. Phương trình quy về phương trình bậc nhất một ẩn",
              status: "not-started",
              duration: "35 phút",
            },
          ],
        },
        {
          id: 2,
          name: "Chương II. Bất đẳng thức. Bất phương trình bậc nhất một ẩn",
          description:
            "Học về bất đẳng thức và phương pháp giải bất phương trình bậc nhất một ẩn.",
          progress: 0,
          status: "not-started",
          estimatedTime: "3-4 tuần",
          difficulty: "Sơ cấp",
          topics: [
            {
              name: "Bất đẳng thức cơ bản",
              status: "not-started",
              duration: "25 phút",
            },
            {
              name: "Bất phương trình bậc nhất một ẩn",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Hệ bất phương trình bậc nhất một ẩn",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Ứng dụng bất phương trình",
              status: "not-started",
              duration: "30 phút",
            },
          ],
        },
        {
          id: 3,
          name: "Chương III. Căn thức",
          description:
            "Tìm hiểu về căn thức, phép tính với căn thức và biến đổi biểu thức chứa căn.",
          progress: 0,
          status: "not-started",
          estimatedTime: "2-3 tuần",
          difficulty: "Trung bình",
          topics: [
            {
              name: "Căn bậc hai số học",
              status: "not-started",
              duration: "30 phút",
            },
            {
              name: "Căn thức bậc hai và hằng đẳng thức",
              status: "not-started",
              duration: "35 phút",
            },
            {
              name: "Biến đổi đơn giản biểu thức chứa căn",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Rút gọn biểu thức chứa căn",
              status: "not-started",
              duration: "45 phút",
            },
          ],
        },
        {
          id: 4,
          name: "Chương IV. Hệ thức lượng trong tam giác vuông",
          description:
            "Học về các hệ thức lượng trong tam giác vuông và ứng dụng.",
          progress: 0,
          status: "not-started",
          estimatedTime: "4-5 tuần",
          difficulty: "Trung bình",
          topics: [
            {
              name: "Hệ thức giữa cạnh và đường cao",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Tỉ số lượng giác của góc nhọn",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Bảng lượng giác",
              status: "not-started",
              duration: "30 phút",
            },
            {
              name: "Ứng dụng thực tế",
              status: "not-started",
              duration: "50 phút",
            },
          ],
        },
        {
          id: 5,
          name: "Chương V. Đường tròn",
          description:
            "Tìm hiểu về đường tròn, các yếu tố liên quan và tính chất.",
          progress: 0,
          status: "not-started",
          estimatedTime: "3-4 tuần",
          difficulty: "Trung bình",
          topics: [
            {
              name: "Sự xác định đường tròn",
              status: "not-started",
              duration: "35 phút",
            },
            {
              name: "Vị trí tương đối của đường thẳng và đường tròn",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Vị trí tương đối của hai đường tròn",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Độ dài đường tròn và diện tích hình tròn",
              status: "not-started",
              duration: "35 phút",
            },
          ],
        },
        {
          id: 6,
          name: "Chương VI. Một số yếu tố thống kê và xác suất",
          description: "Học về thống kê mô tả và xác suất cơ bản.",
          progress: 0,
          status: "not-started",
          estimatedTime: "6-8 tuần",
          difficulty: "Nâng cao",
          topics: [
            {
              name: "Thu thập và xử lý dữ liệu",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Biểu đồ và bảng tần số",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Xác suất của biến cố",
              status: "not-started",
              duration: "50 phút",
            },
            {
              name: "Ứng dụng xác suất",
              status: "not-started",
              duration: "35 phút",
            },
          ],
        },
        {
          id: 7,
          name: "Chương VII. Hàm số y = ax² (a ≠ 0). Phương trình bậc hai một ẩn",
          description:
            "Tìm hiểu về hàm số bậc hai và phương trình bậc hai một ẩn.",
          progress: 0,
          status: "not-started",
          estimatedTime: "4-5 tuần",
          difficulty: "Nâng cao",
          topics: [
            {
              name: "Hàm số y = ax² (a ≠ 0)",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Đồ thị hàm số y = ax²",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Phương trình bậc hai một ẩn",
              status: "not-started",
              duration: "50 phút",
            },
            {
              name: "Công thức nghiệm và định lý Vi-et",
              status: "not-started",
              duration: "55 phút",
            },
          ],
        },
        {
          id: 8,
          name: "Chương VIII. Đường tròn ngoại tiếp và Đường tròn nội tiếp",
          description:
            "Học về đường tròn ngoại tiếp và nội tiếp tam giác, đa giác.",
          progress: 0,
          status: "not-started",
          estimatedTime: "3-4 tuần",
          difficulty: "Nâng cao",
          topics: [
            {
              name: "Đường tròn ngoại tiếp tam giác",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Đường tròn nội tiếp tam giác",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Tứ giác nội tiếp",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Góc nội tiếp và góc ở tâm",
              status: "not-started",
              duration: "35 phút",
            },
          ],
        },
        {
          id: 9,
          name: "Chương IX. Đa giác đều",
          description: "Tìm hiểu về đa giác đều và tính chất của chúng.",
          progress: 0,
          status: "not-started",
          estimatedTime: "4-5 tuần",
          difficulty: "Nâng cao",
          topics: [
            {
              name: "Khái niệm đa giác đều",
              status: "not-started",
              duration: "35 phút",
            },
            {
              name: "Diện tích đa giác đều",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Đường tròn ngoại tiếp và nội tiếp đa giác đều",
              status: "not-started",
              duration: "50 phút",
            },
            {
              name: "Ứng dụng thực tế",
              status: "not-started",
              duration: "30 phút",
            },
          ],
        },
        {
          id: 10,
          name: "Chương X. Hình học trực quan",
          description: "Học về hình học không gian cơ bản và trực quan hóa.",
          progress: 0,
          status: "not-started",
          estimatedTime: "2-3 tuần",
          difficulty: "Trung bình",
          topics: [
            {
              name: "Hình chóp và hình lăng trụ",
              status: "not-started",
              duration: "45 phút",
            },
            {
              name: "Hình nón và hình trụ",
              status: "not-started",
              duration: "40 phút",
            },
            {
              name: "Mặt cầu",
              status: "not-started",
              duration: "35 phút",
            },
            {
              name: "Thể tích các khối hình học",
              status: "not-started",
              duration: "50 phút",
            },
          ],
        },
      ],
      overall_level: "Sơ cấp",
      session_id: null,
      isPersonalized: false,
    };
  }

  static async saveLearningProgress(sessionId, chapterId, progress) {
    try {
      const response = await fetch(
        `/api/method/elearning.elearning.doctype.test.learning_progress.update_chapter_progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            chapter_id: chapterId,
            progress: progress,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save learning progress");
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving learning progress:", error);
      throw error;
    }
  }

  static async refreshUserProgress(userId) {
    // Re-fetch the user's latest learning pathway with updated progress
    try {
      return await this.fetchUserLearningPathway(userId);
    } catch (error) {
      console.error("Error refreshing user progress:", error);
      throw error;
    }
  }

  static async markTopicCompleted(sessionId, topicId, chapterId) {
    try {
      const response = await fetch(
        `/api/method/elearning.elearning.doctype.test.learning_progress.mark_topic_completed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            topic_id: topicId,
            chapter_id: chapterId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark topic as completed");
      }

      return await response.json();
    } catch (error) {
      console.error("Error marking topic as completed:", error);
      throw error;
    }
  }
}

export default LearningPathwayService;
