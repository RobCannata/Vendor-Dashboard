import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'dist', 'index.html');
const BOOT_FROM = '</body>';
const BOOT_SCRIPT = `<script>
(function(){
  function renderStaticScorecards(){
    try{
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
        quality.textContent=scores.length?`${Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}%`:'—';
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
  console.log('Added independent scorecard bootstrap.');
}

main().catch(err=>{console.error(err);process.exit(1);});
