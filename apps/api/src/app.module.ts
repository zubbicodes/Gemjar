import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { AccountsModule } from "./accounts/accounts.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { IntegrationsModule } from "./integrations/integrations.module";
import { OrdersModule } from "./orders/orders.module";
import { PricingModule } from "./pricing/pricing.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), DatabaseModule, AuditModule, AuthModule, AccountsModule, CatalogueModule, PricingModule, OrdersModule, IntegrationsModule],
  controllers: [HealthController],
})
export class AppModule {}
