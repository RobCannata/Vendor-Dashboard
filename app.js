const vendors = ['SASR', 'Anderson', 'Channel Partners', 'Impulso', 'B2X'];

function fmtScore(value) {
  return Number.isFinite(value) ? `${value}%` : '—';
}

function applyScore(card, score) {
  const value = card.querySelector('.score');
  const bar = card.querySelector('.bar span');
  const label = card.querySelector('.score-source');
  const badge = card.querySelector('.badge');
  if (!value || !bar) return;

  value.textContent = fmtScore(score);
  value.classList.toggle('na', !Number.isFinite(score));
  bar.style.width = Number.isFinite(score) ? `${score}%` : '0%';

  if (Number.isFinite(score)) {
    badge.textContent = score >= 90 ? 'STRONG' : score >= 80 ? 'WATCH' : 'AT RISK';
    badge.className = `badge ${score >= 90 ? 'good' : score >= 80 ? 'pending' : 'risk'}`;
    if (label) label.textContent = 'Live ClickUp score';
  }
}

function applyProjectScores(projectScores) {
  const rows = [...document.querySelectorAll('.project-row')];
  rows.forEach(row => {
    const name = row.querySelector('.project-name')?.textContent?.trim();
    const scoreEl = row.querySelector('.project-result strong');
    if (!name || !scoreEl) return;

    const score = Number(projectScores?.[name]);
    if (Number.isFinite(score)) {
      scoreEl.textContent = `${score}%`;
      scoreEl.classList.add('project-score-live');
    } else {
      scoreEl.textContent = '—';
    }
  });
}

async function loadClickUpScores() {
  try {
    const res = await fetch(`clickup-scores.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const scores = payload?.scores || {};
    const projectScores = payload?.projectScores || {};
    const cards = [...document.querySelectorAll('.vendor-card')];

    cards.forEach(card => {
      const name = card.querySelector('.vendor-name')?.textContent?.trim();
      if (!name) return;
      applyScore(card, Number.isFinite(Number(scores[name])) ? Number(scores[name]) : null);
    });

    applyProjectScores(projectScores);

    const values = vendors.map(v => Number(scores[v])).filter(Number.isFinite);
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    const kpi = document.getElementById('installationQualityScore');
    if (kpi) kpi.textContent = fmtScore(avg);
    const detail = document.getElementById('installationQualityDetail');
    if (detail) detail.textContent = `${values.length} of ${vendors.length} vendors scored from ClickUp`;

    const qualityPanel = document.getElementById('qualityByVendor');
    if (qualityPanel) {
      qualityPanel.innerHTML = vendors.map(v => {
        const score = Number(scores[v]);
        const shown = Number.isFinite(score) ? `${score}%` : '—';
        const width = Number.isFinite(score) ? score : 0;
        return `<div class="quality-row"><div><div class="qname">${v}</div><div class="qtrack"><span style="width:${width}%"></span></div></div><div class="qscore">${shown}</div></div>`;
      }).join('');
    }

    const updated = document.getElementById('scoreRefresh');
    if (updated) updated.textContent = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleString() : 'Live ClickUp feed';
  } catch (err) {
    console.error('Unable to load ClickUp score snapshot:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadClickUpScores);
