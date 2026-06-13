#!/bin/bash
# 球探笔记 — 一键更新并发布到 GitHub Pages
# 用法: bash ~/football-site/update.sh

set -e
cd ~/football-site

echo "📊 生成数据..."
python3 scripts/generate_data.py

echo "📦 提交变更..."
git add data/data.json
git commit -m "更新 $(date +%Y-%m-%d) 预测数据" || echo "（无变更）"

echo "🚀 推送到 GitHub..."
git push origin main

echo ""
echo "✅ 完成！1-2分钟后访问 https://LuoFujie0510.github.io/football-predictions/"
