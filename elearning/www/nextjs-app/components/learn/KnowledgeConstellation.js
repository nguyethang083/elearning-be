import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import LearningObjectView from "./LearningObjectView";
import { getTopicsWithProgress, getKnowledgeTreeForTopic } from "../../pages/api/helper";

const KnowledgeConstellation = ({ 
  data, 
  onTopicClick, 
  compact = false,
  learningObjects = [], // Learning Objects data for selected topic
  knowledgeGaps = [], // Knowledge Gaps data
  onLearningObjectAction // Callback for LO actions (practice, video, chat)
}) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: compact ? 600 : 800,
    height: compact ? 192 : 600, // 192px = h-48 in Tailwind
  });
  const simulation = useRef(null);
  
  // State for Progressive Disclosure
  const [currentView, setCurrentView] = useState('topics'); // 'topics' or 'learning-objects'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Real data state
  const [realTopicsData, setRealTopicsData] = useState([]);
  const [realLearningObjects, setRealLearningObjects] = useState([]);
  const [realKnowledgeGaps, setRealKnowledgeGaps] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingLOs, setIsLoadingLOs] = useState(false);

  // Use real data or fallback to mock data
  const mockData = [
    {
      topic_id: 1,
      topic_name: "Phương trình bậc nhất",
      weakness_score: 0.8,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 2,
      topic_name: "Hệ phương trình",
      weakness_score: 0.6,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 3,
      topic_name: "Bất phương trình",
      weakness_score: 0.4,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 4,
      topic_name: "Hàm số bậc nhất",
      weakness_score: 0.9,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 5,
      topic_name: "Đồ thị hàm số",
      weakness_score: 0.7,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 6,
      topic_name: "Hình học phẳng",
      weakness_score: 0.5,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 7,
      topic_name: "Tam giác",
      weakness_score: 0.3,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 8,
      topic_name: "Tứ giác",
      weakness_score: 0.2,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 9,
      topic_name: "Đường tròn",
      weakness_score: 0.6,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
    {
      topic_id: 10,
      topic_name: "Thống kê",
      weakness_score: 0.4,
      x: 0,
      y: 0,
      is_unlocked: true,
    },
  ];

  // Filter to only unlocked topics (from backend or mock)
  const filterUnlocked = (arr) => {
    // If is_unlocked is present, filter by it; else, show all
    // Check if any items have is_unlocked property
    const hasUnlockedProp = arr?.some(
      (t) => typeof t.is_unlocked !== "undefined"
    );

    if (hasUnlockedProp) {
      const filtered = arr.filter((t) => t.is_unlocked);
      return filtered;
    } else {
      return arr;
    }
  };

  // Debug: log incoming data and filtered data (after filterUnlocked is defined)
  if (typeof window !== "undefined") {
    filterUnlocked(
      data && Array.isArray(data) && data.length > 0 ? data : mockData
    );
  }

  // Load real topics data on component mount
  useEffect(() => {
    const loadTopicsData = async () => {
      try {
        setIsLoadingTopics(true);
        const response = await getTopicsWithProgress();
        
        // Frappe returns data in response.message
        const data = response.message || response;
        
        if (data.success && data.topics) {
          console.log('🌟 Loaded real topics data:', data.topics);
          setRealTopicsData(data.topics);
        } else {
          console.warn('Failed to load topics, using mock data');
        }
      } catch (error) {
        console.error('Error loading topics:', error);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    loadTopicsData();
  }, []);

  // Use real data or fallback to mock data
  const currentData = filterUnlocked(
    realTopicsData.length > 0 ? realTopicsData : 
    (data && Array.isArray(data) && data.length > 0 ? data : mockData)
  );

  // Handle topic selection and transition
  const handleTopicSelection = async (topicData) => {
    setIsTransitioning(true);
    setIsLoadingLOs(true);
    
    try {
      console.log('🎯 Loading Knowledge Tree for topic:', topicData.topic_id || topicData.name);
      
      // Load Knowledge Tree data for this topic
      const response = await getKnowledgeTreeForTopic(topicData.topic_id || topicData.name);
      
      console.log('🔍 Full API Response:', response);
      
      // Frappe returns data in response.message, not at root level
      const data = response.message || response;
      
      console.log('🔍 Extracted data:', data);
      console.log('🔍 Response success?', data?.success);
      console.log('🔍 Learning Objects count:', data?.learning_objects?.length);
      console.log('🔍 Knowledge Gaps count:', data?.knowledge_gaps?.length);
      
      if (data && data.success) {
        console.log('📊 Knowledge Tree loaded successfully');
        console.log('📊 Learning Objects:', data.learning_objects);
        console.log('📊 Knowledge Gaps:', data.knowledge_gaps);
        
        setRealLearningObjects(data.learning_objects || []);
        setRealKnowledgeGaps(data.knowledge_gaps || []);
        setSelectedTopic({
          ...topicData,
          ...data.topic_info
        });
      } else {
        console.error('❌ Failed to load Knowledge Tree:', data?.error || 'Unknown error');
        console.error('❌ Full response:', response);
        // Keep existing mock behavior as fallback
        setSelectedTopic(topicData);
      }
      
    } catch (error) {
      console.error('Error loading Knowledge Tree:', error);
      setSelectedTopic(topicData);
    } finally {
      setIsLoadingLOs(false);
      
      // Animate transition
      setTimeout(() => {
        setCurrentView('learning-objects');
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Handle back to topics view
  const handleBackToTopics = () => {
    setIsTransitioning(true);
    
    // Clear Learning Objects data
    setRealLearningObjects([]);
    setRealKnowledgeGaps([]);
    
    setTimeout(() => {
      setCurrentView('topics');
      setSelectedTopic(null);
      setIsTransitioning(false);
    }, 300);
  };

  // Handle Learning Object actions
  const handleLearningObjectAction = (actionType, learningObject) => {
    if (onLearningObjectAction) {
      onLearningObjectAction(actionType, learningObject, selectedTopic);
    }
  };

  // Helper function to extract chapter number from topic name
  const getChapterDisplay = (topicName, topicId) => {
    // Try to extract chapter number from topic name first
    const chapterMatch =
      topicName.match(/chương\s*(\d+)/i) || topicName.match(/ch\.\s*(\d+)/i);
    if (chapterMatch) {
      return `Chương ${chapterMatch[1]}`;
    }
    // Fallback to topic_id if no chapter found
    return `Chương ${topicId}`;
  };

  // Enhanced function with more sophisticated color system optimized for dark space theme
  const getStarStyle = (weaknessScore) => {
    // Convert to percentage for easier calculation
    const percentage = Math.round(weaknessScore * 100);

    // Create a more nuanced color system with better contrast against dark space background
    let style = {};

    if (percentage >= 85) {
      // Extreme critical - Deep red for light background
      style = {
        level: "extreme",
        primaryColor: "#991b1b", // Deep red for contrast
        secondaryColor: "#dc2626", // Medium red
        accentColor: "#fecaca", // Light red
        glowColor: "#dc2626",
        label: "Cực kỳ khẩn cấp",
        description: "Phải ôn ngay lập tức",
        icon: "💀",
        intensity: "maximum",
        pulseSpeed: 600,
      };
    } else if (percentage >= 75) {
      // High critical - Deep orange-red
      style = {
        level: "critical-high",
        primaryColor: "#c2410c", // Deep orange for contrast
        secondaryColor: "#ea580c", // Medium orange
        accentColor: "#fed7aa", // Light orange
        glowColor: "#ea580c",
        label: "Rất khẩn cấp",
        description: "Cần ôn tập gấp",
        icon: "🔥",
        intensity: "high",
        pulseSpeed: 800,
      };
    } else if (percentage >= 65) {
      // Standard critical - Deep amber
      style = {
        level: "critical",
        primaryColor: "#d97706", // Deep amber for contrast
        secondaryColor: "#f59e0b", // Medium amber
        accentColor: "#fef3c7", // Light amber
        glowColor: "#f59e0b",
        label: "Khẩn cấp",
        description: "Cần ôn tập ngay",
        icon: "⚡",
        intensity: "medium-high",
        pulseSpeed: 1000,
      };
    } else if (percentage >= 55) {
      // High moderate - Deep yellow
      style = {
        level: "moderate-high",
        primaryColor: "#ca8a04", // Deep yellow for contrast
        secondaryColor: "#eab308", // Medium yellow
        accentColor: "#fef08a", // Light yellow
        glowColor: "#eab308",
        label: "Cần chú ý",
        description: "Nên ôn tập sớm",
        icon: "⚠️",
        intensity: "medium",
        pulseSpeed: 1200,
      };
    } else if (percentage >= 45) {
      // Standard moderate - Deep lime
      style = {
        level: "moderate",
        primaryColor: "#65a30d", // Deep lime for contrast
        secondaryColor: "#84cc16", // Medium lime
        accentColor: "#d9f99d", // Light lime
        glowColor: "#84cc16",
        label: "Cần luyện tập",
        description: "Nên dành thời gian ôn",
        icon: "📚",
        intensity: "medium-low",
        pulseSpeed: 1500,
      };
    } else if (percentage >= 35) {
      // Low moderate - Deep cyan
      style = {
        level: "moderate-low",
        primaryColor: "#0891b2", // Deep cyan for contrast
        secondaryColor: "#06b6d4", // Medium cyan
        accentColor: "#a5f3fc", // Light cyan
        glowColor: "#06b6d4",
        label: "Ôn nhẹ",
        description: "Có thể ôn thêm",
        icon: "📖",
        intensity: "low",
        pulseSpeed: 2000,
      };
    } else if (percentage >= 25) {
      // Good - Deep blue
      style = {
        level: "good",
        primaryColor: "#2563eb", // Deep blue for contrast
        secondaryColor: "#3b82f6", // Medium blue
        accentColor: "#bfdbfe", // Light blue
        glowColor: "#3b82f6",
        label: "Khá tốt",
        description: "Đã nắm khá vững",
        icon: "👍",
        intensity: "minimal",
        pulseSpeed: 0,
      };
    } else if (percentage >= 15) {
      // Very good - Deep emerald
      style = {
        level: "very-good",
        primaryColor: "#059669", // Deep emerald for contrast
        secondaryColor: "#10b981", // Medium emerald
        accentColor: "#a7f3d0", // Light emerald
        glowColor: "#10b981",
        label: "Tốt",
        description: "Đã thành thạo",
        icon: "✅",
        intensity: "none",
        pulseSpeed: 0,
      };
    } else {
      // Excellent - Deep gold with sparkle effect
      style = {
        level: "excellent",
        primaryColor: "#d97706", // Deep gold for contrast
        secondaryColor: "#f59e0b", // Medium gold
        accentColor: "#fef3c7", // Light gold
        glowColor: "#f59e0b",
        label: "Xuất sắc",
        description: "Hoàn toàn thành thạo",
        icon: "⭐",
        intensity: "sparkle",
        pulseSpeed: 0,
      };
    }

    style.percentage = percentage;
    return style;
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: compact ? 192 : Math.max(400, rect.height), // Fixed height for compact mode
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (
      !currentData ||
      !Array.isArray(currentData) ||
      currentData.length === 0
    ) {
      return;
    }

    if (!svgRef.current) {
      return;
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);

    // Create gradient definitions
    const defs = svg.append("defs");

    // Create more sophisticated gradients
    const createAdvancedGradient = (
      id,
      primaryColor,
      secondaryColor,
      accentColor
    ) => {
      const gradient = defs
        .append("radialGradient")
        .attr("id", id)
        .attr("cx", "50%")
        .attr("cy", "30%")
        .attr("r", "80%");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", accentColor)
        .attr("stop-opacity", "0.9");

      gradient
        .append("stop")
        .attr("offset", "30%")
        .attr("stop-color", secondaryColor)
        .attr("stop-opacity", "0.8");

      gradient
        .append("stop")
        .attr("offset", "70%")
        .attr("stop-color", primaryColor)
        .attr("stop-opacity", "0.9");

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", primaryColor)
        .attr("stop-opacity", "1");
    };

    // Create gradients for each level optimized for light background
    createAdvancedGradient("extremeGradient", "#991b1b", "#dc2626", "#fecaca");
    createAdvancedGradient("criticalHighGradient", "#c2410c", "#ea580c", "#fed7aa");
    createAdvancedGradient("criticalGradient", "#d97706", "#f59e0b", "#fef3c7");
    createAdvancedGradient("moderateHighGradient", "#ca8a04", "#eab308", "#fef08a");
    createAdvancedGradient("moderateGradient", "#65a30d", "#84cc16", "#d9f99d");
    createAdvancedGradient("moderateLowGradient", "#0891b2", "#06b6d4", "#a5f3fc");
    createAdvancedGradient("goodGradient", "#2563eb", "#3b82f6", "#bfdbfe");
    createAdvancedGradient("veryGoodGradient", "#059669", "#10b981", "#a7f3d0");
    createAdvancedGradient("excellentGradient", "#d97706", "#f59e0b", "#fef3c7");

    // Create filters for different glow effects
    const createGlowFilter = (id, intensity, color) => {
      const filter = defs
        .append("filter")
        .attr("id", id)
        .attr("x", "-100%")
        .attr("y", "-100%")
        .attr("width", "300%")
        .attr("height", "300%");

      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", intensity)
        .attr("result", "coloredBlur");

      const feFlood = filter
        .append("feFlood")
        .attr("flood-color", color)
        .attr("flood-opacity", "0.8");

      filter
        .append("feComposite")
        .attr("in", "coloredBlur")
        .attr("in2", "SourceGraphic")
        .attr("operator", "multiply");

      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    };

    createGlowFilter("extremeGlow", 12, "#dc2626");
    createGlowFilter("criticalhighGlow", 10, "#ea580c");
    createGlowFilter("criticalGlow", 9, "#f59e0b");
    createGlowFilter("moderatehighGlow", 8, "#eab308");
    createGlowFilter("moderateGlow", 7, "#84cc16");
    createGlowFilter("moderatelowGlow", 6, "#06b6d4");
    createGlowFilter("goodGlow", 5, "#3b82f6");
    createGlowFilter("verygoodGlow", 4, "#10b981");
    createGlowFilter("excellentGlow", 6, "#f59e0b");

    // Create subtle decorative elements for light background
    const backgroundStars = svg.append("g").attr("class", "background-elements");
    const elementCount = compact ? 15 : 60; // Fewer elements for cleaner look
    const elementColors = [
      "rgba(59, 130, 246, 0.15)",   // Blue
      "rgba(139, 92, 246, 0.12)",  // Purple
      "rgba(236, 72, 153, 0.1)",   // Pink
      "rgba(34, 197, 94, 0.08)",   // Green
      "rgba(251, 146, 60, 0.1)",   // Orange
      "rgba(99, 102, 241, 0.12)",  // Indigo
    ];
    
    for (let i = 0; i < elementCount; i++) {
      const elementType = Math.random();
      const color = elementColors[Math.floor(Math.random() * elementColors.length)];
      
      if (elementType < 0.6) {
        // Soft circular elements
      backgroundStars
        .append("circle")
        .attr("cx", Math.random() * dimensions.width)
        .attr("cy", Math.random() * dimensions.height)
          .attr("r", Math.random() * (compact ? 2 : 3) + 1)
          .style("fill", color)
          .style("opacity", Math.random() * 0.4 + 0.1)
          .style("filter", "blur(1px)")
          .call(gentleTwinkle);
      } else if (elementType < 0.8) {
        // Diamond shapes
        const x = Math.random() * dimensions.width;
        const y = Math.random() * dimensions.height;
        const size = Math.random() * (compact ? 3 : 4) + 2;
        
        backgroundStars
          .append("polygon")
          .attr("points", `${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}`)
          .style("fill", color)
          .style("opacity", Math.random() * 0.3 + 0.1)
          .style("filter", "blur(0.8px)")
          .call(gentleTwinkle);
      } else {
        // Subtle plus signs
        const x = Math.random() * dimensions.width;
        const y = Math.random() * dimensions.height;
        const size = Math.random() * (compact ? 2 : 3) + 1;
        
        const plusElement = backgroundStars.append("g")
          .attr("transform", `translate(${x}, ${y})`);
          
        // Horizontal line
        plusElement.append("line")
          .attr("x1", -size)
          .attr("y1", 0)
          .attr("x2", size)
          .attr("y2", 0)
          .style("stroke", color)
          .style("stroke-width", 1)
          .style("opacity", Math.random() * 0.3 + 0.1);
          
        // Vertical line
        plusElement.append("line")
          .attr("x1", 0)
          .attr("y1", -size)
          .attr("x2", 0)
          .attr("y2", size)
          .style("stroke", color)
          .style("stroke-width", 1)
          .style("opacity", Math.random() * 0.3 + 0.1);
          
        plusElement.call(gentleTwinkle);
      }
    }

    function twinkle(selection) {
      selection.each(function () {
        const star = d3.select(this);
        function animate() {
          star
            .transition()
            .duration(Math.random() * 2000 + 1000)
            .style("opacity", Math.random() * 0.5 + 0.3)
            .on("end", animate);
        }
        animate();
      });
    }

    function gentleTwinkle(selection) {
      selection.each(function () {
        const element = d3.select(this);
        const baseOpacity = parseFloat(element.style("opacity")) || 0.2;
        function animate() {
          element
            .transition()
            .duration(Math.random() * 3000 + 2000)
            .style("opacity", baseOpacity * (Math.random() * 0.5 + 0.5))
            .on("end", animate);
        }
        animate();
      });
    }

    // Enhanced size scale with compact mode support
    const sizeScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range(compact ? [8, 25] : [18, 70]); // Much smaller range for compact mode

    // Create force simulation with compact mode parameters
    const minDistance = compact ? 20 : 100; // Much smaller distance for compact mode
    const chargeStrength = compact ? -150 : -450; // Reduced repulsion for compact mode

    simulation.current = d3
      .forceSimulation(currentData)
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      )
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d) => sizeScale(d.weakness_score) + minDistance)
      )
      .force(
        "x",
        d3.forceX(dimensions.width / 2).strength(compact ? 0.1 : 0.05)
      )
      .force(
        "y",
        d3.forceY(dimensions.height / 2).strength(compact ? 0.1 : 0.05)
      );

    // Enhanced star shape generator
    const starPath = (size) => {
      const points = 5;
      const innerRadius = size * 0.4;
      const outerRadius = size;
      let path = "";

      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        path += (i === 0 ? "M" : "L") + `${x},${y}`;
      }

      return path + "Z";
    };

    // Create star groups
    const stars = svg
      .selectAll(".star")
      .data(currentData)
      .enter()
      .append("g")
      .attr("class", "star")
      .style("cursor", "pointer");

    // Add outer rings based on intensity level with improved logic
    currentData.forEach((d, i) => {
      const style = getStarStyle(d.weakness_score);
      const star = d3.select(stars.nodes()[i]);

      if (style.intensity === "maximum" || style.intensity === "high") {
        // Double ring for highest priority
        star
          .append("circle")
          .attr("r", sizeScale(d.weakness_score) * 2.2)
          .style("fill", "none")
          .style("stroke", style.primaryColor)
          .style("stroke-width", 5)
          .style("stroke-dasharray", "15,8")
          .style("opacity", 0.9)
          .call(urgentPulse, style.pulseSpeed);

        star
          .append("circle")
          .attr("r", sizeScale(d.weakness_score) * 1.8)
          .style("fill", "none")
          .style("stroke", style.secondaryColor)
          .style("stroke-width", 3)
          .style("stroke-dasharray", "8,4")
          .style("opacity", 0.7)
          .call(urgentPulse, style.pulseSpeed + 200);
      } else if (
        style.intensity === "medium-high" ||
        style.intensity === "medium"
      ) {
        // Single ring for moderate priority
        star
          .append("circle")
          .attr("r", sizeScale(d.weakness_score) * 1.6)
          .style("fill", "none")
          .style("stroke", style.primaryColor)
          .style("stroke-width", 3)
          .style("opacity", 0.6)
          .call(moderatePulse, style.pulseSpeed);
      }
    });

    // Add main star shapes with enhanced styling
    stars
      .append("path")
      .attr("d", (d) => starPath(sizeScale(d.weakness_score)))
      .style("fill", (d) => {
        const style = getStarStyle(d.weakness_score);
        const gradientMap = {
          extreme: "url(#extremeGradient)",
          "critical-high": "url(#criticalHighGradient)",
          critical: "url(#criticalGradient)",
          "moderate-high": "url(#moderateHighGradient)",
          moderate: "url(#moderateGradient)",
          "moderate-low": "url(#moderateLowGradient)",
          good: "url(#goodGradient)",
          "very-good": "url(#veryGoodGradient)",
          excellent: "url(#excellentGradient)",
        };
        return gradientMap[style.level];
      })
      .style("stroke", (d) => getStarStyle(d.weakness_score).primaryColor)
      .style("stroke-width", (d) => {
        const style = getStarStyle(d.weakness_score);
        return style.intensity === "maximum"
          ? 5
          : style.intensity === "high"
          ? 4
          : 3;
      })
      .style("filter", (d) => {
        const style = getStarStyle(d.weakness_score);
        return `url(#${style.level.replace("-", "")}Glow)`;
      })
      .style("opacity", 0.95);

    // Add inner highlight
    stars
      .append("path")
      .attr("d", (d) => starPath(sizeScale(d.weakness_score) * 0.6))
      .style("fill", "#ffffff")
      .style("opacity", (d) => {
        const style = getStarStyle(d.weakness_score);
        return style.intensity === "maximum"
          ? 0.95
          : style.intensity === "high"
          ? 0.85
          : style.intensity === "sparkle"
          ? 0.9
          : 0.6;
      });

    // Replace percentage text inside stars with elegant external badges (adjusted for compact mode)
    const percentageBadges = stars
      .append("g")
      .attr("class", "percentage-badge");

    // Create stylish badge background (smaller for compact mode)
    percentageBadges
      .append("circle")
      .attr("cx", (d) => sizeScale(d.weakness_score) * 0.75)
      .attr("cy", (d) => -sizeScale(d.weakness_score) * 0.75)
      .attr("r", compact ? 8 : 14) // Smaller radius for compact mode
      .style("fill", (d) => getStarStyle(d.weakness_score).primaryColor)
      .style("stroke", "#ffffff")
      .style("stroke-width", compact ? 1 : 2) // Thinner stroke for compact mode
      .style("opacity", 0.95)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");

    // Add percentage text on badge (smaller font for compact mode)
    percentageBadges
      .append("text")
      .attr("x", (d) => sizeScale(d.weakness_score) * 0.75)
      .attr("y", (d) => -sizeScale(d.weakness_score) * 0.75)
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .style("fill", "#ffffff")
      .style("font-size", compact ? "8px" : "11px") // Smaller font for compact mode
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
      .text((d) => getStarStyle(d.weakness_score).percentage + "%");

    // Add enhanced chapter labels with better contrast and styling
    const chapterLabels = stars.append("g").attr("class", "chapter-label");
    
    // Helper function to calculate text dimensions more accurately
    const getTextDimensions = (d) => {
      const text = compact ? `C${d.topic_id}` : getChapterDisplay(d.topic_name, d.topic_id);
      const fontSize = Math.max(
        compact ? 9 : 12,
        Math.min(compact ? 11 : 14, sizeScale(d.weakness_score) * 0.3)
      );
      // More accurate width calculation with proper padding
      const textWidth = text.length * fontSize * (compact ? 0.65 : 0.7);
      const padding = compact ? 6 : 8;
      return {
        text,
        fontSize,
        textWidth,
        padding,
        boxWidth: textWidth + padding * 2,
        boxHeight: fontSize + padding
      };
    };

    // Add background for better readability
    chapterLabels
      .append("rect")
      .attr("x", (d) => {
        const dims = getTextDimensions(d);
        return -dims.boxWidth / 2;
      })
      .attr("y", (d) => {
        const dims = getTextDimensions(d);
        return sizeScale(d.weakness_score) + (compact ? 10 : 20) - dims.padding / 2;
      })
      .attr("width", (d) => getTextDimensions(d).boxWidth)
      .attr("height", (d) => getTextDimensions(d).boxHeight)
      .attr("rx", compact ? 3 : 4)
      .style("fill", "rgba(255, 255, 255, 0.95)")
      .style("stroke", (d) => getStarStyle(d.weakness_score).primaryColor)
      .style("stroke-width", compact ? 1 : 1.5)
      .style("opacity", 0.95)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Add the text with enhanced styling and proper positioning
    chapterLabels
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => {
        const dims = getTextDimensions(d);
        // Center text vertically within the box - calculate the center of the box
        const boxTop = sizeScale(d.weakness_score) + (compact ? 10 : 20) - dims.padding / 2;
        const boxCenter = boxTop + dims.boxHeight / 2;
        // Adjust for text baseline (text renders from baseline, not center)
        return boxCenter + dims.fontSize * 0.3;
      })
      .style("fill", (d) => {
        const style = getStarStyle(d.weakness_score);
        // Use the star's primary color for better visual connection
        return style.primaryColor;
      })
      .style("font-size", (d) => getTextDimensions(d).fontSize + "px")
      .style("font-weight", "600")
      .style("font-family", "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("letter-spacing", compact ? "0.2px" : "0.3px")
      .text((d) => getTextDimensions(d).text);

    // Add priority indicator icons (smaller for compact mode)
    if (!compact) {
      // Only show icons in full mode to avoid clutter
      stars
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => -sizeScale(d.weakness_score) - 15)
        .style(
          "font-size",
          (d) => Math.max(12, sizeScale(d.weakness_score) * 0.4) + "px"
        )
        .style("pointer-events", "none")
        .text((d) => {
          const style = getStarStyle(d.weakness_score);
          return style.icon;
        });
    }

    function urgentPulse(selection, delay) {
      function repeat() {
        selection
          .transition()
          .delay(delay)
          .duration(800)
          .style("stroke-opacity", 0.2)
          .attr("r", (d) => sizeScale(d.weakness_score) * 2.2)
          .transition()
          .delay(delay + 800)
          .duration(800)
          .style("stroke-opacity", 0.9)
          .attr("r", (d) => sizeScale(d.weakness_score) * 1.8)
          .on("end", repeat);
      }
      repeat();
    }

    function moderatePulse(selection, delay) {
      function repeat() {
        selection
          .transition()
          .delay(delay)
          .duration(1500)
          .style("stroke-opacity", 0.3)
          .attr("r", (d) => sizeScale(d.weakness_score) * 1.6)
          .transition()
          .delay(delay + 1500)
          .duration(1500)
          .style("stroke-opacity", 0.6)
          .attr("r", (d) => sizeScale(d.weakness_score) * 1.5)
          .on("end", repeat);
      }
      repeat();
    }

    // Add floating animation with different speeds based on priority
    function addFloatingAnimation(starSelection) {
      starSelection.each(function (d, i) {
        const star = d3.select(this);
        const style = getStarStyle(d.weakness_score);
        const delay = i * 200;

        // Faster animation for higher priority
        const baseDuration = style.pulseSpeed || 1500; // Default to 1500 if no pulseSpeed
        const duration = baseDuration + Math.random() * 1000;
        const amplitude =
          style.intensity === "maximum"
            ? 10
            : style.intensity === "high"
            ? 8
            : style.intensity === "medium-high"
            ? 6
            : style.intensity === "medium"
            ? 5
            : style.intensity === "medium-low"
            ? 4
            : 3;

        function float() {
          star
            .transition()
            .delay(delay)
            .duration(duration)
            .ease(d3.easeSinInOut)
            .attr("transform", `translate(${d.x},${d.y - amplitude})`)
            .transition()
            .duration(duration)
            .ease(d3.easeSinInOut)
            .attr("transform", `translate(${d.x},${d.y + amplitude})`)
            .on("end", float);
        }
        float();
      });
    }

    // Enhanced interactions
    stars
      .on("mouseover", function (event, d) {
        const star = d3.select(this);
        const style = getStarStyle(d.weakness_score);

        // Scale up animation with different intensities
        const scaleMultiplier =
          style.intensity === "maximum"
            ? 1.6
            : style.intensity === "high"
            ? 1.4
            : 1.2;

        star
          .transition()
          .duration(200)
          .attr(
            "transform",
            `translate(${d.x},${d.y}) scale(${scaleMultiplier})`
          );

        // Show enhanced tooltip with light theme design
        const tooltip = d3.select(tooltipRef.current);
        const tooltipHTML = compact
          ? // Compact tooltip with light theme
            `<div class="backdrop-blur-md bg-white/95 text-gray-800 px-3 py-2 rounded-xl shadow-2xl text-sm max-w-xs border border-gray-200/80" 
                  style="border-left: 3px solid ${style.primaryColor}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);">
              <div class="font-semibold text-gray-800">${d.topic_name}</div>
              <div class="text-xs text-gray-600 mt-1">
                <span style="color: ${style.primaryColor}">${Math.round(d.weakness_score * 100)}%</span> 
                mức độ yếu
              </div>
            </div>`
          : // Full tooltip with light theme design
            `<div class="backdrop-blur-lg bg-white/95 text-gray-800 p-5 rounded-2xl shadow-2xl border border-gray-200/60 max-w-sm" 
                  style="border-color: ${style.primaryColor}40; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px ${style.primaryColor}20;">
              
              <!-- Header with icon and title -->
              <div class="flex items-center mb-4">
                <div class="text-2xl mr-3 p-2 rounded-full" 
                     style="background: linear-gradient(135deg, ${style.primaryColor}15, ${style.secondaryColor}10);">
                  ${style.icon}
              </div>
                <div>
                  <div class="font-bold text-lg text-gray-800">${d.topic_name}</div>
                  <div class="text-xs text-gray-500">${getChapterDisplay(d.topic_name, d.topic_id)}</div>
                </div>
                </div>
              
              <!-- Progress section -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-600 font-medium">Mức độ yếu:</span>
                  <span class="font-bold text-xl" style="color: ${style.primaryColor}">
                    ${Math.round(d.weakness_score * 100)}%
                  </span>
                </div>
                
                <!-- Enhanced progress bar -->
                <div class="relative w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  <div class="h-3 rounded-full transition-all duration-500 relative overflow-hidden" 
                       style="width: ${d.weakness_score * 100}%; 
                              background: linear-gradient(90deg, ${style.primaryColor}, ${style.secondaryColor});">
                    <div class="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20"></div>
                  </div>
                </div>
                
                <!-- Status badge -->
                <div class="text-center">
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm" 
                        style="background: linear-gradient(135deg, ${style.primaryColor}20, ${style.secondaryColor}10); 
                               color: ${style.primaryColor}; 
                               border: 1px solid ${style.primaryColor}25;">
                    <span class="mr-1">${style.icon}</span>
                    ${style.label}
                  </span>
                </div>
                
                <div class="text-xs text-center text-gray-500 mt-2">
                  ${style.description}
              </div>
              </div>
              
              <!-- Action hint -->
              <div class="text-xs text-center text-blue-600 border-t border-gray-200 pt-3 flex items-center justify-center">
                <span class="animate-pulse mr-1">✨</span>
                Nhấp để bắt đầu học
                <span class="animate-pulse ml-1">✨</span>
              </div>
            </div>`;

        tooltip
          .style("visibility", "visible")
          .style("opacity", 1)
          .html(tooltipHTML);

        // Update tooltip position
        const updateTooltipPosition = (e) => {
          const containerRect = containerRef.current.getBoundingClientRect();
          const tooltipElement = tooltipRef.current;
          const tooltipRect = tooltipElement.getBoundingClientRect();

          let left = e.clientX - containerRect.left + 15;
          let top = e.clientY - containerRect.top - 10;

          if (left + tooltipRect.width > containerRect.width) {
            left = e.clientX - containerRect.left - tooltipRect.width - 15;
          }
          if (top < 0) {
            top = e.clientY - containerRect.top + 25;
          }

          tooltip.style("left", left + "px").style("top", top + "px");
        };

        updateTooltipPosition(event);
      })
      .on("mousemove", function (event, d) {
        // Update tooltip position on mouse move
        const containerRect = containerRef.current.getBoundingClientRect();
        const tooltip = d3.select(tooltipRef.current);
        const tooltipElement = tooltipRef.current;
        const tooltipRect = tooltipElement.getBoundingClientRect();

        let left = event.clientX - containerRect.left + 15;
        let top = event.clientY - containerRect.top - 10;

        if (left + tooltipRect.width > containerRect.width) {
          left = event.clientX - containerRect.left - tooltipRect.width - 15;
        }
        if (top < 0) {
          top = event.clientY - containerRect.top + 25;
        }

        tooltip.style("left", left + "px").style("top", top + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", `translate(${d.x},${d.y}) scale(1)`);

        d3.select(tooltipRef.current)
          .style("visibility", "hidden")
          .style("opacity", 0);
      })
      .on("click", function (event, d) {
        // Enhanced click animation with transition to Learning Objects view
        const star = d3.select(this);
        const style = getStarStyle(d.weakness_score);

        star
          .transition()
          .duration(100)
          .attr("transform", `translate(${d.x},${d.y}) scale(0.8)`)
          .transition()
          .duration(150)
          .attr("transform", `translate(${d.x},${d.y}) scale(1.2)`)
          .transition()
          .duration(100)
          .attr("transform", `translate(${d.x},${d.y}) scale(1)`);

        // Add ripple effect
        const ripple = svg
          .append("circle")
          .attr("cx", d.x)
          .attr("cy", d.y)
          .attr("r", 0)
          .style("fill", "none")
          .style("stroke", style.primaryColor)
          .style("stroke-width", 3)
          .style("opacity", 0.8);

        ripple
          .transition()
          .duration(600)
          .attr("r", sizeScale(d.weakness_score) * 3)
          .style("opacity", 0)
          .remove();

        // Handle topic selection and view transition (internal navigation)
        handleTopicSelection(d);
        
        // Note: We don't call onTopicClick here to prevent auto-redirect
        // onTopicClick is only for external navigation when needed
      });

    // Update positions on simulation tick
    simulation.current.on("tick", () => {
      // Update base position without floating animation first
      stars.each(function (d) {
        // Keep stars within bounds with padding
        const padding = 80; // Increased padding
        d.x = Math.max(padding, Math.min(dimensions.width - padding, d.x));
        d.y = Math.max(padding, Math.min(dimensions.height - padding, d.y));
      });

      stars.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Start floating animation after simulation stabilizes
    simulation.current.on("end", () => {
      addFloatingAnimation(stars);
    });

    // Cleanup
    return () => {
      if (simulation.current) simulation.current.stop();
    };
  }, [data, dimensions, onTopicClick]);

    // Conditional rendering based on current view
  if (currentView === 'learning-objects' && selectedTopic) {
  return (
      <div className={`w-full h-full transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {isLoadingLOs ? (
          // Loading state for Learning Objects
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-lg">
              <div className="text-6xl mb-4 animate-spin">🌀</div>
              <p className="text-xl font-medium text-gray-700">Đang tải cây tri thức...</p>
              <p className="text-gray-500 mt-2">{selectedTopic.topic_name}</p>
              <div className="mt-4 flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
            </div>
          </div>
        ) : (
          <LearningObjectView
            topicData={selectedTopic}
            learningObjects={realLearningObjects}
            knowledgeGaps={realKnowledgeGaps}
            onBackToTopics={handleBackToTopics}
            onLearningObjectAction={handleLearningObjectAction}
            compact={compact}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative overflow-hidden transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
      {/* Light Theme Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Soft geometric patterns */}
        <div className="geometric-bg"></div>
        
        {/* Subtle light effects */}
        <div className="light-effect-1"></div>
        <div className="light-effect-2"></div>
        
        {/* Minimal grid overlay */}
        <div className="grid-overlay"></div>
      </div>

      {/* View indicator for topics view */}
      <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200/50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700">Tổng quan Chòm sao</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Nhấp vào ngôi sao để xem chi tiết</div>
      </div>

      <div ref={containerRef} className="w-full h-full min-h-[500px] relative z-10">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Enhanced Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none transition-all duration-300 z-50"
          style={{ visibility: "hidden", opacity: 0 }}
        />

        {/* Loading or No data message */}
        {(isLoadingTopics || !currentData || !Array.isArray(currentData) || currentData.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 z-20">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-lg">
              {isLoadingTopics ? (
                <>
                  <div className="text-6xl mb-4 animate-spin">🌀</div>
                  <p className="text-xl font-medium text-gray-700">Đang tải chòm sao tri thức của bạn...</p>
                  <p className="text-gray-500 mt-2">Lấy dữ liệu thật từ server...</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4 animate-pulse">🌟</div>
                  <p className="text-xl font-medium text-gray-700">Không có dữ liệu chòm sao</p>
                  <p className="text-gray-500 mt-2">Vui lòng kiểm tra kết nối hoặc thử lại</p>
                </>
              )}
              <div className="mt-4 flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .geometric-bg {
          position: absolute;
          width: 200%;
          height: 200%;
          animation: gentle-drift 180s linear infinite;
          background: 
            radial-gradient(2px 2px at 40px 60px, rgba(59,130,246,0.15), transparent),
            radial-gradient(1px 1px at 120px 30px, rgba(139,92,246,0.12), transparent),
            radial-gradient(1.5px 1.5px at 200px 140px, rgba(236,72,153,0.1), transparent),
            radial-gradient(1px 1px at 80px 180px, rgba(34,197,94,0.08), transparent),
            radial-gradient(2px 2px at 300px 80px, rgba(251,146,60,0.1), transparent);
          background-repeat: repeat;
          background-size: 400px 400px;
        }

        .light-effect-1 {
          position: absolute;
          top: -30%;
          left: -30%;
          width: 160%;
          height: 160%;
          background: radial-gradient(ellipse at 25% 25%, rgba(59,130,246,0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 75% 75%, rgba(139,92,246,0.06) 0%, transparent 50%);
          animation: light-float 120s ease-in-out infinite alternate;
        }

        .light-effect-2 {
          position: absolute;
          top: -30%;
          right: -30%;
          width: 160%;
          height: 160%;
          background: radial-gradient(ellipse at 70% 30%, rgba(236,72,153,0.05) 0%, transparent 70%),
                      radial-gradient(ellipse at 30% 70%, rgba(34,197,94,0.04) 0%, transparent 60%);
          animation: light-float 100s ease-in-out infinite alternate-reverse;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: grid-gentle-pulse 12s ease-in-out infinite;
        }

        @keyframes gentle-drift {
          from { transform: translate(0, 0) rotate(0deg); }
          to { transform: translate(-25%, -25%) rotate(180deg); }
        }

        @keyframes light-float {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(15px, -10px) scale(1.05) rotate(2deg); }
        }

        @keyframes grid-gentle-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
};

export default KnowledgeConstellation;