import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { ComponentsService } from './components.service';
import { MarketTemplatesService } from './templates.service';
import { InteractionsService } from './interactions.service';

@Module({
  controllers: [MarketController],
  providers: [ComponentsService, MarketTemplatesService, InteractionsService],
  exports: [ComponentsService, MarketTemplatesService, InteractionsService],
})
export class MarketModule {}
