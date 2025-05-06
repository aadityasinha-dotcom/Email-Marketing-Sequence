import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "reactflow";
import axios from "axios";
import Modal from "react-modal";
import "reactflow/dist/style.css";
import { useState, useCallback, useEffect, useRef } from "react";

// Set the root element for the modal
Modal.setAppElement("#root");

// Custom styles for the modal
const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "8px",
    padding: "2rem",
    border: "none",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    maxWidth: "500px",
    width: "100%"
  },
};

// Node types with corresponding colors
const nodeTypeColors = {
  "Lead-Source": "#4CAF50", // Green
  "Cold-Email": "#2196F3",  // Blue
  "Wait/Delay": "#FF9800"   // Orange
};

// Custom node styling
const getNodeStyle = (type) => ({
  background: nodeTypeColors[type] || "#666",
  color: "#fff",
  padding: "12px",
  borderRadius: "6px",
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
  fontSize: "14px",
  width: "220px",
  border: "none"
});

// Custom Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = 
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-md shadow-md flex justify-between items-center transition-all duration-300 ease-in-out`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200 focus:outline-none">
        &times;
      </button>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const FlowChart = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeCount, setNodeCount] = useState(1);
  const [selectedNodeType, setSelectedNodeType] = useState("Lead-Source");
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [editingNode, setEditingNode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  // Toast notification functions
  const addToast = (message, type = 'info') => {
    const id = nextToastId.current++;
    setToasts(current => [...current, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  // Callback to handle node changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Callback to handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Function to add a new node and connect it to previous node
  const addNode = (label, content) => {
    const type = label;
    const newNodeId = (nodeCount + 1).toString();
    const newNode = {
      id: newNodeId,
      data: { 
        label: `${label}\n${content}`,
        type: type 
      },
      position: { 
        x: 250, 
        y: nodeCount * 120 
      },
      style: getNodeStyle(type)
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCount((count) => count + 1);

    // Only create edge if there are existing nodes
    if (nodes.length > 0) {
      const newEdge = {
        id: `${nodeCount}-${newNodeId}`,
        source: `${nodeCount}`,
        target: newNodeId,
        animated: true,
        style: { strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
      };
      setEdges((eds) => eds.concat(newEdge));
    }
  };

  // Handle the addition of a new node
  const handleAddNode = () => {
    if (selectedNodeType) {
      setModalContent(selectedNodeType);
      setIsOpen(true);
      setEditingNode(null);
    } else {
      addToast("Please select a valid node type.", "error");
    }
  };

  // Format node content for display
  const formatNodeContent = (type, data) => {
    const nodeContent = {
      "Cold-Email": `📧 Subject: ${data.subject}\n\n${data.text}`,
      "Wait/Delay": `⏱️ Wait: ${data.delay}`,
      "Lead-Source": `👤 Recipient: ${data.email}`
    };
    
    return nodeContent[type] || "";
  };

  // Handle form submission for adding/updating nodes
  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const subject = formData.get("subject");
    const text = formData.get("content");
    const delay = formData.get("delay");
    const email = formData.get("email");
    
    let nodeData = {};
    let nodeContent = "";

    if (modalContent === "Cold-Email") {
      nodeData = { subject, text };
      nodeContent = formatNodeContent("Cold-Email", nodeData);
    } else if (modalContent === "Wait/Delay") {
      nodeData = { delay };
      nodeContent = formatNodeContent("Wait/Delay", nodeData);
    } else {
      nodeData = { email };
      nodeContent = formatNodeContent("Lead-Source", nodeData);
    }

    // Update the existing node if editing, otherwise add a new node
    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode.id
            ? { 
                ...node, 
                data: { 
                  label: nodeContent,
                  type: modalContent
                },
                style: getNodeStyle(modalContent)
              }
            : node
        )
      );
    } else {
      // If this is the first node, ensure it's a Lead-Source
      if (nodes.length === 0 && modalContent !== "Lead-Source") {
        addToast("First node must be a Lead-Source", "warning");
        return;
      }
      
      addNode(modalContent, nodeContent);
      
      // If adding first Lead-Source node, update selected type to Cold-Email for next addition
      if (selectedNodeType === "Lead-Source" && modalContent === "Lead-Source") {
        setSelectedNodeType("Cold-Email");
      }
    }
    
    setIsOpen(false);
    addToast(`${editingNode ? "Updated" : "Added"} ${modalContent} node`, "success");
  };

  // Prepare the node data for backend submission
  const prepareNodesForSubmission = () => {
    return nodes.map(node => {
      const nodeType = node.data.type || node.data.label.split("\n")[0];
      let processedNode = { ...node };
      
      // Format the label for backend processing
      if (nodeType === "Cold-Email") {
        const subject = node.data.label.match(/Subject: (.*?)\\n/)?.[1] || "";
        const text = node.data.label.split("\n\n")[1] || "";
        processedNode.data.label = `Cold-Email\n- (${subject}) ${text}`;
      } else if (nodeType === "Wait/Delay") {
        const delay = node.data.label.match(/Wait: (.*?)$/)?.[1] || "";
        processedNode.data.label = `Wait/Delay\n- (${delay})`;
      } else if (nodeType === "Lead-Source") {
        const email = node.data.label.match(/Recipient: (.*?)$/)?.[1] || "";
        processedNode.data.label = `Lead-Source\n- (${email})`;
      }
      
      return processedNode;
    });
  };

  // Render the modal content based on the selected node type
  const renderModalContent = () => {
    const buttonClass = "mt-4 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors";
    const inputClass = "w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
    const labelClass = "block text-gray-700 text-sm font-bold mb-2";

    let defaultValues = { subject: "", content: "", delay: "1 min", email: "" };
    
    // Extract default values from editing node if available
    if (editingNode) {
      const label = editingNode.data.label;
      
      if (modalContent === "Cold-Email") {
        defaultValues.subject = label.match(/Subject: (.*?)\\n/)?.[1] || "";
        defaultValues.content = label.split("\n\n")[1] || "";
      } else if (modalContent === "Wait/Delay") {
        defaultValues.delay = label.match(/Wait: (.*?)$/)?.[1] || "1 min";
      } else if (modalContent === "Lead-Source") {
        defaultValues.email = label.match(/Recipient: (.*?)$/)?.[1] || "";
      }
    }

    switch (modalContent) {
      case "Cold-Email":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Cold Email Node</h2>
            <div>
              <label htmlFor="subject" className={labelClass}>Email Subject:</label>
              <input
                type="text"
                name="subject"
                id="subject"
                defaultValue={defaultValues.subject}
                required
                className={inputClass}
                placeholder="Enter email subject..."
              />
            </div>
            <div>
              <label htmlFor="content" className={labelClass}>Email Content:</label>
              <textarea
                name="content"
                id="content"
                defaultValue={defaultValues.content}
                required
                className={`${inputClass} h-32`}
                placeholder="Write your email content here..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="py-2 px-4 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className={buttonClass}>
                {editingNode ? "Update Email" : "Add Email"}
              </button>
            </div>
          </form>
        );
      case "Wait/Delay":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Wait/Delay Node</h2>
            <div>
              <label htmlFor="delay" className={labelClass}>Delay Duration:</label>
              <select
                name="delay"
                id="delay"
                defaultValue={defaultValues.delay}
                required
                className={inputClass}
              >
                {[...Array(10).keys()].map((i) => (
                  <option key={i} value={`${i + 1} min`}>
                    {i + 1} minute{i !== 0 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="py-2 px-4 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className={buttonClass}>
                {editingNode ? "Update Delay" : "Add Delay"}
              </button>
            </div>
          </form>
        );
      case "Lead-Source":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lead Source Node</h2>
            <div>
              <label htmlFor="email" className={labelClass}>Recipient Email:</label>
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={defaultValues.email}
                required
                className={inputClass}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="py-2 px-4 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className={buttonClass}>
                {editingNode ? "Update Lead Source" : "Add Lead Source"}
              </button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  // Handle node click to open modal for editing
  const handleNodeClick = (event, node) => {
    const nodeType = node.data.type || node.data.label.split("\n")[0];
    setModalContent(nodeType);
    setIsOpen(true);
    setEditingNode(node);
  };

  // Handle the process start
  const handleStartProcess = async () => {
    if (nodes.length < 2) {
      addToast("Please add at least one email node to your sequence", "error");
      return;
    }
    
    // Check if there's a Lead-Source node
    const hasLeadSource = nodes.some(node => 
      node.data.type === "Lead-Source" || node.data.label.includes("Lead-Source")
    );
    
    if (!hasLeadSource) {
      addToast("Sequence must include a Lead-Source node", "error");
      return;
    }

    try {
      setIsProcessing(true);
      const processedNodes = prepareNodesForSubmission();
      
      const response = await axios.post(
        "http://localhost:8080/api/sequence/start-process",
        {
          nodes: processedNodes,
          edges,
        }
      );
      
      if (response.data.success) {
        addToast("Sequence started successfully!", "success");
      } else {
        addToast(response.data.message || "Error starting sequence", "error");
      }
    } catch (error) {
      console.error("Error starting process:", error);
      addToast(error.response?.data?.message || "Failed to start sequence process", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Add the initial lead-source node on component mount
  useEffect(() => {
    if (nodes.length === 0) {
      handleAddNode();
    }
  }, []);

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Email Sequence Builder</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleStartProcess}
            disabled={isProcessing}
            className="py-2 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : "Start Sequence"}
          </button>
        </div>
      </div>
      
      <div className="relative flex-grow border border-gray-300 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          className="bg-white"
        >
          <Controls position="bottom-right" showInteractive={false} />
          <Background color="#aaa" gap={16} size={1} />
        </ReactFlow>
        
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4 border-t border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <select
              value={selectedNodeType}
              onChange={(e) => setSelectedNodeType(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {nodes.length === 0 && <option value="Lead-Source">Lead Source</option>}
              <option value="Cold-Email">Cold Email</option>
              <option value="Wait/Delay">Wait/Delay</option>
            </select>
            <button 
              onClick={handleAddNode}
              className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors"
            >
              Add Node
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {Object.entries(nodeTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-gray-600">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setIsOpen(false)}
        style={customStyles}
        contentLabel="Node Editor"
      >
        {renderModalContent()}
      </Modal>
      
      {/* Custom Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default FlowChart;
