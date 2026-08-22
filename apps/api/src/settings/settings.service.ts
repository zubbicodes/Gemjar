import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";

export type CommerceSettings = {
  staleStockMinutes: number;
  defaultPaymentTermsDays: number;
  supportEmail: string;
  notificationFromName: string;
};
export type StorefrontContent = {
  eyebrow: string;
  headline: string;
  emphasis: string;
  introduction: string;
  heroImageUrl: string;
  tradeHeadline: string;
  tradeIntroduction: string;
  deliveryPolicy: string;
  returnsPolicy: string;
  contactEmail: string;
};
export const DEFAULT_STOREFRONT_CONTENT: StorefrontContent = {
  eyebrow: "The autumn atelier",
  headline: "Objects of quiet",
  emphasis: "distinction.",
  introduction:
    "Considered jewellery for modern rituals. Precious materials, sculptural forms, and pieces made to remain.",
  heroImageUrl: "/images/gemjar-hero.png",
  tradeHeadline: "A better way to buy, built around your business.",
  tradeIntroduction:
    "Customer-specific pricing, intelligent reordering and a catalogue curated for your store—all in one calm workspace.",
  deliveryPolicy:
    "UK orders are prepared after payment and stock confirmation. Available delivery services, prices and estimated times are shown before checkout. Tracking appears in your account when a shipment is dispatched.",
  returnsPolicy:
    "Eligible items may be requested for return within 30 days of delivery. Submit the request from order history before sending goods. Personalized, worn or damaged items may be excluded where permitted by law.",
  contactEmail: "support@gemjar.co.uk",
};

export const DEFAULT_COMMERCE_SETTINGS: CommerceSettings = {
  staleStockMinutes: 15,
  defaultPaymentTermsDays: 30,
  supportEmail: "support@gemjar.co.uk",
  notificationFromName: "Gemjar",
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async commerce(): Promise<CommerceSettings> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: "commerce" },
    });
    return {
      ...DEFAULT_COMMERCE_SETTINGS,
      ...((row?.value ?? {}) as Partial<CommerceSettings>),
    };
  }

  async updateCommerce(actorId: string, value: CommerceSettings) {
    const before = await this.commerce();
    const row = await this.prisma.platformSetting.upsert({
      where: { key: "commerce" },
      update: { value },
      create: { key: "commerce", value },
    });
    await this.audit.record({
      actorId,
      event: "PLATFORM_SETTINGS_UPDATED",
      entityType: "PlatformSetting",
      entityId: "commerce",
      before,
      after: value,
    });
    return { ...value, updatedAt: row.updatedAt };
  }

  async deliveryMethods() {
    return {
      data: await this.prisma.deliveryMethod.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
    };
  }

  async createDeliveryMethod(
    actorId: string,
    value: {
      code: string;
      name: string;
      description: string;
      priceMinor: number;
      freeThresholdMinor?: number;
      estimatedDaysMin: number;
      estimatedDaysMax: number;
      active: boolean;
      position: number;
    },
  ) {
    const existing = await this.prisma.deliveryMethod.findUnique({
      where: { code: value.code },
    });
    if (existing) throw new ConflictException("Delivery method code already exists");
    const method = await this.prisma.deliveryMethod.create({ data: value });
    await this.audit.record({
      actorId,
      event: "DELIVERY_METHOD_CREATED",
      entityType: "DeliveryMethod",
      entityId: method.id,
      after: value,
    });
    return method;
  }

  async updateDeliveryMethod(
    actorId: string,
    id: string,
    value: {
      name: string;
      description: string;
      priceMinor: number;
      freeThresholdMinor?: number;
      estimatedDaysMin: number;
      estimatedDaysMax: number;
      active: boolean;
      position: number;
    },
  ) {
    const before = await this.prisma.deliveryMethod.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Delivery method was not found");
    const method = await this.prisma.deliveryMethod.update({
      where: { id },
      data: value,
    });
    await this.audit.record({
      actorId,
      event: "DELIVERY_METHOD_UPDATED",
      entityType: "DeliveryMethod",
      entityId: id,
      before,
      after: value,
    });
    return method;
  }

  async storefront(): Promise<StorefrontContent> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: "storefront" },
    });
    return {
      ...DEFAULT_STOREFRONT_CONTENT,
      ...((row?.value ?? {}) as Partial<StorefrontContent>),
    };
  }
  async updateStorefront(actorId: string, value: StorefrontContent) {
    const before = await this.storefront();
    const row = await this.prisma.platformSetting.upsert({
      where: { key: "storefront" },
      update: { value },
      create: { key: "storefront", value },
    });
    await this.audit.record({
      actorId,
      event: "STOREFRONT_CONTENT_UPDATED",
      entityType: "PlatformSetting",
      entityId: "storefront",
      before,
      after: value,
    });
    return { ...value, updatedAt: row.updatedAt };
  }
}
