**🌐 語言:**
[English](README.md) | [簡体中文](README.zhs.md) | [繁體中文](README.zht.md) | [Nederlands](README.nl.md) | [Deutsch](README.de.md)

# EffMind：AI 輔助的思維導圖工具

EffMind 是一個開源思維導圖編輯器，可運行於 Web 與 Visual Studio Code。約 70% 的程式碼及本說明文件由 **GitHub Copilot、ChatGPT、Google Gemini** 等 AI 工具輔助生成。

> ⚠️ 說明：程式碼由不同 AI 工具生成，風格略有差異。目前功能已實現，但程式碼結構尚未完全整理。

## 技術棧

* 基於 **Lit.js** 構建組件（[https://lit.dev/](https://lit.dev/)）
* 原生 Web Components
* 使用 **SVG** 繪製節點與連線
* SPA 架構；VSCode 擴展透過 Webview 復用前端
* 內建多語言系統（JSON 詞典 + 運行時切換）
* **支持深色 / 淺色主題，自動匹配系統設置**

## 功能

### 思維導圖編輯

* 創建、編輯、刪除、移動節點
* 操作子節點與兄弟節點
* 畫布平移與縮放
* 自動布局
* 撤銷 / 重做
* 小地圖
* 節點搜索
* 節點與畫布右鍵菜單

### 導入 / 導出

* 導入：`.mind`（JSON）
* 導出：`.mind`、`.png`、可折疊交互的 `.svg`

### 多語言支持

* 文案以 JSON 維護
* 運行時切換語言
* Web 與 VSCode 共用語言配置
* 可擴展自定義語言包

### 主題

* 支持深色與淺色主題
* 默認跟隨系統 `prefers-color-scheme`

## 平台支持

### PWA

* 可安裝至桌面或移動設備
* 支持離線使用
* 已在 iOS 16 / iPadOS 16 測試
* Android 待測試

### VSCode 擴展

* 自定義編輯器打開 `.mind` 文件
* Webview 加載完整 UI
* 支持文件關聯