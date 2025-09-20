"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import AssignmentTable from "@/components/report/AssignmentTable";
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  Target,
  CheckCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { fetchWithAuth } from "../api/helper";
import { admissionScores } from "./admissionScores";
import PerformanceTrend from "@/components/analysis/PerformanceTrend";

// --- Demo Data ---
const topicPerformance = [
  {
    topic: "Nền tảng Đại số & Tính toán",
    student: 42,
    classAvg: 35,
    gradeAvg: 76,
    fullMark: 100,
  },
  {
    topic: "Mô hình hóa & Toán thực tế",
    student: 18,
    classAvg: 25,
    gradeAvg: 73,
    fullMark: 100,
  },
  {
    topic: "Suy luận & Chứng minh Hình học",
    student: 38,
    classAvg: 45,
    gradeAvg: 80,
    fullMark: 100,
  },
  {
    topic: "Phân tích & Vận dụng Nâng cao",
    student: 15,
    classAvg: 22,
    gradeAvg: 69,
    fullMark: 100,
  },
  {
    topic: "Trực quan & Tư duy Không gian",
    student: 28,
    classAvg: 32,
    gradeAvg: 78,
    fullMark: 100,
  },
];
const progressData = [
  { month: "Tháng 9", grade: 72, effort: 85, participation: 78 },
  { month: "Tháng 10", grade: 75, effort: 88, participation: 82 },
  { month: "Tháng 11", grade: 78, effort: 90, participation: 85 },
  { month: "Tháng 12", grade: 80, effort: 87, participation: 88 },
  { month: "Tháng 1", grade: 82, effort: 92, participation: 90 },
  { month: "Tháng 2", grade: 79, effort: 89, participation: 87 },
];
const peerComparison = [
  { category: "Điểm tổng kết", student: 80, classAvg: 76, gradeLevel: 78 },
  { category: "Bài tập về nhà", student: 85, classAvg: 82, gradeLevel: 80 },
  { category: "Kiểm tra", student: 78, classAvg: 74, gradeLevel: 76 },
  { category: "Tham gia lớp học", student: 90, classAvg: 85, gradeLevel: 83 },
];
const studyHabits = [
  { name: "Hoàn thành bài tập", value: 92, color: "#059669" },
  { name: "Tham gia lớp học", value: 88, color: "#10b981" },
  { name: "Chuẩn bị kiểm tra", value: 75, color: "#3b82f6" },
  { name: "Học nhóm", value: 65, color: "#f59e0b" },
];
const weeklyActivity = [
  { day: "T2", hours: 0.5, assignments: 1 },
  { day: "T3", hours: 0.3, assignments: 1 },
  { day: "T4", hours: 0.4, assignments: 1 },
  { day: "T5", hours: 3.0, assignments: 5 },
  { day: "T6", hours: 0.6, assignments: 2 },
  { day: "T7", hours: 1.2, assignments: 2 },
  { day: "CN", hours: 3.7, assignments: 4 },
];
const percentileRank = 67;

// Demo data for top school comparison
const kvtsData = admissionScores;

/* ----------------- NEW: real, short domain explanations ----------------- */
const DOMAIN_DETAILS = {
  "Nền tảng Đại số & Tính toán": {
    meaning:
      "Rút gọn phân/căn thức, hằng đẳng thức, quy đồng, thay số và giải hệ cơ bản.",
    examFocus: "Các câu rút gọn A, B; tính giá trị; điều kiện xác định.",
    quickFormulas: ["(a±b)²", "a²−b²=(a−b)(a+b)"],
  },
  "Mô hình hóa & Toán thực tế": {
    meaning:
      "Đổi đề lời văn thành phương trình: tỉ lệ–năng suất–chuyển động; thể tích/diện tích.",
    examFocus: "Bài toán thực tế & khối trụ (V=πr²h, Sxq=2πrh).",
    quickFormulas: ["V=πr²h", "Sxq=2πrh"],
  },
  "Suy luận & Chứng minh Hình học": {
    meaning:
      "Tiếp tuyến, đồng dạng, tứ giác nội tiếp; suy luận góc–cạnh chặt chẽ.",
    examFocus: "Đường tròn, tiếp tuyến, góc tạo bởi tiếp tuyến và dây.",
    quickFormulas: ["OT ⟂ tiếp tuyến", "∠(tiếp tuyến,dây)=∠góc ở cung đối"],
  },
  "Phân tích & Vận dụng Nâng cao": {
    meaning:
      "Tham số m, điều kiện có nghiệm, bất đẳng thức/tối ưu và tổng hợp kiến thức.",
    examFocus: "Parabol y=x² và đường thẳng y=ax+b: cắt 2 điểm, Δ>0, Viète.",
    quickFormulas: ["Δ>0", "Viète: x₁+x₂, x₁x₂"],
  },
  "Trực quan & Tư duy Không gian": {
    meaning:
      "Đọc–vẽ đồ thị, nhận diện vị trí tương đối; phác thảo hình 3D/đường tròn chính xác.",
    examFocus: "Đồ thị y=x² & y=ax+b, hình khối trụ; đánh dấu mốc hình.",
    quickFormulas: ["Phác thảo y=x²", "Giao điểm ↔ nghiệm chung"],
  },
};

/* -------- NEW: concise “why score is like this” + “do this now” per topic -------- */
function getAdviceForTopic(topicName, score) {
  switch (topicName) {
    case "Nền tảng Đại số & Tính toán":
      return {
        reasons: [
          "Sai ở bước quy đồng/rút gọn căn; thiếu điều kiện mẫu/căn nên bị trừ điểm.",
          "Thay số tính giá trị biểu thức nhưng không kiểm tra miền xác định.",
        ],
        actions: [
          "Luyện 10 bài rút gọn căn thức có điều kiện; ghi rõ điều kiện trước khi biến đổi.",
          "Giải 10 câu tính giá trị tại x=a; kiểm tra miền xác định và đối chiếu kết quả.",
        ],
      };
    case "Mô hình hóa & Toán thực tế":
      return {
        reasons: [
          "Chưa tách đại lượng–đơn vị nên lập phương trình chưa đúng.",
          "Nhầm bán kính r và chiều cao h khi tính V, Sxq khối trụ.",
        ],
        actions: [
          "Với bài lời văn, lập bảng ‘đại lượng–đơn vị–công thức’ trước khi giải.",
          "Làm 5 bài khối trụ, đánh dấu r, h trên hình rồi mới thay công thức V=πr²h.",
        ],
      };
    case "Suy luận & Chứng minh Hình học":
      return {
        reasons: [
          "Chuỗi suy luận thiếu mắt xích: tiếp tuyến–bán kính hoặc nội tiếp–đồng dạng.",
          "Ít khai thác góc giữa tiếp tuyến và dây để chứng minh đồng dạng.",
        ],
        actions: [
          "Viết sơ đồ ‘dữ kiện → mục tiêu’, nêu lý do từng bước (vuông góc, nội tiếp…).",
          "Luyện 6 bài có tiếp tuyến + nội tiếp, nêu rõ cặp tam giác đồng dạng.",
        ],
      };
    case "Phân tích & Vận dụng Nâng Cao":
    case "Phân tích & Vận dụng Nâng cao":
      return {
        reasons: [
          "Điều kiện cắt 2 điểm của parabol–đường thẳng xử lý chưa chắc (Δ, Viète).",
          "Bất đẳng thức/tối ưu chưa quen chuyển về tổng bình phương.",
        ],
        actions: [
          "Giải 8 bài tìm m để cắt 2 điểm; dùng Δ>0 và kiểm tra chéo bằng Viète.",
          "2 bài tối ưu áp dụng AM-GM/Cauchy, trình bày rõ điều kiện đạt dấu ‘=’.",
        ],
      };
    case "Trực quan & Tư duy Không gian":
      return {
        reasons: [
          "Phác thảo đồ thị/hình chưa chính xác nên đặt điều kiện sai.",
          "Thiếu mốc và nhãn (tiếp điểm, tâm, bán kính) làm lạc hướng suy luận.",
        ],
        actions: [
          "Mỗi bài bắt buộc phác thảo nhanh và đánh dấu giao điểm trước khi giải đại số.",
          "Ôn 3 bài đường tròn có tiếp tuyến; ghi rõ các mốc hình ngay khi vẽ.",
        ],
      };
    default:
      return { reasons: [], actions: [] };
  }
}

function generatePDF() {
  const printStyles = `
    @media print {
      @page { size: A4; margin: 10mm 15mm; }
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 9pt; line-height: 1.3; color: #000; }
      * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
      .no-print { display: none !important; }
      .print-section { margin-bottom: 15px; break-inside: avoid; }
    }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.textContent = printStyles;
  document.head.appendChild(styleSheet);
  setTimeout(() => {
    window.print();
    document.head.removeChild(styleSheet);
  }, 100);
}

export default function Report() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    let userData = null;
    if (loggedInUser) {
      try {
        userData = JSON.parse(loggedInUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Performance trend data
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    // Fetch performance trend from backend
    const fetchTrend = async () => {
      try {
        setTrendLoading(true);
        const response = await fetchWithAuth(
          "test.analysis_processor.get_performance_trend"
        );
        if (response && response.message) {
          setTrendData(response.message);
        }
      } catch (error) {
        console.error("Error fetching performance trend:", error);
      } finally {
        setTrendLoading(false);
      }
    };

    fetchTrend();
  }, []);

  const [selectedKVTS, setSelectedKVTS] = useState("1");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const currentKVTSData = kvtsData[selectedKVTS];

  const emmaScore =
    trendData?.current_month_avg || trendData?.average_score || 2.98; // Default fallback score out of 10

  // Calculate averages
  const selectedSchoolIndex = selectedSchool !== null ? selectedSchool : 0;
  const selectedSchoolData = currentKVTSData.schools[selectedSchoolIndex];
  const selectedSchoolAvg =
    Object.values(selectedSchoolData.scores).reduce((a, b) => a + b, 0) /
    Object.values(selectedSchoolData.scores).length;

  const kvtsAvg =
    currentKVTSData.schools.reduce((acc, school) => {
      const schoolAvg =
        Object.values(school.scores).reduce((a, b) => a + b, 0) /
        Object.values(school.scores).length;
      return acc + schoolAvg;
    }, 0) / currentKVTSData.schools.length;

  const hanoiAvg =
    Object.values(kvtsData).reduce((acc, kvts) => {
      const kvtsAvg =
        kvts.schools.reduce((schoolAcc, school) => {
          const schoolAvg =
            Object.values(school.scores).reduce((a, b) => a + b, 0) /
            Object.values(school.scores).length;
          return schoolAcc + schoolAvg;
        }, 0) / kvts.schools.length;
      return acc + kvtsAvg;
    }, 0) / Object.keys(kvtsData).length;

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div>
      <div
        className="p-4 md:p-6 lg:p-8 overflow-auto min-h-screen"
        style={{
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header with Print Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Báo cáo học tập
            </h1>
            <Button
              onClick={generatePDF}
              className="no-print flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              In/PDF
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="print-section grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Điểm trung bình
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {trendData?.current_month_avg
                  ? trendData.current_month_avg.toFixed(2)
                  : trendData?.average_score
                  ? trendData.average_score.toFixed(2)
                  : "0.00"}
              </div>
              <div className="text-xs text-blue-600">
                {(() => {
                  const currentMonth = trendData?.current_month_avg;
                  const previousMonth = trendData?.previous_month_avg;
                  if (
                    currentMonth !== undefined &&
                    previousMonth !== undefined &&
                    previousMonth > 0
                  ) {
                    const change = currentMonth - previousMonth;
                    if (change > 0) {
                      return `+${change.toFixed(2)} so với tháng trước`;
                    } else if (change < 0) {
                      return `${change.toFixed(2)} so với tháng trước`;
                    } else {
                      return "Giữ nguyên so với tháng trước";
                    }
                  } else {
                    return "Chưa có dữ liệu tháng trước";
                  }
                })()}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Câu hỏi hoàn thành
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700">82</div>
              <div className="text-xs text-green-600">
                +7 so với tháng trước
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Thời gian học trung bình tuần
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-700">9.6h</div>
              <div className="text-xs text-orange-600">
                +0.8h so với tháng trước
              </div>
            </div>
          </div>

          {/* So Sánh Điểm Chuẩn Trường THPT Hàng Đầu */}
          <div className="print-section">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              So Sánh Điểm Chuẩn Trường THPT Hàng Đầu
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Công cụ này giúp bạn đánh giá vị thế của học sinh so với điểm
                  chuẩn tuyển sinh vào lớp 10 của các trường THPT hàng đầu Hà
                  Nội. Dữ liệu được cập nhật từ năm 2022-2024 dựa trên điểm
                  trung bình môn thi tuyển sinh.
                </p>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Lưu ý:</strong> Điểm chuẩn lớp 10 ở Hà Nội được tính
                    theo trung bình môn để phụ huynh, học sinh tham khảo. Thứ
                    hạng là tương đối - được tính từ tổng hợp qua các năm. Điểm
                    chuẩn có thể thay đổi theo năm và chính sách tuyển sinh. Kết
                    quả này chỉ mang tính tham khảo, không thay thế cho quyết
                    định chính thức của Sở GD&ĐT Hà Nội.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">
                        Chọn Khu Vực Tuyển Sinh & Năm
                      </h4>
                      <p className="text-xs text-gray-600">
                        So sánh điểm chuẩn theo khu vực tuyển sinh và năm học
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 0.5rem center",
                          backgroundSize: "1.5em 1.5em",
                        }}
                      >
                        <option value="2022">2022</option>
                        <option value="2023">2023</option>
                        <option value="2024">2024</option>
                      </select>
                      <select
                        value={selectedKVTS}
                        onChange={(e) => setSelectedKVTS(e.target.value)}
                        className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 0.5rem center",
                          backgroundSize: "1.5em 1.5em",
                        }}
                      >
                        <option value="1">KVTS 1: Ba Đình, Tây Hồ</option>
                        <option value="2">
                          KVTS 2: Hoàn Kiếm, Hai Bà Trưng
                        </option>
                        <option value="3">
                          KVTS 3: Đống Đa, Thanh Xuân, Cầu Giấy
                        </option>
                        <option value="4">KVTS 4: Hoàng Mai, Thanh Trì</option>
                        <option value="5">KVTS 5: Gia Lâm, Long Biên</option>
                        <option value="6">
                          KVTS 6: Đông Anh, Mê Linh, Sóc Sơn
                        </option>
                        <option value="7">
                          KVTS 7: Bắc Từ Liêm, Nam Từ Liêm, Đan Phượng, Hoài Đức
                        </option>
                        <option value="8">
                          KVTS 8: Ba Vì, Phúc Thọ, Sơn Tây
                        </option>
                        <option value="9">KVTS 9: Quốc Oai, Thạch Thất</option>
                        <option value="10">
                          KVTS 10: Chương Mỹ, Hà Đông, Thanh Oai
                        </option>
                        <option value="11">
                          KVTS 11: Phú Xuyên, Thường Tín
                        </option>
                        <option value="12">KVTS 12: Mỹ Đức, Ứng Hòa</option>
                      </select>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-3 text-center">
                    Biểu Đồ Điểm Chuẩn KVTS {selectedKVTS} - Năm {selectedYear}
                  </h4>
                  <div className="text-xs text-gray-600 mb-3 text-center">
                    Khu vực{" "}
                    {currentKVTSData.description
                      .split("bao gồm")[1]
                      ?.split("với")[0] || "tuyển sinh"}
                    - Điểm chuẩn thi vào 10 (thang điểm 10) - Dữ liệu năm{" "}
                    {selectedYear}
                  </div>
                  <div className="relative">
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>0</span>
                      <span>2</span>
                      <span>4</span>
                      <span>6</span>
                      <span>8</span>
                      <span>10</span>
                    </div>
                    <div className="h-6 bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 rounded relative">
                      <div
                        className="absolute top-0 w-1 h-6 bg-blue-600"
                        style={{
                          left: `${emmaScore * 10}%`,
                        }}
                      ></div>
                      <div
                        className="absolute -bottom-6 transform -translate-x-1/2 text-xs font-bold text-blue-600"
                        style={{
                          left: `${emmaScore * 10}%`,
                        }}
                      >
                        Bạn: {emmaScore}
                      </div>

                      {/* Top school admission markers */}
                      {currentKVTSData.schools.map((school, index) => {
                        const isSelected = selectedSchool === index;
                        return (
                          <div
                            key={index}
                            className={`absolute top-0 cursor-pointer group transition-all duration-300 rounded-sm ${
                              isSelected
                                ? "h-6 w-1.5 shadow-md ring-1 ring-offset-1 z-10"
                                : "w-0.5 h-6 hover:h-8 hover:w-1 hover:-top-1 hover:shadow-md hover:ring-1 hover:ring-offset-1"
                            }`}
                            style={{
                              left: `${
                                currentKVTSData.schools[index].scores[
                                  selectedYear
                                ] * 10
                              }%`,
                              backgroundColor: school.color,
                              zIndex: isSelected ? 10 : 2,
                              boxShadow: isSelected
                                ? `0 2px 8px ${school.color}40`
                                : undefined,
                              ringColor: school.color,
                              ringOffsetColor: "white",
                            }}
                          >
                            {/* Enhanced Tooltip */}
                            <div
                              className={`absolute left-1/2 -top-12 -translate-x-1/2 px-3 py-2 bg-white border-2 rounded-lg shadow-lg text-xs font-semibold text-gray-800 transition-all duration-300 whitespace-nowrap min-w-max opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105`}
                              style={{
                                borderColor: school.color,
                                boxShadow: `0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px ${school.color}20`,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: school.color }}
                                ></div>
                                <span>{school.name.replace("THPT ", "")}</span>
                                <span
                                  className="font-bold"
                                  style={{ color: school.color }}
                                >
                                  {
                                    currentKVTSData.schools[index].scores[
                                      selectedYear
                                    ]
                                  }
                                </span>
                              </div>
                              {/* Arrow */}
                              <div
                                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                                style={{ borderTopColor: school.color }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>{" "}
                  <div className="mt-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-800 mb-2">
                          📈 Cách đọc biểu đồ:
                        </h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>
                            • Vạch xanh: Vị trí điểm số của học sinh trên thang
                            điểm 10
                          </li>
                          <li>• Vạch màu: Điểm chuẩn của các trường</li>
                          <li>• Trỏ vào vạch để xem chi tiết điểm chuẩn</li>
                          <li>
                            • Click vào tên trường bên dưới để chọn và xem phân
                            tích
                          </li>
                        </ul>
                      </div>
                      <div className="md:w-96">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Trung bình trường qua các năm (
                              {selectedSchoolData.name.replace("THPT ", "")})
                            </span>
                            <span className="font-bold">
                              {selectedSchoolAvg.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Trung bình khu vực
                            </span>
                            <span className="font-bold">
                              {kvtsAvg.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Trung bình Hà Nội
                            </span>
                            <span className="font-bold">
                              {hanoiAvg.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
                    {currentKVTSData.schools.map((school, index) => {
                      const isSelected = selectedSchool === index;
                      return (
                        <div
                          key={index}
                          className={`text-center cursor-pointer transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 ${
                            isSelected ? "bg-blue-50 ring-2 ring-blue-200" : ""
                          }`}
                          onClick={() =>
                            setSelectedSchool(isSelected ? null : index)
                          }
                        >
                          <div
                            className="w-3 h-3 rounded mx-auto mb-1"
                            style={{ backgroundColor: school.color }}
                          ></div>
                          <div
                            className="font-medium"
                            style={{ color: school.color }}
                          >
                            #{school.rank}
                          </div>
                          <div className="text-gray-700 leading-tight">
                            {school.name.replace("THPT ", "")}
                          </div>
                          <div
                            className="font-bold"
                            style={{ color: school.color }}
                          >
                            {
                              currentKVTSData.schools[index].scores[
                                selectedYear
                              ]
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">
                      📊 Phân tích vị thế của bạn:
                    </div>
                    <div className="text-sm text-blue-700 mb-2">
                      {trendData?.insights?.position_analysis ? (
                        trendData.insights.position_analysis
                      ) : (
                        <>
                          Với điểm số trung bình <strong>{emmaScore}/10</strong>
                          , bạn đang ở vị thế
                          {(() => {
                            const schools = currentKVTSData.schools;
                            if (
                              emmaScore >= schools[0]?.scores[selectedYear] ||
                              emmaScore >= 8.5
                            ) {
                              return (
                                " xuất sắc, đủ điều kiện vào " +
                                schools[0]?.name.replace("THPT ", "")
                              );
                            } else if (
                              emmaScore >= schools[1]?.scores[selectedYear] ||
                              emmaScore >= 8.0
                            ) {
                              return (
                                " rất tốt, có thể vào " +
                                (schools[1]?.name.replace("THPT ", "") ||
                                  schools[0]?.name.replace("THPT ", ""))
                              );
                            } else if (
                              emmaScore >= schools[2]?.scores[selectedYear] ||
                              emmaScore >= 7.5
                            ) {
                              return (
                                " tốt, có thể vào " +
                                (schools[2]?.name.replace("THPT ", "") ||
                                  schools[1]?.name.replace("THPT ", "") ||
                                  schools[0]?.name.replace("THPT ", ""))
                              );
                            } else if (
                              emmaScore >= schools[3]?.scores[selectedYear] ||
                              emmaScore >= 7.0
                            ) {
                              return (
                                " khá, có thể vào " +
                                (schools[3]?.name.replace("THPT ", "") ||
                                  schools[2]?.name.replace("THPT ", "") ||
                                  schools[1]?.name.replace("THPT ", ""))
                              );
                            } else if (
                              emmaScore >= schools[4]?.scores[selectedYear] ||
                              emmaScore >= 6.5
                            ) {
                              return (
                                " ổn định, có thể vào " +
                                (schools[4]?.name.replace("THPT ", "") ||
                                  schools[3]?.name.replace("THPT ", "") ||
                                  schools[2]?.name.replace("THPT ", ""))
                              );
                            } else {
                              return " cần cải thiện để đạt điểm chuẩn các trường hàng đầu";
                            }
                          })()}
                          .
                        </>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">
                      💡 <strong>Mẹo:</strong> Điểm chuẩn thường dao động theo
                      năm. Hãy theo dõi các kỳ thi thử để cải thiện vị thế của
                      bạn.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Radar Chart & Topic List */}
          <div className="print-section">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Kỹ năng Toán học
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-start"
                style={{ minHeight: "400px", paddingTop: "60px" }}
              >
                <div style={{ width: "100%", height: "400px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={topicPerformance}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="topic"
                        tick={({
                          payload,
                          x,
                          y,
                          textAnchor,
                          stroke,
                          index,
                        }) => {
                          function splitToTwoLines(text) {
                            const words = text.split(" ");
                            if (words.length <= 2) return [text];
                            const mid = Math.ceil(words.length / 2);
                            return [
                              words.slice(0, mid).join(" "),
                              words.slice(mid).join(" "),
                            ];
                          }
                          const lines = splitToTwoLines(payload.value);
                          let yOffset = -60;
                          let xOffset = -50;
                          let width = 120;
                          let height = 50;
                          if (index === 1 || index === 4) {
                            yOffset = -40;
                          }
                          if (index === 2 || index === 3) {
                            yOffset = 10;
                          }
                          if (index === 0) {
                            yOffset = -35;
                            height = 70;
                          }
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <foreignObject
                                x={xOffset}
                                y={yOffset}
                                width={width}
                                height={height}
                                style={{ overflow: "visible" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    maxWidth: width,
                                    fontSize: 13,
                                    fontWeight: "normal",
                                    color: "#374151",
                                    textAlign: "center",
                                    wordBreak: "break-word",
                                    lineHeight: "1.2",
                                  }}
                                >
                                  {lines.map((line, i) => (
                                    <span key={i}>{line}</span>
                                  ))}
                                </div>
                              </foreignObject>
                            </g>
                          );
                        }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 8 }}
                      />
                      <Radar
                        name="Bạn"
                        dataKey="student"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Tháng trước"
                        dataKey="classAvg"
                        stroke="#10b981"
                        fill="transparent"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Bạn</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-1 bg-green-500"></div>
                    <span>Tháng trước</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {topicPerformance.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <span className="text-sm font-medium flex-1">
                      {topic.topic}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 rounded"
                          style={{
                            width: `${topic.student}%`,
                            backgroundColor:
                              topic.student >= 80
                                ? "#10b981"
                                : topic.student >= 70
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold w-8">
                        {topic.student}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- Domain explainer (short, definitive) — placed right below the list --- */}
            <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-2">
                5 miền năng lực & phần thi liên quan
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(DOMAIN_DETAILS).map(([name, d]) => (
                  <li
                    key={name}
                    className="p-3 bg-white rounded border border-indigo-100"
                  >
                    <div className="text-sm font-semibold text-gray-800">
                      {name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {d.meaning}
                    </div>
                    <div className="text-[11px] text-gray-700 mt-1">
                      <span className="font-medium">Tập trung:</span>{" "}
                      {d.examFocus}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.quickFormulas.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[11px] border border-indigo-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Topic Effort Analysis */}
          <div className="print-section">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Học sinh cần cải thiện kỹ năng nào
              </h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-4">
                Phân tích các kỹ năng cần cải thiện dựa trên điểm số hiện tại so
                với mục tiêu 80%.
              </p>
              <div className="space-y-4">
                {topicPerformance
                  .filter((topic) => topic.student < 80)
                  .map((topic, index) => {
                    const effortNeeded = Math.max(0, 80 - topic.student);
                    const advice = getAdviceForTopic(
                      topic.topic,
                      topic.student
                    );
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-800">
                            {topic.topic}
                          </span>
                          <span className="text-sm text-gray-600">
                            Cần cải thiện: +{effortNeeded}%
                          </span>
                        </div>

                        {/* progress bar */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Hiện tại</span>
                              <span>Mục tiêu (80%)</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded">
                              <div
                                className="h-3 rounded"
                                style={{
                                  width: `${topic.student}%`,
                                  backgroundColor:
                                    topic.student >= 70 ? "#f59e0b" : "#ef4444",
                                }}
                              ></div>
                              <div
                                className="h-3 rounded border-2 border-dashed border-blue-500"
                                style={{
                                  width: "80%",
                                  backgroundColor: "transparent",
                                  position: "relative",
                                  marginTop: "-12px",
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* reasons & actions (short) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="p-3 bg-white rounded border">
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              Lý do điểm hiện tại
                            </div>
                            <ul className="list-disc ml-5 text-xs text-gray-700 space-y-1">
                              {advice.reasons.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3 bg-white rounded border">
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              Việc cần làm ngay
                            </div>
                            <ul className="list-disc ml-5 text-xs text-gray-700 space-y-1">
                              {advice.actions.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                            <div className="mt-2 text-[11px] text-gray-500">
                              ✅ Ghi công thức vào flashcard và đối chiếu đáp án
                              sau mỗi bài.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {topicPerformance.filter((topic) => topic.student < 80)
                  .length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-semibold">Xuất sắc!</p>
                    <p className="text-sm">
                      Bạn đã đạt mục tiêu ở tất cả các kỹ năng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Line Chart & Highlights */}
          <div className="print-section">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Tiến bộ và phát triển theo thời gian
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-4">Xu hướng thành tích</h4>
                <div style={{ width: "100%", height: "350px" }}>
                  {trendLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <PerformanceTrend
                      data={
                        trendData || {
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
                        }
                      }
                    />
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">
                    📈 Điểm nổi bật:
                  </h4>
                  {trendData?.insights?.highlights &&
                  trendData.insights.highlights.length > 0 ? (
                    <ul className="text-sm text-green-700 space-y-1">
                      {trendData.insights.highlights.map((highlight, index) => (
                        <li key={index}>• {highlight}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Đang duy trì kết quả ổn định</li>
                      <li>• Hoàn thành các bài kiểm tra đều đặn</li>
                    </ul>
                  )}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">
                    ⚠️ Cần chú ý:
                  </h4>
                  {trendData?.insights?.concerns &&
                  trendData.insights.concerns.length > 0 ? (
                    <ul className="text-sm text-orange-700 space-y-1">
                      {trendData.insights.concerns.map((concern, index) => (
                        <li key={index}>• {concern}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Cần cải thiện kỹ năng làm bài</li>
                      <li>• Nên ôn tập thêm các kiến thức cơ bản</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Study Habits & Weekly Activity */}
          <div className="print-section">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Thói quen học tập và hoạt động
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-4">
                  Phân tích hoạt động học tập
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Ngày học nhiều nhất
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      Chủ nhật (3.7h)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Ngày học ít nhất
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      Thứ 3 (0.3h)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trung bình/ngày</span>
                    <span className="text-sm font-bold text-blue-600">
                      1.4h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Thời gian học khuyến nghị
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      2.0h/ngày
                    </span>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    💡 Học sinh có xu hướng học tập nhiều vào thứ 5 và chủ nhật,
                    nhưng thời gian học trong tuần còn hạn chế. Để duy trì sự ổn
                    định, nên tăng cường học tập đều đặn từ thứ 2 đến thứ 6, đặc
                    biệt vào các ngày có ít hoạt động như thứ 3.
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-4">
                  Hoạt động học tập hàng tuần
                </h4>
                <div style={{ width: "100%", height: "150px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#3b82f6" name="Giờ học" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Tổng thời gian học: <strong>9.6 giờ/tuần</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6 mb-6 print-section">
            <AssignmentTable />
          </div>
        </div>
      </div>
    </div>
  );
}
