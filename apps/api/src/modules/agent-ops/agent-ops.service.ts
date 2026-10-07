import { Injectable } from '@nestjs/common';
import {
  type AgentProfessionalStatus,
  type AgentWorkspaceResponse,
  type PayAgentVerificationFeeRequest,
  type PayAgentVerificationFeeResponse,
  type VerificationCaseSummary,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppConfigService } from '../../common/config/app-config.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { BillingAccessService } from '../billing/billing-access.service';
import { bigintToString, toIso } from '../billing/billing.util';
import { EntitlementService } from '../billing/entitlement.service';
import { PaymentProviderRegistry } from '../billing/providers/payment-provider';
import { NotificationService } from '../notifications/notification.service';
import { DomainEventBus } from '../integrations/domain-event-bus.service';
import { AgentProfessionalAccessService } from './agent-professional-access.service';

function isReviewEligible(feeStatus: string): boolean {
  return feeStatus === 'PAID' || feeStatus === 'WAIVED' || feeStatus === 'NOT_APPLICABLE';
}

@Injectable()
export class AgentOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AgentProfessionalAccessService,
    private readonly billingAccess: BillingAccessService,
    private readonly entitlements: EntitlementService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationService,
    private readonly domainEvents: DomainEventBus,
  ) {}

  async getProfessionalStatus(
    actor: AuthActor,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<AgentProfessionalStatus> {
    const organization = await this.billingAccess.requireOrganization(
      actor,
      organizationPublicId,
      'organization:read',
      request,
    );
    if (organization.type !== 'AGENCY') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const profile = await this.prisma.agencyProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!profile) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const evaluation = await this.access.evaluateAgency(organization.id);
    const marketplace = await this.access.requireMarketplaceAccess(organization.id);
    const openCase = await this.prisma.verificationCase.findFirst({
      where: {
        organizationId: organization.id,
        subjectType: 'AGENT',
        subjectId: profile.id,
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    const entitlementKeys = await this.entitlements.listForOrganization(organization.id);

    return {
      organizationPublicId: organization.publicId,
      agencyPublicId: profile.publicId,
      verificationStatus: profile.verificationStatus,
      verifiedBadge: evaluation.verifiedBadge,
      professionalAccess: evaluation.eligible,
      listingAccess: evaluation.eligible,
      marketplaceAccess: marketplace.eligible,
      processingFeeStatus: openCase?.processingFeeStatus ?? null,
      activeVerificationCasePublicId: openCase?.publicId ?? null,
      reraNumber: profile.reraNumber,
      verifiedAt: toIso(profile.verifiedAt),
      verificationExpiresAt: toIso(profile.verificationExpiresAt),
      renewalStatus: evaluation.renewalStatus,
      specialization: profile.specialization,
      operatingZones: profile.operatingZones,
      propertyTypes: profile.propertyTypes,
      configurations: profile.configurations,
      priceRangeMinMinor:
        profile.priceRangeMinMinor !== null && profile.priceRangeMinMinor !== undefined
          ? bigintToString(profile.priceRangeMinMinor)
          : null,
      priceRangeMaxMinor:
        profile.priceRangeMaxMinor !== null && profile.priceRangeMaxMinor !== undefined
          ? bigintToString(profile.priceRangeMaxMinor)
          : null,
      entitlements: entitlementKeys,
    };
  }

  async getWorkspace(
    actor: AuthActor,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<AgentWorkspaceResponse> {
    const status = await this.getProfessionalStatus(actor, organizationPublicId, request);
    const organization = await this.prisma.organization.findFirstOrThrow({
      where: { publicId: organizationPublicId },
    });

    const [listingCount, leadCount, openDealCount, openSiteVisitCount, wallet] = await Promise.all([
      this.prisma.property.count({
        where: { organizationId: organization.id, deletedAt: null },
      }),
      this.prisma.lead.count({ where: { recipientOrganizationId: organization.id } }),
      this.prisma.crmDeal.count({
        where: {
          organizationId: organization.id,
          status: { notIn: ['CLOSED', 'LOST', 'BOOKED'] },
        },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          organizationId: organization.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.wallet.findUnique({ where: { organizationId: organization.id } }),
    ]);

    return {
      status,
      listingCount,
      leadCount,
      openDealCount,
      openSiteVisitCount,
      walletBalanceMinor: wallet ? bigintToString(wallet.balanceMinor) : null,
      walletCurrency: wallet?.currency ?? null,
    };
  }

  async payProcessingFee(
    actor: AuthActor,
    body: PayAgentVerificationFeeRequest,
    request?: AuthenticatedRequest,
  ): Promise<PayAgentVerificationFeeResponse> {
    const organization = await this.billingAccess.requireOrganization(
      actor,
      body.organizationPublicId,
      'payments:manage',
      request,
    );
    if (organization.type !== 'AGENCY') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: {
        publicId: body.verificationCasePublicId,
        organizationId: organization.id,
        subjectType: 'AGENT',
      },
      include: { organization: true },
    });
    if (!verificationCase) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    if (
      !['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'DRAFT'].includes(verificationCase.status)
    ) {
      throw new AppError('CONFLICT', 'Processing fee cannot be paid for this case status.');
    }
    if (verificationCase.processingFeeStatus === 'PAID') {
      throw new AppError('CONFLICT', 'Processing fee already paid.');
    }
    if (
      verificationCase.processingFeeStatus !== 'REQUIRED' &&
      verificationCase.processingFeeStatus !== 'FAILED' &&
      verificationCase.processingFeeStatus !== 'PENDING'
    ) {
      throw new AppError('CONFLICT', 'Processing fee is not required for this case.');
    }

    if (this.config.isProduction && this.config.values.PAYMENTS_PROVIDER === 'RAZORPAY') {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Live Razorpay agent verification fee is reserved for a later phase.',
      );
    }

    const amountMinor = BigInt(this.config.values.DEFAULT_AGENT_VERIFICATION_FEE_MINOR);
    const reserved = await this.idempotency.reserve({
      key: body.idempotencyKey,
      scope: 'agent.verification.fee',
      userId: actor.userId,
      organizationId: organization.id,
    });
    if (reserved.existing) {
      const existing = await this.prisma.financialTransaction.findFirst({
        where: { organizationId: organization.id, idempotencyKey: body.idempotencyKey },
      });
      if (existing) {
        const refreshed = await this.prisma.verificationCase.findFirstOrThrow({
          where: { id: verificationCase.id },
          include: { organization: true },
        });
        return {
          transaction: this.toTxSummary(existing, organization.publicId),
          verificationCase: await this.toCaseSummary(refreshed),
        };
      }
    }

    const provider = this.providers.getActive();
    const payment = await provider.createPayment({
      amountMinor,
      currency: 'INR',
      description: 'Agent verification processing fee',
      receipt: body.idempotencyKey,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextPaymentPublicId(),
          organizationId: organization.id,
          type: 'AGENT_VERIFICATION_FEE',
          status: payment.status === 'CAPTURED' ? 'CAPTURED' : 'PENDING',
          provider: provider.code,
          providerTransactionId: payment.providerTransactionId,
          amountMinor,
          currency: 'INR',
          description: 'Agent verification processing fee',
          metadata: {
            verificationCasePublicId: verificationCase.publicId,
            verificationCaseId: verificationCase.id,
          },
          idempotencyKey: body.idempotencyKey,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });

      const feeStatus = payment.status === 'CAPTURED' ? 'PAID' : 'PENDING';
      const updatedCase = await tx.verificationCase.update({
        where: { id: verificationCase.id },
        data: {
          processingFeeStatus: feeStatus,
          processingFeeTransactionId: transaction.id,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: { organization: true },
      });

      return { transaction, updatedCase };
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action:
        result.transaction.status === 'CAPTURED'
          ? 'agent.verification.fee.paid'
          : 'agent.verification.fee.initiated',
      resourceType: 'verification_case',
      resourceId: verificationCase.publicId,
      requestId: request?.requestId,
      after: {
        transactionPublicId: result.transaction.publicId,
        status: result.transaction.status,
        amountMinor: bigintToString(amountMinor),
      },
    });

    if (result.transaction.status === 'CAPTURED') {
      if (verificationCase.submittedByUserId) {
        await this.notifications.create({
          userId: verificationCase.submittedByUserId,
          orgId: organization.id,
          type: 'VERIFICATION_PAYMENT_RECEIVED',
          title: 'Processing fee received',
          body: 'Your verification processing fee was confirmed. The case is now eligible for admin review.',
          severity: 'SUCCESS',
          entityType: 'VERIFICATION_CASE',
          entityId: verificationCase.id,
        });
      }
      await this.domainEvents.emit({
        eventType: 'payment.succeeded',
        resourceType: 'verification_case',
        resourcePublicId: verificationCase.publicId,
        organizationId: organization.id,
        payload: {
          feeType: 'AGENT_VERIFICATION_FEE',
          verificationCasePublicId: verificationCase.publicId,
        },
      });
    }

    await this.idempotency.complete(reserved.id, 201, {
      transactionPublicId: result.transaction.publicId,
    });

    return {
      transaction: this.toTxSummary(result.transaction, organization.publicId),
      verificationCase: await this.toCaseSummary(result.updatedCase),
    };
  }

  /** Called from webhook capture path — never auto-verifies. */
  async markFeePaidFromTransaction(transactionId: string): Promise<void> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, type: 'AGENT_VERIFICATION_FEE' },
    });
    if (!transaction || transaction.status !== 'CAPTURED') return;

    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { processingFeeTransactionId: transaction.id },
    });
    if (!verificationCase) {
      const metadata = transaction.metadata as { verificationCaseId?: string } | null;
      if (!metadata?.verificationCaseId) return;
      await this.prisma.verificationCase.updateMany({
        where: {
          id: metadata.verificationCaseId,
          processingFeeStatus: { in: ['REQUIRED', 'PENDING', 'FAILED'] },
        },
        data: {
          processingFeeStatus: 'PAID',
          processingFeeTransactionId: transaction.id,
          version: { increment: 1 },
        },
      });
      return;
    }

    if (verificationCase.processingFeeStatus === 'PAID') return;

    await this.prisma.verificationCase.update({
      where: { id: verificationCase.id },
      data: {
        processingFeeStatus: 'PAID',
        version: { increment: 1 },
      },
    });

    await this.audit.write({
      organizationId: transaction.organizationId,
      action: 'agent.verification.fee.paid',
      resourceType: 'verification_case',
      resourceId: verificationCase.publicId,
      after: { transactionPublicId: transaction.publicId, via: 'webhook' },
    });

    if (verificationCase.submittedByUserId) {
      await this.notifications.create({
        userId: verificationCase.submittedByUserId,
        orgId: transaction.organizationId,
        type: 'VERIFICATION_PAYMENT_RECEIVED',
        title: 'Processing fee received',
        body: 'Your verification processing fee was confirmed. The case is now eligible for admin review.',
        severity: 'SUCCESS',
        entityType: 'VERIFICATION_CASE',
        entityId: verificationCase.id,
      });
    }
  }

  private toTxSummary(
    row: {
      publicId: string;
      type: string;
      status: string;
      provider: string;
      providerTransactionId: string | null;
      amountMinor: bigint;
      currency: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ) {
    return {
      publicId: row.publicId,
      organizationPublicId,
      type: row.type as PayAgentVerificationFeeResponse['transaction']['type'],
      status: row.status as PayAgentVerificationFeeResponse['transaction']['status'],
      provider: row.provider as PayAgentVerificationFeeResponse['transaction']['provider'],
      providerTransactionId: row.providerTransactionId,
      amountMinor: bigintToString(row.amountMinor),
      currency: row.currency,
      description: row.description,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }

  private async toCaseSummary(row: {
    publicId: string;
    organization?: { publicId: string } | null;
    organizationId: string | null;
    subjectType: VerificationCaseSummary['subjectType'];
    subjectId: string;
    verificationType: VerificationCaseSummary['verificationType'];
    status: VerificationCaseSummary['status'];
    reraNumber: string | null;
    declarationAccepted: boolean;
    processingFeeStatus: VerificationCaseSummary['processingFeeStatus'];
    processingFeeTransactionId: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    expiresAt: Date | null;
    rejectionReason: string | null;
    reviewerNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<VerificationCaseSummary> {
    let subjectPublicId = row.subjectId;
    if (row.subjectType === 'AGENT') {
      const profile = await this.prisma.agencyProfile.findFirst({
        where: { id: row.subjectId },
        select: { publicId: true },
      });
      subjectPublicId = profile?.publicId ?? row.subjectId;
    }

    let feeTxPublicId: string | null = null;
    if (row.processingFeeTransactionId) {
      const tx = await this.prisma.financialTransaction.findFirst({
        where: { id: row.processingFeeTransactionId },
        select: { publicId: true },
      });
      feeTxPublicId = tx?.publicId ?? null;
    }

    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      subjectType: row.subjectType,
      subjectPublicId,
      verificationType: row.verificationType,
      status: row.status,
      reraNumber: row.reraNumber,
      declarationAccepted: row.declarationAccepted,
      processingFeeStatus: row.processingFeeStatus,
      processingFeeTransactionPublicId: feeTxPublicId,
      reviewEligible: isReviewEligible(row.processingFeeStatus),
      submittedAt: toIso(row.submittedAt),
      reviewedAt: toIso(row.reviewedAt),
      expiresAt: toIso(row.expiresAt),
      rejectionReason: row.rejectionReason,
      reviewerNotes: row.reviewerNotes,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
