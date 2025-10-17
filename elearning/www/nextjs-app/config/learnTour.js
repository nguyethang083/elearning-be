// Learn Topic Tours Configuration for nextstepjs v2

// Topic welcome screen tour (before choosing a mode)
export const learnTopicWelcomeTourSteps = [
  {
    tour: "learn-topic-welcome",
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
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        ),
        title: "Chào mừng đến Chủ đề!",
        content: (
          <>
            Đây là màn hình giới thiệu chủ đề. Hãy cùng tìm hiểu các chế độ học
            và tính năng có sẵn!
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ),
        title: "3 Chế độ học tập",
        content: (
          <>
            Mỗi chế độ phù hợp với mục tiêu học khác nhau:
            <br />
            <br />
            <b>• Cơ bản:</b> Làm quen với nội dung mới
            <br />
            <b>• Kiểm tra:</b> Luyện tập và nhận feedback từ AI
            <br />
            <b>• SRS:</b> Ghi nhớ lâu dài với thuật toán thông minh
          </>
        ),
        selector: ".mode-selection-container",
        side: "top",
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: "Thông tin Chủ đề",
        content: (
          <>
            Xem số lượng thẻ, tiến độ học tập và thống kê của bạn ở đây. Giúp
            bạn theo dõi quá trình học!
          </>
        ),
        selector: ".topic-stats-section",
        side: "left",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
    ],
  },
];

// Topic detail page tour (after selecting a mode)
export const learnTopicTourSteps = [
  {
    tour: "learn-topic",
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
        title: "Màn hình học tập",
        content: (
          <>
            Đây là nơi bạn thực sự học! Có 3 chế độ học và nhiều cài đặt để tùy
            chỉnh trải nghiệm!
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ),
        title: "Chế độ Cơ bản",
        content: (
          <>
            Xem và lật thẻ flashcard để làm quen với nội dung. Đơn giản và dễ sử
            dụng cho người mới bắt đầu.
          </>
        ),
        selector: "#learning-mode-basic",
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
        title: "Chế độ Kiểm tra",
        content: (
          <>
            Trả lời câu hỏi và nhận phản hồi thông minh từ AI. Tự động thêm thẻ
            khó vào hệ thống ôn tập ngắt quãng (SRS).
          </>
        ),
        selector: "#learning-mode-exam",
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ),
        title: "Chế độ SRS (Spaced Repetition System)",
        content: (
          <>
            <b>SRS là gì?</b> Hệ thống ôn tập ngắt quãng dựa trên khoa học não
            bộ.
            <br />
            <br />
            <b>Cách hoạt động:</b>
            <br />
            • Thẻ xuất hiện đúng lúc bạn sắp quên
            <br />
            • Thẻ dễ → khoảng cách dài hơn
            <br />
            • Thẻ khó → xuất hiện thường xuyên hơn
            <br />
            <br />
            <b>Lợi ích:</b> Ghi nhớ lâu dài với ít thời gian hơn!
          </>
        ),
        selector: "#learning-mode-srs",
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: "Lịch sử kiểm tra",
        content: (
          <>
            Xem lịch sử các lần kiểm tra để theo dõi tiến bộ của bạn theo thời
            gian. Biểu đồ chi tiết giúp bạn biết mình đã tiến bộ thế nào!
          </>
        ),
        selector: "#exam-history-button",
        side: "left",
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
        title: "Cài đặt Flashcard",
        content: (
          <>
            Tùy chỉnh trải nghiệm học tập của bạn:
            <br />
            <br />
            <b>• Sắp xếp thẻ:</b> Theo thứ tự hoặc ngẫu nhiên
            <br />
            <b>• Hướng lật:</b> Câu hỏi trước hoặc đáp án trước
            <br />
            <b>• Lọc loại thẻ:</b> Chọn loại câu hỏi muốn học
            <br />
            <b>• Đặt lại SRS:</b> Xóa tiến độ ôn tập để bắt đầu lại
          </>
        ),
        selector: "#flashcard-settings-button",
        side: "left",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
        scrollToElement: {
          enabled: true,
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        },
      },
    ],
  },
];

// Learning Mode Detailed Tour (for when in a specific mode like basic, exam, srs)
export const learnModeTourSteps = [
  {
    tour: "learn-mode-detail",
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
        title: "Chào mừng đến Màn hình Học tập!",
        content: (
          <>
            Đây là nơi bạn thực sự học và luyện tập! Hãy cùng khám phá các tính
            năng mạnh mẽ giúp bạn học hiệu quả hơn.
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ),
        title: "Chế độ Cơ bản - Làm quen nội dung",
        content: (
          <>
            <b>Chế độ Cơ bản</b> giúp bạn làm quen với kiến thức mới:
            <br />
            <br />
            <b>• Đọc và lật thẻ:</b> Xem câu hỏi, suy nghĩ và lật để xem đáp án
            <br />
            <b>• Theo dõi tiến độ:</b> Thanh tiến độ hiển thị bạn đã xem bao
            nhiêu thẻ
            <br />
            <b>• Không áp lực:</b> Không cần trả lời, chỉ cần đọc và hiểu
            <br />
            <br />
            💡 <b>Khi nào dùng:</b> Khi bạn mới bắt đầu học một chủ đề mới
          </>
        ),
        selector: "#learning-mode-basic",
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
        title: "Chế độ Kiểm tra - Luyện tập chủ động",
        content: (
          <>
            <b>Chế độ Kiểm tra</b> giúp bạn luyện tập thực tế:
            <br />
            <br />
            <b>• Trả lời câu hỏi:</b> Nhập câu trả lời của bạn vào ô text
            <br />
            <b>• Phản hồi AI thông minh:</b> Nhận đánh giá chi tiết từ AI
            <br />
            <b>• Tự đánh giá:</b> Đánh giá mức độ hiểu của bạn (Quên/Khó/Nhớ)
            <br />
            <b>• Tự động vào SRS:</b> Thẻ khó sẽ được thêm vào hệ thống ôn tập
            <br />
            <br />
            💡 <b>Khi nào dùng:</b> Sau khi đã làm quen với Chế độ Cơ bản
          </>
        ),
        selector: "#learning-mode-exam",
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ),
        title: "🧠 SRS - Hệ thống Ôn tập Thông minh",
        content: (
          <>
            <b>SRS (Spaced Repetition System)</b> là hệ thống học thông minh
            nhất:
            <br />
            <br />
            <b>📚 SRS là gì?</b>
            <br />
            • Hệ thống ôn tập ngắt quãng dựa trên khoa học não bộ
            <br />
            • Giúp bạn ghi nhớ lâu dài với ít thời gian hơn
            <br />
            <br />
            <b>⚙️ Cách hoạt động:</b>
            <br />• <b>Thẻ "Quên"</b> → Xuất hiện lại sau 1-10 phút
            <br />• <b>Thẻ "Khó"</b> → Xuất hiện sau 1-3 ngày
            <br />• <b>Thẻ "Nhớ"</b> → Xuất hiện sau 4+ ngày
            <br />
            <br />
            💡 <b>Khi nào dùng:</b> Sau khi đã làm bài Exam Mode và tự đánh giá
          </>
        ),
        selector: "#learning-mode-srs",
        side: "left",
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
        title: "Chi tiết SRS - Bộ sưu tập thẻ học",
        content: (
          <>
            Hệ thống phân loại thẻ thành 4 nhóm:
            <br />
            <br />
            <b>🟣 Thẻ MỚI:</b> Lần đầu gặp, cần làm quen
            <br />
            <b>🟠 ĐANG HỌC:</b> Đang rèn luyện, cần lặp lại
            <br />
            <b>🟢 DUY TRÌ:</b> Đã thuộc, ôn định kỳ để nhớ lâu
            <br />
            <b>🔵 HÔM NAY:</b> Các thẻ đã đến lịch ôn tập
            <br />
            <br />
            📊 <b>Bảng điều khiển học tập</b> hiển thị:
            <br />
            • Tiến độ phiên ôn tập hiện tại
            <br />
            • Thống kê theo từng loại thẻ
            <br />• Gợi ý thông minh từ hệ thống
          </>
        ),
        selector: "#learning-mode-srs",
        side: "left",
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: "Lịch sử Kiểm tra - Theo dõi tiến bộ",
        content: (
          <>
            Xem chi tiết lịch sử các lần kiểm tra:
            <br />
            <br />
            <b>• Biểu đồ tiến bộ:</b> Xem điểm số theo thời gian
            <br />
            <b>• Chi tiết từng lần:</b> Số câu đúng/sai, thời gian làm bài
            <br />
            <b>• Phân tích xu hướng:</b> Bạn đang tiến bộ hay cần cố gắng hơn
            <br />
            <br />
            💡 Giúp bạn nhìn thấy rõ sự tiến bộ của mình!
          </>
        ),
        selector: "#exam-history-button",
        side: "left",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
        title: "Cài đặt Flashcard - Tùy chỉnh trải nghiệm",
        content: (
          <>
            Tùy chỉnh cách học phù hợp với bạn:
            <br />
            <br />
            <b>🔀 Sắp xếp thẻ:</b>
            <br />• <b>Theo thứ tự:</b> Học từ đầu đến cuối
            <br />• <b>Ngẫu nhiên:</b> Thẻ xuất hiện không theo thứ tự
            <br />
            <br />
            <b>🔄 Hướng lật thẻ:</b>
            <br />• <b>Câu hỏi trước:</b> Hiển thị câu hỏi, lật xem đáp án
            <br />• <b>Đáp án trước:</b> Hiển thị đáp án, lật xem câu hỏi
            <br />
            <br />
            <b>🎯 Lọc loại thẻ:</b>
            <br />
            • Chọn loại câu hỏi bạn muốn luyện tập
            <br />
            • VD: Chỉ học "Điền vào chỗ trống" hoặc "Câu hỏi mở"
            <br />
            <br />
            <b>♻️ Đặt lại SRS:</b>
            <br />
            • Xóa toàn bộ tiến độ ôn tập để bắt đầu lại từ đầu
            <br />• <b>⚠️ Cẩn thận:</b> Hành động này không thể hoàn tác!
          </>
        ),
        selector: "#flashcard-settings-button",
        side: "bottom-right",
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: "Lộ trình học tập đề xuất 🎯",
        content: (
          <>
            <b>Cách học hiệu quả nhất:</b>
            <br />
            <br />
            <b>Bước 1️⃣ - Chế độ Cơ bản</b>
            <br />
            • Đọc và làm quen với tất cả thẻ flashcard
            <br />
            • Không cần ghi nhớ, chỉ cần hiểu nội dung
            <br />
            <br />
            <b>Bước 2️⃣ - Chế độ Kiểm tra</b>
            <br />
            • Trả lời câu hỏi và nhận phản hồi từ AI
            <br />
            • Tự đánh giá mức độ hiểu (Quên/Khó/Nhớ)
            <br />
            • Thẻ khó tự động thêm vào SRS
            <br />
            <br />
            <b>Bước 3️⃣ - Chế độ SRS</b>
            <br />
            • Ôn tập các thẻ theo lịch trình thông minh
            <br />
            • Hệ thống tự điều chỉnh dựa trên đánh giá của bạn
            <br />
            • Ghi nhớ lâu dài với ít thời gian nhất
            <br />
            <br />
            <b>✨ Kết quả:</b> Nhớ lâu, hiểu sâu, tiết kiệm thời gian!
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

export const LEARN_TOPIC_WELCOME_TOUR_STORAGE_KEY =
  "learn_topic_welcome_tour_completed";
export const LEARN_TOPIC_TOUR_STORAGE_KEY = "learn_topic_tour_completed";
export const LEARN_MODE_DETAIL_TOUR_STORAGE_KEY =
  "learn_mode_detail_tour_completed";
