import { Module } from '@nestjs/common';

import { ReviewsAccessService } from './reviews-access.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { TrustScoreService } from './trust-score.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsAccessService, ReviewsService, TrustScoreService],
  exports: [ReviewsService, TrustScoreService],
})
export class ReviewsModule {}
