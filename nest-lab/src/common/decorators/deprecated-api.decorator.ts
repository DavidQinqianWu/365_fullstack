import { applyDecorators, Header } from '@nestjs/common';

// Day 19:给已弃用的接口统一贴上三个响应头(Day 11 的组合装饰器套路)。
// - Deprecation(RFC 9745):从什么时候起弃用。值是结构化字段里的日期:@ + Unix 秒数
// - Sunset(RFC 8594):打算在什么时候下线(HTTP-date)。⚠️ 只是通知,不会自动下线
// - Link:rel="deprecation" 指向迁移说明;rel="successor-version" 指向新版本
// 注意:@Header 只作用于成功响应;出错时的 problem+json 响应不会带这些头。
export interface DeprecationInfo {
  deprecatedAt: Date;
  sunsetAt: Date;
  docs: string;
  successor: string;
}

export function DeprecatedApi(info: DeprecationInfo) {
  return applyDecorators(
    Header('Deprecation', `@${Math.floor(info.deprecatedAt.getTime() / 1000)}`),
    Header('Sunset', info.sunsetAt.toUTCString()),
    Header('Link', `<${info.docs}>; rel="deprecation"; type="text/html", <${info.successor}>; rel="successor-version"`),
  );
}
