import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public() // Day 11:全局保安上岗后,首页要显式标成免检
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
