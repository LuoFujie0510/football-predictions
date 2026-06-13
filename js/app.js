// 球探笔记 — 前端逻辑

const DATA_URL = 'data/data.json';
let appData = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const resp = await fetch(DATA_URL);
    appData = await resp.json();
    renderHome();
  } catch (e) {
    document.getElementById('date-grid').innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>暂无数据。请先运行 scripts/generate_data.py 生成数据文件。</p>
      </div>`;
  }
});

// --- Home ---
function renderHome() {
  document.getElementById('home-view').style.display = 'block';
  document.getElementById('detail-view').style.display = 'none';

  // Stats
  const totalPred = appData.filter(d => d.predictions.C || d.predictions.D).length;
  const totalRev = appData.filter(d => d.reviews.C || d.reviews.D).length;
  document.getElementById('stats-bar').innerHTML = `
    <span>📋 预测 <b class="count">${totalPred}</b> 天</span>
    <span>📊 复盘 <b class="count">${totalRev}</b> 天</span>
    <span>📅 总计 <b class="count">${appData.length}</b> 条记录</span>
  `;

  // Date cards
  const grid = document.getElementById('date-grid');
  grid.innerHTML = appData.map(d => {
    const hasPred = d.predictions.C || d.predictions.D;
    const hasRev = d.reviews.C || d.reviews.D;
    const hasBoth = hasPred && hasRev;
    const predCount = d.predictions.C ? d.predictions.C.match_count : (d.predictions.D ? d.predictions.D.match_count : 0);

    let badges = '';
    if (d.predictions.C && d.predictions.D) badges += '<span class="badge badge-both">C+D</span>';
    else if (d.predictions.C) badges += '<span class="badge badge-c">C版</span>';
    else if (d.predictions.D) badges += '<span class="badge badge-d">D版</span>';

    return `
      <div class="date-card" onclick="showDetail('${d.date}')">
        <div class="date">${d.date} <span class="day">${d.day || ''}</span></div>
        <div class="meta">
          ${hasPred ? `<span>⚽ ${predCount}场预测 ${badges}</span>` : ''}
          ${hasRev ? '<span>📊 有复盘</span>' : ''}
          ${!hasPred && !hasRev ? '<span>📭 仅复盘</span>' : ''}
        </div>
      </div>`;
  }).join('');
}

function showHome() {
  renderHome();
  window.scrollTo(0, 0);
}

// --- Detail ---
function showDetail(date) {
  const entry = appData.find(d => d.date === date);
  if (!entry) return;

  document.getElementById('home-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'block';
  window.scrollTo(0, 0);

  const pc = entry.predictions.C;
  const pd = entry.predictions.D;
  const rc = entry.reviews.C;
  const rd = entry.reviews.D;

  let html = `
    <div class="detail-header">
      <h2>${entry.date} ${entry.day || ''}</h2>
      <div class="date-meta">
        ${pc ? `预测 ${pc.match_count}场 · ` : ''}
        ${rc ? '有复盘' : '暂无复盘'}
      </div>
    </div>`;

  // Tabs
  const tabs = [];
  if (pc) tabs.push({ id: 'pred-c', label: '预测 C版', data: pc });
  if (pd) tabs.push({ id: 'pred-d', label: '预测 D版', data: pd });
  if (rc) tabs.push({ id: 'rev-c', label: '复盘 C版', data: rc });
  if (rd) tabs.push({ id: 'rev-d', label: '复盘 D版', data: rd });

  if (tabs.length === 0) {
    html += '<div class="empty-state"><div class="icon">📭</div><p>该日期暂无数据</p></div>';
    document.getElementById('detail-content').innerHTML = html;
    return;
  }

  html += '<div class="tabs">';
  tabs.forEach((t, i) => {
    html += `<button class="tab ${i === 0 ? 'active' : ''}" onclick="switchTab('${t.id}')">${t.label}</button>`;
  });
  html += '</div>';

  // Tab content containers
  tabs.forEach((t, i) => {
    const isPred = t.id.startsWith('pred');
    html += `<div class="tab-content" id="tab-${t.id}" style="display:${i === 0 ? 'block' : 'none'}">`;
    
    if (isPred && t.data.matches) {
      html += renderPredictions(t.data.matches);
    } else if (!isPred) {
      html += renderReview(t.data);
    }
    
    html += '</div>';
  });

  document.getElementById('detail-content').innerHTML = html;
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  
  const btn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (btn) btn.classList.add('active');
  
  const content = document.getElementById(`tab-${tabId}`);
  if (content) content.style.display = 'block';
}

// --- Render Predictions ---
function renderPredictions(matches) {
  if (!matches || matches.length === 0) return '<div class="empty-state"><p>暂无预测数据</p></div>';

  return matches.map(m => {
    const dir = m.direction || '';
    let dirClass = 'dir-dual';
    if (dir.includes('主胜') && !dir.includes('/') && !dir.includes('平')) dirClass = 'dir-win';
    else if (dir.includes('客胜') && !dir.includes('/') && !dir.includes('平')) dirClass = 'dir-lose';
    else if (dir === '平') dirClass = 'dir-draw';

    const cold = m.cold_prob || '';
    let coldClass = '';
    if (cold.includes('低')) coldClass = 'cold-low';
    else if (cold.includes('中')) coldClass = 'cold-mid';
    else if (cold.includes('高')) coldClass = 'cold-high';

    return `
      <div class="match-card">
        <div class="match-header">
          <span class="league-tag">${m.league || '联赛'}</span>
          <span class="teams">${m.home || '?'} <span class="vs">vs</span> ${m.away || '?'}</span>
          ${dir ? `<span class="direction-tag ${dirClass}">${dir}</span>` : ''}
        </div>
        <div class="match-body">
          ${m.odds ? `<div class="match-item"><span class="label">赔率</span><span class="value">${m.odds}</span></div>` : ''}
          ${m.score_prediction ? `<div class="match-item"><span class="label">比分预测</span><span class="value">${m.score_prediction}</span></div>` : ''}
          ${m.actual_score ? `<div class="match-item"><span class="label">实际赛果</span><span class="value">${m.actual_score}</span></div>` : ''}
          ${m.judgment ? `<div class="match-item"><span class="label">研判结果</span><span class="value">${m.judgment}</span></div>` : ''}
          ${m.mistake_type ? `<div class="match-item"><span class="label">失误类型</span><span class="value">${m.mistake_type}</span></div>` : ''}
          ${cold ? `<div class="match-item"><span class="label">冷门概率</span><span class="value ${coldClass}">${cold}</span></div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// --- Render Review ---
function renderReview(data) {
  const text = data.full_text || data.raw_text || '';
  if (!text.trim()) return '<div class="empty-state"><p>暂无复盘内容</p></div>';

  // Split into sections
  const sections = text.split(/(?:^|\n)-{10,}/gm).filter(s => s.trim());
  
  let html = '<div class="review-section">';
  
  if (sections.length <= 2) {
    // Show as single block
    html += `<div class="review-text">${escapeHtml(text.substring(0, 10000))}</div>`;
  } else {
    // Show sections
    sections.forEach(sec => {
      const trimmed = sec.trim();
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      const title = lines[0].replace(/^【|】$/g, '').trim();
      const content = lines.slice(1).join('\n').trim();
      
      html += `<h3>${title || '复盘内容'}</h3>`;
      html += `<div class="review-text">${escapeHtml(content.substring(0, 5000))}</div>`;
    });
  }
  
  html += '</div>';
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
