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

  // 豆知識の図は横長SVGではなく、スマートフォンで縦に読めるHTML図解とする。
  // 色だけで区別せず、文章ラベルを併記する。
  function fig(title, content, note=''){
    return `<figure class="learning-figure"><figcaption class="figure-heading">${escapeHtml(title)}</figcaption>${content}${note?`<p class="figure-note">${escapeHtml(note)}</p>`:''}</figure>`;
  }
  function stepList(rows){
    return `<ol class="figure-steps">${rows.map(([title,body,emoji])=>`<li><span class="figure-step-mark" aria-hidden="true">${emoji||'●'}</span><div><strong>${escapeHtml(title)}</strong>${body?`<p>${escapeHtml(body)}</p>`:''}</div></li>`).join('')}</ol>`;
  }
  function factCards(rows){
    return `<div class="figure-facts">${rows.map(([label,body,mark])=>`<div class="figure-fact"><span class="fact-mark" aria-hidden="true">${mark||'●'}</span><div><strong>${escapeHtml(label)}</strong><p>${escapeHtml(body)}</p></div></div>`).join('')}</div>`;
  }
  function comparePanels(rows){
    return `<div class="figure-compare">${rows.map(([kind,label,body])=>`<section class="figure-compare-panel ${escapeHtml(kind)}"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(body)}</p></section>`).join('')}</div>`;
  }
  function visual(type){
    const V={
      history:fig('大地震から分かった4つの教訓',
        `<div class="figure-history">${[
          ['1995年','阪神・淡路大震災','建物倒壊や大規模火災','家具固定・耐震化・初期消火を備える'],
          ['2011年','東日本大震災','津波・広い範囲の被害・停電','避難方法と生活備蓄を考える'],
          ['2016年','熊本地震','強い揺れが繰り返し発生','一度揺れが収まっても警戒を続ける'],
          ['2024年','能登半島地震','倒壊・火災・道路の寸断','移動できない場合も想定して備える']
        ].map(row=>`<div class="history-entry"><span class="history-year">${row[0]}</span><div><strong>${row[1]}</strong><p>主な被害：${row[2]}</p><p class="history-lesson">備え：${row[3]}</p></div></div>`).join('')}</div>`,
        '被害の特徴は地震や地域によって異なります。家の安全・火災・避難・備蓄を組み合わせましょう。'),
      magnitude:fig('1つの地震でも、場所ごとに揺れは違う',
        `<div class="figure-hero figure-hero-green"><span class="figure-hero-icon" aria-hidden="true">🌍</span><div><small>地震そのものの規模</small><strong>マグニチュード（M）</strong><p>一つの地震に対する規模の指標</p></div></div><div class="figure-down-arrow" aria-hidden="true">↓ 揺れが伝わる</div>`+
        comparePanels([['location-a','地点Aの震度','震源からの距離や地盤により揺れの強さが決まる'],['location-b','地点Bの震度','同じ地震でも地点Aとは震度が異なる場合がある']]),
        '震度は0・1・2・3・4・5弱・5強・6弱・6強・7の10階級です。'),
      probability:fig('「30年以内の確率」の読み方',
        `<div class="figure-period"><span>いま</span><div class="period-line" aria-hidden="true"><i></i></div><span>30年後</span></div><div class="figure-hero figure-hero-warm"><span class="figure-hero-icon" aria-hidden="true">🗓️</span><div><strong>長い期間に起こる可能性</strong><p>「○％」は、その30年間に発生する可能性の評価です。</p></div></div>`+
        comparePanels([['location-a','分かること','長期間でみた発生の可能性'],['location-b','分からないこと','何月何日に地震が起きるか']]),
        '確率が低いから今は安全、という意味ではありません。日頃から備えることが重要です。'),
      longperiod:fig('長周期地震動は、高層階で大きく揺れることがある',
        `<div class="figure-building"><div class="building-icon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="building-text"><strong>高層ビル</strong><p>建物全体がゆっくり大きく揺れる場合があります。</p><span class="sway-sign" aria-hidden="true">←　→</span></div></div>`+
        stepList([['長くゆっくり揺れる','揺れが長時間続く場合があります。','↔'],['家具やキャスターが動く','転倒・移動・落下に注意します。','🪑'],['姿勢を低くして身を守る','むやみに移動せず、揺れが収まるのを待ちます。','🛡️']]),
        '気象庁は長周期地震動階級を1～4で発表します。'),
      hazard:fig('下京区の地震想定は、家の周りに引き寄せて考える',
        stepList([['想定される揺れを知る','京都市の地震ハザードマップを確認します。','🗺️'],['自宅の危険を見直す','建物の耐震・家具の固定・火災対策を考えます。','🏠'],['集合場所まで歩いて確かめる','道沿いのブロック塀や狭い道も確認します。','🚶'],['家族・近所で共有する','避難先と連絡方法を相談しておきます。','👨‍👩‍👧']]),
        'ハザードマップは被害想定であり、実際の地震を予報するものではありません。'),
      shelter:fig('「逃げる場所」と「生活する場所」の違い',
        comparePanels([['location-a','指定緊急避難場所','災害の危険から一時的に身を守る場所'],['location-b','指定避難所','自宅で生活できない場合に避難生活を送る施設']])+ 
        `<div class="figure-hero figure-hero-green"><span class="figure-hero-icon" aria-hidden="true">🏫</span><div><strong>植柳コミュニティセンター</strong><p>京都市の指定避難所として掲載されています。</p></div></div>`,
        '指定されていても必ず開設されるとは限りません。災害時は自治体の開設情報を確認してください。'),
      rescue:fig('救助をするときは、まず自分の安全',
        stepList([['二次災害を防ぐ','倒壊の危険や火災など、周囲の安全を確かめます。','🛡️'],['応援を呼び119番','一人で無理をせず、周囲に協力を求めます。','📞'],['反応・呼吸を確認','安全な場所で確認し、普段どおりの呼吸がないときは胸骨圧迫を行います。','❤️'],['AEDがあれば使用','音声案内に従い、救急隊へ引き継ぎます。','⚡']]),
        '倒壊建物など危険な場所への立入りや無理な救出は避け、消防など専門機関に任せてください。'),
      aed:fig('AEDの使い方：機械の声に従う',
        stepList([['119番通報・AEDを依頼','周囲の人に役割を頼み、救命処置を始めます。','📞'],['AEDの電源を入れる','ふたを開けるなど、機種の音声案内に従います。','🔌'],['胸にパッドを貼る','図に示された位置へ貼ります。','🩹'],['解析中は触れない','機械が心電図を調べている間は離れます。','⏸️'],['指示があればショック','誰も体に触れていないことを確認します。','⚡'],['胸骨圧迫を再開','AEDの指示に従い救急隊が来るまで続けます。','❤️']]),
        'AEDは必要な場合にのみ電気ショックを指示します。倒れて反応・普段どおりの呼吸がない場合は、ためらわず救命処置を行います。'),
      extinguisher:fig('消火器の基本は「ピン → ホース → レバー」',
        stepList([['安全を確認する','退路を確保し、周囲に火事を知らせます。','🚪'],['安全栓を引き抜く','上部のピンを抜きます。','①'],['ホースを火元へ向ける','炎ではなく燃えている物の根元を狙います。','②'],['レバーを強く握る','姿勢を低くして放射します。','③']]),
        '火が大きい・煙が多い・逃げ道が危険なときは消火をやめ、直ちに避難して119番通報します。'),
      breaker:fig('感震ブレーカーが動く仕組み',
        stepList([['強い地震の揺れ','設定以上の揺れを感知します。','〰️'],['電気を自動で遮断','製品の方式に応じて通電を止めます。','🔌'],['電気火災の危険を減らす','復電時などの出火リスクを低減します。','🛡️']])+
        `<h5 class="figure-subheading">主なタイプ</h5>`+
        factCards([['分電盤型','家の分電盤で電気を遮断する','🏠'],['コンセント型','特定のコンセントの通電を遮断する','🔌'],['簡易型','おもり・ばね等でブレーカーを操作する','⚙️']]),
        '停電すると照明や医療機器等にも影響します。設置前に製品の特性を確認し、非常用照明も準備します。'),
      alarm:fig('住宅用火災警報器には2つの見分け方',
        `<h5 class="figure-subheading">① 何を感知するか</h5>`+
        factCards([['煙式','煙を感知。住宅で広く使われる方式','💨'],['熱式','周囲の温度上昇を感知','🌡️']])+
        `<h5 class="figure-subheading">② どこで警報が鳴るか</h5>`+
        factCards([['単独型','火災を感知した機器が鳴る','🔔'],['連動型','連動設定した他の警報器も鳴る','📣']]),
        '定期的に作動を確認し、設置後おおむね10年を目安に機器の交換を検討します。'),
      blockwall:fig('危ないブロック塀を見つけるポイント',
        `<div class="figure-wall-area"><div class="figure-wall" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span class="wall-crack">⚡</span></div><div><strong>気づきたいサイン</strong><p>ひび割れ・傾き・ぐらつき</p><p>高すぎる塀、控え壁・基礎の不備</p></div></div>`+
        stepList([['普段から状態を確認する','不安があれば専門家へ相談します。','👀'],['地震の後は近づかない','倒壊する危険がある塀から離れます。','⚠️'],['危険箇所は地域と共有','避難経路を変えるなど安全を確保します。','📣']]),
        '外見だけで構造の安全性は判断できません。危険が疑われる場合は近づかないでください。'),
      furniture:fig('家具は「固定」と「置く場所」の両方を考える',
        comparePanels([['danger','危険な置き方','倒れた家具が寝床や出入口をふさぐ'],['safe','安全に近づける工夫','壁の下地に固定し、寝床・出口を転倒方向から外す']])+
        stepList([['家具を壁に固定する','適切な金具などで壁の下地に固定します。','🔧'],['寝室・通路を空ける','大きな家具の配置と倒れる向きを見直します。','🚪'],['中身も落とさない','扉の開放やガラスの飛散も防ぎます。','📚']]),
        '固定方法は家具・壁の種類に合ったものを選んでください。'),
      stock:fig('ローリングストックは「買う→使う→買い足す」',
        stepList([['少し多めに買う','普段食べる食品や水を必要量より少し多く用意します。','🛒'],['古いものから使う','日常生活で使い、賞味期限切れを防ぎます。','🍚'],['使った分を買い足す','常に一定量が家庭に残るように補充します。','🛍️']])+
        `<div class="figure-repeat">↻　この流れをくり返す</div>`,
        '最低3日分、できれば1週間分を目安に、水・食料のほか携帯トイレや常備薬も備えましょう。'),
      '171':fig('171（災害用伝言ダイヤル）の操作',
        `<div class="figure-dial"><span aria-hidden="true">☎</span><strong>まず「171」に電話する</strong></div>`+
        comparePanels([['location-a','録音する場合','ガイダンスに従い「1」を押す'],['location-b','再生する場合','ガイダンスに従い「2」を押す']])+
        `<div class="figure-down-arrow" aria-hidden="true">↓</div><div class="figure-hero figure-hero-green"><span class="figure-hero-icon" aria-hidden="true">📱</span><div><strong>連絡先の電話番号を入力</strong><p>市外局番から。あとは音声ガイダンスに従う。</p></div></div>`,
        '家族で共通して使う電話番号を事前に決め、体験利用日に練習しておきましょう。')
    };
    return V[type]||'';
  }
  function renderTrivia(){
    triviaList.innerHTML='';const categories=[...new Set(APP_DATA.trivia.map(x=>x.category))];
    categories.forEach(category=>{
      const items=APP_DATA.trivia.filter(x=>x.category===category);const group=document.createElement('section');group.className='trivia-group nested-group';
      const gbtn=document.createElement('button');gbtn.type='button';gbtn.className='group-toggle trivia-category-toggle';gbtn.setAttribute('aria-expanded','false');gbtn.innerHTML=`<span class="category-icon">${categoryIcon(category)}</span><span class="group-title"><strong>${escapeHtml(category)}</strong><small>${items.length}項目</small></span>${makeChevron()}`;
      const body=document.createElement('div');body.className='group-body';body.hidden=true;
      items.forEach(item=>{
        const wrap=document.createElement('article');wrap.className='nested-item trivia-item';const btn=document.createElement('button');btn.type='button';btn.className='item-toggle trivia-item-toggle';btn.setAttribute('aria-expanded','false');btn.innerHTML=`<span><strong>${escapeHtml(item.title)}</strong><small>詳細を見る</small></span>${makeChevron()}`;
        const detail=document.createElement('div');detail.className='item-detail trivia-detail';detail.hidden=true;detail.innerHTML=`<p class="detail-summary">${escapeHtml(item.summary)}</p>${visual(item.visual)}<h4>ポイント</h4><ul>${item.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>`;
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
