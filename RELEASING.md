# 发布流程（RELEASING）

npm 包 `@gitcoffee-os/postbot-cli` 的版本管理与发布完全由 GitHub Actions 自动化：
[release-please](https://github.com/googleapis/release-please) 根据 Conventional
Commits 自动开 Release PR，合并后自动发布到 npm。

## 一次性引导（bootstrap）

`@gitcoffee-os/postbot-cli@1.1.0` 已作为 baseline 记录在
`.release-please-manifest.json`。首次发布需要人工推送一次 tag：

1. 在 GitHub 仓库 **Settings → Secrets and variables → Actions → Repository
   secrets** 配置 `NPM_TOKEN`（npm granular access token，需启用 bypass 2FA，
   并具备 `@gitcoffee-os` org 的包读写权限）。

2. 推送发布自动化文件到 `main`，然后打 baseline tag：

   ```bash
   git add .github/workflows release-please-config.json .release-please-manifest.json RELEASING.md CONTRIBUTING.md
   git commit -m "ci: automate releases with release-please"
   git tag v1.1.0
   git push origin main --follow-tags
   ```

   Then run **Actions → Publish → Run workflow** once. It publishes
   `@gitcoffee-os/postbot-cli@1.1.0` and creates the GitHub Release. Because the
   `v1.1.0` tag already exists at `main`, release-please treats 1.1.0 as the
   baseline and will not propose a spurious bump.

3. **Optional, recommended after the first publish** — configure
   **Trusted Publishing** on npmjs.com (package → Settings → Trusted Publisher →
   GitHub Actions, repository `gitcoffee-os/postbot-cli`, workflow
   `release.yml`), then delete the `NPM_TOKEN` secret. Publishing then uses
   OIDC only; provenance is already enabled.

## Day-to-day releases

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Commit | Release |
| --- | --- |
| `fix: …` | patch (1.1.0 → 1.1.1) |
| `feat: …` | minor (1.1.0 → 1.2.0) |
| `feat!: …` or `BREAKING CHANGE:` footer | major (1.1.0 → 2.0.0) |
| `chore:` / `ci:` / `docs:` / `test:` | no release |

Then:

1. Push commits to `main`.
2. Review the release PR opened by release-please (version, `CHANGELOG.md`,
   `package.json`, lockfile if present).
3. Merge it. The tag, GitHub Release, and npm publish follow automatically.
4. Verify with `npm view @gitcoffee-os/postbot-cli version`.

Never edit the version or `CHANGELOG.md` by hand; release-please owns both.

## Manual / break-glass publish

Run **Actions → Publish → Run workflow**. It publishes the version currently in
`package.json` if it is not already on npm, and creates the matching tag and
GitHub Release when missing. Re-running is safe: an already published version is
skipped.

## Notes

- This package is built with **pnpm**; `release.yml` installs pnpm 9 and runs
  `pnpm install --frozen-lockfile` against the committed `pnpm-lock.yaml`
  (regenerate with `pnpm install --ignore-workspace` when dependencies change).
- The smoke check installs the packed tarball into a temp dir and asserts
  `postbot --version` matches `package.json`.
- `release.yml` is a reusable workflow (`workflow_call`) plus `workflow_dispatch`.
  It is not triggered by GitHub Release events: release-please creates releases
  with `GITHUB_TOKEN`, and GitHub does not start workflows from those events.
- The release PR is opened with `GITHUB_TOKEN`, so CI is **not** triggered on it.
  If branch protection requires status checks, either allow the release PR to
  bypass them or add a fine-grained PAT as `RELEASE_PLEASE_TOKEN` and pass
  `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}` to the release-please step.
- Provenance requires a public repository and `id-token: write`, both already
  configured.
- If the npm account enforces 2FA, the CI token must have 2FA bypass enabled, or
  publishing fails with `EOTP`.
- First publish of a brand-new package may be held by npm review and shown as
  `0.0.0-stage` ("Temporary Holding Version") until the review passes; the
  real version then replaces it automatically.
