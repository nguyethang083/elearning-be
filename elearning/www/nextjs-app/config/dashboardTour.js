// Dashboard Tour Configuration for nextstepjs v2
export const dashboardTourSteps = [
  {
    tour: "dashboard",
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
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        ),
        title: "Chào mừng đến với Dashboard!",
        content: (
          <>
            Đây là trung tâm học tập của bạn, nơi bạn có thể theo dõi tiến độ,
            đánh giá kỹ năng và quản lý quá trình học tập. Hãy cùng khám phá các
            tính năng chính!
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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
        title: "Trang chủ - Dashboard",
        content: (
          <>
            <b>Trang chủ</b> là nơi bạn xem tổng quan về tiến độ học tập, các
            hoạt động hàng ngày và thống kê tổng thể.
          </>
        ),
        selector: 'a[href="/dashboard"]',
        side: "bottom-left",
        showControls: true,
        showSkip: true,
        pointerPadding: 5,
        pointerRadius: 12,
        scrollToElement: {
          enabled: true,
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        },
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
        title: "Học tập - Flashcards",
        content: (
          <>
            <b>Học tập</b> dùng phương pháp SRS (Spaced Repetition System) với
            flashcards để ghi nhớ lâu dài. Ôn tập đều đặn mỗi ngày!
          </>
        ),
        selector: 'a[href="/learn"]',
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        ),
        title: "Lộ trình - Học tập cá nhân",
        content: (
          <>
            <b>Lộ trình</b> hiển thị bản đồ kiến thức cá nhân của bạn. Các chủ
            đề sẽ mở khóa dần dựa trên năng lực của bạn.
          </>
        ),
        selector: 'a[href="/my-pathway"]',
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        title: "Kiểm tra - Test & Thi thử",
        content: (
          <>
            <b>Kiểm tra</b> cho phép làm bài kiểm tra theo chuyên đề hoặc thi
            thử tổng hợp. Đánh giá năng lực và rèn luyện kỹ năng!
          </>
        ),
        selector: 'a[href="/test"]',
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
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
        ),
        title: "Báo cáo - Thống kê chi tiết",
        content: (
          <>
            <b>Báo cáo</b> cung cấp thống kê chi tiết về kết quả học tập, lịch
            sử làm bài và xu hướng phát triển.
          </>
        ),
        selector: 'a[href="/report"]',
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
        title: "Phân tích - Điểm yếu & AI",
        content: (
          <>
            <b>Phân tích</b> sử dụng AI để phát hiện điểm yếu, đưa ra gợi ý cải
            thiện và theo dõi xu hướng học tập.
          </>
        ),
        selector: 'a[href="/analysis"]',
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: "Đánh giá kỹ năng",
        content: (
          <>
            Bắt đầu với bài kiểm tra đánh giá để xác định điểm mạnh và điểm yếu
            của bạn. Hệ thống sẽ tạo lộ trình học tập phù hợp.
          </>
        ),
        selector: "#skill-assessment-card",
        side: "right",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: (
          <svg
            className="w-5 h-5 text-indigo-600"
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
        title: "Đánh giá hàng ngày",
        content: (
          <>
            Ôn tập các flashcards với phương pháp lặp lại ngắt quãng (SRS) để
            ghi nhớ lâu dài.
          </>
        ),
        selector: "#daily-review-card",
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
        title: "Phân tích điểm yếu",
        content: (
          <>
            Xem báo cáo chi tiết về tiến độ học tập và các lĩnh vực cần cải
            thiện.
          </>
        ),
        selector: "#analysis-card",
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        ),
        title: "Bảng xếp hạng",
        content: (
          <>
            Theo dõi tiến độ của bạn so với các học viên khác. Tích lũy điểm để
            leo lên vị trí cao hơn!
          </>
        ),
        selector: "#leaderboard-section",
        side: "right",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
        scrollToElement: {
          enabled: true,
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        },
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
              d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        title: "Hiệu suất học tập",
        content: (
          <>Theo dõi điểm số và tiến độ học tập theo thời gian của bạn.</>
        ),
        selector: "#performance-section",
        side: "right",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
        scrollToElement: {
          enabled: true,
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        },
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
        title: "Tiến độ bài học",
        content: (
          <>
            Xem tiến độ của từng chủ đề bạn đang học. Hoàn thành các bài học để
            đạt 100%!
          </>
        ),
        selector: "#lessons-progress",
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
    ],
  },
];

// Tour storage key
export const TOUR_STORAGE_KEY = "dashboard_tour_completed";
