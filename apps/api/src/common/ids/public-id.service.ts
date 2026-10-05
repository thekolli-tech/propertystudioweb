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
