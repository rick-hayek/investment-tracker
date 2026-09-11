# 加密货币投资跟踪 App (Investment Tracker) UI/UX 设计方案与规范

本文档为 **Investment Tracker** 移动端（iOS / Android 跨平台）的设计规范与界面设计图说明。已根据极简原则，升级为 **边栏抽屉导航（Sidebar Drawer）架构**。

---

## 📱 核心界面设计图 (Visual Mockups)

所有高清设计图已保存在本目录下的 `images/` 中，并在本地提供了可交互的原型页面 [`index.html`](file:///Users/rick/src/investment-tracker/design/index.html)。

| 01. 边栏抽屉导航 (New) | 02. 设置与个人中心 (New) | 03. 首页资产看板 | 04. 添加买卖数据 | 05. 投资品详情与走势 |
| :---: | :---: | :---: | :---: | :---: |
| [![边栏抽屉](file:///Users/rick/src/investment-tracker/design/images/04_sidebar_drawer.jpg)](file:///Users/rick/src/investment-tracker/design/images/04_sidebar_drawer.jpg) | [![设置中心](file:///Users/rick/src/investment-tracker/design/images/05_settings_profile.jpg)](file:///Users/rick/src/investment-tracker/design/images/05_settings_profile.jpg) | [![首页看板](file:///Users/rick/src/investment-tracker/design/images/01_home_screen.jpg)](file:///Users/rick/src/investment-tracker/design/images/01_home_screen.jpg) | [![添加买卖](file:///Users/rick/src/investment-tracker/design/images/02_add_transaction.jpg)](file:///Users/rick/src/investment-tracker/design/images/02_add_transaction.jpg) | [![投资品详情](file:///Users/rick/src/investment-tracker/design/images/03_asset_detail.jpg)](file:///Users/rick/src/investment-tracker/design/images/03_asset_detail.jpg) |

> 💡 **在线交互原型体验：** 可以在浏览器中直接双击打开 [`design/index.html`](file:///Users/rick/src/investment-tracker/design/index.html)，支持在 **高保真设计图** 与 **动态交互原型** 之间切换，并可真实体验点击 `☰` 侧边栏滑出抽屉、设置项开关以及买卖计算联动。

---

## 🧭 导航架构升级：边栏抽屉 (Sidebar Drawer)

### 为什么选择边栏设计而非底部 Tab 栏？
1. **产品初期高信噪比**：初期仅包含「Home 资产看板」和「Settings/Profile 设置中心」两大板块。如果使用传统 4~5 个按钮的底部 Tab 栏，会导致大量按钮闲置占位，产生多余的视觉干扰。
2. **释放垂直可视面积**：底部导航栏通常占据 60px~75px 的高度。改用左上角 `☰` 侧边栏后，主屏幕完全被资产总额、走势图及持仓列表所占据，视觉纯粹开阔。
3. **扩展性更自然**：后续版本如增加「美股/A股持仓」、「分类多账套」、「税务导出」等进阶功能，只需在抽屉菜单中纵向增加条目，不会破坏主界面的设计语言。

---

## 🎨 设计哲学与视觉规范 (Design System)

### 1. 核心色彩体系 (Color Palette)

| 语义类型 | 色值 (HEX / RGBA) | 用途说明 |
| :--- | :--- | :--- |
| **主背景 (Background)** | `#090D16` | 页面深空底色，避免刺眼的纯黑 `#000` |
| **卡片背景 (Surface / Glass)** | `rgba(18, 26, 43, 0.75)` | 悬浮卡片、列表容器，搭配 12px 高斯模糊 |
| **抽屉背景 (Drawer Background)** | `linear-gradient(180deg, #0E1626, #090D16)` | 侧边栏渐变，搭配 1px 右侧微光描边 |
| **边框发光 (Card Border)** | `rgba(255, 255, 255, 0.08)` | 极细卡片描边，提供精致界限感 |
| **盈利涨幅 (Positive / P&L Up)** | `#10B981` (Emerald Green) | 盈利率、买入状态、正收益曲线 |
| **亏损跌幅 (Negative / P&L Down)**| `#EF4444` (Coral Red) | 跌幅率、卖出状态、亏损标记 |
| **品牌与交互 (Accent Blue)** | `#3B82F6` / `#2563EB` | 选中的导航项、平台 Tab、主操作按钮等 |
| **主要文本 (Text Primary)** | `#F8FAFC` | 总资产大字、币种名称、成交价格 |
| **次级文本 (Text Muted)** | `#94A3B8` | 标签名称、单位说明、格式提示 |

---

## 📐 页面功能拆解与交互细节

### 1. 边栏抽屉 (Screen 01 - Sidebar Drawer)
- **触发入口**：
  - 点击首页左上角的汉堡按钮 `☰`。
  - 从屏幕左侧边缘向右侧滑手势（Edge Swipe）。
- **组件构成**：
  - **顶部个人名片**：展示用户头像、昵称（如 `Rick H.`）、会员或账户状态（`Crypto Track Pro`）。
  - **核心导航菜单**：
    - 🏠 **资产看板 (Portfolio Home)**：当前高亮激活态，浅蓝微光渐变背景。
    - ⚙️ **设置与个人 (Settings & Profile)**：点击平滑跳转至设置页面。
  - **底部快速偏好设置 (Quick Preferences)**：
    - 基准货币切换（快捷显示当前币种 `USD ($)`）。
    - 生物识别安全锁快捷开关（Face ID / 指纹）。
    - 底部显示客户端版本号（`v1.0.0`）。
  - **右侧遮罩**：半透明黑底 `rgba(0,0,0,0.65)` 搭配高斯模糊，点击遮罩或左滑即可收起抽屉。

---

### 2. 设置与个人中心 (Screen 02 - Settings & Profile)
- **偏好设置 (Preferences)**：
  - **基准法币 (Base Currency)**：支持 `USD ($)`、`CNY (¥)`、`EUR (€)` 等实时汇率换算。
  - **防偷窥隐私模式 (Privacy Mode)**：开启后，首页总资产及持仓市值自动变为 `••••••`，防止公共场合泄露资产。
  - **主题模式 (Theme)**：深空暗黑（Dark Mode）/跟随系统。
- **交易所与数据管理 (Exchanges & Data)**：
  - **已绑定平台 (Connected Exchanges)**：查看 OKX、Binance 等数据源连接状态。
  - **导出交易记录 (Export CSV)**：一键将所有买卖交易记录导出为标准 CSV 电子表格。
  - **本地/云端备份 (Backup & Sync)**：本地 JSON/SQLite 备份与恢复。
- **安全设置 (Security)**：
  - **Face ID / 指纹识别应用锁**：每次重新进入 App 时进行身份验证。

---

### 3. 首页看板 (Screen 03 - Home Portfolio)
- **顶部 Header**：左侧为 `☰` 边栏呼出按钮，中间为 App 名称，右侧为快捷「＋」记账入口。
- **总资产卡片 (Total Portfolio Card)**：
  - 总资产金额大字（`$128,450.80`）。
  - 累计总盈亏与当日涨跌（`+$14,230.50 (+12.4%)`）。
  - 资产曲线 Sparkline 走势图。
  - 快捷操作胶囊按钮：买入记录、卖出记账、统计分析。
- **持仓投资品列表 (Asset List)**：
  - 各币种卡片：代币图标、名称代码、持币量、实时现价、当前总财产值、盈亏金额与百分比。

---

### 4. 添加买卖数据 (Screen 04 - Add Transaction)
- **买入 / 卖出方向切换**。
- **平台智能选择**：`OKX`、`Binance`、`CoinGecko`、`Coinbase`。
- **代码格式智能建议**：
  - Binance: `BTCUSDT`
  - OKX: `BTC-USDT`
  - Coinbase: `BTC-USD`
  - CoinGecko: `bitcoin`
- **单价与数量输入**：支持自动抓取当前市价，实时计算总金额。

---

### 5. 投资品详情 (Screen 05 - Asset Detail)
- **持仓总值与盈亏**。
- **分时价格走势图**：`24H` / `1W` / `1M` / `1Y` / `ALL`。
- **完整交易历史明细流水**：买入/卖出标签、成交日期、成交价格与对应盈亏。

---

## 🛠️ 跨平台技术栈建议

- **React Native (Expo)**：使用官方 `@react-navigation/drawer`（基于 `react-native-reanimated` 与 `react-native-gesture-handler`），能够获得 60fps~120fps 极度丝滑的原生抽屉滑动手势。
- **Flutter**：使用原生 `Scaffold` 的 `drawer` 属性，天然支持原生边缘侧滑与抽屉动效。
