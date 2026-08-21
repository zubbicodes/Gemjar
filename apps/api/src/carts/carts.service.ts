import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CartStatus, Channel, Prisma, UserKind } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { AccountsService } from "../accounts/accounts.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { PricingService } from "../pricing/pricing.service";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              media: { orderBy: { position: "asc" as const }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { variant: { sku: "asc" as const } },
  },
};
type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type DraftInput = {
  organizationId: string;
  name: string;
  items: Array<{ variantId: string; quantity: number }>;
  draftId?: string;
};

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  async current(actor: AuthenticatedUser, organizationId: string) {
    const context = await this.accounts.assertCanOrder(actor, organizationId);
    let cart = await this.findCurrent(actor.id, organizationId);
    if (!cart)
      cart = await this.prisma.cart.create({
        data: {
          userId: actor.id,
          organizationId,
          agentId: context.agentId,
          channel: this.channel(actor),
          status: CartStatus.ACTIVE,
        },
        include: cartInclude,
      });
    return this.withQuote(actor, cart);
  }

  async setItem(
    actor: AuthenticatedUser,
    organizationId: string,
    variantId: string,
    quantity: number,
  ) {
    await this.accounts.assertCanOrder(actor, organizationId);
    const cart = await this.current(actor, organizationId);
    if (quantity <= 0)
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, variantId },
      });
    else
      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        update: { quantity },
        create: { cartId: cart.id, variantId, quantity },
      });
    const updated = await this.prisma.cart.update({
      where: { id: cart.id },
      data: { version: { increment: 1 } },
      include: cartInclude,
    });
    return this.withQuote(actor, updated);
  }

  async saveCurrent(
    actor: AuthenticatedUser,
    organizationId: string,
    name: string,
  ) {
    const current = await this.current(actor, organizationId);
    if (!current.items.length)
      throw new ConflictException(
        "Add at least one product before saving a draft",
      );
    const draft = await this.prisma.cart.update({
      where: { id: current.id },
      data: {
        status: CartStatus.DRAFT,
        name: name.trim(),
        version: { increment: 1 },
      },
      include: cartInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORDER_DRAFT_SAVED",
      entityType: "Cart",
      entityId: draft.id,
      after: { organizationId, name: draft.name, channel: draft.channel },
    });
    return this.withQuote(actor, draft);
  }

  async saveDraft(actor: AuthenticatedUser, input: DraftInput) {
    const context = await this.accounts.assertCanOrder(
      actor,
      input.organizationId,
    );
    if (!input.items.length)
      throw new ConflictException("A draft must contain at least one item");
    const quote = await this.pricing.tradeQuote(actor, {
      organizationId: input.organizationId,
      items: input.items,
    });
    if (quote.lines.some((line) => !line.validation.valid))
      throw new ConflictException("Draft contains invalid quantities");
    let draft;
    if (input.draftId) {
      const existing = await this.ownedDraft(actor, input.draftId);
      if (existing.organizationId !== input.organizationId)
        throw new ForbiddenException(
          "Draft organization context cannot be changed",
        );
      draft = await this.prisma.cart.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          version: { increment: 1 },
          items: { deleteMany: {}, create: input.items },
        },
        include: cartInclude,
      });
    } else {
      draft = await this.prisma.cart.create({
        data: {
          userId: actor.id,
          organizationId: input.organizationId,
          agentId: context.agentId,
          channel: this.channel(actor),
          status: CartStatus.DRAFT,
          name: input.name.trim(),
          items: { create: input.items },
        },
        include: cartInclude,
      });
    }
    await this.audit.record({
      actorId: actor.id,
      event: input.draftId ? "ORDER_DRAFT_UPDATED" : "ORDER_DRAFT_CREATED",
      entityType: "Cart",
      entityId: draft.id,
      after: {
        organizationId: input.organizationId,
        name: draft.name,
        version: draft.version,
      },
    });
    return { ...draft, quote };
  }

  async listDrafts(actor: AuthenticatedUser, organizationId?: string) {
    const data = await this.prisma.cart.findMany({
      where: { userId: actor.id, status: CartStatus.DRAFT, organizationId },
      include: cartInclude,
      orderBy: { updatedAt: "desc" },
    });
    return { data, total: data.length };
  }

  async getDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.ownedDraft(actor, id);
    return this.withQuote(actor, draft);
  }

  async removeDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.ownedDraft(actor, id);
    await this.prisma.cart.update({
      where: { id: draft.id },
      data: { status: CartStatus.ABANDONED, version: { increment: 1 } },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORDER_DRAFT_ABANDONED",
      entityType: "Cart",
      entityId: id,
    });
    return { success: true };
  }

  async guestCart(rawToken?: string) {
    if (!rawToken) return { cart: null };
    const cart = await this.prisma.cart.findFirst({
      where: {
        anonymousToken: this.hashToken(rawToken),
        channel: Channel.B2C,
        status: CartStatus.ACTIVE,
      },
      include: cartInclude,
    });
    return cart ? this.consumerPayload(cart) : { cart: null };
  }

  async saveGuestCart(
    rawToken: string | undefined,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    const normalized = this.normalizeItems(items);
    await this.assertRetailItems(normalized);
    let cart = rawToken
      ? await this.prisma.cart.findFirst({
          where: {
            anonymousToken: this.hashToken(rawToken),
            channel: Channel.B2C,
            status: CartStatus.ACTIVE,
          },
          include: cartInclude,
        })
      : null;
    const issuedToken = cart
      ? rawToken!
      : randomBytes(32).toString("base64url");
    if (cart) cart = await this.replaceItems(cart.id, normalized);
    else
      cart = await this.prisma.cart.create({
        data: {
          anonymousToken: this.hashToken(issuedToken),
          channel: Channel.B2C,
          status: CartStatus.ACTIVE,
          items: { create: normalized },
        },
        include: cartInclude,
      });
    return { ...(await this.consumerPayload(cart)), cartToken: issuedToken };
  }

  async consumerCart(actor: AuthenticatedUser) {
    this.assertConsumer(actor);
    let cart = await this.prisma.cart.findFirst({
      where: {
        userId: actor.id,
        channel: Channel.B2C,
        status: CartStatus.ACTIVE,
      },
      include: cartInclude,
      orderBy: { updatedAt: "desc" },
    });
    if (!cart)
      cart = await this.prisma.cart.create({
        data: {
          userId: actor.id,
          channel: Channel.B2C,
          status: CartStatus.ACTIVE,
        },
        include: cartInclude,
      });
    return this.consumerPayload(cart);
  }

  async saveConsumerCart(
    actor: AuthenticatedUser,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    this.assertConsumer(actor);
    const normalized = this.normalizeItems(items);
    await this.assertRetailItems(normalized);
    const current = await this.consumerCart(actor);
    const cart = await this.replaceItems(current.cart.id, normalized);
    return this.consumerPayload(cart);
  }

  async mergeGuestCart(actor: AuthenticatedUser, rawToken?: string) {
    this.assertConsumer(actor);
    if (!rawToken) return this.consumerCart(actor);
    const guest = await this.prisma.cart.findFirst({
      where: {
        anonymousToken: this.hashToken(rawToken),
        channel: Channel.B2C,
        status: CartStatus.ACTIVE,
      },
      include: cartInclude,
    });
    if (!guest) return this.consumerCart(actor);
    const account = await this.consumerCart(actor);
    const quantities = new Map<string, number>(
      account.cart.items.map((item) => [item.variantId, item.quantity]),
    );
    for (const item of guest.items)
      quantities.set(
        item.variantId,
        Math.max(quantities.get(item.variantId) ?? 0, item.quantity),
      );
    const items = [...quantities].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
    await this.assertRetailItems(items);
    const merged = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.cart.update({
        where: { id: account.cart.id },
        data: {
          version: { increment: 1 },
          items: { deleteMany: {}, create: items },
        },
        include: cartInclude,
      });
      await transaction.cart.update({
        where: { id: guest.id },
        data: {
          status: CartStatus.CONVERTED,
          anonymousToken: null,
          version: { increment: 1 },
        },
      });
      return updated;
    });
    await this.audit.record({
      actorId: actor.id,
      event: "CONSUMER_CART_MERGED",
      entityType: "Cart",
      entityId: merged.id,
      after: { sourceCartId: guest.id, lineCount: items.length },
    });
    return this.consumerPayload(merged);
  }

  private async ownedDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.prisma.cart.findFirst({
      where: { id, userId: actor.id, status: CartStatus.DRAFT },
      include: cartInclude,
    });
    if (!draft) throw new NotFoundException("Draft was not found");
    await this.accounts.assertCanAccess(actor, draft.organizationId!);
    return draft;
  }

  private findCurrent(userId: string, organizationId: string) {
    return this.prisma.cart.findFirst({
      where: { userId, organizationId, status: CartStatus.ACTIVE },
      include: cartInclude,
      orderBy: { updatedAt: "desc" },
    });
  }
  private channel(actor: AuthenticatedUser) {
    return actor.kind === UserKind.AGENT ? Channel.SALES_AGENT : Channel.B2B;
  }
  private async withQuote(actor: AuthenticatedUser, cart: CartWithItems) {
    const quote = cart.items.length
      ? await this.pricing.tradeQuote(actor, {
          organizationId: cart.organizationId!,
          items: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        })
      : null;
    return { ...cart, quote };
  }

  private normalizeItems(
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    const quantities = new Map<string, number>();
    for (const item of items)
      if (item.quantity > 0)
        quantities.set(
          item.variantId,
          (quantities.get(item.variantId) ?? 0) + item.quantity,
        );
    return [...quantities].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
  }

  private async assertRetailItems(
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    if (!items.length) return null;
    const quote = await this.pricing.quote({ channel: "B2C", items });
    if (quote.lines.some((line) => !line.validation.valid))
      throw new ConflictException("Basket contains invalid quantities");
    return quote;
  }

  private replaceItems(
    cartId: string,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        version: { increment: 1 },
        items: { deleteMany: {}, create: items },
      },
      include: cartInclude,
    });
  }

  private async consumerPayload(cart: CartWithItems) {
    const quote = cart.items.length
      ? await this.pricing.quote({
          channel: "B2C",
          items: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        })
      : null;
    return {
      cart: {
        id: cart.id,
        version: cart.version,
        updatedAt: cart.updatedAt,
        items: cart.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          productId: item.variant.productId,
          name: item.variant.product.name,
          slug: item.variant.product.slug,
          sku: item.variant.sku,
          price: item.variant.retailPriceMinor,
          image:
            item.variant.product.media[0]?.url ?? "/images/gemjar-hero.png",
        })),
      },
      quote,
    };
  }

  private assertConsumer(actor: AuthenticatedUser) {
    if (actor.kind !== UserKind.CONSUMER)
      throw new ForbiddenException("A consumer account is required");
  }
  private hashToken(token: string) {
    return createHash("sha256")
      .update(
        `${process.env.COOKIE_SECRET || "local-cookie-secret"}:cart:${token}`,
      )
      .digest("hex");
  }
}
