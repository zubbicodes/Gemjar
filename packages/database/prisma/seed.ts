import { PrismaClient } from "@prisma/client";
import {
  seedCatalogue,
  seedDeliveryMethods,
  seedTradePricing,
} from "./demo-catalogue";
import { seedDemoOperations } from "./demo-operations";
import { seedDemoUsers } from "./demo-users";

const prisma = new PrismaClient();

/**
 * Full demonstration seed. Unlike `seed:demo`, this also resets North & Finch
 * trade pricing to the reference tiers, so avoid it once an environment carries
 * pricing somebody set deliberately.
 */
async function main() {
  await seedDemoUsers(prisma);
  await seedCatalogue(prisma);
  await seedTradePricing(prisma);
  await seedDeliveryMethods(prisma);
  await seedDemoOperations(prisma);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
