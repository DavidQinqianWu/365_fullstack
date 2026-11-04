import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';

// Day 20:标准菜单册 —— 从后厨真实配方(Controller / DTO 上的装饰器)自动印出来的 OpenAPI 文档。
// 只收录对外的业务模块;各种 *-demo 实验模块、首页 Hello World 不进菜单册。
export const DOCS_PATH = 'docs'; // Swagger UI:/docs
export const DOCS_JSON_PATH = 'docs-json'; // OpenAPI JSON:/docs-json

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('nest-lab 任务管理 API')
    .setDescription(
      [
        '365 计划 Week 3 的任务管理 REST API。',
        '',
        '- 设计约定:`docs/api-design.md`(语言无关)',
        '- 错误格式:RFC 9457 `application/problem+json`,错误类型目录见 `docs/problems.md`',
        '- 版本:`/v2/...` 为当前版本,不带版本号的路径等同 v2;`/v1/...` 已弃用,计划 2027-05-01 下线',
      ].join('\n'),
    )
    .setVersion('2.0.0')
    // 写接口要带钥匙(Day 11 的演示鉴权,Week 10 换成 JWT)
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-demo-key', description: '演示用的钥匙,开发环境默认 let-me-in' }, 'demo-key')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [TasksModule, UsersModule],
    // operationId 用「控制器名_方法名[_版本]」,前端代码生成器会用它当函数名。
    // 同一个方法登记在多个版本下时(v2 + VERSION_NEUTRAL),Nest 传进来的 methodKey 会带 [0] 这样的序号,去掉它;
    // version 本身已经是 'v2' 这种带 v 的字符串
    operationIdFactory: (controllerKey, methodKey, version) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey.replace(/\[\d+\]$/, '')}${version ? `_${version}` : ''}`,
  });
  // 不带版本号的 /tasks… 是 v2 的别名(VERSION_NEUTRAL,Day 19)。菜单册里只登记 /v2/… 这一份,避免同一个操作出现两次
  for (const path of Object.keys(document.paths)) {
    if (!/^\/v\d+\//.test(path) && document.paths[`/v2${path}`]) delete document.paths[path];
  }
  return document;
}

export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup(DOCS_PATH, app, document, { jsonDocumentUrl: DOCS_JSON_PATH });
}
