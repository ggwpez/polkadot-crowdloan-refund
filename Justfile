default:
  pnpm install

dev:
  pnpm dev --port 4000

build:
  @pnpm build 2>&1 | grep -E "(error|Error|✓|✘|built in)" || true
