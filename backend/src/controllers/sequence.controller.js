import Sequence from "../models/sequence.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { scheduleEmails, startAgenda } from "../utils/emailScheduler.js";

// Controller to start the sequence process
const startProcess = asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  
  try {
    // Validate if nodes and edges arrays exist and are not empty
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Nodes are required and must be a non-empty array" 
      });
    }
    
    if (!edges || !Array.isArray(edges) || edges.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Edges are required and must be a non-empty array" 
      });
    }
    
    // Create and save new sequence
    const newSequence = new Sequence({ 
      nodes, 
      edges, 
      status: 'pending'
    });
    
    const savedSequence = await newSequence.save();
    
    // Ensure agenda is started
    await startAgenda();
    
    // Schedule emails based on the sequence
    const processedSequence = await scheduleEmails();
    
    if (!processedSequence) {
      return res.status(400).json({
        success: false,
        message: "Failed to process sequence - check for a valid Lead-Source node"
      });
    }
    
    // Update sequence status
    savedSequence.status = 'processing';
    await savedSequence.save();
    
    // Return success response with sequence ID
    res.status(200).json({
      success: true,
      message: "Sequence saved and emails scheduled successfully",
      sequenceId: savedSequence._id
    });
    
  } catch (error) {
    console.error("Error in startProcess:", error);
    res.status(500).json({
      success: false,
      message: "Error saving sequence",
      error: error.message
    });
  }
});

// Get all sequences
const getAllSequences = asyncHandler(async (req, res) => {
  try {
    const sequences = await Sequence.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: sequences.length,
      data: sequences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sequences",
      error: error.message
    });
  }
});

// Get a single sequence by ID
const getSequenceById = asyncHandler(async (req, res) => {
  try {
    const sequence = await Sequence.findById(req.params.id);
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: "Sequence not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sequence",
      error: error.message
    });
  }
});

export { startProcess, getAllSequences, getSequenceById };
