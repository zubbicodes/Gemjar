import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

type AddressInput = {
  label: string;
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  countryCode?: string;
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kind: true,
        emailVerifiedAt: true,
        addresses: { orderBy: { label: "asc" } },
        _count: { select: { customerOrders: true, favourites: true } },
      },
    });
    if (!user) throw new NotFoundException("Account was not found");
    return user;
  }

  async update(
    actor: AuthenticatedUser,
    input: { firstName: string; lastName: string },
  ) {
    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
    });
    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kind: true,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ACCOUNT_PROFILE_UPDATED",
      entityType: "User",
      entityId: actor.id,
      before: { firstName: before.firstName, lastName: before.lastName },
      after: { firstName: user.firstName, lastName: user.lastName },
    });
    return user;
  }

  async addAddress(actor: AuthenticatedUser, input: AddressInput) {
    const address = await this.prisma.address.create({
      data: { ...this.addressData(input), userId: actor.id },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ACCOUNT_ADDRESS_CREATED",
      entityType: "Address",
      entityId: address.id,
      after: { label: address.label, postcode: address.postcode },
    });
    return address;
  }

  async updateAddress(
    actor: AuthenticatedUser,
    id: string,
    input: AddressInput,
  ) {
    const before = await this.ownedAddress(actor.id, id);
    const address = await this.prisma.address.update({
      where: { id },
      data: this.addressData(input),
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ACCOUNT_ADDRESS_UPDATED",
      entityType: "Address",
      entityId: id,
      before: { label: before.label, postcode: before.postcode },
      after: { label: address.label, postcode: address.postcode },
    });
    return address;
  }

  async removeAddress(actor: AuthenticatedUser, id: string) {
    const address = await this.ownedAddress(actor.id, id);
    await this.prisma.address.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      event: "ACCOUNT_ADDRESS_DELETED",
      entityType: "Address",
      entityId: id,
      before: { label: address.label, postcode: address.postcode },
    });
    return { success: true };
  }

  async favourites(actor: AuthenticatedUser) {
    const data = await this.prisma.favourite.findMany({
      where: { userId: actor.id },
      include: {
        product: {
          include: {
            media: { orderBy: { position: "asc" }, take: 1 },
            variants: {
              where: { active: true },
              orderBy: { sku: "asc" },
              include: {
                stockSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      data: data.map(({ product, createdAt }) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        image: product.media[0]?.url ?? null,
        variant: product.variants[0]
          ? {
              ...product.variants[0],
              available: product.variants[0].stockSnapshots[0]?.available ?? 0,
              stockSnapshots: undefined,
            }
          : null,
        savedAt: createdAt,
      })),
      total: data.length,
    };
  }

  async addFavourite(actor: AuthenticatedUser, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE, b2cVisible: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Product was not found");
    await this.prisma.favourite.upsert({
      where: { userId_productId: { userId: actor.id, productId } },
      update: {},
      create: { userId: actor.id, productId },
    });
    return { success: true };
  }

  async removeFavourite(actor: AuthenticatedUser, productId: string) {
    await this.prisma.favourite.deleteMany({
      where: { userId: actor.id, productId },
    });
    return { success: true };
  }

  private ownedAddress(userId: string, id: string) {
    return this.prisma.address.findFirstOrThrow({ where: { id, userId } });
  }

  private addressData(input: AddressInput) {
    return {
      label: input.label.trim(),
      recipient: input.recipient.trim(),
      line1: input.line1.trim(),
      line2: input.line2?.trim() || null,
      city: input.city.trim(),
      county: input.county?.trim() || null,
      postcode: input.postcode.trim().toUpperCase(),
      countryCode: input.countryCode?.trim().toUpperCase() || "GB",
    };
  }
}
