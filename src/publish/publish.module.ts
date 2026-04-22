import { Module } from '@nestjs/common';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { HtmlGenerator } from './html-generator';

@Module({
  controllers: [PublishController],
  providers: [PublishService, HtmlGenerator],
  exports: [PublishService],
})
export class PublishModule {}
