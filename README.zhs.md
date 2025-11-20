**🌐 Languages:**
[English](README.md) | [简体中文](README.zhs.md) | [繁體中文](README.zht.md) | [Nederlands](README.nl.md) | [Deutsch](README.de.md)

# EffMind：AI 辅助的思维导图工具

EffMind 是一个开源思维导图编辑器，可运行在 Web 与 Visual Studio Code 环境中。约 70% 的代码及本说明文档由 **GitHub Copilot、ChatGPT、Google Gemini** 等 AI 工具辅助生成。

> ⚠️ 说明：代码由不同 AI 工具生成，因此风格略有差异。目前功能已实现，但代码结构尚未进行统一整理优化。

## 技术栈

* 基于 **Lit.js** 构建组件（[https://lit.dev/](https://lit.dev/)）
* 原生 Web Components
* 使用 **SVG** 渲染节点和连线
* SPA 架构；VSCode 扩展通过 Webview 复用同一套前端
* 内置多语言系统（JSON 词典 + 运行时切换）
* **支持深色 / 浅色主题，自动匹配系统设置**

## 功能

### 思维导图编辑

* 创建、编辑、删除、移动节点
* 操作子节点与兄弟节点
* 画布平移与缩放
* 自动布局
* 撤销 / 重做
* 小地图
* 节点搜索
* 节点与画布右键菜单

### 导入 / 导出

* 导入：`.mind`（JSON）
* 导出：`.mind`、`.png`、可折叠交互的 `.svg`

### 多语言支持

* 文案以 JSON 维护
* 运行时切换语言
* Web 与 VSCode 端共用语言配置
* 可扩展自定义语言包

### 主题

* 支持深色与浅色主题
* 默认跟随系统 `prefers-color-scheme`

## 平台支持

### PWA

* 可安装至桌面或移动设备
* 支持离线使用
* 已在 iOS 16 / iPadOS 16 测试
* Android 待测试

### VSCode 扩展

* 自定义编辑器打开 `.mind` 文件
* Webview 加载完整 UI
* 支持文件关联