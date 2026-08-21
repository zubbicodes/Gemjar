import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CartStatus, Channel, Prisma, UserKind } from "@prisma/client";
import { AccountsService } from "../accounts/accounts.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { PricingService } from "../pricing/pricing.service";

const cartInclude = { items: { include: { variant: { include: { product: { select: { name: true, slug: true } } } } }, orderBy: { variant: { sku: "asc" as const } } } };
type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type DraftInput = { organizationId: string; name: string; items: Array<{ variantId: string; quantity: number }>; draftId?: string };

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService, private readonly accounts: AccountsService, private readonly audit: AuditService) {}

  async current(actor: AuthenticatedUser, organizationId: string) {
    const context = await this.accounts.assertCanOrder(actor, organizationId);
    let cart = await this.findCurrent(actor.id, organizationId);
    if (!cart) cart = await this.prisma.cart.create({ data: { userId: actor.id, organizationId, agentId: context.agentId, channel: this.channel(actor), status: CartStatus.ACTIVE }, include: cartInclude });
    return this.withQuote(actor, cart);
  }

  async setItem(actor: AuthenticatedUser, organizationId: string, variantId: string, quantity: number) {
    await this.accounts.assertCanOrder(actor, organizationId);
    const cart = await this.current(actor, organizationId);
    if (quantity <= 0) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    else await this.prisma.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, update: { quantity }, create: { cartId: cart.id, variantId, quantity } });
    const updated = await this.prisma.cart.update({ where: { id: cart.id }, data: { version: { increment: 1 } }, include: cartInclude });
    return this.withQuote(actor, updated);
  }

  async saveCurrent(actor: AuthenticatedUser, organizationId: string, name: string) {
    const current = await this.current(actor, organizationId);
    if (!current.items.length) throw new ConflictException("Add at least one product before saving a draft");
    const draft = await this.prisma.cart.update({ where: { id: current.id }, data: { status: CartStatus.DRAFT, name: name.trim(), version: { increment: 1 } }, include: cartInclude });
    await this.audit.record({ actorId: actor.id, event: "ORDER_DRAFT_SAVED", entityType: "Cart", entityId: draft.id, after: { organizationId, name: draft.name, channel: draft.channel } });
    return this.withQuote(actor, draft);
  }

  async saveDraft(actor: AuthenticatedUser, input: DraftInput) {
    const context = await this.accounts.assertCanOrder(actor, input.organizationId);
    if (!input.items.length) throw new ConflictException("A draft must contain at least one item");
    const quote = await this.pricing.tradeQuote(actor, { organizationId: input.organizationId, items: input.items });
    if (quote.lines.some((line) => !line.validation.valid)) throw new ConflictException("Draft contains invalid quantities");
    let draft;
    if (input.draftId) {
      const existing = await this.ownedDraft(actor, input.draftId);
      if (existing.organizationId !== input.organizationId) throw new ForbiddenException("Draft organization context cannot be changed");
      draft = await this.prisma.cart.update({ where: { id: existing.id }, data: { name: input.name.trim(), version: { increment: 1 }, items: { deleteMany: {}, create: input.items } }, include: cartInclude });
    } else {
      draft = await this.prisma.cart.create({ data: { userId: actor.id, organizationId: input.organizationId, agentId: context.agentId, channel: this.channel(actor), status: CartStatus.DRAFT, name: input.name.trim(), items: { create: input.items } }, include: cartInclude });
    }
    await this.audit.record({ actorId: actor.id, event: input.draftId ? "ORDER_DRAFT_UPDATED" : "ORDER_DRAFT_CREATED", entityType: "Cart", entityId: draft.id, after: { organizationId: input.organizationId, name: draft.name, version: draft.version } });
    return { ...draft, quote };
  }

  async listDrafts(actor: AuthenticatedUser, organizationId?: string) {
    const data = await this.prisma.cart.findMany({ where: { userId: actor.id, status: CartStatus.DRAFT, organizationId }, include: cartInclude, orderBy: { updatedAt: "desc" } });
    return { data, total: data.length };
  }

  async getDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.ownedDraft(actor, id);
    return this.withQuote(actor, draft);
  }

  async removeDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.ownedDraft(actor, id);
    await this.prisma.cart.update({ where: { id: draft.id }, data: { status: CartStatus.ABANDONED, version: { increment: 1 } } });
    await this.audit.record({ actorId: actor.id, event: "ORDER_DRAFT_ABANDONED", entityType: "Cart", entityId: id });
    return { success: true };
  }

  private async ownedDraft(actor: AuthenticatedUser, id: string) {
    const draft = await this.prisma.cart.findFirst({ where: { id, userId: actor.id, status: CartStatus.DRAFT }, include: cartInclude });
    if (!draft) throw new NotFoundException("Draft was not found");
    await this.accounts.assertCanAccess(actor, draft.organizationId!);
    return draft;
  }

  private findCurrent(userId: string, organizationId: string) { return this.prisma.cart.findFirst({ where: { userId, organizationId, status: CartStatus.ACTIVE }, include: cartInclude, orderBy: { updatedAt: "desc" } }); }
  private channel(actor: AuthenticatedUser) { return actor.kind === UserKind.AGENT ? Channel.SALES_AGENT : Channel.B2B; }
  private async withQuote(actor: AuthenticatedUser, cart: CartWithItems) {
    const quote = cart.items.length ? await this.pricing.tradeQuote(actor, { organizationId: cart.organizationId!, items: cart.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })) }) : null;
    return { ...cart, quote };
  }
}
