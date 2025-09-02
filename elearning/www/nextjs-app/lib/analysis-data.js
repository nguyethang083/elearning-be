export const studentPerformanceData = {
  overallProgress: 68,
  skillsData: {
    categories: [
      "Đọc hiểu",
      "Viết",
      "Số học",
      "Mô hình hóa",
      "Vận dụng",
      "Tính toán",
    ],
    currentPeriod: [75, 60, 85, 45, 70, 80],
    previousPeriod: [65, 55, 80, 40, 65, 75],
    classAverage: [70, 65, 75, 60, 65, 70],
  },
  knowledgeGaps: {
    mathematicsKnowledge: [
      {
        title: "Số học",
        mistakes: [
          { text: "Chậm hoặc sai khi", highlight: "tính toán cơ bản" },
          {
            text: "Gặp khó khăn với",
            highlight: "phân số, số thập phân & phần trăm",
          },
          { text: "Lúng túng với", highlight: "thứ tự thực hiện phép tính" },
        ],
      },
      {
        title: "Đại số",
        mistakes: [
          { text: "Nhầm lẫn khi", highlight: "biến đổi biến số" },
          { text: "Sai sót ở", highlight: "các bước giải phương trình" },
          { text: "Chưa hiểu rõ về", highlight: "ký hiệu hàm số" },
        ],
      },
    ],
    mathematicsProcesses: [
      {
        title: "Giải quyết vấn đề",
        level: "Đang phát triển",
        issues: [
          "Chưa giải thích hợp lý cho đáp án",
          "Chưa phản ánh và giải thích các bước làm",
          "Khó xác định thông tin quan trọng trong bài toán đố",
        ],
      },
      {
        title: "Giao tiếp toán học",
        level: "Mới bắt đầu",
        issues: [
          "Sử dụng thuật ngữ toán học chưa nhất quán",
          "Khó giải thích quá trình suy luận",
          "Chưa thể hiện bài toán bằng hình ảnh",
        ],
      },
    ],
  },
  performanceTrend: {
    labels: ["Th8"],
    datasets: [
      {
        label: "Chương 1",
        data: [0],
        color: "rgba(99, 102, 241, 1)",
      },
      {
        label: "Chương 2",
        data: [0],
        color: "rgba(236, 72, 153, 1)",
      },
      {
        label: "Chương 3",
        data: [0],
        color: "rgba(74, 222, 128, 1)",
      },
      {
        label: "Chương 4",
        data: [0],
        color: "rgba(251, 191, 36, 1)",
      },
      {
        label: "Chương 5",
        data: [0],
        color: "rgba(59, 130, 246, 1)",
      },
      {
        label: "Chương 6",
        data: [0],
        color: "rgba(244, 63, 94, 1)",
      },
      {
        label: "Chương 7",
        data: [0],
        color: "rgba(16, 185, 129, 1)",
      },
      {
        label: "Chương 8",
        data: [0],
        color: "rgba(168, 85, 247, 1)",
      },
      {
        label: "Chương 9",
        data: [0],
        color: "rgba(251, 113, 133, 1)",
      },
      {
        label: "Chương 10",
        data: [0],
        color: "rgba(34, 197, 94, 1)",
      },
    ],
  },
  areasForImprovement: [
    {
      title: "Giải phương trình đại số",
      issues: [
        "Giữ cân bằng hai vế phương trình",
        "Thường xuyên sai khi cô lập biến ở bài nhiều bước",
        "Biến đổi đại số nhiều bước",
      ],
      recommendations: [
        "Xác định thành phần quan trọng của bài toán",
        "Phân tích bài toán nhiều bước",
        "Áp dụng kỹ thuật biến đổi đại số",
      ],
      masteryLevel: 2,
    },
    {
      title: "Hiểu bài toán đố",
      issues: [
        "Khó chuyển bài toán đố thành phương trình",
        "Bỏ sót thông tin quan trọng trong đề bài",
        "Nhầm lẫn với bài toán đố nhiều bước",
      ],
      recommendations: [
        "Luyện tập nhận diện từ khóa",
        "Vẽ sơ đồ minh họa bài toán",
        "Làm quen với bài toán đơn giản trước",
      ],
      masteryLevel: 1,
    },
  ],
  strengths: [
    {
      title: "Số học cơ bản",
      skills: [
        "Thực hiện phép tính nhanh và chính xác",
        "Hiểu rõ giá trị vị trí số",
        "Tư duy nhẩm toán hiệu quả",
      ],
      masteryLevel: 5,
    },
    {
      title: "Lý luận hình học",
      skills: [
        "Tư duy không gian tốt",
        "Áp dụng công thức hình học chính xác",
        "Hiểu rõ tính chất hình học",
      ],
      masteryLevel: 4,
    },
  ],
  recommendedActions: [
    {
      title: "Thành thạo giải phương trình đại số",
      description:
        "Tập trung vào kỹ thuật giải phương trình từng bước để nâng cao kỹ năng biến đổi đại số.",
      priority: "high",
      resources: [
        {
          type: "video",
          title: "Cân bằng phương trình: Cơ bản",
          duration: "15 phút",
        },
        {
          type: "practice",
          title: "Giải phương trình từng bước",
          duration: "20 bài tập",
        },
        {
          type: "lesson",
          title: "Kỹ thuật đại số nâng cao",
          duration: "30 phút",
        },
      ],
    },
    {
      title: "Chuyển đổi bài toán đố",
      description:
        "Học các chiến lược chuyển bài toán đố thành phương trình toán học.",
      priority: "medium",
      resources: [
        {
          type: "lesson",
          title: "Nhận diện từ khóa trong bài toán đố",
          duration: "20 phút",
        },
        {
          type: "practice",
          title: "Luyện tập chuyển đổi bài toán đố",
          duration: "15 bài tập",
        },
      ],
    },
    {
      title: "Cải thiện kỹ năng mô hình hóa",
      description:
        "Phát triển kỹ năng xây dựng mô hình toán học từ các tình huống thực tế.",
      priority: "high",
      resources: [
        {
          type: "video",
          title: "Giới thiệu về mô hình hóa toán học",
          duration: "25 phút",
        },
        {
          type: "practice",
          title: "Bài tập mô hình hóa cơ bản",
          duration: "10 bài tập",
        },
      ],
    },
    {
      title: "Ôn tập phép toán phân số",
      description: "Củng cố hiểu biết về các phép toán với phân số.",
      priority: "low",
      resources: [
        {
          type: "review",
          title: "Ôn tập nhanh phép toán phân số",
          duration: "10 phút",
        },
        {
          type: "practice",
          title: "Bài tập phân số hỗn hợp",
          duration: "12 bài tập",
        },
      ],
    },
  ],
  chapters: [
    {
      id: "ch1",
      name: "Số và phép tính",
      number: 1,
      description: "Hiểu về số, phép toán và các tính chất",
      status: "completed",
      completionRate: 100,
      topics: [
        {
          id: "t1",
          name: "Số tự nhiên",
          description: "Thực hiện phép toán với số tự nhiên",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t2",
          name: "Phân số",
          description: "Hiểu và thực hiện phép toán với phân số",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t3",
          name: "Số thập phân",
          description: "Hiểu và thực hiện phép toán với số thập phân",
          status: "completed",
          completionRate: 100,
        },
      ],
      tests: [
        {
          id: "test1",
          name: "Trắc nghiệm số học",
          questions: 10,
          duration: "20 phút",
          score: 85,
        },
        {
          id: "test2",
          name: "Kiểm tra phân số & thập phân",
          questions: 15,
          duration: "30 phút",
          score: 80,
        },
      ],
    },
    {
      id: "ch2",
      name: "Đại số và hàm số",
      number: 2,
      description: "Hiểu về quy luật, quan hệ và hàm số",
      status: "in-progress",
      completionRate: 65,
      topics: [
        {
          id: "t4",
          name: "Biến và biểu thức",
          description: "Sử dụng biến trong biểu thức",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t5",
          name: "Phương trình",
          description: "Giải phương trình bậc nhất",
          status: "in-progress",
          completionRate: 70,
        },
        {
          id: "t6",
          name: "Hàm số",
          description: "Hiểu và vẽ đồ thị hàm số",
          status: "not-started",
          completionRate: 0,
        },
      ],
      tests: [
        {
          id: "test3",
          name: "Trắc nghiệm biểu thức",
          questions: 10,
          duration: "20 phút",
          score: 75,
        },
        {
          id: "test4",
          name: "Kiểm tra phương trình",
          questions: 15,
          duration: "30 phút",
          score: null,
        },
      ],
    },
    {
      id: "ch3",
      name: "Hình học và đo lường",
      number: 3,
      description: "Hiểu về hình dạng, kích thước và tính chất của vật thể",
      status: "not-started",
      completionRate: 0,
      topics: [
        {
          id: "t7",
          name: "Hình cơ bản",
          description: "Tính chất của hình 2D",
          status: "not-started",
          completionRate: 0,
        },
        {
          id: "t8",
          name: "Diện tích và chu vi",
          description: "Tính diện tích và chu vi",
          status: "not-started",
          completionRate: 0,
        },
        {
          id: "t9",
          name: "Thể tích",
          description: "Tính thể tích hình 3D",
          status: "not-started",
          completionRate: 0,
        },
      ],
      tests: [
        {
          id: "test5",
          name: "Cơ bản hình học",
          questions: 10,
          duration: "20 phút",
          score: null,
        },
        {
          id: "test6",
          name: "Diện tích & thể tích",
          questions: 15,
          duration: "30 phút",
          score: null,
        },
      ],
    },
  ],
};
