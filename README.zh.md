# Investment Tracker (投资跟踪器)

<p align="center">
  <img src="./assets/icon.png" width="96" height="96" alt="Investment Tracker Logo" style="border-radius: 20px;" />
</p>

<p align="center">
  <b>本地离线优先（Local-First）、严守隐私、支持多交易所资金隔离的聚合资管与投资收益跟踪应用</b>
</p>

<p align="center">
  简体中文 | <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.76.9-61DAFB?logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-52.0.37-000020?logo=expo&logoColor=white" alt="Expo SDK 52" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Build-Android_APK-3DDC84?logo=android&logoColor=white" alt="Android Build" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📖 项目简介 (Overview)

**Investment Tracker** 是一款专注于加密货币（及拓展资产类别）的现代化、极简、高信噪比的个人投资资产管理系统。

不同于传统云端记账软件需要上传敏感财务隐私，也不同于轻量应用脱离实际的“凭空记账”，Investment Tracker 践行 **“交易所聚合（Exchange Aggregator）”** 与 **“本地沙盒化资金隔离（Local Capital Silo）”** 理念：
- **数据 100% 掌握在自己手中**：纯本地 SQLite 存储，不设中心化服务器，保障资产隐私无泄露。
- **贴合真实交易规则**：实行**先充值后买入（Deposit-First Trading）**，各交易所（Binance、OKX、Coinbase 等）资金严格物理隔离，买入自动核销本金，卖出回款自动沉淀。
- **高精度金融级盈亏计算**：严谨的加权平均成本核算体系，实时区分未实现浮动盈亏（Unrealized PnL）与已实现盈亏（Realized PnL）。

---

## ✨ 核心特性 (Key Features)

### 🏦 1. 多交易所资金沙盒与本金隔离
- **资金池独立管理**：每个交易平台（Binance、OKX、Coinbase 等）作为独立的核算单元。
- **先充值后买入**：任何平台的买入操作，必须以该平台已充值且充足的可用稳定币（USDT / USDC）为前提；本金不足时自动拦截并支持快捷补仓。
- **卖出回款沉淀**：平仓或减仓产生的变现资金自动回笼至对应平台的稳定币本金池。

### 📊 2. 专业级投资盈亏引擎 (PnL Engine)
- **大盘总资产看板**：总财产 = 各平台持仓代币现值 + 闲置稳定币本金储备。
- **双维度收益视图**：
  - **累计盈亏模式**：以真实净充值本金为分母推导累计投资回报率（ROI）。
  - **24H 当日波动模式**：基于严谨的期初基准推算当日美元净变动与百分比，杜绝数值失真。
- **逐笔交易穿透**：根据历史订单自动计算单笔交易发生时的持仓成本、已实现盈亏与收益率。

### 📈 3. 交互式分时图表与深度流水
- **多周期行情趋势**：支持 `24H` / `1W` / `1M` / `1Y` / `ALL` 跨周期价格走势查看。
- **长按十字光标准星**：在图表上长按滑动可实时追踪特定时刻的历史价格与时间标签。
- **全生命周期战绩卡**：汇总展示标的胜率、持仓中/已清仓状态、累计投入与卖出回款。

### 🌓 4. 深度深浅双主题设计 (Dark & Light Theme)
- 精心设计的金融级高质感双配色方案（Sleek Dark 暗色 / Pure Light 浅色）。
- 告别生硬的纯黑或惨白，采用深蓝夜幕与温润白卡片设计体系，全组件阴影、边框、状态栏与输入框自适应切换。

### 🔒 5. 极致隐私与安全机制
- **一键防偷窥模式**：首屏与明细支持全局星号（`••••`）隐匿资产金额与持仓比例。
- **切后台自动模糊遮蔽**：App 切入手机多任务后台时自动启用隐私幕布，防止侧览泄露。
- **生物识别支持**：可集成 Face ID / 指纹识别安全锁。

### 🌍 6. 国际化与数据自治
- **多语言与基准法币**：支持简体中文、English，支持切换基准法币（USD / CNY / EUR）并基于实时汇率联动折算。
- **标准 CSV 导出与备份**：一键导出交易明细与出入金流水 CSV，支持系统原生分享与归档。

---

## 🏗️ 架构与技术栈 (Tech Stack & Architecture)

```
investment-tracker/
├── App.tsx                     # 应用根入口，数据状态分发与模态层联动
├── bump-version.js             # 自动化版本号与 Android versionCode 递增脚本
├── package.json                # 项目依赖与运行脚本
├── app.json                    # Expo 配置
├── android/                    # Android 原生工程 (Prebuild)
├── document/
│   └── PRD.md                  # 详尽产品需求与业务规则说明书 (v1.3.0)
└── src/
    ├── components/             # UI 组件库
    │   ├── charts/             # 交互式走势图 (SVG / Crosshair)
    │   ├── common/             # 通用图标、日历选择器、基础模态
    │   ├── detail/             # 持仓资产详情、本金详情、交易流水列表
    │   ├── drawer/             # 侧边栏抽屉导航
    │   ├── portfolio/          # 首页大盘卡片、持仓列表、本金列表
    │   ├── settings/           # 系统设置、平台管理、数据导出界面
    │   └── transactions/       # 买入/卖出交易录入、本金出入金模态
    ├── database/               # 本地 SQLite 数据持久层 (Repository Pattern)
    ├── domain/                 # 核心领域逻辑、高精度 PnLEngine 引擎、类型定义
    ├── services/               # 交易所行情适配器 (Binance, OKX, etc.)、汇率服务
    ├── theme/                  # 语义化主题调色板 (Dark & Light Theme Tokens)
    └── i18n/                   # 中英双语国际化词典与参数插值工具
```

### 主要依赖
- **核心框架**：React Native `0.76.9` + Expo SDK `52` (开启 New Architecture)
- **存储方案**：`expo-sqlite`（本地轻量级数据库）
- **高精度计算**：`bignumber.js`（解决浮点数舍入与精度损失）
- **图表渲染**：`react-native-svg`
- **文件与分享**：`expo-file-system`, `expo-sharing`, `expo-document-picker`
- **代码规范与测试**：TypeScript 5.3 + Jest 自动化单元测试（覆盖引擎、仓库与组件校验）

---

## 🚀 快速开始 (Quick Start)

### 1. 环境准备
- **Node.js**：`>= 18` (推荐 Node.js 20 或 22)
- **包管理器**：`npm` 或 `yarn`
- **移动端开发环境**：
  - Android：JDK 17 + Android Studio (Android SDK 34)
  - iOS：macOS + Xcode + CocoaPods (可选)

### 2. 安装依赖
```bash
git clone https://github.com/rick-hayek/investment-tracker.git
cd investment-tracker
npm install
```

### 3. 本地启动开发
```bash
# 启动 Expo 开发服务器
npm start

# 直接在 Android 模拟器/真机上调试运行
npm run android

# 运行 iOS 模拟器 (仅 macOS)
npm run ios

# 运行 Web 预览
npm run web
```

---

## 🧪 自动化测试与校验 (Testing & Quality)

项目配有覆盖计算引擎、交易校验、本金沙盒与数据导出的完整测试用例套件：

```bash
# 运行全部 Jest 单元测试
npm test

# 观察模式运行测试
npm run test:watch

# 输出单元测试覆盖率报告
npm run test:coverage

# 执行 TypeScript 静态类型检查
npm run typecheck
```

---

## 📦 版本更新与发布打包 (Release & Tooling)

### 1. 自动版本号管理 (`bump-version.js`)
项目内置专属版本更新脚本，自动同步更新 `package.json`、`app.json`、`package-lock.json` 以及 Android `build.gradle`：

```bash
# 方式 A：末位自动递增 (如: 1.0.0 -> 1.0.1，versionCode 始终加 1)
npm run bump-version
# 或
node bump-version.js

# 方式 B：指定目标版本号 (如: 1.1.6，versionCode 自动递增 1)
npm run bump-version -- 1.1.6
# 或
node bump-version.js 1.1.6
```

### 2. Android 本地编译打包
```bash
npm run android:release
```
生成产物路径：`android/app/build/outputs/apk/release/app-release.apk`。

### 3. CI/CD 自动化流水线
仓库集成了 GitHub Actions 自动化构建脚本（`.github/workflows/build-apk.yml`）：
- 提交带 `v*` 的 Git Tag（例如 `git tag v1.0.1 && git push origin v1.0.1`）时，自动触发云端打包并发布 GitHub Release 下载。
- 支持通过 GitHub Web 界面手动触发（Workflow Dispatch）生成 Debug 或 Release 版本的 APK 产物。

---

## 📄 开源许可证 (License)

本项目基于 [MIT License](LICENSE) 协议发布，可自由学习、二开与个人使用。欢迎提交 Issue 与 Pull Request！
