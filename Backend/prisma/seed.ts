import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seeding...");

  // Hash passwords
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const salesPassword = await bcrypt.hash("Sales@123", 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: {
      email: "admin@pgfy.demo",
    },
    update: {
      name: "PGfy Admin",
      password: adminPassword,
      role: "ADMIN",
    },
    create: {
      name: "PGfy Admin",
      email: "admin@pgfy.demo",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Create Sales Executive
  const salesExecutive = await prisma.user.upsert({
    where: {
      email: "sales@pgfy.demo",
    },
    update: {
      name: "Rahul Sharma",
      password: salesPassword,
      role: "SALES_EXECUTIVE",
    },
    create: {
      name: "Rahul Sharma",
      email: "sales@pgfy.demo",
      password: salesPassword,
      role: "SALES_EXECUTIVE",
    },
  });

  console.log("Users created successfully!");

  console.log({
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    salesExecutive: {
      id: salesExecutive.id,
      email: salesExecutive.email,
      role: salesExecutive.role,
    },
  });
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });