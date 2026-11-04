import { type ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';

// 就是 Nest 自带的 ParseIntPipe,只多打一行日志,好让你在观察脚本里看见「② -3 Pipe」这一站。
// 真实项目里直接写 @Param('id', ParseIntPipe) 就行。
@Injectable()
export class TracedParseIntPipe extends ParseIntPipe {
  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<number> {
    try {
      const n = (await super.transform(value, metadata)) as number;
      console.log(`  ②-3 Pipe 核单:'${String(value)}' → ${n}`);
      return n;
    } catch (err) {
      console.log(`  ②-3 Pipe 核单:'${String(value)}' 不是整数 → 抛 BadRequestException`);
      throw err;
    }
  }
}
