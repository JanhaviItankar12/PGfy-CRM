import dotenv from "dotenv";
dotenv.config();

import app from "./src/app";
import prisma from "./src/config/prisma";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log("Connecting to database...");

    await prisma.$connect();

    console.log("PostgreSQL Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database Connection Failed:", error);
    process.exit(1);
  }
}

startServer();