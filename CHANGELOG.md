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

- **每日免费充值（Daily Free Topup）**：新增可配置的每日自动补额度功能。
  管理员可在「系统设置 → 通用 → 每日免费充值」中开启并设置目标额度、触发阈值、
  批量大小、每日执行时间（默认 00:00 服务端本地时间）。启用后，调度器每天在
  设定时刻扫描所有非 root/admin 的普通用户，对余额低于阈值的用户充值到目标额度。
  每日每用户通过 `free_topup_logs` 的 `idx_user_free_topup_date` 唯一索引保证幂等，
  并发任务不会重复发放。提供 `GET /api/option/free_topup/status` 查看上次执行
  统计（扫描人数 / 充值人数 / 累计额度 / 耗时 / 错误信息），以及
  `POST /api/option/free_topup/trigger` 立即手动触发一次。
- **未登录用户顶部促销栏（Promo Bar）**：在公开页面的固定 header 下方新增一条
  可关闭的促销横幅。仅未登录访客可见，关闭后 3 天内（`promo-bar:dismissed-at`
  localStorage 时间戳，跨前端缓存清理保留）不再显示。管理员可在
  「系统设置 → 站点 → 促销栏」中开启 / 关闭并自定义文案，默认开启且默认文案
  为「注册即可解锁每日 200 次的免费请求」。状态通过 `/api/status` 上的
  `promo_bar_enabled` / `promo_bar_text` 字段下发。
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
