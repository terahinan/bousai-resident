(() => {
  'use strict';
  const STORAGE={role:'jishin-role',quake:'jishin-quake-time',tasks:'jishin-task-checks',prep:'jishin-preparedness-checks-v3'};
  const $=id=>document.getElementById(id);
  const roleSelect=$('roleSelect'), quakeDate=$('quakeDate'), quakeTime=$('quakeTime'), elapsedText=$('elapsedText'), taskList=$('taskList'), taskCount=$('taskCount');
  const preparednessList=$('preparednessList'), preparednessCount=$('preparednessCount'), preparednessProgress=$('preparednessProgress'), triviaList=$('triviaList');
  let quakeAt=null, taskChecks=loadObject(STORAGE.tasks), prepChecks=loadObject(STORAGE.prep);
  function loadObject(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
  function saveObject(key,v){localStorage.setItem(key,JSON.stringify(v))}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
  function pad2(n){return String(n).padStart(2,'0')}
  function dateValue(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`}
  function timeValue(d){return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`}
  function elapsedMinutes(){return quakeAt?Math.max(0,Math.floor((Date.now()-quakeAt.getTime())/60000)):null}
  function formatDuration(min){if(min<60)return `${min}分`;if(min<1440){const h=Math.floor(min/60),m=min%60;return m?`${h}時間${m}分`:`${h}時間`;}const d=Math.floor(min/1440),h=Math.floor((min%1440)/60);return h?`${d}日${h}時間`:`${d}日`;}
  function formatRange(s,e){return s===e?formatDuration(s):`${formatDuration(s)}〜${formatDuration(e)}`}
  function statusForTask(task,elapsed,checked){if(checked)return {label:'完了',className:'done'};if(elapsed===null||elapsed<task.startMin)return {label:'これから',className:''};if(elapsed>=task.startMin&&elapsed<=task.endMin)return {label:'今やる',className:'now'};return {label:'要確認',className:'overdue'};}
  function setQuakeDate(date,activeMinutes=null){quakeAt=date;localStorage.setItem(STORAGE.quake,date.toISOString());quakeDate.value=dateValue(date);quakeTime.value=timeValue(date);document.querySelectorAll('[data-minutes]').forEach(btn=>btn.classList.toggle('active',activeMinutes!==null&&Number(btn.dataset.minutes)===activeMinutes));renderActionSection();}
  function combineDateTime(){if(!quakeDate.value||!quakeTime.value)return null;const d=new Date(`${quakeDate.value}T${quakeTime.value}:00`);return Number.isNaN(d.getTime())?null:d;}
  function renderActionSection(){
    const role=roleSelect.value||APP_DATA.roles[0], elapsed=elapsedMinutes(), tasks=APP_DATA.tasks.filter(t=>t.role===role);
    elapsedText.textContent=elapsed===null?'発生時刻を選択してください。':`地震発生から ${formatDuration(elapsed)} 経過しています。`;
    taskCount.textContent=`${tasks.length}件`;taskList.innerHTML='';
    if(elapsed===null){taskList.innerHTML='<div class="empty-state">発生時刻を選択すると、すべての行動項目を時期とともに表示します。</div>';return;}
    tasks.forEach(task=>{
      const checked=!!taskChecks[task.id], status=statusForTask(task,elapsed,checked);
      const card=document.createElement('article');card.className=`task-item ${checked?'completed':''}`;
      card.innerHTML=`<div class="task-head"><input class="task-check" type="checkbox" ${checked?'checked':''} aria-label="${escapeHtml(task.title)}を完了"><div><h3 class="task-title">${escapeHtml(task.title)}</h3><div class="task-meta"><span class="pill ${status.className}">${status.label}</span><span class="pill">目安：${escapeHtml(formatRange(task.startMin,task.endMin))}</span></div><p class="task-detail">${escapeHtml(task.detail)}</p>${task.note?`<p class="task-note">注意：${escapeHtml(task.note)}</p>`:''}</div></div>`;
      card.querySelector('.task-check').addEventListener('change',e=>{taskChecks[task.id]=e.target.checked;saveObject(STORAGE.tasks,taskChecks);renderActionSection();});
      taskList.appendChild(card);
    });
  }
  function makeChevron(){return '<span class="nested-chevron" aria-hidden="true">⌄</span>';}
  function toggleButton(button,body,wrap){const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));body.hidden=open;wrap?.classList.toggle('is-open',!open);}
  function renderPreparedness(){
    preparednessList.innerHTML='';const goals=[...new Set(APP_DATA.preparedness.map(x=>x.goal))];
    goals.forEach((goal,idx)=>{
      const items=APP_DATA.preparedness.filter(x=>x.goal===goal);const done=items.filter(x=>prepChecks[x.id]).length;
      const group=document.createElement('section');group.className='goal-group nested-group';
      const button=document.createElement('button');button.type='button';button.className='group-toggle';button.setAttribute('aria-expanded','false');
      button.innerHTML=`<span class="goal-index">${idx+1}</span><span class="group-title"><strong>${escapeHtml(goal)}</strong><small>${done} / ${items.length} 実施</small></span>${makeChevron()}`;
      const body=document.createElement('div');body.className='group-body';body.hidden=true;
      items.forEach(item=>{
        const wrap=document.createElement('article');wrap.className=`nested-item prep-item ${prepChecks[item.id]?'is-checked':''}`;
        const row=document.createElement('div');row.className='prep-row';
        row.innerHTML=`<label class="prep-check-label"><input type="checkbox" ${prepChecks[item.id]?'checked':''} aria-label="${escapeHtml(item.title)}を実施済みにする"><span class="prep-check-box" aria-hidden="true"></span></label><button type="button" class="item-toggle" aria-expanded="false"><span>${escapeHtml(item.title)}</span>${makeChevron()}</button>`;
        const detail=document.createElement('div');detail.className='item-detail';detail.hidden=true;
        detail.innerHTML=`<p class="detail-summary">${escapeHtml(item.summary)}</p><h4>確認のポイント</h4><ul>${item.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>`;
        const cb=row.querySelector('input'), it=row.querySelector('.item-toggle');
        cb.addEventListener('change',()=>{prepChecks[item.id]=cb.checked;saveObject(STORAGE.prep,prepChecks);wrap.classList.toggle('is-checked',cb.checked);updatePreparednessProgress();const d=items.filter(x=>prepChecks[x.id]).length;button.querySelector('small').textContent=`${d} / ${items.length} 実施`;});
        it.addEventListener('click',()=>toggleButton(it,detail,wrap));wrap.append(row,detail);body.appendChild(wrap);
      });
      button.addEventListener('click',()=>toggleButton(button,body,group));group.append(button,body);preparednessList.appendChild(group);
    });updatePreparednessProgress();
  }
  function updatePreparednessProgress(){const total=APP_DATA.preparedness.length,done=APP_DATA.preparedness.filter(x=>prepChecks[x.id]).length;preparednessCount.textContent=`${done} / ${total}`;preparednessProgress.max=total;preparednessProgress.value=done;}

  function renderTrivia(){
    triviaList.innerHTML='';const categories=[...new Set(APP_DATA.trivia.map(x=>x.category))];
    categories.forEach(category=>{
      const items=APP_DATA.trivia.filter(x=>x.category===category);const group=document.createElement('section');group.className='trivia-group nested-group';
      const gbtn=document.createElement('button');gbtn.type='button';gbtn.className='group-toggle trivia-category-toggle';gbtn.setAttribute('aria-expanded','false');gbtn.innerHTML=`<span class="category-icon">${categoryIcon(category)}</span><span class="group-title"><strong>${escapeHtml(category)}</strong><small>${items.length}項目</small></span>${makeChevron()}`;
      const body=document.createElement('div');body.className='group-body';body.hidden=true;
      items.forEach(item=>{
        const wrap=document.createElement('article');wrap.className='nested-item trivia-item';const btn=document.createElement('button');btn.type='button';btn.className='item-toggle trivia-item-toggle';btn.setAttribute('aria-expanded','false');btn.innerHTML=`<span><strong>${escapeHtml(item.title)}</strong><small>詳細を見る</small></span>${makeChevron()}`;
        const detail=document.createElement('div');detail.className='item-detail trivia-detail';detail.hidden=true;detail.innerHTML=`<p class="detail-summary">${escapeHtml(item.summary)}</p><h4>ポイント</h4><ul>${item.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>`;
        btn.addEventListener('click',()=>toggleButton(btn,detail,wrap));wrap.append(btn,detail);body.appendChild(wrap);
      });gbtn.addEventListener('click',()=>toggleButton(gbtn,body,group));group.append(gbtn,body);triviaList.appendChild(group);
    });
  }
  function categoryIcon(c){if(c.includes('地震'))return '🌏';if(c.includes('京都'))return '📍';if(c.includes('命'))return '🫶';if(c.includes('火災'))return '🧯';if(c.includes('住まい'))return '🏠';return '🎒';}
  function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),1800);}
  APP_DATA.roles.forEach(role=>{const o=document.createElement('option');o.value=role;o.textContent=role;roleSelect.appendChild(o)});roleSelect.value=localStorage.getItem(STORAGE.role)||APP_DATA.roles[0];roleSelect.addEventListener('change',()=>{localStorage.setItem(STORAGE.role,roleSelect.value);renderActionSection()});
  document.querySelectorAll('[data-minutes]').forEach(btn=>btn.addEventListener('click',()=>{const min=Number(btn.dataset.minutes);setQuakeDate(new Date(Date.now()-min*60000),min)}));
  const manual=()=>{const d=combineDateTime();if(d)setQuakeDate(d,null)};quakeDate.addEventListener('change',manual);quakeTime.addEventListener('change',manual);
  const saved=localStorage.getItem(STORAGE.quake);if(saved){const d=new Date(saved);if(!Number.isNaN(d.getTime()))setQuakeDate(d,null)}
  $('resetTaskChecks').addEventListener('click',()=>{if(confirm('やること一覧のチェックをすべて外しますか？')){taskChecks={};saveObject(STORAGE.tasks,taskChecks);renderActionSection()}});
  $('resetPreparedness').addEventListener('click',()=>{if(confirm('防災取組チェックをすべて外しますか？')){prepChecks={};saveObject(STORAGE.prep,prepChecks);renderPreparedness()}});
  $('refreshButton').addEventListener('click',async()=>{const b=$('refreshButton'),old=b.textContent;b.disabled=true;b.textContent='更新中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('jishin-ni-sonaeru-')).map(k=>caches.delete(k)))}toast('最新版を読み込みます');setTimeout(()=>location.reload(),450)}catch(e){console.error(e);b.disabled=false;b.textContent=old;toast('更新できませんでした。通信状況を確認してください。')}});
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));
  renderActionSection();renderPreparedness();renderTrivia();setInterval(()=>{if(quakeAt)renderActionSection()},60000);
})();
