import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller.js';
import { BadKitchenService, KitchenService } from './kitchen.service.js';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, BadKitchenService],
})
export class KitchenModule {}
