/** @type {import('next').NextConfig} */
export default {
  output: "export",      // 生成纯静态 HTML,不需要 Node 服务器
  trailingSlash: true,   // /zh/day/1/ 这样的干净路径,nginx 直接映射到文件夹
};
