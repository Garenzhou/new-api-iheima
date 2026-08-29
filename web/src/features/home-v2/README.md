# home-v2 沙箱

`/home-v2` 是首页重设计的**实验沙箱**，结构参考 `E:\Downloads\www.openstarry.com.zip`，颜色调色板仍跟随项目主色（indigo / violet）。

## 范围

- 路由：`web/src/routes/home-v2/index.tsx` 暴露 `/home-v2`
- 页面：`web/src/features/home-v2/index.tsx` 的 `HomeV2` 组件
- 复用：`PublicLayout`（已使用 2026-08 重写后的 `PublicHeader`），样式与生产首页不重复

## 当前包含的最小化内容

- 顶部公告条：`PromoBanner`（`components/promo-banner.tsx`）
- 一个「设计进行中」提示区 + 跳回 `/` 的按钮
- 项目自带的 `Footer`

## 行为约定

- 沙箱页面是**纯本地**：不对接任何额外的后端 endpoint
- 不修改 `PublicLayout` / `PublicHeader` 的 props 语义；如需在沙箱里展示新的视觉，先在 `PublicHeader` 加 props，再在沙箱传入
- 沙箱里**禁止**改 `common/`、`relay/`、`setting/`、`model/`、`router/` 等全局模块；如发现需要，先在「首页 v2 设计」任务里讨论拆分

## 与生产首页的关系

- 生产首页 `/` 保持不变
- 沙箱完成后，需要把变更**逐块**移植回 `/` 的 feature；不要把整段 `home-v2` 复制到 `features/home/` 之下当一次性切换
- 完成移植后删除 `web/src/routes/home-v2/`、`web/src/features/home-v2/` 两个目录
