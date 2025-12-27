<div align="center">
  <h1 style="margin: 0; font-size: 2.5rem; font-weight: bold;">一生足迹数据导入器</h1>
  <p>
    <img src="https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react&logoColor=white&style=flat" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.2.2-3178C6?logo=typescript&logoColor=white&style=flat" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?logo=vite&logoColor=white&style=flat" alt="Vite" />
    <img src="https://img.shields.io/badge/Ant%20Design-6.1.2-0170FE?logo=ant-design&logoColor=white&style=flat" alt="Ant Design" />
    <img src="https://img.shields.io/github/stars/Kearney3/steplife-importer-webui?style=social" alt="GitHub stars" />
  </p>
  <p>
    <em>
      一个现代化的 Web 应用，用于将第三方轨迹数据（GPX、KML、OVJSN）转换为「一生足迹」应用所需的 CSV 格式。<br />
      所有数据处理均在浏览器本地完成，保护您的隐私安全。
    </em>
  </p>
  <p>
    <a href="https://kearney3.github.io/steplife-importer-webui/" target="_blank" style="font-size: 20px; font-weight: bold; text-decoration: none;">
      👉 在线体验地址（Github Pages）
    </a>
  </p>
  <p>
    <a href="https://steplife-importer.vercel.app/" target="_blank" style="font-size: 18px; font-weight: bold; text-decoration: none; margin-right: 16px;">
      🚀 Vercel 访问地址
    </a>
    <a href="https://steplife-importer.netlify.app/" target="_blank" style="font-size: 18px; font-weight: bold; text-decoration: none;">
      🌐 Netlify 访问地址
    </a>
  </p>
</div>

---

<div align="center" style="margin-bottom: 12px;">
  <p style="font-size: 16px; margin-bottom: 8px;">
    支持一键部署，点击下方按钮即可将本项目快速部署到 Vercel 或 Netlify，立即体验或搭建属于你自己的轨迹数据转换工具：
  </p>
  <div style="margin-bottom: 8px;">
    <span style="font-size: 15px; font-weight: bold; margin-right: 10px;">Vercel 部署：</span>
    <a href="https://vercel.com/new/clone?repository-url=https://github.com/Kearney3/steplife-importer-webui" target="_blank" style="display: inline-block; margin-right: 20px;">
      <img src="https://vercel.com/button" alt="使用 Vercel 部署" height="32" />
    </a>
  </div>
  <div>
    <span style="font-size: 15px; font-weight: bold; margin-right: 10px;">Netlify 部署：</span>
    <a href="https://app.netlify.com/start/deploy?repository=https://github.com/Kearney3/steplife-importer-webui" target="_blank" style="display: inline-block;">
      <img src="https://www.netlify.com/img/deploy/button.svg" alt="使用 Netlify 部署" height="32" />
    </a>
  </div>
</div>

---

## ✨ 功能特性

### 📁 多格式支持
- ✅ **GPX 格式**：支持标准 GPX 轨迹文件
- ✅ **KML 格式**：支持 Google Earth KML 文件
- ✅ **OVJSN 格式**：支持奥维互动地图导出的 OVJSN 格式
- ✅ **批量处理**：支持同时上传和处理多个文件，提高工作效率

### ⏰ 灵活的时间配置
- ✅ **开始时间设置**：自定义轨迹起始时间（必填）
- ✅ **结束时间设置**：可选设置结束时间，系统自动均匀分配
- ✅ **时间间隔控制**：支持自定义轨迹点之间的时间间隔
- ✅ **时区支持**：支持选择任意 IANA 时区，不选择时自动使用系统时区
- ✅ **时间反转**：支持负数时间间隔，可反转轨迹时间顺序

### 🎯 轨迹优化功能
- ✅ **智能插点**：自动在距离过大的轨迹点之间插入补点，使轨迹更平滑
- ✅ **海拔控制**：支持自定义默认海拔高度
- ✅ **速度计算**：支持自动计算或手动指定速度（m/s）
- ✅ **距离优化**：可配置插点距离阈值，默认 100 米

### 🎨 用户体验
- ✅ **现代化 UI**：基于 Ant Design 6.x 的精美界面设计
- ✅ **深色模式**：支持白天/夜间模式切换，主题设置自动保存
- ✅ **响应式设计**：完美适配桌面和移动设备
- ✅ **实时反馈**：处理进度、状态日志实时显示
- ✅ **批量下载**：支持单个或批量下载处理结果
- ✅ **完全本地处理**：所有数据在浏览器中处理，无需上传到服务器，保护隐私安全

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0（推荐 >= 24.0.0）
- npm >= 7.0.0

### 安装和运行

```bash
# 克隆项目
git clone https://github.com/Kearney3/steplife-importer-webui.git
cd steplife-importer-webui

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 构建生产版本

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

构建产物将输出到 `dist` 目录，可直接部署到静态文件服务器。

## 📖 使用指南

### 操作流程

应用采用直观的四步操作流程：

1. **📁 选择文件** - 上传需要转换的轨迹文件（支持拖拽）
2. **⚙️ 配置参数** - 设置时间、海拔、速度等处理参数
3. **▶️ 开始处理** - 点击处理按钮，系统自动转换文件
4. **💾 下载结果** - 查看处理结果并下载生成的 CSV 文件

### 文件上传

- **支持格式**：`.gpx`、`.kml`、`.ovjsn`
- **上传方式**：支持点击选择或拖拽上传
- **批量上传**：可同时上传多个文件进行处理
- **文件验证**：自动验证文件格式，无效文件会被拒绝

### 参数配置详解

#### 时间设置

**开始时间**（必填）
- 格式：`YYYY-MM-DD HH:mm:ss`
- 说明：轨迹的起始时间，所有轨迹点的时间将基于此时间计算

**结束时间**（可选）
- 格式：`YYYY-MM-DD HH:mm:ss`
- 说明：轨迹的结束时间，如果设置，系统会在开始和结束时间之间均匀分配时间戳

**时间间隔**（可选）
- 单位：秒
- 说明：轨迹点之间的时间间隔
- 特殊用法：设置为负数可以反转轨迹的时间顺序

**时区设置**（可选）
- 说明：选择时区用于时间转换，支持所有 IANA 时区
- 默认：不选择时使用系统时区
- 显示：每个时区选项会显示时区名称和 UTC 偏移量

**时间分配优先级**：
1. 如果设置了结束时间 → 在开始和结束时间之间均匀分配
2. 如果设置了时间间隔 → 按指定间隔分配时间
3. 如果都没有设置 → 所有轨迹点使用开始时间

#### 海拔与速度

**默认海拔**
- 单位：米
- 说明：为所有轨迹点设置统一的海拔高度
- 默认值：0

**速度模式**
- **自动计算**：系统根据轨迹点之间的距离自动计算速度
- **手动指定**：手动设置所有轨迹点的速度值（单位：m/s）
  - 默认值：1.5 m/s（约 5.4 km/h，正常步行速度）

#### 轨迹优化

**轨迹插点功能**
- 功能：自动在距离过大的相邻轨迹点之间插入补点
- 作用：使轨迹更平滑、连续
- 配置：设置插点距离阈值（单位：米）
  - 当相邻两点距离超过阈值时，自动插入补点
  - 默认阈值：100 米

### 处理与下载

点击"开始处理"后，系统将：

1. **解析文件**：识别文件格式并解析轨迹点数据
2. **应用配置**：根据您的参数设置处理轨迹
3. **生成 CSV**：转换为「一生足迹」标准 CSV 格式
4. **显示结果**：展示处理统计信息（原始点数、最终点数、插入点数）

**输出文件**：
- 文件名格式：`原文件名_steplife.csv`
- 文件格式：标准 CSV，包含完整的轨迹数据

**下载方式**：
- 单个下载：点击文件列表中的下载按钮
- 批量下载：点击"下载全部"按钮，一次性下载所有处理结果

### 主题切换

应用支持白天和夜间两种主题模式：

- **切换方式**：点击界面右上角的 🌙/☀️ 按钮
- **自动保存**：主题设置会自动保存到浏览器本地存储
- **视觉特性**：
  - 渐变背景和玻璃态效果
  - 流畅的动画过渡
  - 护眼的深色配色方案

## 🛠️ 技术栈

### 前端框架
- **React 19.2.1** - 现代化的 UI 框架
- **TypeScript 5.2.2** - 类型安全的开发体验
- **Vite 5.0.8** - 快速的构建工具

### UI 组件库
- **Ant Design 6.1.2** - 企业级 UI 组件库
- **Day.js 1.11.19** - 轻量级日期处理库

### 数据处理
- **原生 DOM API** - XML/JSON 解析，无需额外依赖
- **本地存储** - 数据持久化

### 部署
- **GitHub Actions** - 自动化部署工作流
- **GitHub Pages** - 静态网站托管
- **Vercel** - 边缘网络部署
- **Netlify** - 静态网站托管

## 📁 项目结构

```
steplife-importer-webui/
├── src/
│   ├── components/          # React 组件
│   │   ├── FileUpload.tsx   # 文件上传组件
│   │   ├── ConfigPanel.tsx  # 参数配置组件
│   │   ├── StatusPanel.tsx  # 状态显示组件
│   │   └── FileProcessList.tsx # 文件处理列表组件
│   ├── parsers/             # 文件解析器
│   │   ├── gpx.ts           # GPX 格式解析
│   │   ├── kml.ts           # KML 格式解析
│   │   └── ovjsn.ts         # OVJSN 格式解析
│   ├── utils/               # 工具函数
│   │   ├── fileParser.ts    # 文件解析入口
│   │   ├── processor.ts     # 轨迹处理核心逻辑
│   │   ├── pointcalc.ts     # 轨迹插点计算
│   │   └── csv.ts           # CSV 生成和下载
│   ├── types.ts             # TypeScript 类型定义
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   └── App.css                # 全局样式
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 部署配置
├── index.html               # HTML 模板
├── package.json             # 项目配置和依赖
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 构建配置
└── README.md                # 项目文档
```

## 🌐 浏览器兼容性

- ✅ Chrome/Edge (最新版本)
- ✅ Firefox (最新版本)
- ✅ Safari (最新版本)

**注意**：需要支持以下现代 Web API：
- ES6+ 语法
- `Intl.DateTimeFormat` API（用于时区处理）
- `FileReader` API（用于文件读取）

## 🚀 部署指南

本项目支持多种部署方式，选择最适合您的方案：

### 🌟 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kearney3/steplife-importer-webui)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Kearney3/steplife-importer-webui)

### 📦 快速部署

#### Vercel 部署（推荐）
```bash
npm install -g vercel
vercel --prod
```

#### Netlify 部署
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

#### GitHub Pages 部署
项目已配置 GitHub Actions 自动部署，推送到 `main` 分支即可自动部署。

### ⚙️ 自动部署配置

项目配置了 GitHub Actions 自动部署工作流，支持部署到多个平台。

#### 支持的部署平台

- **GitHub Pages** - 自动部署到 GitHub Pages（免费）
- **Vercel** - 自动部署到 Vercel（需要配置 secrets）
- **Netlify** - 自动部署到 Netlify（需要配置 secrets）

#### 触发条件

- 推送到 `main` 分支时自动触发部署
- 创建 Pull Request 时会构建但不部署（仅验证）

#### GitHub Pages（自动启用）

GitHub Pages 部署会自动启用，无需额外配置。首次部署需要：

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 中选择 **GitHub Actions**
3. 推送到 `main` 分支后会自动部署

#### Vercel 部署（可选）

如需启用 Vercel 自动部署，需要在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets：
   - `VERCEL_TOKEN`: Vercel 访问令牌
     - 获取方式：Vercel Dashboard → Settings → Tokens → Create Token
   - `VERCEL_ORG_ID`: Vercel 组织 ID
     - 获取方式：Vercel Dashboard → Settings → General → Team ID
   - `VERCEL_PROJECT_ID`: Vercel 项目 ID
     - 获取方式：项目 Settings → General → Project ID

#### Netlify 部署（可选）

如需启用 Netlify 自动部署，需要在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets：
   - `NETLIFY_AUTH_TOKEN`: Netlify 认证令牌
     - 获取方式：Netlify Dashboard → User settings → Applications → New access token
   - `NETLIFY_SITE_ID`: Netlify 站点 ID
     - 获取方式：站点 Settings → General → Site details → Site ID

#### 查看部署状态

- 在 GitHub 仓库的 **Actions** 标签页查看部署状态
- 部署成功后，可以在对应平台的 Dashboard 查看部署详情
- Pull Request 中会自动评论部署预览链接（如果配置了 Vercel 或 Netlify）

## ⚠️ 注意事项

1. **隐私安全**：所有数据处理都在浏览器本地完成，不会上传到任何服务器
2. **文件大小**：大文件处理可能需要一些时间，请耐心等待
3. **数据备份**：建议在处理前先备份原始文件
4. **时区选择**：如果不确定时区，建议不选择，使用系统默认时区
5. **时间设置**：开始时间为必填项，请确保格式正确

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范
```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 组件采用函数式组件 + Hooks 模式
- 使用 Vite 进行快速构建
- 生产构建会自动进行代码压缩和优化

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Ant Design](https://ant.design/) - UI 组件库
- [Day.js](https://day.js.org/) - 日期处理库

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/Kearney3/steplife-importer-webui/issues)
- 在 [GitHub](https://github.com/Kearney3/steplife-importer-webui) 上参与讨论
- 项目主页: [https://github.com/Kearney3/steplife-importer-webui](https://github.com/Kearney3/steplife-importer-webui)

---

<div align="center">

⭐ 如果这个项目对您有帮助，请给我们一个星标！

**Made with ❤️ for 一生足迹用户**

</div>
