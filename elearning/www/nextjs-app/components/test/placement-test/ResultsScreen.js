"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Award } from "lucide-react";
// No recharts: use custom SVG for ALEKS-style pie
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

export default function ResultsScreen({
  results,
  onRetake,
  onContinueLearning,
}) {
  // Map backend results to topicPerformance structure
  const topicPerformance = results.reduce((acc, r) => {
    acc[r.topic] = {
      correct: r.num_correct || 0,
      total: r.num_answered || 0,
      percentage: r.num_answered
        ? Math.round((r.num_correct / r.num_answered) * 100)
        : 0,
      mastery_weight: r.mastery_weight || 0,
    };
    return acc;
  }, {});
  // For ALEKS-style pie, we need to calculate start/end angles for each slice
  // Use mastery_weight for progress fill
  const pieData = Object.entries(topicPerformance).map(
    ([subject, data], index, arr) => {
      const totalSlices = arr.length;
      const sliceAngle = 360 / totalSlices;
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const fill = `hsl(${index * 60 + 20}, 70%, 50%)`;
      return {
        subject,
        correct: data.correct,
        total: data.total,
        mastery_weight: data.mastery_weight || 0,
        fill,
        index,
        startAngle,
        endAngle,
        sliceAngle,
        label: String.fromCharCode(65 + index),
        percentage: data.percentage,
      };
    }
  );
  const totalTopics = Object.keys(topicPerformance).length;
  const totalCorrect = Object.values(topicPerformance).reduce(
    (sum, data) => sum + data.correct,
    0
  );
  const totalQuestions = Object.values(topicPerformance).reduce(
    (sum, data) => sum + data.total,
    0
  );
  const overallPercentage = totalQuestions
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;
  // Define masteredTopics as number of topics with mastery_weight >= 800
  const masteredTopics = Object.values(topicPerformance).filter(
    (data) => (data.mastery_weight || 0) >= 800
  ).length;
  // Define learnedTopics as number of topics with 0 < mastery_weight < 800
  const learnedTopics = Object.values(topicPerformance).filter(
    (data) => (data.mastery_weight || 0) > 0 && (data.mastery_weight || 0) < 800
  ).length;

  const [selectedSlice, setSelectedSlice] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [showInstructional, setShowInstructional] = useState(false);
  const [instructionStage, setInstructionStage] = useState(1);
  // Track if a hover tooltip is active
  const hoverTimeout = useRef(null);

  // Track if we should show the instructional tooltip after pieData is ready
  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowInstructional(true);
  }, []);

  useEffect(() => {
    if (!showInstructional || !pieData.length) return;
    // Instructional tooltip: step 1 (shaded), step 2 (gray)
    const cx = 210,
      cy = 210,
      rMin = 60,
      rMax = 180;
    let shadedX = cx,
      shadedY = cy,
      grayX = cx,
      grayY = cy;
    // Step 1: shaded part of first slice with mastery_weight > 0 (else fallback to first slice)
    let firstFilledSlice =
      pieData.find((s) => (s.mastery_weight || 0) > 0) || pieData[0];
    if (firstFilledSlice) {
      const start = firstFilledSlice.startAngle - 90 + 1;
      const end = firstFilledSlice.endAngle - 90 - 1;
      const midAngle = (start + end) / 2;
      const fillRatio = Math.max(
        0,
        Math.min(1, (firstFilledSlice.mastery_weight || 0) / 1000)
      );
      // Center of the colored arc: halfway between rMin and fillRadius
      const fillRadius =
        rMin + (rMax - rMin) * (fillRatio > 0 ? fillRatio : 0.66);
      const shadedRadius = rMin + (fillRadius - rMin) / 2;
      shadedX = cx + shadedRadius * Math.cos((midAngle * Math.PI) / 180);
      shadedY = cy + shadedRadius * Math.sin((midAngle * Math.PI) / 180);
    }
    // Step 2: gray part of last slice (always at 90% radius)
    if (pieData.length > 1) {
      const slice = pieData[pieData.length - 1];
      const start = slice.startAngle - 90 + 1;
      const end = slice.endAngle - 90 - 1;
      const midAngle = (start + end) / 2;
      const grayRadius = rMin + (rMax - rMin) * 0.9;
      grayX = cx + grayRadius * Math.cos((midAngle * Math.PI) / 180);
      grayY = cy + grayRadius * Math.sin((midAngle * Math.PI) / 180);
    }
    setTooltipData({
      show: true,
      stage: instructionStage,
      x: instructionStage === 1 ? shadedX : grayX,
      y: (instructionStage === 1 ? shadedY : grayY) - 30,
      subject: null,
      percentage: null,
      correct: null,
      total: null,
      shadedX,
      shadedY,
      grayX,
      grayY,
    });
    // Hide any hover tooltip if instructional is showing
    return () => setTooltipData(null);
  }, [showInstructional, pieData, instructionStage]);
  const topicRefs = useRef([]);
  const progressListRef = useRef(null);

  // Scroll only the Progress Per Topic scroll container
  const handleSliceClick = useCallback((data, index) => {
    setSelectedSlice((prev) => (prev === index ? null : index));
    setTooltipData(null); // Hide tooltip on click
    setTimeout(() => {
      const topicEl = topicRefs.current[index];
      const container = progressListRef.current;
      if (topicEl && container) {
        const topicRect = topicEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const topicCenter = topicRect.top + topicRect.height / 2;
        const containerCenter = containerRect.top + containerRect.height / 2;
        const delta = topicCenter - containerCenter;
        const targetScroll = container.scrollTop + delta;
        const maxScroll = container.scrollHeight - container.clientHeight;
        container.scrollTo({
          top: Math.max(0, Math.min(targetScroll, maxScroll)),
          behavior: "smooth",
        });
      }
    }, 50);
  }, []);

  const handleSliceHover = useCallback(
    (data, event) => {
      // Only show hover tooltip if instructional is not showing
      if (showInstructional) return;
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      let chartContainer = document.querySelector(".recharts-wrapper");
      if (!chartContainer) {
        chartContainer = event?.target?.ownerSVGElement?.parentElement;
      }
      if (!chartContainer) return;
      const containerRect = chartContainer.getBoundingClientRect();
      let targetRect;
      if (event && event.target) {
        targetRect = event.target.getBoundingClientRect();
      } else {
        targetRect = {
          left: containerRect.left + containerRect.width / 2,
          top: containerRect.top + containerRect.height / 2,
          width: 20,
          height: 20,
        };
      }
      setTooltipData({
        show: true,
        stage: 3, // not instructional
        x: targetRect.left - containerRect.left + targetRect.width / 2,
        y: targetRect.top - containerRect.top,
        subject: data.subject,
        mastery_weight: data.mastery_weight,
      });
    },
    [showInstructional]
  );

  const handleTooltipNext = useCallback(() => {
    setInstructionStage(2);
  }, []);
  const handleTooltipClose = useCallback(() => {
    setTooltipData(null);
    setShowInstructional(false);
    setInstructionStage(1);
  }, []);

  // For each slice, create two Pie data arrays: one for colored (known), one for gray (unknown)
  const chartSlices = pieData.map((item, i) => {
    const {
      startAngle,
      sliceAngle,
      percentage,
      fill,
      subject,
      correct,
      total,
      index,
    } = item;
    const knownEnd = startAngle + (sliceAngle * percentage) / 100;
    return {
      known: {
        value: 1,
        fill,
        startAngle,
        endAngle: knownEnd,
        subject,
        correct,
        total,
        percentage,
        index,
        label: String.fromCharCode(65 + i),
      },
      unknown: {
        value: 1,
        fill: "#e5e7eb",
        startAngle: knownEnd,
        endAngle: startAngle + sliceAngle,
        subject,
        index,
        label: String.fromCharCode(65 + i),
      },
    };
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 px-8 py-8">
            <div className="inline-flex items-center px-6 py-3 bg-slate-700 text-white rounded-xl font-bold text-lg">
              <Award className="w-5 h-5 mr-2 text-yellow-400" />
              Trình độ sơ cấp
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Pie Chart Section */}
              <div className="flex flex-col items-center relative">
                <h1 className="text-3xl font-bold text-gray-700 mb-8 text-center">
                  Chúc mừng! Đây là kết quả của bạn.
                </h1>
                <div className="relative w-[420px] h-[420px]">
                  <ChartContainer className="w-full h-full">
                    {(() => {
                      const cx = 210,
                        cy = 210,
                        rMin = 60,
                        rMax = 180; // bigger pie
                      const sectorGap = 2; // smaller gap between sectors
                      return (
                        <svg width={420} height={420} viewBox="0 0 420 420">
                          {pieData.map((slice, i) => {
                            const totalSectors = pieData.length;
                            const sliceAngle = 360 / totalSectors;
                            const start = slice.startAngle - 90 + sectorGap / 2;
                            const end = slice.endAngle - 90 - sectorGap / 2;
                            // Use mastery_weight/1000 for fill ratio (since mastery is 1-1000)
                            const fillRatio = Math.max(
                              0,
                              Math.min(1, (slice.mastery_weight || 0) / 1000)
                            );
                            const fillRadius = rMin + (rMax - rMin) * fillRatio;
                            function sectorPath(r0, r1, a0, a1) {
                              const toRad = (a) => (a * Math.PI) / 180;
                              const x0 = cx + r0 * Math.cos(toRad(a0));
                              const y0 = cy + r0 * Math.sin(toRad(a0));
                              const x1 = cx + r1 * Math.cos(toRad(a0));
                              const y1 = cy + r1 * Math.sin(toRad(a0));
                              const x2 = cx + r1 * Math.cos(toRad(a1));
                              const y2 = cy + r1 * Math.sin(toRad(a1));
                              const x3 = cx + r0 * Math.cos(toRad(a1));
                              const y3 = cy + r0 * Math.sin(toRad(a1));
                              const largeArc = a1 - a0 > 180 ? 1 : 0;
                              return [
                                `M ${x0} ${y0}`,
                                `L ${x1} ${y1}`,
                                `A ${r1} ${r1} 0 ${largeArc} 1 ${x2} ${y2}`,
                                `L ${x3} ${y3}`,
                                `A ${r0} ${r0} 0 ${largeArc} 0 ${x0} ${y0}`,
                                "Z",
                              ].join(" ");
                            }
                            // Draw filled (colored) sector: rMin to fillRadius
                            const filledPath =
                              fillRatio > 0
                                ? sectorPath(
                                    rMin,
                                    rMin + (rMax - rMin) * fillRatio,
                                    start,
                                    end
                                  )
                                : null;
                            // Draw unfilled (gray) sector: fillRadius to rMax, but only if not full
                            const unfilledPath =
                              fillRatio < 1
                                ? sectorPath(
                                    rMin + (rMax - rMin) * fillRatio,
                                    rMax,
                                    start,
                                    end
                                  )
                                : null;
                            // Label position: outside the pie, bold, dark
                            const midAngle = (start + end) / 2;
                            const labelRadius = rMax + 18;
                            const labelX =
                              cx +
                              labelRadius *
                                Math.cos((midAngle * Math.PI) / 180);
                            const labelY =
                              cy +
                              labelRadius *
                                Math.sin((midAngle * Math.PI) / 180) +
                              4;
                            return (
                              <g
                                key={i}
                                style={(() => {
                                  const base = {
                                    cursor: "pointer",
                                    zIndex: selectedSlice === i ? 2 : 1,
                                  };
                                  if (selectedSlice === i) {
                                    // Float upward only a little (8px) along the bisector
                                    const midAngle =
                                      (slice.startAngle -
                                        90 +
                                        sectorGap / 2 +
                                        (slice.endAngle - 90 - sectorGap / 2)) /
                                      2;
                                    const rad = (midAngle * Math.PI) / 180;
                                    const distance = 8; // px to move outward
                                    const dx = Math.cos(rad) * distance;
                                    const dy = Math.sin(rad) * distance;
                                    return {
                                      ...base,
                                      transform: `translate(${dx}px, ${dy}px)`,
                                      transition:
                                        "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
                                    };
                                  } else {
                                    return {
                                      ...base,
                                      transform: "none",
                                      transition:
                                        "transform 0.2s cubic-bezier(.4,0,.2,1)",
                                    };
                                  }
                                })()}
                                onClick={() => handleSliceClick(slice, i)}
                                onMouseEnter={(e) => handleSliceHover(slice, e)}
                                onMouseLeave={() => {
                                  if (hoverTimeout.current)
                                    clearTimeout(hoverTimeout.current);
                                  hoverTimeout.current = setTimeout(() => {
                                    setTooltipData(null);
                                  }, 80);
                                }}
                              >
                                {/* Filled sector (partial) */}
                                {filledPath && (
                                  <path
                                    d={filledPath}
                                    fill={slice.fill}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                )}
                                {/* Unfilled sector (gray, remainder) */}
                                {unfilledPath && (
                                  <path
                                    d={unfilledPath}
                                    fill="#e5e7eb"
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                )}
                                {/* Label */}
                                <text
                                  x={labelX}
                                  y={labelY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-gray-700 text-lg font-bold pointer-events-none select-none"
                                  style={{ fontWeight: 700, fontSize: 18 }}
                                >
                                  {slice.label || String.fromCharCode(65 + i)}
                                </text>
                              </g>
                            );
                          })}
                          {/* Center circle for value (smaller) - only one, at the new center */}
                          <circle cx={cx} cy={cy} r={rMin * 0.35} fill="#fff" />
                        </svg>
                      );
                    })()}
                  </ChartContainer>
                  {/* Center content */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      {selectedSlice !== null ? (
                        <div className="text-5xl font-bold text-gray-800">
                          {Math.round(
                            (pieData[selectedSlice].mastery_weight || 0) / 100
                          )}
                        </div>
                      ) : (
                        <div className="text-5xl font-bold text-gray-800">
                          &nbsp;
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show instructional tooltip only if showInstructional is true */}
                  {showInstructional && tooltipData && tooltipData.show && (
                    <div
                      className="absolute z-20 bg-white rounded-lg shadow-xl border-2 border-orange-300 max-w-xs"
                      style={{
                        left: tooltipData.x,
                        top: tooltipData.y,
                        transform: "translate(-50%, -100%)",
                        pointerEvents: "auto",
                        minWidth: 260,
                        maxWidth: 320,
                        whiteSpace: "normal",
                        fontFamily: "inherit",
                      }}
                    >
                      {/* Speech bubble pointer */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-300"></div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent border-t-white"></div>
                      <div className="p-4">
                        {instructionStage === 1 ? (
                          <>
                            <p className="text-sm text-gray-700 mb-4 italic">
                              Phần màu của mỗi lát thể hiện kiến thức bạn đã
                              biết.
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                              onClick={handleTooltipNext}
                            >
                              Tiếp tục
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-700 mb-4 italic">
                              Phần màu xám thể hiện kiến thức bạn sẽ học cùng
                              ISY.
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                              onClick={handleTooltipClose}
                            >
                              Đã hiểu
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Show hover/click tooltip only if instructional is not showing */}
                  {!showInstructional && tooltipData && tooltipData.show && (
                    <div
                      className="absolute z-20 bg-white rounded-lg shadow-xl border-2 border-orange-300 max-w-xs"
                      style={{
                        left: tooltipData.x,
                        top: tooltipData.y,
                        transform: "translate(-50%, -100%)",
                        pointerEvents: "auto",
                        minWidth: 260,
                        maxWidth: 320,
                        whiteSpace: "normal",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={() => {
                        if (hoverTimeout.current)
                          clearTimeout(hoverTimeout.current);
                      }}
                      onMouseLeave={() => {
                        if (hoverTimeout.current)
                          clearTimeout(hoverTimeout.current);
                        hoverTimeout.current = setTimeout(() => {
                          setTooltipData(null);
                        }, 80);
                      }}
                    >
                      {/* Speech bubble pointer */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-300"></div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent border-t-white"></div>
                      <div className="p-4">
                        <div className="mb-2">
                          <span className="font-bold text-gray-800">
                            {tooltipData.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700">
                            Mức độ thành thạo:{" "}
                            <span className="font-bold">
                              {Math.round(
                                ((tooltipData.mastery_weight || 0) / 1000) * 100
                              )}
                              %
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Mastery explanation message */}
                <div className="mt-6 text-center">
                  <p className="text-base text-gray-700 font-medium bg-blue-50 rounded-xl px-6 py-3 inline-block">
                    <span className="font-bold text-blue-800">8</span> hoặc cao
                    hơn được xem là
                    <span className="font-bold text-green-700">
                      {" "}
                      đã thành thạo
                    </span>
                    . Hãy cố gắng đạt ít nhất 8 ở mỗi chủ đề!
                  </p>
                </div>
              </div>
              {/* Progress Details Section */}
              <div className="space-y-6">
                {/* Total Progress */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Tiến độ tổng thể
                  </h3>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-gray-800">
                      {masteredTopics}/{totalTopics} Chủ đề
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-slate-700 rounded mr-2"></div>
                      <span>{masteredTopics} Đã thành thạo</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-200 rounded mr-2"></div>
                      <span>{learnedTopics} Đã học</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
                      <span>
                        {totalTopics - masteredTopics - learnedTopics} Chưa học
                      </span>
                    </div>
                  </div>
                </div>
                {/* Progress Per Topic */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Tiến độ theo chủ đề
                  </h3>
                  <div
                    className="space-y-3 max-h-96 overflow-y-auto pr-2"
                    id="progress-per-topic-list"
                    ref={progressListRef}
                  >
                    {pieData.map((topic, index) => (
                      <div
                        key={topic.subject}
                        ref={(el) => (topicRefs.current[index] = el)}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                          selectedSlice === index
                            ? "bg-blue-50 border-2 border-blue-200"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                        onClick={() =>
                          setSelectedSlice(
                            selectedSlice === index ? null : index
                          )
                        }
                      >
                        <div className="flex items-center">
                          <div
                            className="w-6 h-6 rounded-full mr-3 flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: topic.fill }}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {topic.subject}
                            </p>
                            <p className="text-sm text-gray-600">
                              {/* Show mastery_weight/1000 as x/10 Mastery for each topic */}
                              {Math.round((topic.mastery_weight || 0) / 100)}/10
                              Thành thạo
                            </p>
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round(
                                (topic.mastery_weight || 0) / 10
                              )}%`,
                              backgroundColor: topic.fill,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-4 mt-8 pt-6 border-t">
                <Button
                  className="w-60 py-5 text-xl bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 hover:from-green-500 hover:to-blue-600 text-white rounded-2xl font-extrabold shadow-lg transition-all duration-300 border-0"
                  onClick={onContinueLearning}
                >
                  Xem lộ trình học tập
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
