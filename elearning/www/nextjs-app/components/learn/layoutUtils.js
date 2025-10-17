import dagre from 'dagre';

// Create hierarchical layout using Dagre
export const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Debug layout input
  if (nodes.length === 0) {
    console.warn('⚠️ No nodes provided for layout');
    return { nodes: [], edges: [] };
  }
  
  console.log(`🌳 Layout: ${nodes.length} nodes, ${edges.length} edges, direction: ${direction}`);

  // Configure the layout
  dagreGraph.setGraph({ 
    rankdir: direction, // LR = Left to Right, TB = Top to Bottom
    align: 'UL', // Upper Left alignment
    nodesep: 120, // Vertical spacing between nodes in same rank
    ranksep: 200, // Horizontal spacing between ranks (levels)
    marginx: 60,
    marginy: 60
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.width || 320, 
      height: node.height || 180 
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: 'left',
      sourcePosition: 'right',
      position: {
        x: nodeWithPosition.x - (node.width || 320) / 2,
        y: nodeWithPosition.y - (node.height || 180) / 2,
      },
    };
    
    return newNode;
  });

  console.log(`🌳 Layout completed: ${layoutedNodes.length} nodes positioned`);
  return { nodes: layoutedNodes, edges };
};

// Convert Learning Objects data to React Flow format
export const convertToReactFlowData = (learningObjects, knowledgeGaps, externalPrerequisites = []) => {
  // Remove duplicates based on name/id
  const uniqueLearningObjects = learningObjects.filter((lo, index, self) => 
    index === self.findIndex(item => item.name === lo.name)
  );
  
  console.log(`🔍 Original LOs: ${learningObjects.length}, After dedup: ${uniqueLearningObjects.length}`);
  
  // Create nodes from learning objects
  const nodes = uniqueLearningObjects.map((lo) => {
    const hasKnowledgeGap = knowledgeGaps.some(gap => 
      gap.learning_object === lo.name && gap.status === "Identified"
    );

    // For knowledge gaps, set high weakness_score
    const actualWeaknessScore = hasKnowledgeGap ? 0.9 : (lo.weakness_score || 0);

    return {
      id: lo.name,
      type: 'learningObjectNode',
      data: {
        id: lo.name,
        title: lo.title || lo.learning_object_title,
        description: lo.description,
        difficulty_level: lo.difficulty_level,
        weakness_score: actualWeaknessScore,
        hasKnowledgeGap,
        isExternalPrerequisite: false,
        prerequisites: Array.isArray(lo.prerequisites) ? [...new Set(lo.prerequisites)] : [], // Remove duplicate prerequisites
      },
      width: 320,
      height: 180,
    };
  });

  // Add external prerequisite nodes
  const externalNodes = externalPrerequisites.map((prereq) => ({
    id: prereq.id,
    type: 'learningObjectNode',
    data: {
      id: prereq.id,
      title: prereq.title,
      description: prereq.description || 'Kiến thức tiên quyết từ chương khác',
      difficulty_level: prereq.difficulty_level || 'Trung bình',
      weakness_score: 0,
      hasKnowledgeGap: false,
      isExternalPrerequisite: true,
      externalTopicName: prereq.topicName,
      prerequisites: [],
    },
    width: 320,
    height: 180,
  }));

  const allNodes = [...nodes, ...externalNodes];

  // Create edges from prerequisites - avoid duplicate edges
  const edges = [];
  const edgeSet = new Set(); // Track edges to prevent duplicates
  
  uniqueLearningObjects.forEach((lo) => {
    if (lo.prerequisites && lo.prerequisites.length > 0) {
      // Remove duplicate prerequisites
      const uniquePrerequisites = [...new Set(lo.prerequisites)];
      
      uniquePrerequisites.forEach((prereqId) => {
        const edgeId = `${prereqId}-${lo.name}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: prereqId,
            target: lo.name,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#6b7280',
              strokeWidth: 2.5,
            },
            markerEnd: {
              type: 'arrowclosed',
              width: 20,
              height: 20,
              color: '#6b7280',
            },
            label: '',
            labelStyle: { fontSize: 10, fontWeight: 600 },
          });
        }
      });
    }
  });

  if (edges.length > 0) {
    console.log(`🔗 Created ${edges.length} prerequisite edges`);
  } else {
    console.warn('⚠️ No prerequisite relationships found - nodes will be arranged vertically');
  }
  
  return { nodes: allNodes, edges };
};

// Find root nodes (nodes with no prerequisites or only external prerequisites)
export const findRootNodes = (nodes) => {
  return nodes.filter(node => {
    const prerequisites = node.data.prerequisites || [];
    return prerequisites.length === 0 || 
           prerequisites.every(prereq => 
             nodes.find(n => n.id === prereq)?.data.isExternalPrerequisite
           );
  });
};

// Find leaf nodes (nodes that no other nodes depend on)
export const findLeafNodes = (nodes, edges) => {
  const targetIds = new Set(edges.map(edge => edge.target));
  return nodes.filter(node => !targetIds.has(node.id));
};

// Calculate tree depth and complexity
export const analyzeGraph = (nodes, edges) => {
  const rootNodes = findRootNodes(nodes);
  const leafNodes = findLeafNodes(nodes, edges);
  
  // Calculate max depth using BFS
  let maxDepth = 0;
  const visited = new Set();
  
  const calculateDepth = (nodeId, currentDepth = 0) => {
    if (visited.has(nodeId)) return currentDepth;
    visited.add(nodeId);
    
    maxDepth = Math.max(maxDepth, currentDepth);
    
    // Find children of this node
    const children = edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
    
    children.forEach(childId => {
      calculateDepth(childId, currentDepth + 1);
    });
    
    return currentDepth;
  };
  
  rootNodes.forEach(root => calculateDepth(root.id));
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    rootCount: rootNodes.length,
    leafCount: leafNodes.length,
    maxDepth: maxDepth + 1,
    complexity: edges.length / nodes.length // Average connections per node
  };
};
