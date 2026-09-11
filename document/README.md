# Investment Tracker - 项目规格与技术文档库

本文档目录包含 Investment Tracker 的产品需求规格说明书（PRD）、系统架构设计（SAD）、工程实施计划（Implementation Plan）及研发实施方案。

## 📚 核心文档索引

- 📋 **[PRD.md](file:///Users/rick/src/investment-tracker/document/PRD.md)**: **产品需求规格说明书 (Product Requirements Document)**
  - 产品背景、核心痛点与阶段定位（加密货币先行，后拓股票）
  - 用户角色画像与典型使用场景
  - 功能需求规格说明（侧边栏抽屉、Home 资产看板、添加买卖、详情走势图、设置中心）
  - 业务规则与财务计算模型（加权持仓成本、未实现与已实现盈亏公式）
  - 非功能性需求（60/120 FPS 体验、Local-First 隐私、离线秒开）
  - 异常场景与边界处理（超额卖出阻断、行情降级、高精度小数处理）

- 🏛️ **[ARCHITECTURE.md](file:///Users/rick/src/investment-tracker/document/ARCHITECTURE.md)**: **系统架构设计说明书 (System Architecture Document)**
  - 核心架构目标（Local-First、隐私优先、抽屉导航架构）
  - 技术选型论证（React Native + Expo SDK 52 + TypeScript）
  - 四层分层架构图与模块协作
  - 数据库实体设计与 SQLite DDL 语句
  - 多平台行情适配器接口与各平台（OKX、Binance、Coinbase、CoinGecko）API 接入规范
  - 工程代码目录规范

- 🚀 **[IMPLEMENTATION_PLAN.md](file:///Users/rick/src/investment-tracker/document/IMPLEMENTATION_PLAN.md)**: **研发工程实施计划 (Implementation Plan)**
  - 6 周 / 6 个 Sprint 里程碑甘特排期
  - WBS 任务分解结构（基建/存储、行情/录入、边栏/看板、详情/走势、设置/安全、联调/发版）
  - 验收交付标准（Definition of Done - DoD）
  - 关键风险与应对预案（API 限流兜底、高精度计算防误差、图表降采样）
  - 生产依赖基线清单（package.json dependencies）

## 🔗 相关联资源

- 🎨 **UI 设计图与交互原型**：查看 [`design/README.md`](file:///Users/rick/src/investment-tracker/design/README.md) 或在浏览器中打开 [`design/index.html`](file:///Users/rick/src/investment-tracker/design/index.html)。
- 💡 **需求简述**：查看根目录下的 [`README.md`](file:///Users/rick/src/investment-tracker/README.md)。
