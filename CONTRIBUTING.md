# Contributing to PostBot CLI

感谢您对 PostBot CLI 的关注！我们欢迎任何形式的贡献，包括但不限于：

- 报告 Bug
- 提交功能建议
- 改进文档
- 提交代码修复或新功能

## 开发流程

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/gitcoffee-os/postbot-cli.git
cd postbot-cli

# 安装依赖
pnpm install

# 进入 CLI 目录
cd apps/postbot-cli

# 开发运行
pnpm dev

# 以 postbot 模式运行
pnpm postbot

# 以 postar 模式运行
pnpm postar
```

### 项目结构

```
apps/postbot-cli/          CLI 应用入口
  ├── bin/                 可执行入口脚本
  ├── src/                 源码
  │   ├── index.ts         CLI 入口（commander 命令注册）
  │   ├── config.ts        配置管理
  │   ├── auth/            认证命令
  │   ├── publish/         发布命令
  │   ├── task/            任务管理命令
  │   ├── workflow/        工作流命令
  │   ├── platform/        平台查询命令
  │   ├── account/         账号查询命令
  │   ├── client/          客户端查询命令
  │   └── status/          状态查询命令
  └── tests/               测试文件
packages/sdk/postbot-sdk/  通用 SDK
```

### 代码规范

- 使用 TypeScript，严格模式
- 遵循现有代码风格
- 不要在源码中添加个人/内部标识信息
- 所有 API 调用通过 `@gitcoffee-os/postbot-sdk` 完成

### 提交 Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 提交代码 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

### 提交信息格式

参考 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具链变更

## 报告 Bug

请通过 [GitHub Issues](https://github.com/gitcoffee-os/postbot-cli/issues) 提交，并包含：

- 运行环境（操作系统、Node.js 版本）
- 复现步骤
- 期望行为与实际行为
- 相关日志或截图

## 许可

贡献的代码将遵循项目的 [Apache-2.0 License](LICENSE)。
