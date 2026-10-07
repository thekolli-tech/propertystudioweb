import { Injectable } from '@nestjs/common';
import { PUBLIC_ID_SEQUENCES, formatPublicId } from '@property-studio/public-id';

import { PrismaService } from '../prisma/prisma.module';

type PublicIdKind = keyof typeof PUBLIC_ID_SEQUENCES;

@Injectable()
export class PublicIdService {
  constructor(private readonly prisma: PrismaService) {}

  async nextUserPublicId(): Promise<string> {
    return this.next('USER');
  }

  async nextOrganizationPublicId(): Promise<string> {
    return this.next('ORG');
  }

  async nextDeveloperPublicId(): Promise<string> {
    return this.next('DEV');
  }

  async nextAgencyPublicId(): Promise<string> {
    return this.next('AGT');
  }

  async nextProjectPublicId(): Promise<string> {
    return this.next('PROJ');
  }

  async nextPropertyPublicId(): Promise<string> {
    return this.next('PROP');
  }

  async nextCommunityPublicId(): Promise<string> {
    return this.next('COM');
  }

  async nextMediaPublicId(): Promise<string> {
    return this.next('MED');
  }

  async nextDocumentPublicId(): Promise<string> {
    return this.next('DOC');
  }

  async nextRequirementPublicId(): Promise<string> {
    return this.next('REQ');
  }

  async nextLeadPublicId(): Promise<string> {
    return this.next('LEAD');
  }

  async nextContactPublicId(): Promise<string> {
    return this.next('CONTACT');
  }

  async nextActivityPublicId(): Promise<string> {
    return this.next('ACT');
  }

  async nextTaskPublicId(): Promise<string> {
    return this.next('TASK');
  }

  async nextVisitPublicId(): Promise<string> {
    return this.next('VISIT');
  }

  async nextDealPublicId(): Promise<string> {
    return this.next('DEAL');
  }

  async nextPlanPublicId(): Promise<string> {
    return this.next('PLAN');
  }

  async nextSubscriptionPublicId(): Promise<string> {
    return this.next('SUB');
  }

  async nextWalletPublicId(): Promise<string> {
    return this.next('WAL');
  }

  async nextWalletLedgerPublicId(): Promise<string> {
    return this.next('WLED');
  }

  async nextPaymentPublicId(): Promise<string> {
    return this.next('PAY');
  }

  async nextInvoicePublicId(): Promise<string> {
    return this.next('INV');
  }

  async nextRefundPublicId(): Promise<string> {
    return this.next('REF');
  }

  async nextLeadPurchasePublicId(): Promise<string> {
    return this.next('LPUR');
  }

  async nextVerificationCasePublicId(): Promise<string> {
    return this.next('VCASE');
  }

  async nextVerificationDocumentPublicId(): Promise<string> {
    return this.next('VDOC');
  }

  async nextReviewPublicId(): Promise<string> {
    return this.next('REV');
  }

  async nextReviewReportPublicId(): Promise<string> {
    return this.next('RRPT');
  }

  async nextNotificationPublicId(): Promise<string> {
    return this.next('NTF');
  }

  async nextConversationPublicId(): Promise<string> {
    return this.next('CONV');
  }

  async nextMessagePublicId(): Promise<string> {
    return this.next('MSG');
  }

  async nextLeadAccessPublicId(): Promise<string> {
    return this.next('LACC');
  }

  async nextContentReportPublicId(): Promise<string> {
    return this.next('CRPT');
  }

  async nextMarketSnapshotPublicId(): Promise<string> {
    return this.next('MSNAP');
  }

  async nextInfrastructurePublicId(): Promise<string> {
    return this.next('INFRA');
  }

  async nextIntelligenceObservationPublicId(): Promise<string> {
    return this.next('IOBS');
  }

  async nextAiJobPublicId(): Promise<string> {
    return this.next('AIJOB');
  }

  async nextDocumentAnalysisPublicId(): Promise<string> {
    return this.next('DOCA');
  }

  async nextFloorPlanAnalysisPublicId(): Promise<string> {
    return this.next('FPA');
  }

  async nextValuationEstimatePublicId(): Promise<string> {
    return this.next('VAL');
  }

  async nextCreatorProfilePublicId(): Promise<string> {
    return this.next('CRT');
  }

  async nextEditorialContentPublicId(): Promise<string> {
    return this.next('EDC');
  }

  async nextEditorialRevisionPublicId(): Promise<string> {
    return this.next('EDCR');
  }

  async nextMediaCollectionPublicId(): Promise<string> {
    return this.next('MCOL');
  }

  async nextMediaCollectionItemPublicId(): Promise<string> {
    return this.next('MCIT');
  }

  async nextMediaAnalyticsEventPublicId(): Promise<string> {
    return this.next('MAEV');
  }

  async nextExternalMediaMappingPublicId(): Promise<string> {
    return this.next('EMAP');
  }

  async nextBroadcastConfigPublicId(): Promise<string> {
    return this.next('BCFG');
  }

  async nextPartnerIntegrationPublicId(): Promise<string> {
    return this.next('PINT');
  }

  async nextApiClientPublicId(): Promise<string> {
    return this.next('AKEY');
  }

  async nextWebhookEndpointPublicId(): Promise<string> {
    return this.next('WHK');
  }

  async nextWebhookDeliveryPublicId(): Promise<string> {
    return this.next('WHDEL');
  }

  async nextDomainEventPublicId(): Promise<string> {
    return this.next('DEVNT');
  }

  async nextBackgroundJobPublicId(): Promise<string> {
    return this.next('JOB');
  }

  async nextDeadLetterPublicId(): Promise<string> {
    return this.next('DLQ');
  }

  async nextExternalResourceMappingPublicId(): Promise<string> {
    return this.next('XMAP');
  }

  async nextIntegrationUsagePublicId(): Promise<string> {
    return this.next('IUSG');
  }

  async nextAutomationRulePublicId(): Promise<string> {
    return this.next('RULE');
  }

  async nextAiConversationPublicId(): Promise<string> {
    return this.next('ACONV');
  }

  async nextAiConversationMessagePublicId(): Promise<string> {
    return this.next('AMSG');
  }

  async nextAiChatAnalyticsPublicId(): Promise<string> {
    return this.next('ACHEV');
  }

  async nextSavedSearchPublicId(): Promise<string> {
    return this.next('SSEARCH');
  }

  async nextSavedPropertyPublicId(): Promise<string> {
    return this.next('SPROP');
  }

  async nextSavedSearchMatchPublicId(): Promise<string> {
    return this.next('SMATCH');
  }

  async nextConstructionUpdatePublicId(): Promise<string> {
    return this.next('CUPD');
  }

  async nextProjectClaimPublicId(): Promise<string> {
    return this.next('PCLAIM');
  }

  private async next(kind: PublicIdKind): Promise<string> {
    const sequence = PUBLIC_ID_SEQUENCES[kind];
    const rows = await this.prisma.$queryRawUnsafe<Array<{ n: bigint | number }>>(
      `SELECT nextval('${sequence}') AS n`,
    );
    const value = rows[0]?.n;
    if (value === undefined) {
      throw new Error(`Failed to allocate public ID from ${sequence}`);
    }
    return formatPublicId(kind, Number(value));
  }
}
