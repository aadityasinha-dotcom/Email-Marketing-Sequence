import dotenv from "dotenv";
import { app } from "./app.js";
import connectToDB from "./db/index.js";
import { agenda } from "./utils/emailScheduler.js";

dotenv.config({ path: "./.env" });

const DEFAULT_PORT = 8080;

connectToDB()
  .then(() => {
    app.on("error", (error) => {
      console.error("Error while talking with database:", error);
    });

    app.listen(DEFAULT_PORT, "0.0.0.0", () => {
      console.log(`Server is listening on port ${DEFAULT_PORT}`);
    });
  })
  .catch((error) => {
    console.error("Connection to MongoDB failed:", error);
    process.exit(1);
  });

agenda.on("ready", () => {
  agenda.start();
});

