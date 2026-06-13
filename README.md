# 球探笔记 — 竞彩足球预测与复盘网站

基于 GitHub Pages 的静态网站，展示每日竞彩足球预测和结构化复盘内容。

## 更新流程

每次预测/复盘完成后，运行：

```bash
cd ~/football-site
python3 scripts/generate_data.py   # 从预测文件生成 data.json
git add data/
git commit -m "更新 $(date +%Y-%m-%d) 预测数据"
git push
```

GitHub Pages 会自动部署，约 1-2 分钟后生效。

## 文件结构

```
football-site/
├── index.html          # 首页
├── css/style.css       # 样式
├── js/app.js           # 前端逻辑
├── data/data.json      # 预测数据（自动生成）
├── scripts/
│   └── generate_data.py  # 数据生成脚本
└── README.md
```

## 数据源

- 竞彩官网（体彩API）
- Flashscore（积分榜/FORM）
- OddsPortal（赔率）
- API-Football（事件增强）
