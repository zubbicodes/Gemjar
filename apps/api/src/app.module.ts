import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { AccountsModule } from "./accounts/accounts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { CartsModule } from "./carts/carts.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { DatabaseModule } from "./database/database.module";
import { FulfilmentModule } from "./fulfilment/fulfilment.module";
import { HealthController } from "./health.controller";
import { IntegrationsModule } from "./integrations/integrations.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { OrdersModule } from "./orders/orders.module";
import { PricingModule } from "./pricing/pricing.module";
import { PaymentsModule } from "./payments/payments.module";
import { SettingsModule } from "./settings/settings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AccessModule } from "./access/access.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DatabaseModule,
    AuditModule,
    AuthModule,
    AccountsModule,
    CatalogueModule,
    PricingModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
    IntegrationsModule,
    FulfilmentModule,
    InvoicesModule,
    AnalyticsModule,
    SettingsModule,
    NotificationsModule,
    AccessModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
