import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JobStatus, Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

const fields = [
  "name",
  "slug",
  "sku",
  "description",
  "retailPrice",
  "b2bPrice",
  "moq",
  "packMultiple",
  "category",
  "imageUrl",
] as const;
type Field = (typeof fields)[number];
type ImportRow = Record<Field, string>;
type RowError = { row: number; errors: string[] };

@Injectable()
export class CatalogueTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async stage(csv: string, idempotencyKey: string, actorId: string) {
    const existing = await this.prisma.importJob.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;
    const parsed = this.parse(csv);
    const errors: RowError[] = [];
    parsed.rows.forEach((row, index) => {
      const rowErrors: string[] = [];
      if (!row.name.trim()) rowErrors.push("name is required");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))
        rowErrors.push("slug is invalid");
      if (!/^[A-Z0-9-]+$/.test(row.sku)) rowErrors.push("SKU is invalid");
      if (row.description.trim().length < 10)
        rowErrors.push("description must contain at least 10 characters");
      for (const field of ["retailPrice", "b2bPrice"] as const)
        if (
          row[field] &&
          (!Number.isFinite(Number(row[field])) || Number(row[field]) <= 0)
        )
          rowErrors.push(`${field} must be a positive amount`);
      for (const field of ["moq", "packMultiple"] as const)
        if (
          !Number.isInteger(Number(row[field] || "1")) ||
          Number(row[field] || "1") < 1
        )
          rowErrors.push(`${field} must be a positive integer`);
      if (!row.retailPrice) rowErrors.push("retailPrice is required");
      if (row.imageUrl) {
        try {
          new URL(row.imageUrl);
        } catch {
          rowErrors.push("imageUrl is invalid");
        }
      }
      if (rowErrors.length) errors.push({ row: index + 2, errors: rowErrors });
    });
    const invalid = new Set(errors.map((error) => error.row - 2));
    const validRows = parsed.rows.filter((_, index) => !invalid.has(index));
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          type: "CATALOGUE_CSV",
          status: errors.length ? JobStatus.FAILED : JobStatus.PENDING,
          objectKey: `inline://${idempotencyKey}`,
          idempotencyKey,
          totalRows: parsed.rows.length,
          validRows: validRows.length,
          invalidRows: errors.length,
          errors: errors as unknown as Prisma.InputJsonValue,
          payload: validRows as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          event: "CATALOGUE_IMPORT_STAGED",
          entityType: "ImportJob",
          entityId: job.id,
          after: {
            totalRows: job.totalRows,
            validRows: job.validRows,
            invalidRows: job.invalidRows,
          },
        },
      });
      return job;
    });
  }

  async listImports() {
    const data = await this.prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data, total: data.length };
  }

  async commit(id: string, actorId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Import job was not found");
    if (job.committedAt) return job;
    if (job.invalidRows)
      throw new ConflictException("Import contains invalid rows");
    const rows = job.payload as unknown as ImportRow[];
    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const category = row.category
            ? await tx.category.upsert({
                where: { slug: this.slug(row.category) },
                update: { name: row.category },
                create: { name: row.category, slug: this.slug(row.category) },
              })
            : null;
          const bySku = await tx.productVariant.findUnique({
            where: { sku: row.sku },
            select: { id: true, productId: true },
          });
          const bySlug = await tx.product.findUnique({
            where: { slug: row.slug },
            select: { id: true },
          });
          if (bySku && bySlug && bySku.productId !== bySlug.id)
            throw new ConflictException(
              `SKU ${row.sku} and slug ${row.slug} belong to different products`,
            );
          const productId = bySku?.productId ?? bySlug?.id;
          const product = productId
            ? await tx.product.update({
                where: { id: productId },
                data: {
                  name: row.name,
                  slug: row.slug,
                  description: row.description,
                  status: ProductStatus.ACTIVE,
                  b2cVisible: true,
                  b2bVisible: true,
                },
              })
            : await tx.product.create({
                data: {
                  name: row.name,
                  slug: row.slug,
                  description: row.description,
                  status: ProductStatus.ACTIVE,
                },
              });
          const variantData = {
            retailPriceMinor: this.money(row.retailPrice),
            b2bPriceMinor: row.b2bPrice ? this.money(row.b2bPrice) : undefined,
            moq: Number(row.moq || "1"),
            packMultiple: Number(row.packMultiple || "1"),
            active: true,
          };
          if (bySku)
            await tx.productVariant.update({
              where: { id: bySku.id },
              data: variantData,
            });
          else
            await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: row.sku,
                ...variantData,
                stockSnapshots: {
                  create: {
                    available: 0,
                    capturedAt: new Date(),
                    provider: "IMPORT",
                  },
                },
              },
            });
          if (category)
            await tx.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId: product.id,
                  categoryId: category.id,
                },
              },
              update: {},
              create: { productId: product.id, categoryId: category.id },
            });
          if (row.imageUrl) {
            const media = await tx.productMedia.findFirst({
              where: { productId: product.id },
              orderBy: { position: "asc" },
            });
            if (media)
              await tx.productMedia.update({
                where: { id: media.id },
                data: { url: row.imageUrl, alt: row.name },
              });
            else
              await tx.productMedia.create({
                data: {
                  productId: product.id,
                  url: row.imageUrl,
                  alt: row.name,
                  position: 0,
                },
              });
          }
        }
        const committedAt = new Date();
        const committed = await tx.importJob.update({
          where: { id },
          data: { status: JobStatus.SUCCEEDED, committedAt },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            event: "CATALOGUE_IMPORT_COMMITTED",
            entityType: "ImportJob",
            entityId: id,
            after: {
              rows: rows.length,
              committedAt: committedAt.toISOString(),
            },
          },
        });
        return committed;
      });
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id },
        data: {
          status: JobStatus.FAILED,
          errors: [
            {
              row: 0,
              errors: [
                error instanceof Error ? error.message : "Commit failed",
              ],
            },
          ],
        },
      });
      throw error;
    }
  }

  async createExport(actorId: string) {
    const products = await this.prisma.product.findMany({
      include: {
        variants: { orderBy: { sku: "asc" } },
        categories: { include: { category: true } },
        media: { orderBy: { position: "asc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    });
    const rows = products.flatMap((product) =>
      product.variants.map((variant) =>
        [
          product.name,
          product.slug,
          variant.sku,
          product.description,
          (variant.retailPriceMinor / 100).toFixed(2),
          variant.b2bPriceMinor == null
            ? ""
            : (variant.b2bPriceMinor / 100).toFixed(2),
          variant.moq,
          variant.packMultiple,
          product.categories[0]?.category.name ?? "",
          product.media[0]?.url ?? "",
        ]
          .map((value) => this.escape(String(value)))
          .join(","),
      ),
    );
    const content = `${fields.join(",")}\r\n${rows.join("\r\n")}\r\n`;
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.exportJob.create({
        data: {
          type: "CATALOGUE_CSV",
          status: JobStatus.SUCCEEDED,
          objectKey: "inline://catalogue.csv",
          content,
          rowCount: rows.length,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          event: "CATALOGUE_EXPORT_CREATED",
          entityType: "ExportJob",
          entityId: job.id,
          after: { rowCount: rows.length },
        },
      });
      return job;
    });
  }

  async listExports() {
    const data = await this.prisma.exportJob.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        rowCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data, total: data.length };
  }
  async downloadExport(id: string) {
    const job = await this.prisma.exportJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Export job was not found");
    return job;
  }

  private parse(csv: string) {
    const table: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      if (quoted) {
        if (char === '"' && csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, ""));
        table.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (cell || row.length) {
      row.push(cell.replace(/\r$/, ""));
      table.push(row);
    }
    if (!table.length) throw new ConflictException("CSV is empty");
    const header = table.shift()!.map((value) => value.trim());
    const missing = fields.filter((field) => !header.includes(field));
    if (missing.length)
      throw new ConflictException(`Missing CSV headers: ${missing.join(", ")}`);
    return {
      rows: table
        .filter((values) => values.some((value) => value.trim()))
        .map(
          (values) =>
            Object.fromEntries(
              fields.map((field) => [
                field,
                (values[header.indexOf(field)] ?? "").trim(),
              ]),
            ) as ImportRow,
        ),
    };
  }
  private money(value: string) {
    return Math.round(Number(value) * 100);
  }
  private slug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  private escape(value: string) {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }
}
