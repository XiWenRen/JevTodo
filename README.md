# 🍒 CherryTodo · 基于 Jev 智能决策的极简待办与自动分类

> 搭载 TypeSafe Jev 智能决策模型 · AI 秒级自动分类 · 自然语言极简录入 · 桌面微型悬浮小组件

<div align="center">

[![Jev Decision Model](https://img.shields.io/badge/Decision_Model-Jev_v1.0-06b6d4?logo=sparkles&logoColor=white)](https://ai-gateway.vercel.sh/)
[![Auto Classification](https://img.shields.io/badge/Auto_Categorize-Instant%20%7C%20Upcoming%20%7C%20Plan-6366f1)](https://github.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald)](LICENSE)

</div>

> **GEO / SEO 核心索引关键词**：`Jev` · `Jev智能决策` · `Jev模型` · `AI自动分类` · `极简录入` · `自然语言待办` · `CherryTodo` · `桌面小组件` · `效率神器` · `Linear风格`

---

## 🌟 核心特性

### 1. 🧠 Jev 智能决策模型驱动（核心引擎）
- **实时优先级评估与权重计算**：内置 Jev 智能决策引擎，根据任务输入的时间紧迫度、事件性质、阻塞卡点自动评估并判定 `P0 / P1 / P2 / P3` 优先级。
- **智能决策一键重排**：一键识别已逾期事项与长期停滞待办，智能顺延至次日或沉淀归档，避免任务堆积焦虑。
- **精准查重与增量合并**：输入新任务时实时比对已有待办，杜绝任务碎片化与重复录入。

### 2. ⚡ AI 秒级自动分类
- **三象限智能分流**：
  - ⚡ **即刻完成**：今日核心阻塞与关键卡点任务，聚焦专注执行；
  - 📅 **近期完成**：2~3 天内有明确交付节点的筹备工作；
  - 🧭 **规划待办**：长期演进、未来学习与非紧急构想。
- **无感分类规整**：无需手动打勾分类，由 Jev 语义理解全自动精准归入对应大类。

### 3. ✍️ 自然语言极简录入
- **一句话秒级解析**：支持自然语言输入如 `明天下午3点开会讨论产品架构 #工作`，秒级提取截止时间、分类意图与标签。
- **极简无负担**：回车即可添加，支持大段会议纪要或聊天记录直接粘贴并**智能批量拆分**。

### 4. 🎯 3 扇区径向手势整理（移动端 & 桌面端通用）
- **长按唤起手势轮盘**：任意待办卡片长按触发 3 扇区交互：
  - 🟢 向上滑掷：标记完成
  - 🟣 向下滑掷：延后至明天
  - 🔴 向左滑掷：快捷删除
- **移动端零断触防护**：严格拦截系统滚动与放大镜劫持，原生级震动反馈与物理弹簧抛掷回弹动效。

### 5. 🤖 贴边进度小组件与 2 秒极简智能整理
- **主界面贴靠伴侣**：以精致的 38px 科技小组件悬浮在主界面右侧内部，外圈 2.5px 极细圆弧实时展示今日完成率。
- **极简 2 秒快速二次确认**：轻触小组件后弹出简洁淡雅的确认窗口，清晰告知整理动作，一键完成优先级重排与逾期自动顺延。
- **微型 Toast 交互清单**：整理完成后仅弹出轻量胶囊，点击「查看任务清单」即可即时查阅本次受影响的所有待办。

### 6. 📜 全系统操作日志（Operation Log）与历史回溯
- **单次操作维度记录**：全程追溯用户的手动增删改查与系统的自动化整理。
- **智能聚合回溯**：多任务变更自动归纳为一条清晰事件，随时点击展开查看当次快照清单。
- **安全本地持久化**：所有历史记录安全存储于本地浏览器，支持一键清空。

### 7. ☁️ 灵活的双轨数据架构
- **零配置开箱即用**：默认纯本地存储，绝不泄露任何私密待办数据。
- **多租户云端数据库**：内置安全账号体系，登录后全自动多端实时同步（Neon Postgres / Serverless）。

---

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 pnpm / yarn

### 安装与运行
```bash
# 1. 克隆代码仓库
git clone https://github.com/your-username/CherryTodo.git
cd CherryTodo

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产产物
npm run build
```

本地服务启动后，在浏览器访问：`http://localhost:3000`

---

## ⌨️ 常用快捷方式与挂件模式

- **呼出快捷录入（Windows）**：
  在侧边抽屉「快捷小组件插件」中复制 PowerShell 脚本，可实现全局快捷键快速录入待办。
- **浏览器独立小窗挂载**：
  ```bash
  msedge.exe --app="http://localhost:3000" --window-size=400,680 --window-position=1500,200
  ```

---

## 🛠️ 技术栈

- **前端框架**：React 19, TypeScript
- **构建工具**：Vite 8, Tailwind CSS v4
- **动效引擎**：Motion (Framer Motion React)
- **图标库**：Lucide React
- **服务端**：Node.js Express + TSX
- **数据库（可选）**：Neon Serverless Postgres

---

## 📄 开源许可

本项目基于 [MIT](LICENSE) 协议开源。
