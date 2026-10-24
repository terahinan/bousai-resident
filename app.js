(() => {
  'use strict';

  const STORAGE = {
    role: 'jishin-role',
    quake: 'jishin-quake-time',
    tasks: 'jishin-task-checks',
    prep: 'jishin-preparedness-checks-v3'
  };

  const TRIVIA_IMAGES = {
    '過去の大きな地震から学ぶ': {
      src: './images/trivia/01-past-earthquakes.webp',
      alt: '過去の大きな地震から学ぶの図解'
    },
    'マグニチュードと震度': {
      src: './images/trivia/02-magnitude-and-intensity.webp',
      alt: 'マグニチュードと震度の図解'
    },
    '地震の発生確率': {
      src: './images/trivia/03-earthquake-probability.webp',
      alt: '南海トラフ地震の発生確率の図解'
    },
    '長周期地震動': {
      src: './images/trivia/04-long-period-ground-motion.webp',
      alt: '長周期地震動の図解'
    },
    '下京区の地震想定': {
      src: './images/trivia/05-shimogyo-scenario.webp',
      alt: '下京区の地震想定の図解'
    },
    '指定避難所・指定緊急避難場所': {
      src: './images/trivia/06-designated-shelters.webp',
      alt: '指定避難所・指定緊急避難場所の図解'
    },
    '救命救助するときの基本': {
      src: './images/trivia/07-life-saving-basics.webp',
      alt: '救命救助するときの基本の図解'
    },
    'AEDの原理と使い方': {
      src: './images/trivia/08-aed-howto.webp',
      alt: 'AEDの原理と使い方の図解'
    },
    '消火器の種類と使い方': {
      src: './images/trivia/09-fire-extinguisher.webp',
      alt: '消火器の種類と使い方の図解'
    },
    '感震ブレーカーの種類': {
      src: './images/trivia/10-seismic-breaker.webp',
      alt: '感震ブレーカーの種類の図解'
    },
    '住宅用火災警報器の種類': {
      src: './images/trivia/11-fire-alarm.webp',
      alt: '住宅用火災警報器の種類の図解'
    },
    '危険なブロック塀': {
      src: './images/trivia/12-block-wall.webp',
      alt: '危険なブロック塀の図解'
    },
    '家具の転倒防止': {
      src: './images/trivia/13-furniture-safety.webp',
      alt: '家具の転倒防止の図解'
    },
    'ローリングストック': {
      src: './images/trivia/14-rolling-stock.webp',
      alt: 'ローリングストックの図解'
    },
    '災害用伝言ダイヤル171': {
      src: './images/trivia/15-message-dial-171.webp',
      alt: '災害用伝言ダイヤル171の図解'
    }
  };

  const $ = id => document.getElementById(id);
  const roleSelect = $('roleSelect');
  const quakeDate = $('quakeDate');
  const quakeTime = $('quakeTime');
  const elapsedText = $('elapsedText');
  const taskList = $('taskList');
  const taskCount = $('taskCount');
  const preparednessList = $('preparednessList');
  const preparednessCount = $('preparednessCount');
  const preparednessProgress = $('preparednessProgress');
  const triviaList = $('triviaList');

  let quakeAt = null;
  let taskChecks = loadObject(STORAGE.tasks);
  let prepChecks = loadObject(STORAGE.prep);
  let imageModal = null;
  let imageModalImg = null;
  let imageModalCaption = null;

  function loadObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  }

  function saveObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[ch]));
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function dateValue(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function timeValue(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function elapsedMinutes() {
    return quakeAt ? Math.max(0, Math.floor((Date.now() - quakeAt.getTime()) / 60000)) : null;
  }

  function formatDuration(min) {
    if (min < 60) return `${min}分`;
    if (min < 1440) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return m ? `${h}時間${m}分` : `${h}時間`;
    }
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    return h ? `${d}日${h}時間` : `${d}日`;
  }

  function formatRange(start, end) {
    return start === end ? formatDuration(start) : `${formatDuration(start)}〜${formatDuration(end)}`;
  }

  function statusForTask(task, elapsed, checked) {
    if (checked) return { label: '完了', className: 'done' };
    if (elapsed === null || elapsed < task.startMin) return { label: 'これから', className: '' };
    if (elapsed >= task.startMin && elapsed <= task.endMin) return { label: '今やる', className: 'now' };
    return { label: '要確認', className: 'overdue' };
  }

  function setQuakeDate(date, activeMinutes = null) {
    quakeAt = date;
    localStorage.setItem(STORAGE.quake, date.toISOString());
    quakeDate.value = dateValue(date);
    quakeTime.value = timeValue(date);
    document.querySelectorAll('[data-minutes]').forEach(btn => {
      btn.classList.toggle('active', activeMinutes !== null && Number(btn.dataset.minutes) === activeMinutes);
    });
    renderActionSection();
  }

  function combineDateTime() {
    if (!quakeDate.value || !quakeTime.value) return null;
    const d = new Date(`${quakeDate.value}T${quakeTime.value}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function renderActionSection() {
    const role = roleSelect.value || APP_DATA.roles[0];
    const elapsed = elapsedMinutes();
    const tasks = APP_DATA.tasks.filter(task => task.role === role);

    elapsedText.textContent = elapsed === null
      ? '発生時刻を選択してください。'
      : `地震発生から ${formatDuration(elapsed)} 経過しています。`;

    taskCount.textContent = `${tasks.length}件`;
    taskList.innerHTML = '';

    if (elapsed === null) {
      taskList.innerHTML = '<div class="empty-state">発生時刻を選択すると、すべての行動項目を時期とともに表示します。</div>';
      return;
    }

    tasks.forEach(task => {
      const checked = !!taskChecks[task.id];
      const status = statusForTask(task, elapsed, checked);
      const card = document.createElement('article');
      card.className = `task-item ${checked ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="task-head">
          <input class="task-check" type="checkbox" ${checked ? 'checked' : ''} aria-label="${escapeHtml(task.title)}を完了">
          <div>
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <div class="task-meta">
              <span class="pill ${status.className}">${status.label}</span>
              <span class="pill">目安：${escapeHtml(formatRange(task.startMin, task.endMin))}</span>
            </div>
            <p class="task-detail">${escapeHtml(task.detail)}</p>
            ${task.note ? `<p class="task-note">注意：${escapeHtml(task.note)}</p>` : ''}
          </div>
        </div>`;

      card.querySelector('.task-check').addEventListener('change', event => {
        taskChecks[task.id] = event.target.checked;
        saveObject(STORAGE.tasks, taskChecks);
        renderActionSection();
      });

      taskList.appendChild(card);
    });
  }

  function makeChevron() {
    return '<span class="nested-chevron" aria-hidden="true">⌄</span>';
  }

  function toggleButton(button, body, wrap) {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
    wrap?.classList.toggle('is-open', !open);
  }

  function renderPreparedness() {
    preparednessList.innerHTML = '';
    const goals = [...new Set(APP_DATA.preparedness.map(x => x.goal))];

    goals.forEach((goal, idx) => {
      const items = APP_DATA.preparedness.filter(x => x.goal === goal);
      const done = items.filter(x => prepChecks[x.id]).length;
      const group = document.createElement('section');
      group.className = 'goal-group nested-group';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'group-toggle';
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `
        <span class="goal-index">${idx + 1}</span>
        <span class="group-title"><strong>${escapeHtml(goal)}</strong><small>${done} / ${items.length} 実施</small></span>
        ${makeChevron()}`;

      const body = document.createElement('div');
      body.className = 'group-body';
      body.hidden = true;

      items.forEach(item => {
        const wrap = document.createElement('article');
        wrap.className = `nested-item prep-item ${prepChecks[item.id] ? 'is-checked' : ''}`;

        const row = document.createElement('div');
        row.className = 'prep-row';
        row.innerHTML = `
          <label class="prep-check-label">
            <input type="checkbox" ${prepChecks[item.id] ? 'checked' : ''} aria-label="${escapeHtml(item.title)}を実施済みにする">
            <span class="prep-check-box" aria-hidden="true"></span>
          </label>
          <button type="button" class="item-toggle" aria-expanded="false"><span>${escapeHtml(item.title)}</span>${makeChevron()}</button>`;

        const detail = document.createElement('div');
        detail.className = 'item-detail';
        detail.hidden = true;
        detail.innerHTML = `<p class="detail-summary">${escapeHtml(item.summary)}</p><h4>確認のポイント</h4><ul>${item.points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;

        const checkbox = row.querySelector('input');
        const toggle = row.querySelector('.item-toggle');
        checkbox.addEventListener('change', () => {
          prepChecks[item.id] = checkbox.checked;
          saveObject(STORAGE.prep, prepChecks);
          wrap.classList.toggle('is-checked', checkbox.checked);
          updatePreparednessProgress();
          const newDone = items.filter(x => prepChecks[x.id]).length;
          button.querySelector('small').textContent = `${newDone} / ${items.length} 実施`;
        });
        toggle.addEventListener('click', () => toggleButton(toggle, detail, wrap));

        wrap.append(row, detail);
        body.appendChild(wrap);
      });

      button.addEventListener('click', () => toggleButton(button, body, group));
      group.append(button, body);
      preparednessList.appendChild(group);
    });

    updatePreparednessProgress();
  }

  function updatePreparednessProgress() {
    const total = APP_DATA.preparedness.length;
    const done = APP_DATA.preparedness.filter(x => prepChecks[x.id]).length;
    preparednessCount.textContent = `${done} / ${total}`;
    preparednessProgress.max = total;
    preparednessProgress.value = done;
  }

  function buildTriviaImage(item) {
    const image = TRIVIA_IMAGES[item.title];
    if (!image) return '';
    return `
      <button type="button" class="trivia-image-button" data-image-src="${escapeHtml(image.src)}" data-image-alt="${escapeHtml(image.alt)}" aria-label="${escapeHtml(item.title)}の画像を拡大して見る">
        <span class="trivia-image-frame">
          <img class="trivia-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async">
        </span>
        <span class="trivia-image-hint">画像をタップして拡大</span>
      </button>`;
  }

  function renderTrivia() {
    triviaList.innerHTML = '';
    const categories = [...new Set(APP_DATA.trivia.map(x => x.category))];

    categories.forEach(category => {
      const items = APP_DATA.trivia.filter(x => x.category === category);
      const group = document.createElement('section');
      group.className = 'trivia-group nested-group';

      const groupButton = document.createElement('button');
      groupButton.type = 'button';
      groupButton.className = 'group-toggle trivia-category-toggle';
      groupButton.setAttribute('aria-expanded', 'false');
      groupButton.innerHTML = `
        <span class="category-icon">${categoryIcon(category)}</span>
        <span class="group-title"><strong>${escapeHtml(category)}</strong><small>${items.length}項目</small></span>
        ${makeChevron()}`;

      const body = document.createElement('div');
      body.className = 'group-body';
      body.hidden = true;

      items.forEach(item => {
        const wrap = document.createElement('article');
        wrap.className = 'nested-item trivia-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'item-toggle trivia-item-toggle';
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = `<span><strong>${escapeHtml(item.title)}</strong><small>詳細を見る</small></span>${makeChevron()}`;

        const detail = document.createElement('div');
        detail.className = 'item-detail trivia-detail';
        detail.hidden = true;
        detail.innerHTML = `
          <p class="detail-summary">${escapeHtml(item.summary)}</p>
          ${buildTriviaImage(item)}
          <h4>ポイント</h4>
          <ul>${item.points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;

        detail.querySelectorAll('.trivia-image-button').forEach(imageButton => {
          imageButton.addEventListener('click', event => {
            event.stopPropagation();
            openImageModal(imageButton.dataset.imageSrc, imageButton.dataset.imageAlt);
          });
        });

        button.addEventListener('click', () => toggleButton(button, detail, wrap));
        wrap.append(button, detail);
        body.appendChild(wrap);
      });

      groupButton.addEventListener('click', () => toggleButton(groupButton, body, group));
      group.append(groupButton, body);
      triviaList.appendChild(group);
    });
  }

  function ensureImageModal() {
    if (imageModal) return;

    imageModal = document.createElement('div');
    imageModal.className = 'image-modal';
    imageModal.hidden = true;
    imageModal.setAttribute('aria-hidden', 'true');
    imageModal.innerHTML = `
      <div class="image-modal-backdrop" data-close="true"></div>
      <div class="image-modal-dialog" role="dialog" aria-modal="true" aria-label="画像を拡大表示">
        <button type="button" class="image-modal-close" aria-label="閉じる">×</button>
        <img class="image-modal-image" src="" alt="">
        <p class="image-modal-caption"></p>
      </div>`;

    document.body.appendChild(imageModal);
    imageModalImg = imageModal.querySelector('.image-modal-image');
    imageModalCaption = imageModal.querySelector('.image-modal-caption');

    imageModal.addEventListener('click', event => {
      if (event.target.dataset.close === 'true' || event.target.classList.contains('image-modal-close')) {
        closeImageModal();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && imageModal && !imageModal.hidden) {
        closeImageModal();
      }
    });
  }

  function openImageModal(src, alt) {
    ensureImageModal();
    imageModalImg.src = src;
    imageModalImg.alt = alt || '';
    imageModalCaption.textContent = alt || '';
    imageModal.hidden = false;
    imageModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeImageModal() {
    if (!imageModal) return;
    imageModal.hidden = true;
    imageModal.setAttribute('aria-hidden', 'true');
    imageModalImg.src = '';
    imageModalImg.alt = '';
    imageModalCaption.textContent = '';
    document.body.classList.remove('modal-open');
  }

  function categoryIcon(category) {
    if (category.includes('地震')) return '🌏';
    if (category.includes('京都')) return '📍';
    if (category.includes('命')) return '🫶';
    if (category.includes('火災')) return '🧯';
    if (category.includes('住まい')) return '🏠';
    return '🎒';
  }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  APP_DATA.roles.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    roleSelect.appendChild(option);
  });

  roleSelect.value = localStorage.getItem(STORAGE.role) || APP_DATA.roles[0];
  roleSelect.addEventListener('change', () => {
    localStorage.setItem(STORAGE.role, roleSelect.value);
    renderActionSection();
  });

  document.querySelectorAll('[data-minutes]').forEach(btn => btn.addEventListener('click', () => {
    const min = Number(btn.dataset.minutes);
    setQuakeDate(new Date(Date.now() - min * 60000), min);
  }));

  const manualDateUpdate = () => {
    const date = combineDateTime();
    if (date) setQuakeDate(date, null);
  };
  quakeDate.addEventListener('change', manualDateUpdate);
  quakeTime.addEventListener('change', manualDateUpdate);

  const saved = localStorage.getItem(STORAGE.quake);
  if (saved) {
    const date = new Date(saved);
    if (!Number.isNaN(date.getTime())) setQuakeDate(date, null);
  }

  $('resetTaskChecks').addEventListener('click', () => {
    if (confirm('やること一覧のチェックをすべて外しますか？')) {
      taskChecks = {};
      saveObject(STORAGE.tasks, taskChecks);
      renderActionSection();
    }
  });

  $('resetPreparedness').addEventListener('click', () => {
    if (confirm('防災取組チェックをすべて外しますか？')) {
      prepChecks = {};
      saveObject(STORAGE.prep, prepChecks);
      renderPreparedness();
    }
  });

  $('refreshButton').addEventListener('click', async () => {
    const button = $('refreshButton');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = '更新中…';
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) await registration.update();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('jishin-ni-sonaeru-')).map(key => caches.delete(key)));
      }
      toast('最新版を読み込みます');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = oldText;
      toast('更新できませんでした。通信状況を確認してください。');
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.error));
  }

  renderActionSection();
  renderPreparedness();
  renderTrivia();
  setInterval(() => {
    if (quakeAt) renderActionSection();
  }, 60000);
})();
