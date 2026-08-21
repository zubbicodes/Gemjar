import { PrismaClient } from "@prisma/client";
import { demoPassword, seedDemoUsers } from "./demo-users";

const prisma = new PrismaClient();

async function main() {
  const { admin, agentUser, owner } = await seedDemoUsers(prisma);
  const emails = [
    admin.email,
    agentUser.email,
    owner.email,
    "customer@gemjar.test",
  ];
  console.log(`Demonstration accounts ready: ${emails.join(", ")}`);
  console.log(
    process.env.DEMO_USER_PASSWORD?.trim()
      ? "Password taken from DEMO_USER_PASSWORD."
      : `Password: ${demoPassword()} (set DEMO_USER_PASSWORD to override).`,
  );
}

main()
  .catch((error) => {
    console.error("Demonstration account seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
