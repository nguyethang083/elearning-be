import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const KnowledgeConstellation = ({ data, onTopicClick }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const simulation = useRef(null);

  // Use real data or fallback to mock data
  const mockData = [
    { topic_id: 1, topic_name: "Phương trình bậc nhất", weakness_score: 0.8, x: 0, y: 0 },
    { topic_id: 2, topic_name: "Hệ phương trình", weakness_score: 0.6, x: 0, y: 0 },
    { topic_id: 3, topic_name: "Bất phương trình", weakness_score: 0.4, x: 0, y: 0 },
    { topic_id: 4, topic_name: "Hàm số bậc nhất", weakness_score: 0.9, x: 0, y: 0 },
    { topic_id: 5, topic_name: "Đồ thị hàm số", weakness_score: 0.7, x: 0, y: 0 },
    { topic_id: 6, topic_name: "Hình học phẳng", weakness_score: 0.5, x: 0, y: 0 },
    { topic_id: 7, topic_name: "Tam giác", weakness_score: 0.3, x: 0, y: 0 },
    { topic_id: 8, topic_name: "Tứ giác", weakness_score: 0.2, x: 0, y: 0 },
    { topic_id: 9, topic_name: "Đường tròn", weakness_score: 0.6, x: 0, y: 0 },
    { topic_id: 10, topic_name: "Thống kê", weakness_score: 0.4, x: 0, y: 0 }
  ];

  const currentData = data && Array.isArray(data) && data.length > 0 ? data : mockData;

  // Helper function to extract chapter number from topic name
  const getChapterDisplay = (topicName, topicId) => {
    // Try to extract chapter number from topic name first
    const chapterMatch = topicName.match(/chương\s*(\d+)/i) || topicName.match(/ch\.\s*(\d+)/i);
    if (chapterMatch) {
      return `Chương ${chapterMatch[1]}`;
    }
    // Fallback to topic_id if no chapter found
    return `Chương ${topicId}`;
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(400, rect.height)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    
    if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
      return;
    }

    if (!svgRef.current) {
      return;
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    // Create gradient definitions
    const defs = svg.append('defs');
    
    // Star gradient
    const starGradient = defs.append('radialGradient')
      .attr('id', 'starGradient')
      .attr('cx', '50%')
      .attr('cy', '30%')
      .attr('r', '70%');
    
    starGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', '0.8');
    
    starGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4f46e5')
      .attr('stop-opacity', '0.9');

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for high weakness
    const strongGlowFilter = defs.append('filter')
      .attr('id', 'strongGlow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');

    strongGlowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur');

    const strongFeMerge = strongGlowFilter.append('feMerge');
    strongFeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    strongFeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create background stars
    const backgroundStars = svg.append('g').attr('class', 'background-stars');
    for (let i = 0; i < 50; i++) {
      backgroundStars.append('circle')
        .attr('cx', Math.random() * dimensions.width)
        .attr('cy', Math.random() * dimensions.height)
        .attr('r', Math.random() * 1.5 + 0.5)
        .style('fill', '#ffffff')
        .style('opacity', Math.random() * 0.5 + 0.3)
        .call(twinkle);
    }

    function twinkle(selection) {
      selection.each(function() {
        const star = d3.select(this);
        function animate() {
          star.transition()
            .duration(Math.random() * 2000 + 1000)
            .style('opacity', Math.random() * 0.5 + 0.3)
            .on('end', animate);
        }
        animate();
      });
    }

    // Enhanced color scale
    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateRgb('#3b82f6', '#ef4444'));

    // Enhanced size scale - larger stars
    const sizeScale = d3.scaleLinear()
      .domain([0, 1])
      .range([20, 50]);

    // Create force simulation with better parameters to prevent overlapping
    const minDistance = 80; // Minimum distance between stars
    simulation.current = d3.forceSimulation(currentData)
      .force('charge', d3.forceManyBody().strength(-300)) // Increased repulsion
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale(d.weakness_score) + minDistance)) // Increased collision radius
      .force('x', d3.forceX(dimensions.width / 2).strength(0.05))
      .force('y', d3.forceY(dimensions.height / 2).strength(0.05));

    // Enhanced star shape generator
    const starPath = (size) => {
      const points = 5;
      const innerRadius = size * 0.4;
      const outerRadius = size;
      let path = '';
      
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
        path += (i === 0 ? 'M' : 'L') + `${x},${y}`;
      }
      
      return path + 'Z';
    };

    // Create star groups
    const stars = svg.selectAll('.star')
      .data(currentData)
      .enter()
      .append('g')
      .attr('class', 'star')
      .style('cursor', 'pointer');

    // Add star shapes with enhanced styling
    stars.append('path')
      .attr('d', d => starPath(sizeScale(d.weakness_score)))
      .style('fill', d => colorScale(d.weakness_score))
      .style('stroke', '#ffffff')
      .style('stroke-width', 2)
      .style('filter', d => d.weakness_score > 0.6 ? 'url(#strongGlow)' : 'url(#glow)')
      .style('opacity', 0.9);

    // Add inner glow
    stars.append('path')
      .attr('d', d => starPath(sizeScale(d.weakness_score) * 0.6))
      .style('fill', 'url(#starGradient)')
      .style('opacity', 0.7);

    // Add pulsing rings for high weakness scores
    stars.filter(d => d.weakness_score > 0.6)
      .append('circle')
      .attr('r', d => sizeScale(d.weakness_score) * 1.5)
      .style('fill', 'none')
      .style('stroke', d => colorScale(d.weakness_score))
      .style('stroke-width', 3)
      .style('opacity', 0.6)
      .call(pulse);

    // Add text labels with simplified chapter names
    stars.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => sizeScale(d.weakness_score) + 20)
      .style('fill', '#ffffff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)')
      .text(d => getChapterDisplay(d.topic_name, d.topic_id));

    function pulse(selection) {
      function repeat() {
        selection
          .transition()
          .duration(1500)
          .style('stroke-opacity', 0.1)
          .attr('r', d => sizeScale(d.weakness_score) * 2.2)
          .transition()
          .duration(1500)
          .style('stroke-opacity', 0.6)
          .attr('r', d => sizeScale(d.weakness_score) * 1.5)
          .on('end', repeat);
      }
      repeat();
    }

    // Add floating animation to stars
    function addFloatingAnimation(starSelection) {
      starSelection.each(function(d, i) {
        const star = d3.select(this);
        const delay = i * 200; // Stagger the animations
        const duration = 3000 + Math.random() * 2000; // Random duration between 3-5 seconds
        const amplitude = 3 + Math.random() * 2; // Random amplitude between 3-5 pixels
        
        function float() {
          star.transition()
            .delay(delay)
            .duration(duration)
            .ease(d3.easeSinInOut)
            .attr('transform', `translate(${d.x},${d.y - amplitude})`)
            .transition()
            .duration(duration)
            .ease(d3.easeSinInOut)
            .attr('transform', `translate(${d.x},${d.y + amplitude})`)
            .on('end', float);
        }
        float();
      });
    }

    // Enhanced interactions
    stars
      .on('mouseover', function(event, d) {
        const star = d3.select(this);
        
        // Scale up animation
        star.transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1.3)`);

        // Show tooltip with improved positioning
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style('visibility', 'visible')
          .style('opacity', 1)
          .html(`
            <div class="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 max-w-xs">
              <div class="font-bold text-lg mb-1">${d.topic_name}</div>
              <div class="text-sm text-gray-300 mb-2">Mức độ yếu: ${(d.weakness_score * 100).toFixed(1)}%</div>
              <div class="text-xs text-blue-300">🌟 Nhấp để bắt đầu học</div>
            </div>
          `);

        // Update tooltip position to follow cursor precisely
        const updateTooltipPosition = (e) => {
          const containerRect = containerRef.current.getBoundingClientRect();
          const tooltipElement = tooltipRef.current;
          const tooltipRect = tooltipElement.getBoundingClientRect();
          
          // Calculate position relative to container
          let left = e.clientX - containerRect.left + 10;
          let top = e.clientY - containerRect.top - 10;
          
          // Keep tooltip within container bounds
          if (left + tooltipRect.width > containerRect.width) {
            left = e.clientX - containerRect.left - tooltipRect.width - 10;
          }
          if (top < 0) {
            top = e.clientY - containerRect.top + 20;
          }
          
          tooltip
            .style('left', left + 'px')
            .style('top', top + 'px');
        };

        updateTooltipPosition(event);
      })
      .on('mousemove', function(event, d) {
        // Update tooltip position on mouse move
        const containerRect = containerRef.current.getBoundingClientRect();
        const tooltip = d3.select(tooltipRef.current);
        const tooltipElement = tooltipRef.current;
        const tooltipRect = tooltipElement.getBoundingClientRect();
        
        let left = event.clientX - containerRect.left + 10;
        let top = event.clientY - containerRect.top - 10;
        
        // Keep tooltip within container bounds
        if (left + tooltipRect.width > containerRect.width) {
          left = event.clientX - containerRect.left - tooltipRect.width - 10;
        }
        if (top < 0) {
          top = event.clientY - containerRect.top + 20;
        }
        
        tooltip
          .style('left', left + 'px')
          .style('top', top + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);

        d3.select(tooltipRef.current)
          .style('visibility', 'hidden')
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        // Click animation
        const star = d3.select(this);
        star.transition()
          .duration(100)
          .attr('transform', `translate(${d.x},${d.y}) scale(0.9)`)
          .transition()
          .duration(100)
          .attr('transform', `translate(${d.x},${d.y}) scale(1.1)`)
          .transition()
          .duration(100)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);

        if (onTopicClick) {
          onTopicClick(d.topic_id);
        }
      });

    // Update positions on simulation tick
    simulation.current.on('tick', () => {
      // Update base position without floating animation first
      stars.each(function(d) {
        // Keep stars within bounds with padding
        const padding = 60;
        d.x = Math.max(padding, Math.min(dimensions.width - padding, d.x));
        d.y = Math.max(padding, Math.min(dimensions.height - padding, d.y));
      });
      
      stars.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Start floating animation after simulation stabilizes
    simulation.current.on('end', () => {
      addFloatingAnimation(stars);
    });

    // Cleanup
    return () => {
      if (simulation.current) simulation.current.stop();
    };
  }, [data, dimensions, onTopicClick]);

  return (
    <div className="w-full h-full relative">
      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars-bg"></div>
      </div>

      <div ref={containerRef} className="w-full h-full min-h-[500px] relative">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Tooltip */}
        <div 
          ref={tooltipRef} 
          className="absolute pointer-events-none transition-opacity duration-200 z-50"
          style={{ visibility: 'hidden', opacity: 0 }}
        />

        {/* No data message */}
        {(!currentData || !Array.isArray(currentData) || currentData.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-4xl mb-4">🌟</div>
              <p className="text-lg">Đang tải chòm sao tri thức của bạn...</p>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .stars-bg {
          position: absolute;
          width: 200%;
          height: 200%;
          animation: drift 100s linear infinite;
          background: radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
                      radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
                      radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)),
                      radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
        }

        @keyframes drift {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
};

export default KnowledgeConstellation;