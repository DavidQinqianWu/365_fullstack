import { type INestApplication, VersioningType } from '@nestjs/common';

// 「只能在 app 实例上做的事」的唯一装配点。
// Day 10:全局店规曾经都在这里 → Day 13:能放进 AppModule 的都搬走了(APP_* + configure())
// → Day 19:URI 版本化只能在 app 实例上开(Nest 没有对应的 APP_* token),所以放回这里。
//
// ⚠️ 所有创建 app 的地方都必须调用它:main.ts、每个 e2e 测试、每个观察脚本。
//    忘了调用会怎样?/v1/tasks、/v2/tasks 全部 404(Day 19 观察脚本第 5 幕实测)。
//    所以 main.ts 和所有观察脚本统一用 src/app.factory.ts 的 createApp();e2e 测试在 createNestApplication() 之后调用它。
export function configureApp(app: INestApplication): INestApplication {
  app.enableVersioning({ type: VersioningType.URI }); // /v1/...、/v2/...;不带版本的路由保持原样
  return app;
}
