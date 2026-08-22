import {
  Channel,
  FulfilmentStatus,
  IntegrationStatus,
  JobStatus,
  OrderStatus,
  OrganizationStatus,
  PaymentStatus,
  type PrismaClient,
  RequestStatus,
  ShipmentStatus,
} from "@prisma/client";
import { TRADE_ACCOUNT_NUMBER } from "./demo-users";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * 3_600_000);

const address = {
  line1: "18 Walcot Street",
  city: "Bath",
  postcode: "BA1 5BD",
  countryCode: "GB",
};
const consumerAddress = {
  line1: "44 Lansdown Crescent",
  city: "Bath",
  postcode: "BA1 5EX",
  countryCode: "GB",
};

type SeedLine = { slug: string; quantity: number; unitPriceMinor: number };

type SeedOrder = {
  number: string;
  source: Channel;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  daysAgo: number;
  email: string;
  lines: SeedLine[];
  organization?: boolean;
  agent?: boolean;
  consumer?: boolean;
  purchaseOrder?: string;
  notes?: string;
  stockConfirmationPending?: boolean;
  invoice?: { number: string; daysAgo: number };
  /** Quantities shipped per line index, in shipment order. */
  shipments?: Array<{
    status: ShipmentStatus;
    carrier: string;
    trackingNumber: string;
    daysAgo: number;
    quantities: number[];
  }>;
  returnRequest?: { type: string; reason: string; status: RequestStatus };
};

const ORDERS: SeedOrder[] = [
  {
    number: "GJ-2026-000118",
    source: Channel.B2B,
    status: OrderStatus.PROCESSING,
    paymentStatus: PaymentStatus.UNPAID,
    fulfilmentStatus: FulfilmentStatus.PARTIALLY_FULFILLED,
    daysAgo: 6,
    email: "buyer@gemjar.test",
    organization: true,
    purchaseOrder: "PO-88214",
    notes: "Split delivery accepted — please dispatch the bamboo socks first.",
    lines: [
      { slug: "beach-hut-bamboo-socks", quantity: 10, unitPriceMinor: 525 },
      { slug: "fairisle-wool-sock-bundle", quantity: 8, unitPriceMinor: 1495 },
    ],
    invoice: { number: "SI-004821", daysAgo: 5 },
    shipments: [
      {
        status: ShipmentStatus.DELIVERED,
        carrier: "DPD",
        trackingNumber: "DPD4471902288",
        daysAgo: 4,
        quantities: [10, 0],
      },
      {
        status: ShipmentStatus.IN_TRANSIT,
        carrier: "DPD",
        trackingNumber: "DPD4471902411",
        daysAgo: 1,
        quantities: [0, 4],
      },
    ],
  },
  {
    number: "GJ-2026-000117",
    source: Channel.SALES_AGENT,
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.UNPAID,
    fulfilmentStatus: FulfilmentStatus.UNFULFILLED,
    daysAgo: 2,
    email: "buyer@gemjar.test",
    organization: true,
    agent: true,
    purchaseOrder: "PO-88240",
    notes: "Placed by Theo during the Bath showroom visit.",
    stockConfirmationPending: true,
    lines: [
      { slug: "lemons-bamboo-socks", quantity: 6, unitPriceMinor: 525 },
      { slug: "fairisle-wool-sock-bundle", quantity: 4, unitPriceMinor: 1495 },
    ],
  },
  {
    number: "GJ-2026-000116",
    source: Channel.B2B,
    status: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    fulfilmentStatus: FulfilmentStatus.FULFILLED,
    daysAgo: 21,
    email: "buyer@gemjar.test",
    organization: true,
    purchaseOrder: "PO-87990",
    lines: [
      { slug: "bamboo-pyjama-set", quantity: 5, unitPriceMinor: 2995 },
      { slug: "beach-hut-bamboo-socks", quantity: 4, unitPriceMinor: 525 },
    ],
    invoice: { number: "SI-004702", daysAgo: 20 },
    shipments: [
      {
        status: ShipmentStatus.DELIVERED,
        carrier: "Royal Mail",
        trackingNumber: "RM88213004GB",
        daysAgo: 18,
        quantities: [5, 4],
      },
    ],
  },
  {
    number: "GJ-2026-000115",
    source: Channel.B2C,
    status: OrderStatus.PROCESSING,
    paymentStatus: PaymentStatus.PAID,
    fulfilmentStatus: FulfilmentStatus.UNFULFILLED,
    daysAgo: 0,
    email: "customer@gemjar.test",
    consumer: true,
    lines: [{ slug: "fairisle-wool-sock-bundle", quantity: 2, unitPriceMinor: 2495 }],
  },
  {
    number: "GJ-2026-000114",
    source: Channel.B2C,
    status: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    fulfilmentStatus: FulfilmentStatus.FULFILLED,
    daysAgo: 12,
    email: "customer@gemjar.test",
    consumer: true,
    lines: [{ slug: "beach-hut-bamboo-socks", quantity: 1, unitPriceMinor: 795 }],
    shipments: [
      {
        status: ShipmentStatus.DELIVERED,
        carrier: "Royal Mail",
        trackingNumber: "RM88190441GB",
        daysAgo: 9,
        quantities: [1],
      },
    ],
    returnRequest: {
      type: "RETURN",
      reason: "Gift recipient preferred another pattern — exchange requested.",
      status: RequestStatus.REQUESTED,
    },
  },
  {
    number: "GJ-2026-000113",
    source: Channel.B2C,
    status: OrderStatus.SUBMITTED,
    paymentStatus: PaymentStatus.FAILED,
    fulfilmentStatus: FulfilmentStatus.UNFULFILLED,
    daysAgo: 1,
    email: "customer@gemjar.test",
    consumer: true,
    lines: [{ slug: "bamboo-pyjama-set", quantity: 1, unitPriceMinor: 4495 }],
  },
];

/** VAT is charged on top for trade lines and is included in retail prices. */
function totals(
  source: Channel,
  lines: Array<{ quantity: number; unitPriceMinor: number }>,
) {
  const trade = source !== Channel.B2C;
  const base = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const vat = trade ? Math.round(base * 0.2) : Math.round(base - base / 1.2);
  return {
    subtotalMinor: trade ? base : base - vat,
    vatMinor: vat,
    totalMinor: trade ? base + vat : base,
  };
}

async function seedOrders(prisma: PrismaClient) {
  const organization = await prisma.organization.findUnique({
    where: { accountNumber: TRADE_ACCOUNT_NUMBER },
  });
  const agent = await prisma.salesAgent.findFirst({
    where: { code: "AG-001" },
  });
  const consumer = await prisma.user.findUnique({
    where: { email: "customer@gemjar.test" },
  });
  const buyer = await prisma.user.findUnique({
    where: { email: "buyer@gemjar.test" },
  });
  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { slug: true, name: true } } },
  });
  if (!organization || !variants.length) return 0;

  let created = 0;
  for (const seed of ORDERS) {
    if (
      await prisma.order.findUnique({
        where: { number: seed.number },
        select: { id: true },
      })
    )
      continue;
    const resolved = seed.lines.flatMap((line) => {
      const variant = variants.find(
        (entry) => entry.product.slug === line.slug,
      );
      return variant ? [{ ...line, variant }] : [];
    });
    if (resolved.length !== seed.lines.length) continue;
    const money = totals(seed.source, resolved);
    const createdAt = ago(seed.daysAgo, 3);
    const trade = seed.source !== Channel.B2C;

    const order = await prisma.order.create({
      data: {
        number: seed.number,
        idempotencyKey: `demo-${seed.number}`,
        source: seed.source,
        status: seed.status,
        paymentStatus: seed.paymentStatus,
        fulfilmentStatus: seed.fulfilmentStatus,
        stockConfirmationPending: seed.stockConfirmationPending ?? false,
        organizationId: seed.organization ? organization.id : undefined,
        agentId: seed.agent ? agent?.id : undefined,
        userId: seed.consumer
          ? consumer?.id
          : seed.organization
            ? buyer?.id
            : undefined,
        createdById: seed.agent
          ? agent?.userId
          : seed.consumer
            ? consumer?.id
            : buyer?.id,
        email: seed.email,
        currency: "GBP",
        subtotalMinor: money.subtotalMinor,
        vatMinor: money.vatMinor,
        totalMinor: money.totalMinor,
        billingAddress: seed.consumer ? consumerAddress : address,
        deliveryAddress: seed.consumer ? consumerAddress : address,
        purchaseOrder: seed.purchaseOrder,
        notes: seed.notes,
        createdAt,
        items: {
          create: resolved.map((line) => {
            const gross = line.unitPriceMinor * line.quantity;
            const vat = trade
              ? Math.round(gross * 0.2)
              : Math.round(gross - gross / 1.2);
            return {
              variantId: line.variant.id,
              skuSnapshot: line.variant.sku,
              nameSnapshot: line.variant.product.name,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              vatMinor: vat,
              totalMinor: trade ? gross + vat : gross,
              pricingRule: trade ? "CUSTOMER_FIXED" : "RETAIL",
            };
          }),
        },
        events: {
          create: [
            { type: "ORDER_SUBMITTED", message: "Order submitted", createdAt },
            ...(seed.status === OrderStatus.SUBMITTED
              ? []
              : [
                  {
                    type: "ORDER_CONFIRMED",
                    message: "Order confirmed",
                    createdAt: ago(seed.daysAgo, 1),
                  },
                ]),
          ],
        },
      },
      include: { items: true },
    });
    created += 1;

    if (seed.paymentStatus !== PaymentStatus.UNPAID)
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "stripe",
          idempotencyKey: `demo-pay-${seed.number}`,
          status: seed.paymentStatus,
          amountMinor: money.totalMinor,
          failureCode:
            seed.paymentStatus === PaymentStatus.FAILED
              ? "card_declined"
              : undefined,
          failureMessage:
            seed.paymentStatus === PaymentStatus.FAILED
              ? "The card issuer declined the payment"
              : undefined,
          createdAt,
        },
      });

    for (const [index, plan] of (seed.shipments ?? []).entries()) {
      const lines = plan.quantities.flatMap((quantity, lineIndex) =>
        quantity > 0
          ? [{ orderItemId: order.items[lineIndex].id, quantity }]
          : [],
      );
      if (!lines.length) continue;
      const dispatchedAt = ago(plan.daysAgo, 2);
      const shipment = await prisma.shipment.create({
        data: {
          orderId: order.id,
          status: plan.status,
          carrier: plan.carrier,
          trackingNumber: plan.trackingNumber,
          externalId: `MINTSOFT-DEMO-${seed.number.slice(-6)}-${index + 1}`,
          dispatchedAt,
          deliveredAt:
            plan.status === ShipmentStatus.DELIVERED
              ? ago(plan.daysAgo - 1 < 0 ? 0 : plan.daysAgo - 1)
              : null,
          createdAt: dispatchedAt,
          items: { create: lines },
        },
      });
      const events = [
        {
          status: "DISPATCHED",
          detail: `Collected by ${plan.carrier}`,
          occurredAt: dispatchedAt,
        },
        ...(plan.status === ShipmentStatus.IN_TRANSIT ||
        plan.status === ShipmentStatus.DELIVERED
          ? [
              {
                status: "IN_TRANSIT",
                detail: "In transit to delivery depot",
                occurredAt: ago(plan.daysAgo, 1),
              },
            ]
          : []),
        ...(plan.status === ShipmentStatus.DELIVERED
          ? [
              {
                status: "DELIVERED",
                detail: "Delivered and signed for",
                occurredAt: ago(Math.max(plan.daysAgo - 1, 0)),
              },
            ]
          : []),
      ];
      await prisma.trackingEvent.createMany({
        data: events.map((event) => ({ ...event, shipmentId: shipment.id })),
      });
      await prisma.orderStatusEvent.create({
        data: {
          orderId: order.id,
          type:
            plan.status === ShipmentStatus.DELIVERED
              ? "SHIPMENT_DELIVERED"
              : "SHIPMENT_CREATED_PARTIAL",
          message:
            plan.status === ShipmentStatus.DELIVERED
              ? `Shipment ${plan.trackingNumber} delivered`
              : `Shipment ${plan.trackingNumber} dispatched`,
          metadata: { shipmentId: shipment.id, carrier: plan.carrier },
          createdAt: dispatchedAt,
        },
      });
    }

    if (seed.invoice)
      await prisma.invoiceReference.create({
        data: {
          orderId: order.id,
          number: seed.invoice.number,
          totalMinor: money.totalMinor,
          issuedAt: ago(seed.invoice.daysAgo),
          externalId: `SAGE-MOCK-${seed.invoice.number}`,
          documentKey: `invoices/${seed.invoice.number}.pdf`,
        },
      });

    if (seed.returnRequest)
      await prisma.serviceRequest.create({
        data: {
          orderId: order.id,
          type: seed.returnRequest.type,
          status: seed.returnRequest.status,
          reason: seed.returnRequest.reason,
          items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
        },
      });
  }
  return created;
}

/** A second organization awaiting approval gives the admin queue something real. */
async function seedPendingApplication(prisma: PrismaClient) {
  await prisma.organization.upsert({
    where: { accountNumber: "GJ-TRADE-002" },
    update: {},
    create: {
      name: "Halden & Roe",
      accountNumber: "GJ-TRADE-002",
      status: OrganizationStatus.PENDING,
      paymentTermsDays: 30,
      poRequired: false,
      catalogueRestricted: false,
    },
  });
}

async function seedIntegrations(prisma: PrismaClient) {
  const mintsoft = await prisma.integrationConnection.upsert({
    where: { provider: "MINTSOFT" },
    update: { status: IntegrationStatus.DEGRADED, lastSuccessAt: ago(0, 1) },
    create: {
      provider: "MINTSOFT",
      status: IntegrationStatus.DEGRADED,
      lastSuccessAt: ago(0, 1),
      configuration: { mode: "demo-fallback" },
    },
  });
  const sage = await prisma.integrationConnection.upsert({
    where: { provider: "SAGE_50" },
    update: { status: IntegrationStatus.DISABLED, lastSuccessAt: ago(1) },
    create: {
      provider: "SAGE_50",
      status: IntegrationStatus.DISABLED,
      lastSuccessAt: ago(1),
      configuration: { mode: "mock" },
    },
  });
  const jobs = [
    {
      connectionId: mintsoft.id,
      type: "STOCK_SYNC",
      status: JobStatus.SUCCEEDED,
      key: "demo-stock-1",
      attempts: 1,
      payload: { skus: 4 },
      createdAt: ago(0, 1),
    },
    {
      connectionId: mintsoft.id,
      type: "ORDER_SUBMIT",
      status: JobStatus.SUCCEEDED,
      key: "demo-order-submit-116",
      attempts: 1,
      payload: { order: "GJ-2026-000116" },
      createdAt: ago(20),
    },
    {
      connectionId: mintsoft.id,
      type: "SHIPMENT_PULL",
      status: JobStatus.RETRYING,
      key: "demo-shipment-pull-1",
      attempts: 2,
      payload: { since: ago(1).toISOString() },
      createdAt: ago(0, 4),
      errorCode: "UPSTREAM_TIMEOUT",
      errorMessage: "Mintsoft did not respond within 30s",
    },
    {
      connectionId: mintsoft.id,
      type: "ORDER_SUBMIT",
      status: JobStatus.FAILED,
      key: "demo-order-submit-117",
      attempts: 4,
      payload: { order: "GJ-2026-000117" },
      createdAt: ago(1),
      errorCode: "STOCK_SHORTFALL",
      errorMessage: "Requested quantity exceeds warehouse availability",
    },
    {
      connectionId: sage.id,
      type: "INVOICE_PULL",
      status: JobStatus.SUCCEEDED,
      key: "demo-invoice-pull-1",
      attempts: 1,
      payload: { invoices: 2 },
      createdAt: ago(1),
    },
  ];
  for (const job of jobs)
    await prisma.integrationJob.upsert({
      where: { idempotencyKey: job.key },
      update: {
        status: job.status,
        attempts: job.attempts,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
      },
      create: {
        connectionId: job.connectionId,
        type: job.type,
        status: job.status,
        correlationId: job.key,
        idempotencyKey: job.key,
        payload: job.payload,
        attempts: job.attempts,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        nextAttemptAt:
          job.status === JobStatus.RETRYING
            ? new Date(Date.now() + 300_000)
            : null,
      },
    });
}

/**
 * Operational demonstration data: orders across all three channels, a live
 * partial shipment, invoices, a return, a pending trade application, and
 * integration job history. Idempotent — existing orders are left untouched.
 */
export async function seedDemoOperations(prisma: PrismaClient) {
  await seedPendingApplication(prisma);
  const orders = await seedOrders(prisma);
  await seedIntegrations(prisma);
  return { orders };
}
