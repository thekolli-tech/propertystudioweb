import { Module } from '@nestjs/common';

import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { OrganizationsController, PublicProfilesController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController, PublicProfilesController],
  providers: [OrganizationsService, ObjectStorageService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
