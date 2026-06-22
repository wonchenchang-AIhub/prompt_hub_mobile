/* ════════════════════════════════════════════════════════════
   app.js  v5  ·  AI 提示詞資料庫 · Mobile
   修正：
   ① 移除巢狀反引號（Safari Mobile 相容性問題）
   ② 案例區塊改用 DOM 方法建立，不用 innerHTML 注入
   ③ 所有 innerHTML 字串改用字串串接，不用 template literal
════════════════════════════════════════════════════════════ */

'use strict';

/* ── State ───────────────────────────────────────────────── */
var currentCat  = 'all';
var searchQuery = '';
var currentView = 'home';
var sheetId     = null;

/* ── Case cache ──────────────────────────────────────────── */
window.__caseCache = [];
var __sheetCache   = [];

function storeCase(text) {
  window.__caseCache.push(text);
  return window.__caseCache.length - 1;
}

/* ── LocalStorage ────────────────────────────────────────── */
/* ── Copy-count persistence (GitHub Gist + localStorage fallback) ───────── */
var _JSONBIN_KEY = '$2a$10$WRBPAEz0JT3wvVYlWyg07ewTjQaoZpsM8BEmJx5O/E3w2B5gwvE1y';
var _BIN_ID     = '6a389834f5f4af5e291a94f6';
var _BIN_URL    = 'https://api.jsonbin.io/v3/b/6a389834f5f4af5e291a94f6';
var _LS_KEY     = 'prompt_copy_counts';
var _memCounts  = null;
var _pushTimer  = null;

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }

function getCnt(id) {
  return (_memCounts || lsGet(_LS_KEY) || {})[id] || 0;
}


function refreshAllCountPills() {
  if (!_memCounts) return;
  document.querySelectorAll('.prompt-card[data-id]').forEach(function(card) {
    var id  = parseInt(card.getAttribute('data-id'));
    var cnt = (_memCounts[id] || 0);
    var pill = card.querySelector('.copy-count-pill');
    if (cnt > 0) {
      if (!pill) {
        var actions = card.querySelector('.card-actions');
        if (actions) {
          pill = document.createElement('span');
          pill.className = 'copy-count-pill';
          actions.appendChild(pill);
        }
      }
      if (pill) pill.textContent = '⎘ ' + fmt(cnt);
    }
  });
}

function syncFromGist() {
  fetch(_BIN_URL + '/latest', {
    headers: { 'X-Master-Key': _JSONBIN_KEY }
  })
  .then(function(r) { return r.ok ? r.json() : null; })
  .then(function(data) {
    if (!data || !data.record) return;
    var remote = data.record.counts || {};
    var local  = _lsLoad();
    var merged = Object.assign({}, _INIT_COUNTS);
    Object.keys(remote).forEach(function(k) {
      merged[k] = Math.max(parseInt(merged[k])||0, parseInt(remote[k])||0);
    });
    Object.keys(local).forEach(function(k) {
      merged[k] = Math.max(parseInt(merged[k])||0, parseInt(local[k])||0);
    });
    _memCounts = merged;
    _lsSave(merged);
    refreshAllCountPills();
  })
  .catch(function() {
    _memCounts = _lsLoad();
    refreshAllCountPills();
  });
}

function pushToBin() {
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(function() {
    var payload = JSON.stringify({ counts: _memCounts || _lsLoad() });
    fetch(_BIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': _JSONBIN_KEY
      },
      body: payload
    }).catch(function() {});
  }, 2000);
}

function incCnt(id) {
  var c = _memCounts || lsGet(_LS_KEY) || {};
  c[id] = (c[id] || 0) + 1;
  _memCounts = c;
  lsSet(_LS_KEY, c);
  lsSet('cnt', c);
  pushToBin();
  return c[id];
}

window.addEventListener('DOMContentLoaded', function() {
  var _INIT_COUNTS = {"1":18,"3":6,"4":8,"5":7,"6":7,"7":7,"9":9,"10":14,"11":11,"12":14,"13":11,"14":8,"15":8,"16":8,"17":8,"18":9,"19":22,"81":18,"20":9,"21":12,"22":9,"23":12,"24":11,"25":9,"26":12,"27":7,"28":5,"29":7,"30":7,"31":9,"32":8,"33":11,"34":10,"35":10,"36":11,"37":9,"38":8,"39":9,"40":7,"41":7,"43":7,"44":9,"45":7,"46":5,"47":8,"48":9,"49":5,"50":8,"51":5,"52":9,"8":16,"53":11,"54":9,"55":11,"56":8,"57":7,"58":7,"59":8,"60":9,"61":7,"62":10,"63":9,"64":12,"65":11,"66":12,"67":11,"68":6,"69":7,"70":7,"71":6,"72":7,"73":5,"74":22,"75":9,"76":12,"77":9,"78":9,"79":11,"80":11,"82":7,"83":11,"84":7,"85":11,"86":8,"87":9,"88":7,"89":7,"90":12,"91":9,"92":8,"102":9,"103":12,"104":10,"105":9,"106":11,"107":11,"108":11,"109":9};
  var _storedCounts = lsGet(_LS_KEY) || lsGet('cnt');
  if (_storedCounts && Object.keys(_storedCounts).length > 0) {
    var merged = Object.assign({}, _INIT_COUNTS);
    Object.keys(_storedCounts).forEach(function(k) {
      merged[k] = Math.max(parseInt(merged[k])||0, parseInt(_storedCounts[k])||0);
    });
    _memCounts = merged;
  } else {
    _memCounts = Object.assign({}, _INIT_COUNTS);
  }
  syncFromGist();
});



function fmt(n)      { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

function getRecent()   { return lsGet('recent') || []; }
function addRecent(id) { var r = getRecent().filter(function(x){ return x !== id; }); r.unshift(id); lsSet('recent', r.slice(0, 20)); }
function getFavs()     { return lsGet('favs') || []; }
function isFav(id)     { return getFavs().indexOf(id) !== -1; }
function toggleFav(id) {
  var f = getFavs();
  if (f.indexOf(id) !== -1) { f = f.filter(function(x){ return x !== id; }); }
  else { f.unshift(id); }
  lsSet('favs', f);
  return f.indexOf(id) !== -1;
}

/* ── Helpers ─────────────────────────────────────────────── */
function catInfo(key) {
  return (typeof CATEGORIES !== 'undefined' && CATEGORIES[key]) || { label: key, icon: '◉', class: '' };
}
function getCases(pid) {
  return (typeof CASES_BY_PROMPT !== 'undefined' && CASES_BY_PROMPT[pid]) || [];
}
function previewText(txt) {
  return txt.replace(/#+\s/g, '').replace(/[│|]/g, '').replace(/\n+/g, ' ').trim();
}
function tagCls(type) { return type === 'practice' ? 'practice' : ''; }

/* HTML 轉義 - 只用字串方法，不用正則 */
function esc(s) {
  return String(s)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function doCopy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function(res) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    res();
  });
}

/* ════════════════════════════════════════════════════════════
   buildCard  — 完全用字串串接，不用巢狀 template literal
   這樣 Safari Mobile 不會有解析問題
════════════════════════════════════════════════════════════ */
function buildCard(p, idx) {
  var cat   = catInfo(p.cat);
  var cnt   = getCnt(p.id);
  var cases = getCases(p.id);

  /* ① 藍色「複製提示詞」按鈕 */
  var copyBtn = '<button class="btn-copy-prompt" onclick="cardCopyPrompt(event,this,' + p.id + ')">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="9" y="9" width="13" height="13" rx="2"/>'
    + '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
    + '</svg>複製提示詞</button>';

  if (cnt > 0) {
    copyBtn += '<span class="copy-count-pill">\u29d8 ' + fmt(cnt) + '</span>';
  }

  /* ② 案例折疊區（綠色「複製案例」按鈕） */
  var casesHtml = '';
  if (cases.length) {
    var items = '';
    for (var ci = 0; ci < cases.length; ci++) {
      var c       = cases[ci];
      var cacheIdx = storeCase(c.prompt);
      var badgeCls = 'case-type-badge' + (tagCls(c.type) ? ' ' + tagCls(c.type) : '');
      items += '<div class="case-card">'
        + '<div class="case-card-head">'
        + '<span class="' + badgeCls + '">' + esc(c.typeLabel) + '</span>'
        + '<button class="btn-copy-case" onclick="cardCopyCase(event,this,' + cacheIdx + ')">\u29d8 \u8907\u88fd\u6848\u4f8b</button>'
        + '</div>'
        + '<div class="case-name">' + esc(c.title) + '</div>'
        + '<div class="case-scene-text">' + esc(c.scene) + '</div>'
        + '</div>';
    }
    casesHtml = '<button class="cases-toggle-btn" onclick="toggleCases(event,this)">'
      + '<span class="cases-toggle-arrow">\u25b6</span>'
      + '\ud83d\udccb \u5be6\u6230\u6848\u4f8b'
      + '<span class="cases-count-pill">' + cases.length + ' \u500b</span>'
      + '</button>'
      + '<div class="cases-body">' + items + '</div>';
  }

  /* ③ 完整卡片 */
  var delay = Math.min(idx * 0.02, 0.4);
  return '<div class="prompt-card ' + cat.class + '" style="animation-delay:' + delay + 's" data-id="' + p.id + '">'
    + '<div class="card-main" onclick="openSheet(' + p.id + ')">'
    + '<div class="card-body">'
    + '<div class="card-title">' + esc(p.title) + '</div>'
    + '<div class="card-preview">' + esc(previewText(p.content)) + '</div>'
    + '</div>'
    + '<svg class="card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline points="9 18 15 12 9 6"/>'
    + '</svg>'
    + '</div>'
    + '<div class="card-actions">' + copyBtn + '</div>'
    + casesHtml
    + '</div>';
}

/* ── Render cards ────────────────────────────────────────── */
function renderCards() {
  window.__caseCache = [];
  var grid = document.getElementById('cardGrid');
  var q    = searchQuery.toLowerCase();

  var list = PROMPTS.filter(function(p) {
    var matchCat = (currentCat === 'all') || (p.cat === currentCat);
    var matchQ   = !q || p.title.toLowerCase().indexOf(q) !== -1 || p.content.toLowerCase().indexOf(q) !== -1;
    return matchCat && matchQ;
  });

  document.getElementById('count-all').textContent = PROMPTS.length;

  if (!list.length) {
    grid.innerHTML = '<div class="no-results"><div class="no-results-icon">\u25ce</div><p>\u627e\u4e0d\u5230\u7b26\u5408\u7684\u63d0\u793a\u8a5e</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    html += buildCard(list[i], i);
  }
  grid.innerHTML = html;
}

/* ── Copy: prompt (blue) ─────────────────────────────────── */
function cardCopyPrompt(e, btn, id) {
  e.stopPropagation();
  var p = null;
  for (var i = 0; i < PROMPTS.length; i++) {
    if (PROMPTS[i].id === id) { p = PROMPTS[i]; break; }
  }
  if (!p) return;
  doCopy(p.content).then(function() {
    var n = incCnt(id);
    addRecent(id);
    btn.classList.add('copied');
    btn.textContent = '\u2713 \u5df2\u8907\u88fd\uff01';
    setTimeout(function() {
      btn.classList.remove('copied');
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>\u8907\u88fd\u63d0\u793a\u8a5e';
    }, 2000);
    /* update badge */
    var card = document.querySelector('.prompt-card[data-id="' + id + '"]');
    if (card) {
      var pill = card.querySelector('.copy-count-pill');
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'copy-count-pill';
        card.querySelector('.card-actions').appendChild(pill);
      }
      pill.textContent = '\u29d8 ' + fmt(n);
    }
  });
}

/* ── Copy: case (green) ──────────────────────────────────── */
function cardCopyCase(e, btn, idx) {
  e.stopPropagation();
  var text = window.__caseCache[idx] || '';
  if (!text) return;
  doCopy(text).then(function() {
    btn.classList.add('copied');
    btn.textContent = '\u2713 \u5df2\u8907\u88fd';
    setTimeout(function() {
      btn.classList.remove('copied');
      btn.textContent = '\u29d8 \u8907\u88fd\u6848\u4f8b';
    }, 2000);
  });
}

/* ── Toggle case list ────────────────────────────────────── */
function toggleCases(e, btn) {
  e.stopPropagation();
  var body = btn.nextElementSibling;
  btn.classList.toggle('open');
  body.classList.toggle('open');
}

/* ── Open detail sheet ───────────────────────────────────── */
function openSheet(id) {
  __sheetCache = [];
  var p = null;
  for (var i = 0; i < PROMPTS.length; i++) {
    if (PROMPTS[i].id === id) { p = PROMPTS[i]; break; }
  }
  if (!p) return;
  sheetId = id;
  addRecent(id);

  var cat = catInfo(p.cat);

  var catTag = document.getElementById('sheetCat');
  catTag.textContent = cat.icon + ' ' + cat.label;
  catTag.style.cssText = 'background:' + catLt(p.cat) + ';color:' + catColor(p.cat) + ';';
  document.getElementById('sheetTitle').textContent   = p.title;
  document.getElementById('sheetContent').textContent = p.content;
  document.getElementById('sheetFav').classList.toggle('faved', isFav(id));

  var n = getCnt(id);
  document.getElementById('copyCountBadge').textContent = n > 0 ? '\u5df2\u8907\u88fd ' + n + ' \u6b21' : '';

  /* cases */
  var cases   = getCases(id);
  var casesEl = document.getElementById('sheetCases');
  casesEl.innerHTML = '';

  if (cases.length) {
    var titleEl = document.createElement('div');
    titleEl.className = 'cases-section-title';
    titleEl.textContent = '\ud83d\udccb \u5be6\u6230\u6848\u4f8b\uff08' + cases.length + ' \u500b\uff09';
    casesEl.appendChild(titleEl);

    for (var ci = 0; ci < cases.length; ci++) {
      var c   = cases[ci];
      var idx = __sheetCache.length;
      __sheetCache.push(c.prompt);

      var caseEl = document.createElement('div');
      caseEl.className = 'sheet-case';

      /* header */
      var headEl = document.createElement('div');
      headEl.className = 'sheet-case-head';

      var badge = document.createElement('span');
      badge.className = 'case-type-badge' + (tagCls(c.type) ? ' ' + tagCls(c.type) : '');
      badge.textContent = c.typeLabel;
      headEl.appendChild(badge);

      var titleDiv = document.createElement('div');
      titleDiv.className = 'sheet-case-title';
      titleDiv.textContent = c.title;
      headEl.appendChild(titleDiv);

      var copyBtn = document.createElement('button');
      copyBtn.className = 'sheet-case-copy';
      copyBtn.textContent = '\u29d8 \u8907\u88fd';
      copyBtn.setAttribute('data-idx', idx);
      copyBtn.addEventListener('click', function() {
        var i2 = parseInt(this.getAttribute('data-idx'));
        var t  = __sheetCache[i2] || '';
        if (!t) return;
        var self = this;
        doCopy(t).then(function() {
          self.classList.add('copied');
          self.textContent = '\u2713 \u5df2\u8907\u88fd';
          setTimeout(function() {
            self.classList.remove('copied');
            self.textContent = '\u29d8 \u8907\u88fd';
          }, 2000);
        });
      });
      headEl.appendChild(copyBtn);
      caseEl.appendChild(headEl);

      /* scene */
      var sceneSection = document.createElement('div');
      sceneSection.className = 'sheet-case-section';
      sceneSection.innerHTML = '<div class="sheet-case-section-label">\ud83d\udccd \u60c5\u5883</div>';
      var sceneText = document.createElement('div');
      sceneText.className = 'sheet-case-text';
      sceneText.textContent = c.scene;
      sceneSection.appendChild(sceneText);
      caseEl.appendChild(sceneSection);

      /* prep */
      if (c.prep) {
        var prepSection = document.createElement('div');
        prepSection.className = 'sheet-case-section';
        prepSection.innerHTML = '<div class="sheet-case-section-label">\ud83d\udd27 \u6e96\u5099</div>';
        var prepText = document.createElement('div');
        prepText.className = 'sheet-case-text';
        prepText.textContent = c.prep;
        prepSection.appendChild(prepText);
        caseEl.appendChild(prepSection);
      }

      /* tips */
      if (c.tips && c.tips.length) {
        var tipsSection = document.createElement('div');
        tipsSection.className = 'sheet-case-section';
        tipsSection.innerHTML = '<div class="sheet-case-section-label">\ud83d\udca1 \u9032\u968e\u7df4\u7fd2</div>';
        var tipsText = document.createElement('div');
        tipsText.className = 'sheet-case-text';
        tipsText.textContent = c.tips.map(function(t){ return '\u2022 ' + t; }).join('\n');
        tipsSection.appendChild(tipsText);
        caseEl.appendChild(tipsSection);
      }

      /* prompt block */
      var promptWrap = document.createElement('div');
      promptWrap.className = 'sheet-case-prompt-wrap';
      var promptLabel = document.createElement('div');
      promptLabel.className = 'sheet-case-section-label';
      promptLabel.style.cssText = 'font-size:10px;font-weight:700;color:var(--text-4);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px;';
      promptLabel.textContent = '\ud83d\udccb \u5b8c\u6574\u63d0\u793a\u8a5e';
      promptWrap.appendChild(promptLabel);
      var pre = document.createElement('pre');
      pre.className = 'sheet-case-prompt';
      pre.textContent = c.prompt;
      promptWrap.appendChild(pre);
      caseEl.appendChild(promptWrap);

      casesEl.appendChild(caseEl);
    }
  }

  /* reset copy btn */
  var copyMainBtn = document.getElementById('copyMainBtn');
  copyMainBtn.classList.remove('copied');
  copyMainBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> \u8907\u88fd\u63d0\u793a\u8a5e';

  document.getElementById('detailSheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('show');
  setTimeout(function() { document.getElementById('sheetBody').scrollTop = 0; }, 20);
}

/* ── Close sheet ─────────────────────────────────────────── */
function closeSheet() {
  document.getElementById('detailSheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('show');
  sheetId = null;
}
document.getElementById('sheetBack').addEventListener('click', closeSheet);
document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeSheet(); });

/* ── Copy main prompt (blue) ─────────────────────────────── */
document.getElementById('copyMainBtn').addEventListener('click', function() {
  if (!sheetId) return;
  var p = null;
  for (var i = 0; i < PROMPTS.length; i++) {
    if (PROMPTS[i].id === sheetId) { p = PROMPTS[i]; break; }
  }
  if (!p) return;
  doCopy(p.content).then(function() {
    var n = incCnt(sheetId);
    addRecent(sheetId);
    var btn = document.getElementById('copyMainBtn');
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> \u5df2\u8907\u88fd\uff01';
    setTimeout(function() {
      btn.classList.remove('copied');
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> \u8907\u88fd\u63d0\u793a\u8a5e';
    }, 2200);
    document.getElementById('copyCountBadge').textContent = '\u5df2\u8907\u88fd ' + n + ' \u6b21';
    var toast = document.getElementById('copyToast');
    toast.textContent = '\u2713 \u7b2c ' + n + ' \u6b21\u8907\u88fd';
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2400);
  });
});

/* ── Fav ─────────────────────────────────────────────────── */
document.getElementById('sheetFav').addEventListener('click', function() {
  if (!sheetId) return;
  var now = toggleFav(sheetId);
  document.getElementById('sheetFav').classList.toggle('faved', now);
  if (currentView === 'fav') renderFav();
});

/* ── Drag to dismiss ─────────────────────────────────────── */
(function() {
  var sheet  = document.getElementById('detailSheet');
  var handle = document.getElementById('sheetHandleArea');
  var sy = 0, st = 0, dragging = false;
  function start(e) {
    if (!sheet.classList.contains('open')) return;
    sy = e.touches ? e.touches[0].clientY : e.clientY;
    st = Date.now(); dragging = true;
    sheet.style.transition = 'none';
  }
  function move(e) {
    if (!dragging) return;
    var dy = (e.touches ? e.touches[0].clientY : e.clientY) - sy;
    if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
  }
  function end(e) {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    var dy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - sy;
    if (dy > 120 || (dy > 60 && Date.now() - st < 250)) {
      closeSheet();
      sheet.style.transform = '';
    } else {
      sheet.style.transform = '';
    }
  }
  handle.addEventListener('touchstart', start, { passive: true });
  handle.addEventListener('touchmove',  move,  { passive: true });
  handle.addEventListener('touchend',   end);
  handle.addEventListener('mousedown',  start);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup',   end);
})();

/* ── Category tabs ───────────────────────────────────────── */
document.getElementById('catTabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.cat-tab');
  if (!tab) return;
  var tabs = document.querySelectorAll('.cat-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  tab.classList.add('active');
  currentCat = tab.dataset.cat;
  showHome();
  renderCards();
  tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
});

/* ── Search ──────────────────────────────────────────────── */
var searchOverlay = document.getElementById('searchOverlay');
var searchInput   = document.getElementById('searchInput');
var searchClear   = document.getElementById('searchClear');

// searchTrigger removed (search bar is now always visible in hero)

searchInput.addEventListener('input', function(e) {
  searchQuery = e.target.value;
  searchClear.classList.toggle('show', !!searchQuery);
  showHome();
  renderCards();
});
searchClear.addEventListener('click', function() {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('show');
  renderCards();
  searchOverlay.classList.remove('open');
});
document.addEventListener('click', function(e) {
  if (searchOverlay.classList.contains('open') &&
      !searchOverlay.contains(e.target) &&
      e.target.id !== 'searchTrigger') {
    searchOverlay.classList.remove('open');
  }
});

/* ── View switching ──────────────────────────────────────── */
function showHome() {
  currentView = 'home';
  document.getElementById('cardGrid').style.display    = 'flex';
  document.getElementById('recentPanel').style.display = 'none';
  document.getElementById('favPanel').style.display    = 'none';
  document.getElementById('catTabsWrap').style.display = '';
  var btns = document.querySelectorAll('.tab-bar-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.view === 'home');
  }
}

function switchView(view, btn) {
  currentView = view;
  var btns = document.querySelectorAll('.tab-bar-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (btn) btn.classList.add('active');

  document.getElementById('cardGrid').style.display    = (view === 'home')   ? 'flex'  : 'none';
  document.getElementById('recentPanel').style.display = (view === 'recent') ? 'block' : 'none';
  document.getElementById('favPanel').style.display    = (view === 'fav')    ? 'block' : 'none';
  document.getElementById('catTabsWrap').style.display = (view === 'home')   ? ''      : 'none';

  if (view === 'recent') renderRecent();
  if (view === 'fav')    renderFav();
}

function renderRecent() {
  var el = document.getElementById('recentPanel');
  var recent = getRecent();
  var prompts = [];
  for (var i = 0; i < recent.length; i++) {
    for (var j = 0; j < PROMPTS.length; j++) {
      if (PROMPTS[j].id === recent[i]) { prompts.push(PROMPTS[j]); break; }
    }
  }
  if (!prompts.length) { el.innerHTML = emptyHtml('clock', '\u5c1a\u7121\u6700\u8fd1\u4f7f\u7528\u7684\u63d0\u793a\u8a5e'); return; }
  window.__caseCache = [];
  var html = '<p style="font-size:12px;color:var(--text-3);margin-bottom:10px;font-weight:600;">\u6700\u8fd1\u4f7f\u7528</p>';
  for (var i = 0; i < prompts.length; i++) html += buildCard(prompts[i], i);
  el.innerHTML = html;
}

function renderFav() {
  var el = document.getElementById('favPanel');
  var favIds = getFavs();
  var prompts = [];
  for (var i = 0; i < favIds.length; i++) {
    for (var j = 0; j < PROMPTS.length; j++) {
      if (PROMPTS[j].id === favIds[i]) { prompts.push(PROMPTS[j]); break; }
    }
  }
  if (!prompts.length) { el.innerHTML = emptyHtml('star', '\u5c1a\u7121\u6536\u85cf\u7684\u63d0\u793a\u8a5e<br>\u5728\u8a73\u60c5\u9801\u9ede \u2606 \u6536\u85cf'); return; }
  window.__caseCache = [];
  var html = '<p style="font-size:12px;color:var(--text-3);margin-bottom:10px;font-weight:600;">\u6536\u85cf\u6e05\u55ae</p>';
  for (var i = 0; i < prompts.length; i++) html += buildCard(prompts[i], i);
  el.innerHTML = html;
}

function emptyHtml(icon, msg) {
  var svg = icon === 'clock'
    ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    : '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  return '<div class="empty-view">' + svg + '<p>' + msg + '</p></div>';
}

/* ── Colour helpers ──────────────────────────────────────── */
function catColor(cat) {
  var map = { preset:'#7c3aed', decision:'#2563eb', proposal:'#0891b2', comms:'#db2777',
    writing:'#059669', ai_roles:'#ea580c', coach:'#be123c', life:'#b45309',
    routine:'#0f766e', research:'#7e22ce', tools:'#0369a1',
    industry:'#0284c7', sales:'#15803d', learning:'#be123c', creative:'#6d28d9' };
  return map[cat] || '#2563eb';
}
function catLt(cat) {
  var map = { preset:'#f5f3ff', decision:'#eff6ff', proposal:'#ecfeff', comms:'#fdf2f8',
    writing:'#ecfdf5', ai_roles:'#fff7ed', coach:'#fff1f2', life:'#fffbeb',
    routine:'#f0fdfa', research:'#faf5ff', tools:'#f0f9ff',
    industry:'#f0f9ff', sales:'#f0fdf4', learning:'#fff1f2', creative:'#f5f3ff' };
  return map[cat] || '#eff6ff';
}

/* ── Init ────────────────────────────────────────────────── */
renderCards();
