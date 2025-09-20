import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from 'next/router';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import LearningObjectNode from './LearningObjectNode';
import DetailPanel from './DetailPanel';
import { convertToReactFlowData, getLayoutedElements, analyzeGraph } from './layoutUtils';

const LearningObjectView = ({ 
  topicData, 
  learningObjects = [], 
  knowledgeGaps = [],
  onBackToTopics,
  onLearningObjectAction,
  compact = false 
}) => {
  const router = useRouter();
  const [selectedLO, setSelectedLO] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [graphAnalysis, setGraphAnalysis] = useState(null);

  // Use real data, no fallback to mock
  const currentLOs = learningObjects.length > 0 ? learningObjects : [];

  // Define custom node types
  const nodeTypes = useMemo(() => ({ learningObjectNode: LearningObjectNode }), []);

  // Handle node clicks - fix forward reference
  const handleNodeClick = useCallback((nodeData) => {
    setSelectedLO(nodeData);
    setIsDetailPanelOpen(true);
  }, []);

  // Prepare React Flow data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (currentLOs.length === 0) return { nodes: [], edges: [] };

    // Convert LO data to React Flow format
    const flowData = convertToReactFlowData(currentLOs, knowledgeGaps);
    
    // Apply automatic layout
    const layoutedData = getLayoutedElements(flowData.nodes, flowData.edges, 'LR');
    
    // Add onClick handler to nodes
    const nodesWithHandler = layoutedData.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onClick: handleNodeClick
      }
    }));

    return { 
      nodes: nodesWithHandler, 
      edges: layoutedData.edges 
    };
  }, [currentLOs, knowledgeGaps, handleNodeClick]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    
    // Analyze graph complexity
    if (initialNodes.length > 0) {
      const analysis = analyzeGraph(initialNodes, initialEdges);
      setGraphAnalysis(analysis);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle connections (for future use)
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Close detail panel
  const closeDetailPanel = useCallback(() => {
    setIsDetailPanelOpen(false);
    setSelectedLO(null);
  }, []);

  // React Flow edge styles
  const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#6b7280',
    },
    style: {
      strokeWidth: 2.5,
      stroke: '#6b7280',
    },
  };

  // Handle node hover to highlight connections
  const onNodeMouseEnter = useCallback((event, node) => {
    // Find connected edges
    const connectedEdges = edges.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );
    
    // Highlight connected edges
    const updatedEdges = edges.map(edge => {
      if (connectedEdges.includes(edge)) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#3b82f6',
            strokeWidth: 4,
          },
          animated: true,
        };
      } else {
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: 0.3,
          },
        };
      }
    });
    
    setEdges(updatedEdges);
  }, [edges, setEdges]);

  const onNodeMouseLeave = useCallback(() => {
    // Reset all edges to normal
    const resetEdges = edges.map(edge => ({
      ...edge,
      style: {
        stroke: '#6b7280',
        strokeWidth: 2.5,
        opacity: 1,
      },
      animated: false,
    }));
    
    setEdges(resetEdges);
  }, [edges, setEdges]);

  // Handle learning object actions
  const handleLearningObjectAction = useCallback((actionType, loData) => {
    switch (actionType) {
      case 'practice':
        // Navigate to learn page with specific learning object
        if (topicData?.name || topicData?.topic_id) {
          const topicId = topicData.name || topicData.topic_id;
          // Sử dụng loData.id là lo.name (khóa chính), không phải custom_lo_id
          router.push(`/learn/${topicId}?lo_id=${loData.id || loData.name}`);
        }
        break;
        
      case 'video':
        // Open video playlist in new tab
        window.open('https://www.youtube.com/playlist?list=PL5q2T2FxzK7XY4s9FqDi6KCFEpGr2LX2D', '_blank');
        break;
        
      case 'chat':
        // Open chatbot with pre-filled message about this Learning Object
        const message = `Xin chào ISY! Em muốn hỏi về kỹ năng "${loData.title}" (${loData.id}).

📝 MÔ TẢ KỸ NĂNG:
${loData.description}

🎯 NHỮNG GÌ EM CẦN HỖ TRỢ:
   • Giải thích chi tiết về kỹ năng này
   • Cung cấp ví dụ minh họa cụ thể  
   • Hướng dẫn phương pháp giải bài tập
   • Các lỗi thường gặp và cách tránh

Em cảm ơn ISY! 🙏`;

        // Trigger chatbot opening with pre-filled message
        triggerChatbot(message);
        break;
        
      default:
        // Fallback to original handler
        if (onLearningObjectAction) {
          onLearningObjectAction(actionType, loData);
        }
    }
    
    closeDetailPanel();
  }, [router, topicData, onLearningObjectAction, closeDetailPanel]);

  // Function to trigger chatbot with pre-filled message
  const triggerChatbot = useCallback((message) => {
    // Create a custom event to open chatbot with message
    const event = new CustomEvent('openChatbotWithMessage', {
      detail: { message }
    });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Header with back button and topic info */}
      <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200/50">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToTopics}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <div>
            <div className="font-semibold text-gray-800">{topicData?.topic_name || "Chi tiết kỹ năng"}</div>
            <div className="text-xs text-gray-500">{currentLOs.length} Learning Objects</div>
          </div>
        </div>
      </div>



      {/* Main React Flow Canvas */}
      <div className="w-full h-full min-h-[500px] relative overflow-hidden">
        {/* Modern background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Animated geometric patterns */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-20 left-20 w-36 h-36 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
          </div>
        </div>

        {currentLOs.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{
              padding: 0.15,
              includeHiddenNodes: false,
            }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
            className="bg-transparent [&_.react-flow\_\_attribution]:hidden"
          >
            {/* Enhanced Controls */}
            <Controls 
              className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg"
              showZoom={true}
              showFitView={true}
              showInteractive={true}
            />
            
            {/* Subtle grid background */}
            <Background 
              variant="dots" 
              gap={20} 
              size={1} 
              color="#e2e8f0" 
              className="opacity-30"
            />

            {/* Custom Panel for Instructions - positioned to cover React Flow attribution */}
            <Panel 
              position="bottom-right" 
              className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200/50 max-w-64"
              style={{ marginBottom: '8px', marginRight: '8px' }}
            >
              <div className="text-xs text-gray-700">
                <div className="font-semibold mb-1 flex items-center">
                  <span className="mr-1">🎯</span>
                  <span>Hướng dẫn sử dụng</span>
                </div>
                <ul className="space-y-1">
                  <li>• Nhấp vào node để xem chi tiết</li>
                  <li>• Mũi tên chỉ mối quan hệ tiên quyết</li>
                  <li>• Dùng controls để zoom và di chuyển</li>
                  <li>• Node đỏ = cần ôn ngay</li>
                </ul>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          /* No data message */
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-lg">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-xl font-medium text-gray-700">Không có Learning Object nào để hiển thị</p>
              <p className="text-gray-500 mt-2">Vui lòng chọn một chủ đề khác hoặc kiểm tra dữ liệu</p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        selectedLO={selectedLO}
        isOpen={isDetailPanelOpen}
        onClose={closeDetailPanel}
        onLearningObjectAction={handleLearningObjectAction}
        allLearningObjects={nodes}
      />
    </div>
  );
};

export default LearningObjectView;
