import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service.js';

// @Global():任何模块都能直接注入 RequestContextService,不用每个模块 imports
@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
