// Test Page Guided Tour Configuration for nextstepjs v2

// Test page main tour
export const testTourSteps = [
  {
    tour: "test-page",
    steps: [
      {
        icon: (
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        ),
        title: "Chào mừng đến với Test Room!",
        content: (
          <>
            Đây là nơi bạn kiểm tra kiến thức và đánh giá năng lực của mình.
            <br />
            <br />
            <b>Có 3 loại bài kiểm tra:</b>
            <br />• <b>Chuyên đề:</b> Kiểm tra theo từng chương
            <br />• <b>Thi thử:</b> Đề thi tổng hợp
            <br />• <b>Luyện tập:</b> Ôn luyện các dạng bài
          </>
        ),
        selector: "",
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 0,
        pointerRadius: 0,
      },
      {
        icon: (
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
        title: "Bảng điều khiển chế độ",
        content: (
          <>
            Đây là nơi bạn chọn loại bài kiểm tra muốn làm:
            <br />
            <br />
            <b>Hãy chọn một chế độ để tiếp tục hướng dẫn!</b>
            <br />
            <br />• Chọn <b>"Chuyên đề"</b> để xem bài kiểm tra theo chương
            <br />• Chọn <b>"Thi thử"</b> để xem đề thi tổng hợp
            <br />• Chọn <b>"Luyện tập"</b> để xem bài luyện tập
          </>
        ),
        selector: "#test-mode-selector",
        side: "right",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: (
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ),
        title: "Chuyên đề - Kiểm tra theo chương",
        content: (
          <>
            <b>Chuyên đề</b> là các bài kiểm tra theo từng chương trong SGK.
            <br />
            <br />
            <b>Đặc điểm:</b>
            <br />
            • Tập trung vào 1 chương cụ thể
            <br />
            • Câu hỏi từ dễ đến khó theo nội dung chương
            <br />
            • Giúp bạn đánh giá mức độ hiểu bài từng phần
            <br />
            • Phù hợp ôn tập sau khi học xong chương
            <br />
            <br />
            <b>Chọn một chủ đề để xem các đề kiểm tra!</b>
          </>
        ),
        selector: "",
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 0,
        pointerRadius: 0,
      },
      {
        icon: (
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
        title: "Danh sách đề kiểm tra",
        content: (
          <>
            Đây là các đề kiểm tra cho chủ đề bạn đã chọn:
            <br />
            <br />
            <b>Thông tin mỗi đề:</b>
            <br />• <b>Độ khó:</b> Dễ / Trung bình / Khó
            <br />• <b>Thời gian:</b> Giới hạn thời gian làm bài
            <br />• <b>Số câu:</b> Tổng số câu hỏi trong đề
            <br />
            <br />
            <b>Chọn một đề để bắt đầu làm bài!</b>
          </>
        ),
        selector: "",
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 0,
        pointerRadius: 0,
      },
      {
        icon: (
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
        title: "Kết quả và Phản hồi",
        content: (
          <>
            Sau khi hoàn thành bài kiểm tra, bạn sẽ nhận được:
            <br />
            <br />
            <b>• Điểm số:</b> Đánh giá tổng quan kết quả
            <br />
            <b>• Phân tích chi tiết:</b> Từng câu đúng/sai
            <br />
            <b>• Lời giải:</b> Hướng dẫn chi tiết từng bài
            <br />
            <b>• Thống kê:</b> Điểm mạnh, điểm yếu theo chủ đề
            <br />
            <b>• Gợi ý AI:</b> Hướng cải thiện cá nhân hóa
            <br />
            <br />
            Xem lại kết quả cũ tại mục "Trình độ tổng thể"!
          </>
        ),
        selector: "",
        side: "top",
        showControls: true,
        showSkip: false,
        pointerPadding: 0,
        pointerRadius: 0,
      },
    ],
  },
];

export const TEST_TOUR_STORAGE_KEY = "test_tour_completed";
