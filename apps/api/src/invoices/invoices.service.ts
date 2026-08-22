import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserKind } from "@prisma/client";
import { AccountsService } from "../accounts/accounts.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

const invoiceInclude = {
  order: {
    select: {
      id: true,
      number: true,
      source: true,
      currency: true,
      purchaseOrder: true,
      organizationId: true,
      userId: true,
      organization: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
          paymentTermsDays: true,
        },
      },
    },
  },
} as const;

/**
 * Invoices are read through a provider-neutral reference table. Sage 50 (or a
 * replacement) fills the reference and document key; nothing in the portals
 * depends on which accounting system produced the document.
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async listForOrganization(actor: AuthenticatedUser, organizationId: string) {
    await this.accounts.assertCanAccess(actor, organizationId);
    const data = await this.prisma.invoiceReference.findMany({
      where: { order: { organizationId } },
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
    });
    return {
      data,
      total: data.length,
      outstandingMinor: data.reduce(
        (sum, invoice) => sum + invoice.totalMinor,
        0,
      ),
    };
  }

  async listForConsumer(actor: AuthenticatedUser) {
    if (actor.kind !== UserKind.CONSUMER)
      throw new ForbiddenException("A consumer account is required");
    const data = await this.prisma.invoiceReference.findMany({
      where: { order: { userId: actor.id } },
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
    });
    return { data, total: data.length };
  }

  async listAll(limit = 100) {
    const data = await this.prisma.invoiceReference.findMany({
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 250),
    });
    return { data, total: data.length };
  }

  async forOrder(actor: AuthenticatedUser, orderId: string) {
    const invoice = await this.prisma.invoiceReference.findUnique({
      where: { orderId },
      include: invoiceInclude,
    });
    if (!invoice)
      throw new NotFoundException(
        "No invoice has been issued for this order yet",
      );
    if (actor.permissions.includes("finance:read")) return invoice;
    if (invoice.order.organizationId) {
      await this.accounts.assertCanAccess(actor, invoice.order.organizationId);
      return invoice;
    }
    if (invoice.order.userId === actor.id) return invoice;
    throw new ForbiddenException("You do not have access to this invoice");
  }

  async document(actor: AuthenticatedUser, id: string) {
    const reference = await this.prisma.invoiceReference.findUnique({
      where: { id },
      include: { order: { include: { items: true, organization: true } } },
    });
    if (!reference) throw new NotFoundException("Invoice was not found");
    await this.forOrder(actor, reference.orderId);
    const lines = reference.order.items
      .map(
        (item) =>
          `${item.skuSnapshot}\t${item.nameSnapshot}\t${item.quantity}\tGBP ${(item.totalMinor / 100).toFixed(2)}`,
      )
      .join("\n");
    return {
      number: reference.number,
      content: [
        `GEMJAR INVOICE ${reference.number}`,
        `Issued: ${reference.issuedAt.toISOString().slice(0, 10)}`,
        `Order: ${reference.order.number}`,
        reference.order.organization
          ? `Account: ${reference.order.organization.name}`
          : `Customer: ${reference.order.email}`,
        "",
        "SKU\tDescription\tQty\tTotal",
        lines,
        "",
        `Invoice total: GBP ${(reference.totalMinor / 100).toFixed(2)}`,
      ].join("\n"),
    };
  }
}
