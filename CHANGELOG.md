# Changelog

本项目记录 AToken Router（new-api fork）的重要变更。格式基于
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

All notable changes to AToken Router (a new-api fork) are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- **品牌名从 AToken Relay 更改为 AToken Router**：全站统一更新品牌名，参考
  Open Router 的命名。涉及后端系统名（`SystemName`、OpenRouter 上报标题、
  Waffo 充值商品名）、前端页面标题/meta、默认系统名、邮箱发件人占位符、
  渠道提示文案，以及全部 9 种语言的 i18n 文案。

### Added

- **CC Switch 导入支持更多应用**：令牌列表的「填入 CC Switch」弹窗现在支持
  Claude、Codex、Gemini、Grok Build、OpenCode、OpenClaw、Hermes 共 7 个应用。
  新增应用的 app 标识与 endpoint 后缀均对齐 CC Switch 上游解析逻辑
  （`AppType::from_str`），OpenAI 兼容类应用（Codex / Grok Build / OpenCode /
  OpenClaw / Hermes）的 endpoint 自动追加 `/v1`，Claude / Gemini 使用裸 base URL。
- **CC Switch 默认名称改为 atoken 前缀**：各应用默认名称统一为
  `atoken-<App>`（例如 `atoken-OpenCode`），替换原先的 `My <App>`。
- **CC Switch URL 构建逻辑抽离并补测试**：将 `APP_CONFIGS` 与
  `buildCCSwitchURL` 抽取到 `web/src/features/keys/lib/cc-switch.ts`，
  并新增 `cc-switch-url.test.ts` 锁定 `ccswitch://v1/import` 深链契约
  （app / endpoint 后缀 / apiKey 编码 / 空模型字段省略 / app 标识符合法性）。
