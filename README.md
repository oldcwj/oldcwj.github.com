# Coobbi 官网（GitHub Pages）

这是一个可直接部署到 GitHub Pages 的静态网站模板，用于展示你的 Google Play 应用。

## 已实现功能

- 中英文切换（默认英文，支持一键切换中文）
- 应用列表卡片展示（链接直达 Google Play）
- 数据自动同步（由 GitHub Actions 定时从 Google Play 拉取）

## 文件说明

- `index.html`：页面结构与中英文文案锚点
- `styles.css`：页面样式
- `script.js`：语言切换 + 应用列表渲染
- `apps.json`：网站展示的数据源（包含中英文字段）
- `scripts/fetch-play-apps.mjs`：从 Google Play 开发者主页抓取应用列表并生成 `apps.json`
- `.github/workflows/sync-google-play.yml`：每日自动同步 Google Play 应用数据
- `CNAME`：自定义域名（`coobbi.com`）

## 一键同步 Google Play 应用（自动）

项目已配置 GitHub Actions：

- 每天自动运行一次同步任务（UTC 02:30）
- 也可在 GitHub `Actions` 页面手动点击 **Run workflow** 立即更新

同步逻辑：
1. 读取开发者 ID：`4826052335238518015`
2. 分别拉取英文与中文应用列表
3. 合并后写入 `apps.json`
4. 若有变化，自动提交到仓库

## 本地手动同步

```bash
npm install
npm run fetch:play
```

执行后会自动更新 `apps.json`。

## GitHub Pages + 域名绑定步骤

1. 把本项目推送到 GitHub 仓库。
2. 在仓库 `Settings -> Pages`：
   - `Source` 选择 `Deploy from a branch`
   - Branch 选择 `main`（或你当前分支）和 `/root`
3. 在域名提供商处配置 DNS：
   - `A` 记录指向 GitHub Pages IP（四条）：
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - `CNAME` 记录：`www` 指向 `你的用户名.github.io`
4. 在 GitHub Pages 设置里填写 Custom domain：`coobbi.com`。
5. 勾选“Enforce HTTPS”。
6. 等待 DNS 生效后，访问 `coobbi.com` 即可打开 GitHub 上的网站。
