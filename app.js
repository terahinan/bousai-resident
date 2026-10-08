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
  function sourceLinks(sources){if(!sources?.length)return '';return `<div class="detail-sources"><strong>参考</strong>${sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>`).join('')}</div>`;}
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
        detail.innerHTML=`<p class="detail-summary">${escapeHtml(item.summary)}</p><h4>確認のポイント</h4><ul>${item.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>${sourceLinks(item.sources)}`;
        const cb=row.querySelector('input'), it=row.querySelector('.item-toggle');
        cb.addEventListener('change',()=>{prepChecks[item.id]=cb.checked;saveObject(STORAGE.prep,prepChecks);wrap.classList.toggle('is-checked',cb.checked);updatePreparednessProgress();const d=items.filter(x=>prepChecks[x.id]).length;button.querySelector('small').textContent=`${d} / ${items.length} 実施`;});
        it.addEventListener('click',()=>toggleButton(it,detail,wrap));wrap.append(row,detail);body.appendChild(wrap);
      });
      button.addEventListener('click',()=>toggleButton(button,body,group));group.append(button,body);preparednessList.appendChild(group);
    });updatePreparednessProgress();
  }
  function updatePreparednessProgress(){const total=APP_DATA.preparedness.length,done=APP_DATA.preparedness.filter(x=>prepChecks[x.id]).length;preparednessCount.textContent=`${done} / ${total}`;preparednessProgress.max=total;preparednessProgress.value=done;}

  function visual(type){
    const V={
      history:`<div class="viz"><div class="viz-title">過去の大地震 ― 被害の特徴と備え</div>
        <svg class="info-svg" viewBox="0 0 720 300" role="img" aria-label="1995年阪神淡路大震災、2011年東日本大震災、2016年熊本地震、2024年能登半島地震の主な特徴を時系列で示す図">
          <line x1="80" y1="70" x2="650" y2="70" stroke="#9fbdb7" stroke-width="6" stroke-linecap="round"/>
          <g font-family="sans-serif" text-anchor="middle">
            <g transform="translate(100 70)"><circle r="18" fill="#0f766e"/><text y="-34" font-size="22" font-weight="700" fill="#12213a">1995</text><rect x="-72" y="32" width="144" height="118" rx="12" fill="#edf8f5" stroke="#b8d5cf"/><text y="62" font-size="17" font-weight="700">阪神・淡路</text><text y="91" font-size="15">建物倒壊</text><text y="115" font-size="15">市街地火災</text><text y="139" font-size="13" fill="#0f766e">家具・耐震・消火</text></g>
            <g transform="translate(270 70)"><circle r="18" fill="#0f766e"/><text y="-34" font-size="22" font-weight="700" fill="#12213a">2011</text><rect x="-72" y="32" width="144" height="118" rx="12" fill="#edf8f5" stroke="#b8d5cf"/><text y="62" font-size="17" font-weight="700">東日本</text><text y="91" font-size="15">巨大津波</text><text y="115" font-size="15">広域停電</text><text y="139" font-size="13" fill="#0f766e">避難・備蓄</text></g>
            <g transform="translate(440 70)"><circle r="18" fill="#0f766e"/><text y="-34" font-size="22" font-weight="700" fill="#12213a">2016</text><rect x="-72" y="32" width="144" height="118" rx="12" fill="#edf8f5" stroke="#b8d5cf"/><text y="62" font-size="17" font-weight="700">熊本</text><text y="91" font-size="15">強い揺れが反復</text><text y="115" font-size="15">家屋被害</text><text y="139" font-size="13" fill="#0f766e">余震への備え</text></g>
            <g transform="translate(610 70)"><circle r="18" fill="#0f766e"/><text y="-34" font-size="22" font-weight="700" fill="#12213a">2024</text><rect x="-72" y="32" width="144" height="118" rx="12" fill="#edf8f5" stroke="#b8d5cf"/><text y="62" font-size="17" font-weight="700">能登半島</text><text y="91" font-size="15">倒壊・火災</text><text y="115" font-size="15">道路寸断</text><text y="139" font-size="13" fill="#0f766e">複合災害を想定</text></g>
          </g>
        </svg><p class="figure-note">地震ごとに被害の出方は違います。ひとつの対策だけでなく、「家の安全・火災・避難・備蓄」を組み合わせて備えます。</p></div>`,
      magnitude:`<div class="viz"><div class="viz-title">マグニチュードと震度は別もの</div>
        <svg class="info-svg" viewBox="0 0 720 330" role="img" aria-label="地震の規模を表すマグニチュードと場所ごとの揺れを表す震度の違いを示す図">
          <g font-family="sans-serif">
            <circle cx="135" cy="160" r="72" fill="#0f766e"/><text x="135" y="145" text-anchor="middle" font-size="18" fill="white">地震そのものの規模</text><text x="135" y="185" text-anchor="middle" font-size="46" font-weight="700" fill="white">M</text><text x="135" y="210" text-anchor="middle" font-size="15" fill="white">マグニチュード</text>
            <path d="M220 160 C255 105 285 105 320 160 C355 215 385 215 420 160" fill="none" stroke="#e47721" stroke-width="8" stroke-linecap="round"/>
            <g text-anchor="middle"><rect x="455" y="60" width="210" height="64" rx="12" fill="#fee9dc"/><text x="560" y="88" font-size="16">震源に近い場所</text><text x="560" y="113" font-size="22" font-weight="700" fill="#a33f12">震度が大きいことが多い</text>
            <rect x="455" y="137" width="210" height="64" rx="12" fill="#f3f7f6"/><text x="560" y="165" font-size="16">少し離れた場所</text><text x="560" y="190" font-size="20" font-weight="700">震度は変わる</text>
            <rect x="455" y="214" width="210" height="64" rx="12" fill="#edf8f5"/><text x="560" y="242" font-size="16">遠い場所</text><text x="560" y="267" font-size="20" font-weight="700" fill="#0f766e">小さくなることが多い</text></g>
            <text x="360" y="310" text-anchor="middle" font-size="14" fill="#667085">地盤・地形などによっても揺れ方は変わります</text>
          </g>
        </svg><div class="key-box"><b>覚え方</b><span>マグニチュード＝電球そのものの明るさ ／ 震度＝その場所で感じる明るさ、というイメージです。</span></div></div>`,
      probability:`<div class="viz"><div class="viz-title">「30年以内○％」は発生日の予報ではない</div>
        <svg class="info-svg" viewBox="0 0 720 300" role="img" aria-label="地震発生確率は30年間のどこで起こるかを示すものではなく日付の予報ではないことを説明する図">
          <g font-family="sans-serif"><text x="45" y="44" font-size="16" font-weight="700">今日</text><text x="642" y="44" font-size="16" font-weight="700">30年後</text>
          <line x1="72" y1="80" x2="650" y2="80" stroke="#0f766e" stroke-width="12" stroke-linecap="round"/><g fill="#e47721"><circle cx="150" cy="80" r="8"/><circle cx="270" cy="80" r="8"/><circle cx="410" cy="80" r="8"/><circle cx="560" cy="80" r="8"/></g>
          <text x="360" y="118" text-anchor="middle" font-size="16">どの日に起こるかは分からない</text>
          <rect x="65" y="150" width="260" height="90" rx="14" fill="#edf8f5" stroke="#b8d5cf"/><text x="195" y="178" text-anchor="middle" font-size="15">計算方法の一例</text><text x="195" y="214" text-anchor="middle" font-size="28" font-weight="700" fill="#0f766e">60～90％程度以上</text>
          <rect x="395" y="150" width="260" height="90" rx="14" fill="#f3f7f6" stroke="#d0d5dd"/><text x="525" y="178" text-anchor="middle" font-size="15">別の計算方法</text><text x="525" y="214" text-anchor="middle" font-size="28" font-weight="700" fill="#475467">20～50％</text>
          <text x="360" y="277" text-anchor="middle" font-size="14" fill="#667085">確率が低い時期＝「今は安全」という意味ではありません</text></g>
        </svg><p class="figure-note">地震本部は、南海トラフ地震の発生確率を最も高いランクと評価しています。日付を予測する数字ではないため、確率にかかわらず備えを続けます。</p></div>`,
      longperiod:`<div class="viz"><div class="viz-title">長周期地震動 ― 高層階ほど大きく長く揺れることがある</div>
        <svg class="info-svg" viewBox="0 0 720 330" role="img" aria-label="低層建物と高層建物の長周期地震動による揺れ方の違いを示す図">
          <g font-family="sans-serif"><line x1="45" y1="270" x2="675" y2="270" stroke="#7b8f8a" stroke-width="5"/>
          <rect x="95" y="190" width="95" height="80" rx="4" fill="#dfeae7" stroke="#0f766e" stroke-width="3"/><text x="142" y="300" text-anchor="middle" font-size="16">低層建物</text><path d="M75 160 Q95 140 115 160" fill="none" stroke="#e47721" stroke-width="5"/><path d="M170 160 Q190 140 210 160" fill="none" stroke="#e47721" stroke-width="5"/>
          <rect x="365" y="55" width="125" height="215" rx="4" fill="#edf8f5" stroke="#0f766e" stroke-width="4"/><g stroke="#9fc9c1" stroke-width="2"><line x1="365" y1="100" x2="490" y2="100"/><line x1="365" y1="145" x2="490" y2="145"/><line x1="365" y1="190" x2="490" y2="190"/><line x1="365" y1="235" x2="490" y2="235"/></g><text x="428" y="300" text-anchor="middle" font-size="16">高層建物</text>
          <path d="M315 95 C350 55 380 55 415 95" fill="none" stroke="#e47721" stroke-width="7"/><path d="M440 95 C475 55 505 55 540 95" fill="none" stroke="#e47721" stroke-width="7"/><text x="425" y="34" text-anchor="middle" font-size="16" fill="#a33f12">ゆっくり・大きく・長く</text>
          <g text-anchor="middle"><rect x="535" y="74" width="135" height="42" rx="8" fill="#eef7f5"/><text x="602" y="101" font-size="15">階級1</text><rect x="535" y="124" width="135" height="42" rx="8" fill="#fff7e8"/><text x="602" y="151" font-size="15">階級2</text><rect x="535" y="174" width="135" height="42" rx="8" fill="#fee9dc"/><text x="602" y="201" font-size="15">階級3</text><rect x="535" y="224" width="135" height="42" rx="8" fill="#fbd5d2"/><text x="602" y="251" font-size="15">階級4</text></g></g>
        </svg><p class="figure-note">高層ビルでは、家具やキャスター付き什器が大きく移動することがあります。揺れている間は無理に移動せず、頭を守ります。</p></div>`,
      hazard:`<div class="viz"><div class="viz-title">下京区の地震想定を見るときのポイント</div>
        <svg class="info-svg" viewBox="0 0 720 315" role="img" aria-label="自宅から集合場所、避難先までの経路と危険箇所をハザードマップで確認する図">
          <g font-family="sans-serif"><rect x="35" y="35" width="650" height="230" rx="14" fill="#f7fbfa" stroke="#b8d5cf"/><path d="M100 210 C190 145 250 205 330 135 S470 80 610 125" fill="none" stroke="#758d88" stroke-width="16" stroke-linecap="round"/><path d="M100 210 C190 145 250 205 330 135 S470 80 610 125" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-dasharray="12 10"/>
          <g text-anchor="middle"><rect x="63" y="169" width="86" height="64" rx="10" fill="#edf8f5" stroke="#0f766e"/><text x="106" y="195" font-size="25">⌂</text><text x="106" y="219" font-size="15" font-weight="700">自宅</text>
          <circle cx="275" cy="174" r="32" fill="#fff1e8" stroke="#e47721" stroke-width="3"/><text x="275" y="180" font-size="28">!</text><text x="275" y="224" font-size="14">危険箇所</text>
          <rect x="372" y="91" width="112" height="66" rx="10" fill="#eef7f5" stroke="#0f766e"/><text x="428" y="119" font-size="16" font-weight="700">集合場所</text><text x="428" y="142" font-size="13">町内で確認</text>
          <rect x="565" y="88" width="90" height="72" rx="10" fill="#edf8f5" stroke="#0f766e"/><text x="610" y="117" font-size="18">避難先</text><text x="610" y="142" font-size="13">開設を確認</text></g>
          <text x="360" y="296" text-anchor="middle" font-size="14" fill="#667085">想定震度だけでなく、「実際に通る道」と危険箇所を一緒に確認</text></g>
        </svg></div>`,
      shelter:`<div class="viz"><div class="viz-title">「逃げる場所」と「生活する場所」を区別する</div>
        <svg class="info-svg" viewBox="0 0 720 320" role="img" aria-label="指定緊急避難場所と指定避難所の違いを示す図">
          <g font-family="sans-serif" text-anchor="middle"><rect x="245" y="24" width="230" height="58" rx="12" fill="#fff1e8" stroke="#e47721"/><text x="360" y="50" font-size="17" font-weight="700">災害の危険が迫っている</text><text x="360" y="71" font-size="14">まず命を守る</text>
          <path d="M360 84 L360 120" stroke="#667085" stroke-width="5"/><polygon points="360,130 349,112 371,112" fill="#667085"/>
          <rect x="70" y="135" width="250" height="110" rx="14" fill="#edf8f5" stroke="#0f766e" stroke-width="3"/><text x="195" y="170" font-size="18" font-weight="700">指定緊急避難場所</text><text x="195" y="200" font-size="16">危険から一時的に逃げる</text><text x="195" y="224" font-size="13" fill="#667085">災害の種類ごとに指定</text>
          <rect x="400" y="135" width="250" height="110" rx="14" fill="#f3f7f6" stroke="#75948f" stroke-width="3"/><text x="525" y="170" font-size="18" font-weight="700">指定避難所</text><text x="525" y="200" font-size="16">自宅で生活できない人が生活</text><text x="525" y="224" font-size="13" fill="#667085">実際の開設状況を確認</text>
          <text x="360" y="288" font-size="14" fill="#667085">同じ施設が両方に指定されることもあります</text></g>
        </svg><p class="figure-note">植柳コミュニティセンターは京都市防災ポータルで市指定避難所として掲載されています。災害時は必ず開設状況を確認してください。</p></div>`,
      rescue:`<div class="viz"><div class="viz-title">救命の基本 ― 自分の安全を確保してから</div>
        <svg class="info-svg" viewBox="0 0 720 390" role="img" aria-label="救命処置の流れを安全確認からAEDまで順番に示す図">
          <g font-family="sans-serif" text-anchor="middle"><rect x="150" y="20" width="420" height="54" rx="12" fill="#fff1e8" stroke="#e47721"/><text x="360" y="54" font-size="19" font-weight="700">① 自分と周囲の安全を確認</text>
          <path d="M360 76 V106" stroke="#667085" stroke-width="4"/><polygon points="360,117 350,100 370,100" fill="#667085"/>
          <rect x="150" y="120" width="420" height="54" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="360" y="153" font-size="18" font-weight="700">② 反応と普段どおりの呼吸を確認</text>
          <path d="M360 176 V206" stroke="#667085" stroke-width="4"/><polygon points="360,217 350,200 370,200" fill="#667085"/>
          <rect x="80" y="220" width="260" height="62" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="210" y="247" font-size="18" font-weight="700">③ 119番通報</text><text x="210" y="270" font-size="14">場所・状態を伝える</text>
          <rect x="380" y="220" width="260" height="62" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="510" y="247" font-size="18" font-weight="700">③ AEDを依頼</text><text x="510" y="270" font-size="14">近くの人に持ってきてもらう</text>
          <path d="M360 286 V316" stroke="#667085" stroke-width="4"/><polygon points="360,327 350,310 370,310" fill="#667085"/>
          <rect x="150" y="330" width="420" height="54" rx="12" fill="#eaf4f1" stroke="#0f766e" stroke-width="3"/><text x="360" y="363" font-size="18" font-weight="700">④ 胸骨圧迫を続ける → AEDの音声に従う</text></g>
        </svg><div class="key-box warning"><b>重要</b><span>倒壊建物の中など危険な場所へ無理に入らないでください。二次災害を防ぐことが最優先です。</span></div></div>`,
      aed:`<div class="viz"><div class="viz-title">AED ― 音声案内に従えば使える</div>
        <svg class="info-svg" viewBox="0 0 720 360" role="img" aria-label="AEDの電源、パッド貼付、解析、ショック、胸骨圧迫再開の手順を示す図">
          <g font-family="sans-serif"><g text-anchor="middle"><rect x="25" y="40" width="130" height="85" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="90" y="72" font-size="28" font-weight="700">1</text><text x="90" y="102" font-size="16">電源を入れる</text>
          <rect x="190" y="40" width="150" height="85" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="265" y="72" font-size="28" font-weight="700">2</text><text x="265" y="102" font-size="16">パッドを貼る</text>
          <rect x="380" y="40" width="140" height="85" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="450" y="72" font-size="28" font-weight="700">3</text><text x="450" y="102" font-size="16">解析を待つ</text>
          <rect x="555" y="40" width="140" height="85" rx="12" fill="#fff1e8" stroke="#e47721"/><text x="625" y="72" font-size="28" font-weight="700">4</text><text x="625" y="100" font-size="15">指示があれば</text><text x="625" y="117" font-size="15">ショック</text></g>
          <g transform="translate(230 160)"><path d="M90 0 C45 0 30 38 38 74 L52 158 L128 158 L142 74 C150 38 135 0 90 0Z" fill="#f8e8db" stroke="#9b6c5a" stroke-width="3"/><rect x="52" y="28" width="52" height="35" rx="6" fill="#fff" stroke="#0f766e" stroke-width="3" transform="rotate(-12 78 46)"/><rect x="90" y="92" width="52" height="35" rx="6" fill="#fff" stroke="#0f766e" stroke-width="3" transform="rotate(12 116 110)"/><text x="-5" y="48" font-size="14">右上</text><line x1="28" y1="45" x2="53" y2="45" stroke="#667085"/><text x="155" y="118" font-size="14">左下</text><line x1="142" y1="113" x2="152" y2="113" stroke="#667085"/></g>
          <text x="500" y="205" font-size="16" font-weight="700">解析中・ショック時</text><text x="500" y="233" font-size="19" fill="#b42318" font-weight="700">傷病者に触れない</text><text x="500" y="273" font-size="16" font-weight="700">ショック後</text><text x="500" y="301" font-size="19" fill="#0f766e" font-weight="700">すぐ胸骨圧迫を再開</text></g>
        </svg></div>`,
      extinguisher:`<div class="viz"><div class="viz-title">消火器 ― 「ピン・ホース・レバー」の順</div>
        <svg class="info-svg" viewBox="0 0 720 320" role="img" aria-label="消火器の安全栓を抜く、ホースを火元に向ける、レバーを握る手順を示す図">
          <g font-family="sans-serif" text-anchor="middle"><g transform="translate(55 55)"><rect x="0" y="45" width="90" height="150" rx="24" fill="#d92d20"/><rect x="25" y="20" width="40" height="35" rx="4" fill="#7a271a"/><path d="M65 35 C120 45 135 85 145 120" fill="none" stroke="#333" stroke-width="8"/><circle cx="145" cy="122" r="10" fill="#333"/></g>
          <rect x="235" y="40" width="130" height="95" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="300" y="73" font-size="30" font-weight="700">1</text><text x="300" y="108" font-size="16">安全栓を抜く</text>
          <rect x="400" y="40" width="130" height="95" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="465" y="73" font-size="30" font-weight="700">2</text><text x="465" y="103" font-size="15">ホースを外し</text><text x="465" y="122" font-size="15">火元へ向ける</text>
          <rect x="565" y="40" width="130" height="95" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="630" y="73" font-size="30" font-weight="700">3</text><text x="630" y="108" font-size="16">レバーを握る</text>
          <path d="M270 165 C360 145 430 145 520 165" fill="none" stroke="#e47721" stroke-width="7" stroke-linecap="round"/><polygon points="525,165 507,154 509,176" fill="#e47721"/><path d="M550 190 C570 145 605 145 620 190 C635 230 585 260 550 220Z" fill="#f79009" opacity=".95"/><text x="585" y="286" font-size="15" fill="#a33f12">炎が天井付近まで達したら避難</text></g>
        </svg></div>`,
      breaker:`<div class="viz"><div class="viz-title">感震ブレーカー ― 揺れを感じて電気を自動遮断</div>
        <svg class="info-svg" viewBox="0 0 720 330" role="img" aria-label="地震の揺れから感震ブレーカーが作動し電気火災を防ぐ流れと主な種類を示す図">
          <g font-family="sans-serif" text-anchor="middle"><rect x="30" y="35" width="160" height="74" rx="12" fill="#fff1e8" stroke="#e47721"/><text x="110" y="65" font-size="25">揺れ</text><text x="110" y="92" font-size="15">一定以上の地震動</text><path d="M198 72 H255" stroke="#667085" stroke-width="5"/><polygon points="265,72 247,62 247,82" fill="#667085"/>
          <rect x="275" y="35" width="170" height="74" rx="12" fill="#edf8f5" stroke="#0f766e"/><text x="360" y="65" font-size="20" font-weight="700">感震ブレーカー</text><text x="360" y="92" font-size="15">揺れを検知</text><path d="M453 72 H510" stroke="#667085" stroke-width="5"/><polygon points="520,72 502,62 502,82" fill="#667085"/>
          <rect x="530" y="35" width="160" height="74" rx="12" fill="#eaf4f1" stroke="#0f766e"/><text x="610" y="65" font-size="21" font-weight="700">電気を遮断</text><text x="610" y="92" font-size="15">電気火災を抑える</text>
          <text x="360" y="150" font-size="16" font-weight="700">主なタイプ</text><g font-size="14"><rect x="35" y="175" width="150" height="90" rx="10" fill="#f3f7f6"/><text x="110" y="207" font-weight="700">分電盤内蔵型</text><text x="110" y="233">分電盤に内蔵</text><rect x="200" y="175" width="150" height="90" rx="10" fill="#f3f7f6"/><text x="275" y="207" font-weight="700">分電盤後付け型</text><text x="275" y="233">既存盤に追加</text><rect x="365" y="175" width="150" height="90" rx="10" fill="#f3f7f6"/><text x="440" y="207" font-weight="700">コンセント型</text><text x="440" y="233">特定回路を遮断</text><rect x="530" y="175" width="150" height="90" rx="10" fill="#f3f7f6"/><text x="605" y="207" font-weight="700">簡易型</text><text x="605" y="233">おもり等で作動</text></g><text x="360" y="305" font-size="14" fill="#667085">停電に備えて懐中電灯などの照明も準備します</text></g>
        </svg></div>`,
      alarm:`<div class="viz"><div class="viz-title">住宅用火災警報器 ― 「何を感知するか」と「どう鳴るか」</div>
        <svg class="info-svg" viewBox="0 0 720 330" role="img" aria-label="煙式と熱式、単独型と連動型の違いを示す図">
          <g font-family="sans-serif" text-anchor="middle"><text x="190" y="38" font-size="17" font-weight="700">感知方式</text><rect x="45" y="55" width="290" height="92" rx="12" fill="#edf8f5" stroke="#0f766e"/><circle cx="105" cy="101" r="28" fill="#fff" stroke="#0f766e"/><path d="M90 108 C85 91 98 91 93 77 M105 110 C100 92 112 92 107 77 M120 108 C115 91 128 91 123 77" fill="none" stroke="#7b8f8a" stroke-width="3"/><text x="220" y="92" font-size="18" font-weight="700">煙式</text><text x="220" y="119" font-size="14">煙を感知</text>
          <rect x="385" y="55" width="290" height="92" rx="12" fill="#fff7e8" stroke="#e47721"/><circle cx="445" cy="101" r="28" fill="#fff" stroke="#e47721"/><text x="445" y="111" font-size="30">♨</text><text x="560" y="92" font-size="18" font-weight="700">熱式</text><text x="560" y="119" font-size="14">温度上昇を感知</text>
          <text x="190" y="190" font-size="17" font-weight="700">警報の伝わり方</text><rect x="45" y="207" width="290" height="75" rx="12" fill="#f3f7f6"/><text x="190" y="238" font-size="18" font-weight="700">単独型</text><text x="190" y="264" font-size="14">感知した機器だけ鳴る</text><rect x="385" y="207" width="290" height="75" rx="12" fill="#eaf4f1"/><text x="530" y="238" font-size="18" font-weight="700">連動型</text><text x="530" y="264" font-size="14">他の警報器も連動して鳴る</text><text x="360" y="315" font-size="14" fill="#667085">定期的に作動確認し、設置後10年を目安に交換</text></g>
        </svg></div>`,
      blockwall:`<div class="viz"><div class="viz-title">危険なブロック塀 ― 「高い・傾く・割れる」に注意</div>
        <svg class="info-svg" viewBox="0 0 720 355" role="img" aria-label="ブロック塀の高さ、ひび割れ、傾き、控え壁、基礎を確認する図">
          <g font-family="sans-serif"><rect x="120" y="65" width="300" height="210" fill="#dfe5e4" stroke="#61716e" stroke-width="4"/><g stroke="#8f9c9a" stroke-width="2"><line x1="120" y1="117" x2="420" y2="117"/><line x1="120" y1="169" x2="420" y2="169"/><line x1="120" y1="221" x2="420" y2="221"/><line x1="195" y1="65" x2="195" y2="275"/><line x1="270" y1="65" x2="270" y2="275"/><line x1="345" y1="65" x2="345" y2="275"/></g><path d="M285 80 L265 115 L292 145 L270 185" fill="none" stroke="#b42318" stroke-width="7"/><rect x="95" y="275" width="350" height="28" fill="#8a7463"/><path d="M420 150 L490 275" fill="none" stroke="#0f766e" stroke-width="12"/><text x="508" y="210" font-size="14" fill="#0f766e">控え壁</text>
          <g font-size="15"><circle cx="535" cy="78" r="12" fill="#e47721"/><text x="560" y="84">高すぎないか</text><circle cx="535" cy="126" r="12" fill="#e47721"/><text x="560" y="132">ひび割れはないか</text><circle cx="535" cy="174" r="12" fill="#e47721"/><text x="560" y="180">傾き・ぐらつきはないか</text><circle cx="535" cy="222" r="12" fill="#e47721"/><text x="560" y="228">控え壁・基礎はあるか</text></g><text x="360" y="338" text-anchor="middle" font-size="15" fill="#b42318" font-weight="700">地震後、異常がある塀には近づかない</text></g>
        </svg></div>`,
      furniture:`<div class="viz"><div class="viz-title">家具対策 ― 「固定」と「置き方」の両方が大切</div>
        <svg class="info-svg" viewBox="0 0 720 360" role="img" aria-label="寝床や出口を家具の転倒範囲から外し家具を壁に固定する室内配置図">
          <g font-family="sans-serif"><rect x="55" y="35" width="610" height="270" rx="10" fill="#f7fbfa" stroke="#8ab5ae" stroke-width="4"/><rect x="85" y="190" width="230" height="85" rx="10" fill="#d8e7f3"/><text x="200" y="238" text-anchor="middle" font-size="18" font-weight="700">寝床</text><rect x="475" y="55" width="130" height="95" rx="6" fill="#cbbca8" stroke="#735f48" stroke-width="3"/><text x="540" y="105" text-anchor="middle" font-size="17">背の高い家具</text><path d="M470 58 L450 42 M610 58 L630 42" stroke="#0f766e" stroke-width="6"/><text x="540" y="30" text-anchor="middle" font-size="14" fill="#0f766e">壁へ固定</text><path d="M475 152 L335 270 L605 270 Z" fill="#f04438" opacity=".13" stroke="#d92d20" stroke-width="2" stroke-dasharray="8 6"/><text x="515" y="245" text-anchor="middle" font-size="15" fill="#b42318">転倒する範囲</text><rect x="585" y="205" width="58" height="80" fill="#fff" stroke="#5a6c68" stroke-width="3"/><path d="M585 205 L628 225 L628 285" fill="none" stroke="#5a6c68" stroke-width="3"/><text x="614" y="326" text-anchor="middle" font-size="14">出口</text><text x="200" y="326" text-anchor="middle" font-size="14" fill="#0f766e">寝床・出口を転倒範囲から外す</text></g>
        </svg></div>`,
      stock:`<div class="viz"><div class="viz-title">ローリングストック ― 使いながら備える</div>
        <svg class="info-svg" viewBox="0 0 720 330" role="img" aria-label="多めに買う、普段使う、使った分を補充するローリングストックの循環を示す図">
          <g font-family="sans-serif" text-anchor="middle"><circle cx="360" cy="165" r="116" fill="none" stroke="#c8ded9" stroke-width="22"/><path d="M360 48 A117 117 0 0 1 465 113" fill="none" stroke="#0f766e" stroke-width="22" stroke-linecap="round"/><polygon points="478,122 450,114 468,93" fill="#0f766e"/><path d="M472 205 A117 117 0 0 1 300 271" fill="none" stroke="#e47721" stroke-width="22" stroke-linecap="round"/><polygon points="288,265 316,269 300,291" fill="#e47721"/><path d="M252 127 A117 117 0 0 1 315 61" fill="none" stroke="#5f8f87" stroke-width="22" stroke-linecap="round"/><polygon points="328,56 306,74 301,47" fill="#5f8f87"/>
          <rect x="285" y="120" width="150" height="90" rx="16" fill="#fff" stroke="#b8d5cf"/><text x="360" y="151" font-size="17" font-weight="700">日常の食品を</text><text x="360" y="179" font-size="22" font-weight="700" fill="#0f766e">少し多めに</text><text x="360" y="199" font-size="14">持っておく</text>
          <text x="540" y="98" font-size="16" font-weight="700">① 多めに買う</text><text x="525" y="267" font-size="16" font-weight="700">② 普段使う</text><text x="172" y="130" font-size="16" font-weight="700">③ 買い足す</text><text x="360" y="315" font-size="14" fill="#667085">最低3日分、できれば1週間分程度を意識</text></g>
        </svg></div>`,
      '171':`<div class="viz"><div class="viz-title">災害用伝言ダイヤル171 ― 家族の安否を音声で残す</div>
        <svg class="info-svg" viewBox="0 0 720 355" role="img" aria-label="171で伝言を録音または再生する操作手順を示す図">
          <g font-family="sans-serif" text-anchor="middle"><circle cx="105" cy="125" r="65" fill="#0f766e"/><text x="105" y="143" font-size="50" font-weight="700" fill="white">171</text><path d="M175 125 H235" stroke="#667085" stroke-width="5"/><polygon points="245,125 227,115 227,135" fill="#667085"/>
          <rect x="255" y="65" width="165" height="120" rx="14" fill="#edf8f5" stroke="#0f766e"/><text x="337" y="99" font-size="17">録音なら</text><text x="337" y="135" font-size="40" font-weight="700" fill="#0f766e">1</text><text x="337" y="166" font-size="17">再生なら <tspan font-weight="700">2</tspan></text><path d="M430 125 H490" stroke="#667085" stroke-width="5"/><polygon points="500,125 482,115 482,135" fill="#667085"/>
          <rect x="510" y="65" width="175" height="120" rx="14" fill="#f3f7f6" stroke="#75948f"/><text x="598" y="105" font-size="17" font-weight="700">電話番号を入力</text><text x="598" y="134" font-size="15">市外局番から</text><text x="598" y="163" font-size="14" fill="#667085">家族で共通番号を決める</text>
          <rect x="120" y="230" width="480" height="72" rx="14" fill="#fff1e8" stroke="#e47721"/><text x="360" y="260" font-size="17" font-weight="700">録音：171 → 1 → 電話番号 → ガイダンス</text><text x="360" y="288" font-size="17" font-weight="700">再生：171 → 2 → 電話番号 → ガイダンス</text><text x="360" y="337" font-size="14" fill="#667085">災害時に慌てないよう、体験利用日に家族で練習</text></g>
        </svg></div>`
    };return V[type]||'';
  }
  function renderTrivia(){
    triviaList.innerHTML='';const categories=[...new Set(APP_DATA.trivia.map(x=>x.category))];
    categories.forEach(category=>{
      const items=APP_DATA.trivia.filter(x=>x.category===category);const group=document.createElement('section');group.className='trivia-group nested-group';
      const gbtn=document.createElement('button');gbtn.type='button';gbtn.className='group-toggle trivia-category-toggle';gbtn.setAttribute('aria-expanded','false');gbtn.innerHTML=`<span class="category-icon">${categoryIcon(category)}</span><span class="group-title"><strong>${escapeHtml(category)}</strong><small>${items.length}項目</small></span>${makeChevron()}`;
      const body=document.createElement('div');body.className='group-body';body.hidden=true;
      items.forEach(item=>{
        const wrap=document.createElement('article');wrap.className='nested-item trivia-item';const btn=document.createElement('button');btn.type='button';btn.className='item-toggle trivia-item-toggle';btn.setAttribute('aria-expanded','false');btn.innerHTML=`<span><strong>${escapeHtml(item.title)}</strong><small>詳細を見る</small></span>${makeChevron()}`;
        const detail=document.createElement('div');detail.className='item-detail trivia-detail';detail.hidden=true;detail.innerHTML=`<p class="detail-summary">${escapeHtml(item.summary)}</p>${visual(item.visual)}<h4>ポイント</h4><ul>${item.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>${sourceLinks(item.sources)}`;
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
