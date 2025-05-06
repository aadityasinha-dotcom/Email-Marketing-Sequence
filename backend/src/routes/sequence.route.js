import { Router } from "express";
import { 
  startProcess, 
  getAllSequences, 
  getSequenceById 
} from "../controllers/sequence.controller.js";

const router = Router();

// POST route to start process
router.route("/start-process").post(startProcess);

// GET route to fetch all sequences
router.route("/").get(getAllSequences);

// GET route to fetch a specific sequence by ID
router.route("/:id").get(getSequenceById);

export default router;
