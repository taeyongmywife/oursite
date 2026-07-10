# BubbleCrisp v2 Checklist

## P0

- [x] git merge conflict 标记完全清除（`src/pages/index.astro`）
- [x] 所有 `example.com` 元信息替换为真实域名（`astro.config.mjs` / `BaseHead.astro`）
- [x] favicon 为品牌 logo 简化版（`public/favicon.svg`）
- [x] `/` 桌面端完整渲染无构建错误（`npm run build` 通过）
- [x] 4 张矿石图通过 `astro:assets` 优化成功（`npm run build` optimized images 输出含 02/03/04；01 在 fragments 详情强制使用）
- [x] 删除 RSS alternate link（`BaseHead.astro`）

## P1

- [x] 路由存在：`/`、`/fragments`、`/fragments/[slug]`、`/experiments`、`/market`、`/identity`、`/404`
- [x] 组件存在：`Nav` / `Footer` / `SpecimenLabel` / `RockCard` / `ChoicePanel` / `SectionHeader` / `MineralFigure`
- [x] 全局样式：`tokens.css` / `fonts.css` / `base.css`
- [x] OG 图：`public/og-image.png`
- [x] Noise 纹理：`public/textures/noise.png`

## P2

- [ ] docs/screenshots/（桌面与移动端截图补齐）
