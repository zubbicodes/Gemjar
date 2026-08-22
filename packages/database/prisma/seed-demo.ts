import { PrismaClient } from "@prisma/client";
import {
  seedCatalogue,
  seedDeliveryMethods,
  seedInitialTradePricing,
} from "./demo-catalogue";
import { seedDemoOperations } from "./demo-operations";
import { demoPassword, seedDemoUsers } from "./demo-users";

const prisma = new PrismaClient();

/**
 * Non-destructive demonstration seed. Everything here upserts or skips existing
 * rows, so it is safe to run on every deployment: catalogue edits, customer
 * pricing, and orders created during a demonstration all survive a redeploy.
 */
async function main() {
  const { admin, agentUser, owner } = await seedDemoUsers(prisma);
  await seedCatalogue(prisma);
  await seedDeliveryMethods(prisma);
  const prices = await seedInitialTradePricing(prisma);
  const { orders } = await seedDemoOperations(prisma);

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
  console.log(
    orders
      ? `Seeded ${orders} demonstration order(s).`
      : "Demonstration orders already present; left untouched.",
  );
  console.log(
    prices
      ? `Seeded ${prices} reference customer price(s).`
      : "Customer pricing already configured; left untouched.",
  );
}

main()
  .catch((error) => {
    console.error("Demonstration seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
