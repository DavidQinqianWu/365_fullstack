import { Module } from '@nestjs/common';
import { DecoratorDemoController } from './decorator-demo.controller.js';

@Module({ controllers: [DecoratorDemoController] })
export class DecoratorDemoModule {}
