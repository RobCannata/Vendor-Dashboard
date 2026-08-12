const vendors = ['SASR', 'Anderson', 'Channel Partners', 'Impulso', 'B2X'];

const clickUpLinks = {
  vendors: {
    'SASR': 'https://app.clickup.com/t/869ed6zn3',
    'Anderson': 'https://app.clickup.com/t/869dmepg4',
    'Channel Partners': 'https://app.clickup.com/t/869d1ete9',
    'Impulso': 'https://app.clickup.com/t/869duw9kp',
    'B2X': 'https://app.clickup.com/t/869egpcgz'
  },
  projects: {
    'DHI': 'https://app.clickup.com/t/869ed6zzt',
    'Dollar General Pilot': 'https://app.clickup.com/t/869ed6zxk',
    'Natural Grocers': 'https://app.clickup.com/t/869ed78hy',
    'Hucks Stores Pilot': 'https://app.clickup.com/t/869daqvck',
    'WMUS Top Stock': 'https://app.clickup.com/t/869dvfp4w',
    'WMUS Audits': 'https://app.clickup.com/t/869dvfnue',
    'Academy Sports': 'https://app.clickup.com/t/869d1wf7v',
    'Miniso': 'https://app.clickup.com/t/869ed7at4',
    'Ace Elgin': 'https://app.clickup.com/t/869d4m6vq',
    'Dufry': 'https://app.clickup.com/t/869dmfb7c',
    'Oxxo Revisits': 'https://app.clickup.com/t/869duwa8r',
    'Food 4 Less': 'https://app.clickup.com/t/869egpcpd'
  }
};

function scoreBand(score) {
  if (!Number.isFinite(score)) return 'na';
  if (score >= 90) return 'score-green';
  if (score >= 80) return 'score-blue';
  if (score >= 70) return 'score-orange';
  return 'score-red';
}

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
  value.classList.remove('score-green', 'score-blue', 'score-orange', 'score-red');
  value.classList.add(scoreBand(score));
  bar.style.width = Number.isFinite(score) ? `${score}%` : '0%';
  bar.className = scoreBand(score);

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
    const result = row.querySelector('.project-result');
    const scoreEl = row.querySelector('.project-result strong');
    if (!name || !result || !scoreEl) return;

    const score = Number(projectScores?.[name]);
    scoreEl.classList.remove('project-score-live', 'score-green', 'score-blue', 'score-orange', 'score-red');
    result.querySelector('.project-score-bar')?.remove();

    if (Number.isFinite(score)) {
      scoreEl.textContent = `${score}%`;
      const band = scoreBand(score);
      scoreEl.classList.add('project-score-live', band);

      const track = document.createElement('div');
      track.className = 'project-score-bar';
      track.innerHTML = `<span class="${band}" style="width:${score}%"></span>`;
      result.appendChild(track);

      const status = result.querySelector('.project-status');
      if (status) {
        status.textContent = score >= 90 ? 'Strong' : score >= 80 ? 'Watch' : 'At risk';
        status.className = `project-status ${band}`;
      }
    } else {
      scoreEl.textContent = '—';
      const status = result.querySelector('.project-status');
      if (status) {
        status.textContent = 'Pending';
        status.className = 'project-status';
      }
    }
  });
}

function setupClickUpLinks() {
  document.querySelectorAll('.vendor-card').forEach(card => {
    const vendor = card.querySelector('.vendor-name')?.textContent?.trim();
    const vendorUrl = clickUpLinks.vendors[vendor];
    if (!vendorUrl) return;

    card.classList.add('clickup-linked');
    card.setAttribute('title', `Open ${vendor} scorecard in ClickUp`);
    card.addEventListener('click', event => {
      const projectRow = event.target.closest('.project-row');
      if (projectRow) return;
      window.open(vendorUrl, '_blank', 'noopener,noreferrer');
    });

    card.querySelectorAll('.project-row').forEach(row => {
      const project = row.querySelector('.project-name')?.textContent?.trim();
      const projectUrl = clickUpLinks.projects[project];
      if (!projectUrl) return;
      row.classList.add('clickup-linked');
      row.setAttribute('title', `Open ${project} scorecard in ClickUp`);
      row.addEventListener('click', event => {
        event.stopPropagation();
        window.open(projectUrl, '_blank', 'noopener,noreferrer');
      });
    });
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
    setupClickUpLinks();

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
        const band = scoreBand(score);
        return `<div class="quality-row"><div><div class="qname">${v}</div><div class="qtrack"><span class="${band}" style="width:${width}%"></span></div></div><div class="qscore ${band}">${shown}</div></div>`;
      }).join('');
    }

    const updated = document.getElementById('scoreRefresh');
    if (updated) updated.textContent = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleString() : 'Live ClickUp feed';
  } catch (err) {
    console.error('Unable to load ClickUp score snapshot:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadClickUpScores);