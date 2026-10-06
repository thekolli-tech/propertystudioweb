import { Injectable } from '@nestjs/common';
import { type InvoiceListQuery, type InvoiceSummary } from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { BillingAccessService } from './billing-access.service';
import { applyCreatedCursor, bigintToString, encodeCursor, toIso } from './billing.util';

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthActor, query: InvoiceListQuery, request?: AuthenticatedRequest) {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }
    const organization = await this.access.requireOrganization(
      actor,
      query.organizationPublicId,
      'invoices:read',
      request,
    );
    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        financialTransaction: { select: { publicId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      invoices: page.map((row) => this.toSummary(row, organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  async get(
    actor: AuthActor,
    publicId: string,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.access.requireOrganization(
      actor,
      organizationPublicId,
      'invoices:read',
      request,
    );
    const row = await this.prisma.invoice.findFirst({
      where: { publicId, organizationId: organization.id },
      include: {
        items: true,
        financialTransaction: { select: { publicId: true } },
      },
    });
    if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
    return this.toSummary(row, organization.publicId);
  }

  async issueForTransactionInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      financialTransactionId: string;
      description: string;
      amountMinor: bigint;
      currency: string;
      actorUserId?: string | null;
    },
  ) {
    const numberRows = await tx.$queryRawUnsafe<Array<{ n: bigint | number }>>(
      `SELECT nextval('invoice_number_seq') AS n`,
    );
    const sequence = Number(numberRows[0]?.n ?? 0);
    const invoiceNumber = `INV-${String(sequence).padStart(8, '0')}`;

    const invoice = await tx.invoice.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextInvoicePublicId(),
        organizationId: input.organizationId,
        invoiceNumber,
        status: 'ISSUED',
        subtotalMinor: input.amountMinor,
        taxMinor: 0n,
        totalMinor: input.amountMinor,
        currency: input.currency,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        financialTransactionId: input.financialTransactionId,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        items: {
          create: [
            {
              id: newUuid(),
              description: input.description,
              quantity: 1,
              unitAmountMinor: input.amountMinor,
              amountMinor: input.amountMinor,
            },
          ],
        },
      },
      include: {
        items: true,
        financialTransaction: { select: { publicId: true } },
      },
    });

    return invoice;
  }

  async markPaidInTx(tx: TxClient, invoiceId: string, actorUserId?: string | null) {
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        version: { increment: 1 },
        updatedBy: actorUserId ?? null,
      },
    });
  }

  async adminList(actor: AuthActor, query: InvoiceListQuery) {
    await this.access.requireAdminBilling(actor, 'admin:billing:read');
    const where: Record<string, unknown> = {};
    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!org) throw new AppError('NOT_FOUND', 'Resource not found.');
      where.organizationId = org.id;
    }
    if (query.status) where.status = query.status;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.invoice.findMany({
      where,
      include: {
        organization: { select: { publicId: true } },
        items: true,
        financialTransaction: { select: { publicId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      invoices: page.map((row) => this.toSummary(row, row.organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  toSummary(
    row: {
      publicId: string;
      invoiceNumber: string;
      status: InvoiceSummary['status'];
      subtotalMinor: bigint;
      taxMinor: bigint;
      totalMinor: bigint;
      currency: string;
      issuedAt: Date | null;
      dueAt: Date | null;
      paidAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      items: Array<{
        description: string;
        quantity: number;
        unitAmountMinor: bigint;
        amountMinor: bigint;
      }>;
      financialTransaction: { publicId: string } | null;
    },
    organizationPublicId: string,
  ): InvoiceSummary {
    return {
      publicId: row.publicId,
      organizationPublicId,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      subtotalMinor: bigintToString(row.subtotalMinor),
      taxMinor: bigintToString(row.taxMinor),
      totalMinor: bigintToString(row.totalMinor),
      currency: row.currency,
      issuedAt: toIso(row.issuedAt),
      dueAt: toIso(row.dueAt),
      paidAt: toIso(row.paidAt),
      financialTransactionPublicId: row.financialTransaction?.publicId ?? null,
      items: row.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmountMinor: bigintToString(item.unitAmountMinor),
        amountMinor: bigintToString(item.amountMinor),
      })),
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
