#!/bin/zsh
set -e
cd "${0:A:h}"

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js。请安装 Node.js 22 或更新版本：https://nodejs.org/"
  read "?按回车关闭窗口"
  exit 1
fi
if [[ ! -x node_modules/.bin/vite ]]; then
  npm install --no-audit --no-fund
fi

GAME_PORT=5173
if curl --silent --fail "http://127.0.0.1:${GAME_PORT}/" | rg -q '霓虹江湖'; then
  open "http://127.0.0.1:${GAME_PORT}/"
  exit 0
fi
while lsof -iTCP:${GAME_PORT} -sTCP:LISTEN >/dev/null 2>&1; do
  GAME_PORT=$((GAME_PORT + 1))
done

npm run dev -- --port "${GAME_PORT}" --strictPort &
GAME_PID=$!
trap 'kill ${GAME_PID} 2>/dev/null || true' EXIT INT TERM
for GAME_TRY in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:${GAME_PORT}/" >/dev/null; then
    open "http://127.0.0.1:${GAME_PORT}/"
    break
  fi
  sleep 0.2
done
echo "玄刃已启动。关闭本终端窗口即可停止服务器。"
wait "${GAME_PID}"
