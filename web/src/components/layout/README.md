# Layout 组件

公开页（`/`, `/about`, `/pricing`, `/rankings`, `/docs`, `/home-v2` 等）的整体布局由 `PublicLayout` 装配，业务后台（`/dashboard` 及其下所有页面）由 `AuthenticatedLayout` 装配。本目录主要承载公开页的顶栏、侧栏与共用导航片段。

## PublicHeader

`components/public-header.tsx` 是公开页唯一的顶栏组件，2026-08 重写为 openstarry 视觉：固定顶栏、磨砂玻璃背景、滚动时显示细描边、Sparkles 渐变 logo + "AToken Router" 字标。

### Props（兼容原有调用方）

```ts
interface PublicHeaderProps {
  navLinks?: TopNavLink[]              // 兼容字段；动态链接生效时此值被忽略
  mobileLinks?: TopNavLink[]           // 兼容字段
  navContent?: React.ReactNode         // 自定义中央内容；设置后覆盖默认链接
  showThemeSwitch?: boolean            // 默认 true
  showLanguageSwitcher?: boolean       // 默认 true
  logo?: React.ReactNode               // 自定义 logo；为空时渲染默认品牌块
  siteName?: string                    // 兼容字段
  homeUrl?: string                     // logo 点击跳转；默认 '/'
  leftContent?: React.ReactNode        // 在 logo 之后、链接之前的自定义内容
  rightContent?: React.ReactNode       // 在右侧按钮组之前的自定义内容
  showAuthButtons?: boolean            // 是否渲染 Sign in / Signed in；默认 true
  showNotifications?: boolean          // 是否渲染通知 popover；默认 true
  className?: string                   // 追加到 <nav>
}
```

`PublicHeader` 接受上述任何子集——历史 23 处调用方无需改动即可享受新视觉。

### 链接来源：后端 HeaderNavModules 优先

公开页的导航链接 **完全由后端 `HeaderNavModules` 决定**。前端在 `useTopNavLinks()` 中按以下规则生成：

- 后端 `HeaderNavModules` 解析后为 `home/console/pricing/rankings/docs/about` 等字段
- 字段值为 `false` 表示隐藏对应链接
- `pricing` / `rankings` 接受 `{ enabled, requireAuth }` 对象，单独控制可见性与登录要求

运维通过「系统设置 → 站点 → 顶部导航」修改 `HeaderNavModules` 即可调整公开页导航内容。**前端默认值与 `useTopNavLinks()` 的行为不变**，新顶栏不会绕过运维配置。

### FALLBACK_LINKS 的角色

`PublicHeader` 内部保留一份静态兜底链接（`Home / Models / Integrate / Rankings / About`），仅在 **后端响应完全没有解析出任何动态链接** 时渲染，避免顶栏空白。它是故障兜底，不参与正常展示。

### 国际化

顶栏文本通过 `useTranslation()` 渲染，所有可见字符串已加进 `web/src/i18n/locales/en.json` 与 `zh.json`。新增链接或按钮请同步两个 locale。

### 邻近组件

- `components/public-navigation.tsx`：历史「公开页链接」配置，保留兼容
- `components/nav-language-switcher.tsx`：从 `features/home-v2/components/` 上移到此处，供新顶栏复用
- `components/system-brand.tsx` / `header-logo.tsx`：dashboard 侧的品牌块，**与 `PublicHeader` 不共用**

### 注意事项

- 不要把 `PublicHeader` 直接复用到 dashboard——dashboard 使用 `AppHeader`，二者样式/数据流均不同
- 修改 `PublicHeader` 的默认 props 不会影响已显式传值的调用方，但会改变所有使用默认值的公开页；公开页通常应该传 props 而不是依赖默认值
