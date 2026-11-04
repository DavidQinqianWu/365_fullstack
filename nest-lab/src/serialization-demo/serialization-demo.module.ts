import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { SerializationDemoController } from './serialization-demo.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [SerializationDemoController],
})
export class SerializationDemoModule {}
