import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');
const BOOT_FROM = '</body>';
const BOOT_SCRIPT = `<script>
(function(){
  function applyVendorCardLayout(){
    if(document.getElementById('vendor-scorecard-size-fix')) return;
    const style=document.createElement('style');
    style.id='vendor-scorecard-size-fix';
    style.textContent=''
      + '.vendor-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:14px!important}'
      + '.vendor-grid .vendor{min-height:300px!important;height:auto!important;aspect-ratio:1 / 1!important;overflow:hidden!important}'
      + '.vendor-grid .vendor-head{padding:18px 18px 12px!important}'
      + '.vendor-grid .v-name{font-size:20px!important}'
      + '.vendor-grid .v-score b{font-size:28px!important}'
      + '.vendor-grid .criteria{padding:14px 18px 0!important;gap:10px!important}'
      + '.vendor-grid .projects{padding:14px 18px!important;margin-top:auto!important;overflow:auto!important;max-height:150px!important}'
      + '.vendor-grid .proj{grid-template-columns:minmax(0,1fr) 60px!important;gap:8px!important}'
      + '@media(max-width:1500px){.vendor-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.vendor-grid .vendor{aspect-ratio:auto!important;min-height:320px!important}}'
      + '@media(max-width:1100px){.vendor-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.vendor-grid .vendor{min-height:320px!important}}'
      + '@media(max-width:820px){.vendor-grid{grid-template-columns:1fr!important}.vendor-grid .vendor{aspect-ratio:auto!important;min-height:280px!important}}';
    document.head.appendChild(style);
  }

  function renderStaticScorecards(){
    try{
      applyVendorCardLayout();
      if(typeof VENDORS==='undefined' || typeof renderVendor!=='function') return false;
      const grid=document.getElementById('vendorGrid');
      if(grid) grid.innerHTML=VENDORS.map(renderVendor).join('');
      const avg=document.getElementById('avgList');
      if(avg && typeof scoreOfVendor==='function'){
        const items=VENDORS.map(v=>({name:v.name,score:scoreOfVendor(v),color:v.accent,projects:v.projects.length})).filter(x=>x.score!=null).sort((a,b)=>b.score-a.score);
        avg.innerHTML=items.map(v=>'<a class="item" href="'+VENDORS.find(x=>x.name===v.name).url+'" target="_blank" rel="noreferrer"><div><b>'+String(v.name)+'</b><span>'+v.projects+' projects • weighted average across scorecards</span><div style="height:8px;background:#e8edf6;border-radius:999px;overflow:hidden;margin-top:8px"><div style="height:100%;width:'+v.score+'%;background:'+v.color+'"></div></div></div><em>'+v.score+'%</em></a>').join('');
      }
      const quality=document.getElementById('kVendorQuality');
      if(quality && typeof scoreOfVendor==='function'){
        const scores=VENDORS.map(v=>scoreOfVendor(v)).filter(v=>Number.isFinite(v));
        const qualityText = scores.length ? String(Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)) + '%' : '—';
        quality.textContent=qualityText;
      }
      const count=document.getElementById('kScorecards');
      if(count) count.textContent=String(VENDORS.length);
      return true;
    }catch(e){ console.warn('Scorecard bootstrap failed', e); return false; }
  }
  if(!renderStaticScorecards()) document.addEventListener('DOMContentLoaded', renderStaticScorecards);
})();
</script>`;

async function main(){
  const html=await fs.readFile(filePath,'utf8');
  const next=html.includes(BOOT_FROM) ? html.replace(BOOT_FROM, BOOT_SCRIPT + BOOT_FROM) : html + BOOT_SCRIPT;
  await fs.writeFile(filePath,next,'utf8');
  console.log('Added independent scorecard bootstrap with larger vendor cards.');
}

main().catch(err=>{console.error(err);process.exit(1);});
