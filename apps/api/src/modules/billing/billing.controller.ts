import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  adminSubscriptionListQuerySchema,
  adminWalletListQuerySchema,
  billingOverviewQuerySchema,
  cancelOrganizationSubscriptionRequestSchema,
  createLeadPurchaseRequestSchema,
  createOrganizationSubscriptionRequestSchema,
  createRefundRequestSchema,
  createSubscriptionPlanRequestSchema,
  financialTransactionListQuerySchema,
  invoiceListQuerySchema,
  subscriptionPlanListQuerySchema,
  updateSubscriptionPlanRequestSchema,
  walletLedgerListQuerySchema,
  walletTopUpRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { InvoiceService } from './invoice.service';
import { LeadPurchaseService } from './lead-purchase.service';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';
import { BillingAccessService } from './billing-access.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { applyCreatedCursor, encodeCursor } from './billing.util';
import { AppError } from '../../common/errors/app-error';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly wallets: WalletService,
    private readonly payments: PaymentService,
    private readonly invoices: InvoiceService,
    private readonly leadPurchases: LeadPurchaseService,
  ) {}

  @Get('subscriptions/plans')
  listPlans(@Query(new ZodValidationPipe(subscriptionPlanListQuerySchema)) query: unknown) {
    return this.subscriptions.listPlans(query as Parameters<SubscriptionService['listPlans']>[0]);
  }

  @Get('subscriptions/current')
  currentSubscription(
    @CurrentActor() actor: AuthActor,
    @Query('organizationPublicId') organizationPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.subscriptions.current(actor, organizationPublicId, request);
  }

  @Post('subscriptions')
  createSubscription(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createOrganizationSubscriptionRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.subscriptions.createSubscription(
      actor,
      body as Parameters<SubscriptionService['createSubscription']>[1],
      request,
    );
  }

  @Post('subscriptions/cancel')
  cancelSubscription(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(cancelOrganizationSubscriptionRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.subscriptions.cancel(
      actor,
      body as Parameters<SubscriptionService['cancel']>[1],
      request,
    );
  }

  @Get('billing/overview')
  billingOverview(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(billingOverviewQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const parsed = query as { organizationPublicId: string };
    return this.subscriptions.overview(actor, parsed.organizationPublicId, request);
  }

  @Get('wallet')
  getWallet(
    @CurrentActor() actor: AuthActor,
    @Query('organizationPublicId') organizationPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.wallets.getWallet(actor, organizationPublicId, request);
  }

  @Get('wallet/ledger')
  walletLedger(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(walletLedgerListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.wallets.listLedger(
      actor,
      query as Parameters<WalletService['listLedger']>[1],
      request,
    );
  }

  @Post('wallet/topup')
  walletTopUp(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(walletTopUpRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.wallets.topUp(actor, body as Parameters<WalletService['topUp']>[1], request);
  }

  @Get('payments')
  listPayments(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(financialTransactionListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.list(actor, query as Parameters<PaymentService['list']>[1], request);
  }

  @Get('payments/:publicId')
  getPayment(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Query('organizationPublicId') organizationPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.get(actor, publicId, organizationPublicId, request);
  }

  @Post('payments/refunds')
  createRefund(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createRefundRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payments.createRefund(
      actor,
      body as Parameters<PaymentService['createRefund']>[1],
      request,
    );
  }

  @Get('invoices')
  listInvoices(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(invoiceListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invoices.list(actor, query as Parameters<InvoiceService['list']>[1], request);
  }

  @Get('invoices/:publicId')
  getInvoice(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Query('organizationPublicId') organizationPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invoices.get(actor, publicId, organizationPublicId, request);
  }

  @Post('lead-purchases')
  purchaseLead(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createLeadPurchaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leadPurchases.purchase(
      actor,
      body as Parameters<LeadPurchaseService['purchase']>[1],
      request,
    );
  }
}

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminBillingController {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly payments: PaymentService,
    private readonly invoices: InvoiceService,
    private readonly wallets: WalletService,
    private readonly access: BillingAccessService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('subscriptions/plans')
  adminListPlans(@Query(new ZodValidationPipe(subscriptionPlanListQuerySchema)) query: unknown) {
    return this.subscriptions.listPlans(query as Parameters<SubscriptionService['listPlans']>[0]);
  }

  @Post('subscriptions/plans')
  createPlan(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createSubscriptionPlanRequestSchema)) body: unknown,
  ) {
    return this.subscriptions.createPlan(
      actor,
      body as Parameters<SubscriptionService['createPlan']>[1],
    );
  }

  @Patch('subscriptions/plans/:publicId')
  updatePlan(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateSubscriptionPlanRequestSchema)) body: unknown,
  ) {
    return this.subscriptions.updatePlan(
      actor,
      publicId,
      body as Parameters<SubscriptionService['updatePlan']>[2],
    );
  }

  @Get('subscriptions')
  listSubscriptions(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminSubscriptionListQuerySchema)) query: unknown,
  ) {
    return this.subscriptions.adminListSubscriptions(
      actor,
      query as Parameters<SubscriptionService['adminListSubscriptions']>[1],
    );
  }

  @Get('payments')
  listPayments(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(financialTransactionListQuerySchema)) query: unknown,
  ) {
    return this.payments.adminList(actor, query as Parameters<PaymentService['adminList']>[1]);
  }

  @Get('invoices')
  listInvoices(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(invoiceListQuerySchema)) query: unknown,
  ) {
    return this.invoices.adminList(actor, query as Parameters<InvoiceService['adminList']>[1]);
  }

  @Get('wallets')
  async listWallets(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminWalletListQuerySchema)) query: unknown,
  ) {
    await this.access.requireAdminBilling(actor, 'admin:billing:read');
    const parsed = query as {
      cursor?: string;
      limit: number;
      organizationPublicId?: string;
    };
    const where: Record<string, unknown> = {};
    if (parsed.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: parsed.organizationPublicId },
      });
      if (!org) throw new AppError('NOT_FOUND', 'Resource not found.');
      where.organizationId = org.id;
    }
    applyCreatedCursor(where, parsed.cursor);
    const rows = await this.prisma.wallet.findMany({
      where,
      include: { organization: { select: { publicId: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: parsed.limit + 1,
    });
    const page = rows.slice(0, parsed.limit);
    const next = rows.length > parsed.limit ? page[page.length - 1] : null;
    return {
      wallets: page.map((row) => this.wallets.toWalletSummary(row, row.organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }
}

import { WebhookService } from './webhook.service';

@Controller('payments/webhooks')
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Post('razorpay')
  razorpay(
    @Body() body: unknown,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Req() request: AuthenticatedRequest & { rawBody?: Buffer | string },
  ) {
    const rawBody =
      typeof request.rawBody === 'string'
        ? request.rawBody
        : Buffer.isBuffer(request.rawBody)
          ? request.rawBody.toString('utf8')
          : JSON.stringify(body ?? {});
    return this.webhooks.handleRazorpay(rawBody, signature);
  }

  @Post('sandbox')
  sandbox(@Body() body: unknown) {
    return this.webhooks.handleSandbox(JSON.stringify(body ?? {}));
  }
}
