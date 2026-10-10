# 历史迁移基线验收记录（7 产品旧库）

此记录仅对应汽配库切换前的旧基线。当前汽配版请查看 [AUTOMOTIVE-VERIFICATION.md](AUTOMOTIVE-VERIFICATION.md)，不要把以下测试数字用于新版本。

验证环境：Windows Docker Desktop / Compose，独立 `sentient` 项目，HTTP 端口 `8090`。源码与部署均在 `modern/`；不连接旧站或 vibocnc 的数据库。

## 已通过

| 检查 | 结果 |
| --- | --- |
| Go `go test ./...` | 全部通过，含 SQL 解析、可逆 SKU URL、IndexNow 旧主题路径、自定义文章路径约定 |
| 内容 SQL 过滤单测 | 3/3，只保留 7 张业务表；不拷贝账户/配置表 |
| TypeScript `tsc --noEmit` | 通过 |
| Next.js 生产构建（含 ESLint/类型检查） | 通过；Docker standalone 镜像已运行 |
| Compose | MySQL、Redis、backend、frontend 健康；Nginx 正常代理 |
| 空库首次部署 | 8/8，独立临时项目自动初始化、导入 7 个产品/16 个产品栏目/7 个单页、前台 SSR 成功；测试项目与专属卷已删除，工作部署未受影响 |
| `smoke-test.py` | 76/76，产品 SSR、全部 sitemap URL、404、后台鉴权、询盘入库及校验、普通保存自动优化开关 |
| `verify-migration.py` | 10/10，后台 SEO/正文/分类/图片保存，重复导入不覆盖且不增记录 |
| `verify-routing.py` | 39/39，特殊字符 SKU、实时 SEO HTML、首页 URL、自定义文章别名跨具体路由跳转 |
| `verify-homepage.py` | 6/6，主区块标题/副标题/正文/图片/CTA、停用后横幅显示 |
| 浏览器公共页面 | 1440×1000 和 390×844：首页、列表、产品、联系、下载、分销、新闻 HTTP 200，无横向页面溢出、无浏览器异常；横幅切换、手机菜单/搜索、产品 canonical/JSON-LD 通过 |
| 浏览器整轮回归 | 56/56，含产品搜索、询盘真实提交、请求目录后获取真实 PDF、后台登录/产品数据/真实开关显示、AI SEO 统计接口与页面 |
| npm 生产依赖审计 | `npm audit --omit=dev`：0 个已知漏洞 |

以上接口/迁移/路由/首页/浏览器/空库首次部署共 **195/195** 项检查通过。完整机器检查结果、桌面/手机截图在 `reports/`。回归脚本在 `finally` 中恢复临时修改的产品/首页并删除测试文章；询盘/目录下载测试保留明确标注的 `Migration Smoke Test` / `Migration Browser Test` 记录，可在后台删除。

## 导入结果

7 个产品、16 个产品栏目、6 篇文章、7 个单页、2 条图片内容、5 张横幅、2 个区块。SQL 还有其他页面/文章栏目，没有错误地转成产品栏目。

- 原 SQL 头部为 2025-06-24；当前模板的 SENTIENT 汽配栏目 179 和 `homeAbout` 不在此 SQL 中。当前页面展示的是实际导入的旧酒柜/机械/测试内容，**不是当前线上汽配目录的完整复原**。
- 6 个产品原 URL 为 `//.html`：不猜测；有效旧路径映射到新页。
- 审计到 14 个媒体引用：3 个原文件存在；11 个缺失原文件中有 4 个匹配缩略图可用，其余 7 个需补齐。
- 暂无已验证的 SENTIENT 品牌 logo，默认文字标识；没有擅自套用原目录的 HomeSun 图片。

## 上线前仍需处理

1. 提供与当前模板匹配的新数据库和媒体，人工校对产品、公司资料、首页及品牌标识。更新数据须制定增量策略；现有导入器按旧 ID 跳过，不覆盖后台修改。
2. 配置自己的 AI provider/key、邮件和 IndexNow；功能页面保留不代表外部服务已连通。原平台 AI 行业提示偏工业自动化，需按真实业务审核。
3. 域名/TLS、`SITE_URL`、安全 cookie、备份/恢复与生产容量检查；`SEED_DEFAULT_ADMIN` 首次创建后应设为 false。
4. 全量 npm 审计仍有 5 项 ESLint 构建工具链告警（上游 braces 3.0.3）；生产依赖审计为零不等于完整安全认证。未运行 Go 依赖/镜像专项安全扫描。
5. 未执行真实 AI 调用、真实邮件、IndexNow 对外提交、支付或与可运行旧站的像素级对照。

访问：`http://localhost:8090`；后台：`http://localhost:8090/admin`。
管理员用户名/新密码在 `.env` 的 `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`；本记录不包含秘密。
