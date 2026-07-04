<p align="center">
  <img src="./icons/icon-128.png" width="88" height="88" alt="PaperDock icon">
</p>

# PaperDock

PaperDock 是一个本地优先的论文阅读浏览器扩展。打开论文或 PDF 后，可以用自己的模型做速览、深读、追问、保存笔记，并把论文保存到 Zotero。

支持 Chrome、Edge 和大多数 Chromium 浏览器。

## 支持

- arXiv：摘要页、PDF 页
- ACM Digital Library：论文页、PDF、EPDF、Full HTML
- IEEE Xplore：论文页、`stamp.jsp`
- 普通网页 PDF、本地 PDF、非 `.pdf` 结尾的 PDF 链接
- ChatGPT 网页版、DeepSeek 网页版
- 本地 Zotero Desktop

本地 PDF 需要在扩展详情页打开“允许访问文件网址”。

## 功能

- 论文速览、深读、学习卡
- 围绕当前论文连续对话
- Markdown、表格、代码块、公式渲染
- 手动保存论文复盘
- 读取 PDF 全文，必要时回退到页面正文
- 支持 OpenAI-compatible、DeepSeek、MiniMax、Ollama、自定义网关
- 支持 ChatGPT Web、DeepSeek Web
- 读取 Zotero 分类，保存论文条目和 PDF 附件
- 本地数据备份和恢复

## 截图

![论文阅读与深读](./docs/images/paper-chat-panel.png)

![模型配置](./docs/images/model-settings.png)

## 安装

推荐下载稳定版：

[Releases](https://github.com/jiahaozhang6/PaperDock/releases)

1. 下载最新 `PaperDock-vX.X.X.zip`
2. 解压
3. 打开 `chrome://extensions` 或 `edge://extensions`
4. 打开开发者模式
5. 点击“加载已解压的扩展程序”
6. 选择解压后的文件夹

## 使用

1. 打开 PaperDock 设置页
2. 新建模型
3. 填写 Base URL、API Key、模型名
4. 测试并保存
5. 打开论文页面，点击右下角 `AI`

新安装不会内置模型。只有你自己保存的模型会出现在聊天框里。

## 模型

常用地址：

| 类型 | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com` |
| MiniMax | `https://api.minimaxi.com/v1` |
| Ollama | `http://localhost:11434/v1` |
| ChatGPT Web | `webchat://chatgpt` |
| DeepSeek Web | `webchat://deepseek` |

WebChat 模式需要先登录对应网页。

## Zotero

先打开 Zotero Desktop，再在论文面板点击 `Zotero`。

PaperDock 可以读取本地分类，手动选择分类，或让模型推荐分类。保存时会创建 Zotero 条目，并尽量附上 PDF。

## 升级

不要卸载扩展。卸载会删除浏览器里的本地数据。

Git 安装：

```bash
git pull
```

ZIP 安装：

1. 下载最新版 ZIP
2. 用新文件覆盖原文件夹
3. 在扩展管理页刷新 PaperDock
4. 刷新已经打开的论文页面

## 数据

PaperDock 不提供云服务。模型配置、API Key、聊天记录、复盘库和缓存保存在浏览器本地。

请求模型时，论文内容和问题会发送给你选择的模型服务。使用 ChatGPT Web 或 DeepSeek Web 时，内容会发送到对应网页会话。

## 开发

没有构建步骤，改完源码后重新加载扩展即可。

```bash
node tests/zotero-suggestion-parser.test.js
node tests/webchat-thinking-contract.test.js
node tests/pdf-iframe-panel-contract.test.js
node --check content.js
node --check background.js
```

## Topics

`arxiv` `acm-digital-library` `ieee-xplore` `pdf-reader` `chrome-extension` `edge-extension` `llm` `deepseek` `minimax` `chatgpt` `zotero`

## License

MIT. See [LICENSE](./LICENSE).

---

## English

PaperDock is a local-first Chromium extension for reading research papers with your own LLMs.

It supports arXiv, ACM, IEEE, regular PDFs, local PDFs, ChatGPT Web, DeepSeek Web, and local Zotero.

Main features:

- summarize and chat with papers
- render Markdown, tables, code, and math
- use API models or WebChat models
- save notes locally
- save papers to Zotero collections

Install from [Releases](https://github.com/jiahaozhang6/PaperDock/releases), unzip, then load the folder from `chrome://extensions` or `edge://extensions`.

Do not uninstall before upgrading, or browser-local data may be removed.
