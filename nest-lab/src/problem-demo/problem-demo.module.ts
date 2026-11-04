import { Module } from '@nestjs/common';
import { ProblemDemoController } from './problem-demo.controller.js';

@Module({ controllers: [ProblemDemoController] })
export class ProblemDemoModule {}
