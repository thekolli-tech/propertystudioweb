import { Module } from '@nestjs/common';

import { IntelligenceModule } from '../intelligence/intelligence.module';
import { BroadcastService } from './broadcast.service';
import { CollectionsService } from './collections.service';
import { CreatorsService } from './creators.service';
import { EditorialService } from './editorial.service';
import { ExternalMediaService } from './external-media.service';
import { MediaAccessService } from './media-access.service';
import { MediaAnalyticsService } from './media-analytics.service';
import { MediaCmsService } from './media-cms.service';
import { MediaController } from './media.controller';

@Module({
  imports: [IntelligenceModule],
  controllers: [MediaController],
  providers: [
    MediaAccessService,
    MediaCmsService,
    EditorialService,
    CollectionsService,
    MediaAnalyticsService,
    ExternalMediaService,
    BroadcastService,
    CreatorsService,
  ],
  exports: [MediaCmsService, EditorialService, CollectionsService, BroadcastService],
})
export class MediaModule {}
