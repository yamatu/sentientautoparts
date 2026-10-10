# sentientautoparts — 汽配目录 / Next.js / Go

独立实现位于 `modern/`。保留原平台的产品、媒体、AI SEO、IndexNow、文章与管理能力；前台改为汽车空调配件目录。原 PHP 和 `vibocnc` 源目录不修改，旧账户及 API/邮件密钥不迁入。

## 本次汽配数据库

实际源为同级备份：`liang_ygm88_com_2026-01-31_13-28-25_mysql_data_DFzLS.sql.zip`，包含 **1,581 个产品**、66 个旧栏目、16 个旧单页、5 篇文章、6 条图片内容、4 个区块和 7 个横幅。

旧 `spex_db.sql` 只有 7 个酒柜/机械测试产品，现已退出默认导入流程。旧工作数据库 `sentient` 原样保留；切换前快照在 `.runtime/backups/pre-automotive-*.sql`（含账户数据，不要发布）。当前目标为独立数据库 **`sentientautoparts`**，Redis 使用 DB 1。

`data/automotive-20260131.sql` 仅保留 7 张业务表，不包含旧账号、邮件配置和密钥。导入按事务提交，独立 source `yourphp-automotive-20260131` 记录旧 ID、原字段、原 URL 和哈希；重复导入跳过已迁移 ID，保留后台修改。

## 汽配字段与分类

- 唯一 ST-Code 保留为 SKU；重复/缺失 ST-Code 用稳定的 `SAP-{旧ID}` 区分，源代码保留在 model。
- 正文表格中的 OE/零件参考号、适配原文、皮带轮、电压和油品提取成结构字段。
- 支持 vehicle make、fitments（车型、起止年份、发动机、备注）、compressor series、refrigerant、pulley、displacement、oil 和 interchange references。
- 数据未明确提供的字段留空；不会从 OE 相似度推断适配或把车厂当成配件制造商。`0`/单字符占位参考号不视为有效 OE 号。原 HTML/补充规格保留用于核对。
- 分类整理为 **A/C Compressors / Auto Condensers / Evaporator Units / Expansion Valves → 车厂或应用组**。空的酒柜/中文历史产品栏目不进入汽配目录；Sanden、工程机械、Bus 等来源应用组保留。
- 若原文明确车厂与源栏目矛盾（例如 Nissan 栏目下明确写 Hyundai），按原文纠正并记录报告；未知车厂不猜测。
- 年份过滤只使用明确的闭合起止范围；开放年份在详情页提示核对。
- 显式分类优化使用已录入的配件类型/车厂匹配现有分类，不运行工业型号规则，不自动发布或下架产品。
- 普通保存不会生成工业文案。显式 AI SEO 使用汽配提示和结构数据，保持原 SEO 作业队列与审核能力；外部 provider 仍需配置。

## 前台与后台

前台保留原蓝白品牌方向，重做响应式页头、首页产品范围/车型入口、OE/ST 搜索、分层分类、车型/年份过滤、产品规格表与适配表、图库、询盘与 PDF 目录请求。首页主图和文案来自实际 `homeAbout`；企业优势来自源栏目 179。

后台名称统一为 `sentientautoparts`；新增/编辑产品提供汽配字段面板。后台历史作业协议标记及来源兼容逻辑可保留旧内部标识，不作为品牌或默认内容展示。

- `/admin/products`：目录、汽配字段、图片、SEO。
- `/admin/categories`：分类树，可调整栏目名称/父级/启用状态。
- `/admin/ai-seo`、`/admin/ai-assistant`：AI 任务与助手，需要自己的 provider/key。
- `/admin/indexnow`：IndexNow 设置，提交新站真实 canonical。
- `/admin/homepage`：`hero_section` 的标题/副标题/描述/图片/站内 CTA 与启用状态。
- `/admin/site-pages`：导入单页；`about_content` 为源公司介绍区块。
- `/admin/contacts`：询盘与目录请求；邮件通知另配。

## 部署

需要 Docker Engine/Desktop + Compose v2。建议构建时至少 4GB 可用内存。

```sh
cd modern
python scripts/init-env.py  # 已有 .env 时不会覆盖
# 设置 .env 的域名/品牌；管理员密码在 DEFAULT_ADMIN_PASSWORD
# 当前交付目录已经准备好 SQL 与媒体

docker compose up -d --build --wait
```

首次启动顺序：MySQL/Redis → Go 初始化表和管理员 → `init-catalog` 自动汽配导入 → Next.js → Nginx。

访问 `http://localhost:8090`；后台 `http://localhost:8090/admin`。数据库/Redis 不暴露主机端口。

```sh
# 仅预览，不写数据库
docker compose --profile tools run --rm import-legacy /app/import-legacy -file /data/automotive-20260131.sql -profile automotive
# 重复导入；跳过已存在旧 ID
docker compose --profile tools run --rm import-legacy
```

管理员新密码在 `.env` 的 `DEFAULT_ADMIN_PASSWORD`。首次完成后可将 `SEED_DEFAULT_ADMIN=false`；不要提交 `.env` 或数据库快照。

HTTPS 部署时设置 `SITE_URL`、`AUTH_COOKIE_SECURE=true`，配置可信 TLS 反代并重建前台。外部 AI、邮件、IndexNow 提交、域名/TLS、备份恢复和容量需在目标环境验证。

只需部署 `modern/`；Git 默认忽略 SQL、媒体、凭据、构建和报告，因此通过 Git 交付时须单独同步 `data/automotive-20260131.sql` 与 `frontend/public/legacy/`。数据库/上传使用命名卷。不要对工作项目运行 `docker compose down -v`。

## 重新准备数据 / 回滚

```sh
python scripts/prepare-assets.py /path/to/php-root
python scripts/prepare-automotive-data.py /path/to/backup.sql.zip
cd frontend
node scripts/build-legacy-css.cjs
```

新版备份再次出现相同旧 ID 时，导入器保持跳过策略；需另行制定有审核的增量更新，不能用重复导入覆盖线上修改。

本机原 `sentient` 库和快照仍在。回滚时恢复先前代码/镜像，并把 `MYSQL_DATABASE=sentient`、Redis DB 改回 0，禁用汽配初始化服务后启动。不要把汽配数据导入旧库，也不要在没有备份时删除卷。

## 验证

本轮 Go 测试、TypeScript、Next.js 生产构建均通过；汽配接口 **47/47**、三种屏幕浏览器 **70/70**、空库部署 **8/8**，合计 **125/125**。完整说明见 [AUTOMOTIVE-VERIFICATION.md](AUTOMOTIVE-VERIFICATION.md)。

```sh
cd backend
go test ./...
cd ../frontend
npx tsc --noEmit
npm run build
cd ..
python scripts/verify-automotive.py
python scripts/verify-firstboot.py
cd frontend
node scripts/verify-automotive-browser.cjs
```

测试仅针对本地隔离迁移环境：API 脚本临时编辑并恢复一个汽配产品，检验字段/分类/SEO/重复导入；浏览器脚本检验桌面、平板、手机、搜索、图库和后台字段。结果在 `reports/automotive-*.json`，截图为 `reports/automotive-*.png`。历史 `verify-migration.py`/`smoke-test.py` 等 7 产品脚本属于旧基线，不用于新版汽配验收。

源库的 1,581 个商品均是压缩机，其他三个配件类型分类暂无商品。41 个车厂用于筛选，无法确认的型号/车厂保持源文本；没有补造冷凝器等产品。

之前生产 npm 依赖审计为 0 个已知漏洞；全量构建依赖仍有 5 项上游 ESLint/braces 告警，不代表完整安全审计。本轮以实际构建、导入、API 与浏览器报告为准。
