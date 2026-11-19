/* Haven app — student residence Haven. Works offline, data is stored on the phone (localStorage).
   All texts live in lang/<code>.json. English (en.json) is the base and the fallback.
   Room types, prices and the building layout are in HAVEN below: change them there. */
(function () {
'use strict';

/* ---------- storage ---------- */
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('dd_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('dd_' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- languages ---------- */
var LANGS = [['en','English','🇬🇧'],['nl','Nederlands','🇳🇱'],['de','Deutsch','🇩🇪'],['es','Español','🇪🇸'],['pl','Polski','🇵🇱']];
var EN = null, L = null, LANG = 'en';
function detectLang() {
  var saved = store.get('lang', null);
  if (saved && LANGS.some(function (l) { return l[0] === saved; })) return saved;
  var nav = (navigator.languages || [navigator.language || 'en']);
  for (var i = 0; i < nav.length; i++) {
    var c = String(nav[i]).slice(0, 2).toLowerCase();
    if (LANGS.some(function (l) { return l[0] === c; })) return c;
  }
  return 'en';
}
function fetchLang(code) { return fetch('lang/' + code + '.json').then(function (r) { if (!r.ok) throw new Error(code); return r.json(); }); }
function setLang(code) {
  return (code === 'en' ? Promise.resolve(EN) : fetchLang(code)).then(function (data) {
    L = data; LANG = code; store.set('lang', code); document.documentElement.lang = code;
  }).catch(function () { L = EN; LANG = 'en'; document.documentElement.lang = 'en'; });
}
function t(key, vars) {
  var s = (L && L.ui[key] != null) ? L.ui[key] : (EN.ui[key] != null ? EN.ui[key] : key);
  if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}
function D(part) { return (L && L[part] != null) ? L[part] : EN[part]; }
function langPicker() {
  return '<div class="chips" style="margin:6px 0 0">' + LANGS.map(function (l) {
    return '<button class="chip' + (l[0] === LANG ? ' on' : '') + '" data-lang="' + l[0] + '">' + l[2] + ' ' + l[1] + '</button>';
  }).join('') + '</div>';
}
function bindLangPicker() {
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.onclick = function () { if (b.dataset.lang === LANG) return; setLang(b.dataset.lang).then(function () { toast(t('language_saved')); render(); }); };
  });
}
function fmtDate(d, opts) { try { return d.toLocaleDateString(LANG, opts); } catch (e) { return d.toDateString(); } }
function longDate(d) { return fmtDate(d, {day:'numeric', month:'long', year:'numeric'}); }
function monthYear(d) { return fmtDate(d, {month:'long', year:'numeric'}); }

/* ---------- Haven: building data (example, change here) ---------- */
var HAVEN = {
  ready: new Date(2027, 7, 1),       // completion (August 2027)
  moveIn: new Date(2027, 8, 1),      // contracts start 1 September 2027
  // id, size m², basic rent, service costs, luxury 1-5, icon, self-contained (huurtoeslag possible), persons
  types: [
    {id:'basic',   m2:14, rent:475,  service:60, lux:1, icon:'🛏️', own:false, persons:1},
    {id:'comfort', m2:18, rent:560,  service:60, lux:2, icon:'🚿', own:false, persons:1},
    {id:'studio',  m2:24, rent:725,  service:65, lux:3, icon:'🏠', own:true,  persons:1},
    {id:'plus',    m2:28, rent:810,  service:65, lux:4, icon:'🌇', own:true,  persons:1},
    {id:'loft',    m2:36, rent:945,  service:70, lux:5, icon:'✨', own:true,  persons:1},
    {id:'duo',     m2:48, rent:1150, service:95, lux:4, icon:'👥', own:true,  persons:2}
  ],
  // rooms per floor and type: 8 + 15 + 15 + 15 + 17 = 70
  floors: [
    {basic:4, comfort:2, studio:2},
    {basic:4, comfort:4, studio:3, plus:2, loft:1, duo:1},
    {basic:4, comfort:4, studio:3, plus:2, loft:1, duo:1},
    {basic:4, comfort:4, studio:3, plus:2, loft:1, duo:1},
    {basic:4, comfort:2, studio:3, plus:4, loft:3, duo:1}
  ],
  // construction phases: progress per phase (0-100), same order as "phases" in the language files
  phases: [100, 100, 70, 0, 0, 0],
  // dates of the news items, same order as "news" in the language files (newest first)
  news: ['2026-11-14', '2026-10-28', '2026-10-03', '2026-06-01', '2026-03-02']
};
var TYPE_ORDER = HAVEN.types.map(function (x) { return x.id; });
function type(id) { return HAVEN.types.filter(function (x) { return x.id === id; })[0]; }
function typeText(id) { return D('types')[id]; }
function total(tp) { return tp.rent + tp.service; }
var ROOMS = (function () {
  var list = [];
  HAVEN.floors.forEach(function (f, fl) {
    var n = 1;
    TYPE_ORDER.forEach(function (tid) {
      for (var i = 0; i < (f[tid] || 0); i++) { list.push({id:fl + '.' + (n < 10 ? '0' : '') + n, floor:fl, type:tid}); n++; }
    });
  });
  return list;
})();
function room(id) { return ROOMS.filter(function (r) { return r.id === id; })[0]; }
function floorName(fl) { return fl === 0 ? t('floor_0') : t('floor_n', {n:fl}); }
function buildProgress() { var p = HAVEN.phases; return Math.round(p.reduce(function (a, b) { return a + b; }, 0) / p.length); }
function currentPhase() { for (var i = 0; i < HAVEN.phases.length; i++) if (HAVEN.phases[i] < 100) return i; return -1; }
function luxStars(n) { return '<span class="lux">' + '★★★★★'.slice(0, n) + '<span style="opacity:.25">' + '★★★★★'.slice(n) + '</span></span>'; }

/* ---------- helpers ---------- */
var $view = document.getElementById('view');
var $title = document.getElementById('title');
var $back = document.getElementById('back');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function eur(n) {
  var neg = n < 0; n = Math.abs(n);
  var whole = Math.floor(n), cents = Math.round((n - whole) * 100);
  var s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (cents ? ',' + (cents < 10 ? '0' : '') + cents : '');
  return (neg ? '-€' : '€') + s;
}
function toast(s) { var e = document.getElementById('toast'); e.textContent = s; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 2400); }
function go(h) { location.hash = h; }
function firstName(n) { return esc(String(n || '').split(' ')[0]); }
function applications() { var u = me(); return u ? (u.apps || []) : []; }
function unreadNews() { var seen = new Date(store.get('news_seen', 0)); return HAVEN.news.filter(function (d) { return new Date(d) > seen; }).length; }
var timers = [];
function clearTimers() { timers.forEach(function (x) { clearInterval(x); clearTimeout(x); }); timers = []; }

/* ---------- views ---------- */
var views = {};

views.home = function () {
  var u = me(), mine = u && u.room ? room(u.room) : null, apps = applications(), unread = unreadNews(), cur = currentPhase();
  return {title:'Haven', html:
    '<div class="card hero"><h2>' + (u ? t('home_hi', {name:firstName(u.name)}) : t('home_welcome')) + '</h2><p>' + t('home_intro', {date:monthYear(HAVEN.ready)}) + '</p>' +
    '<button class="btn" style="background:#fff;color:#021839" onclick="location.hash=\'rooms\'">' + t('view_rooms') + '</button></div>' +
    (mine ? '<div class="card city" onclick="location.hash=\'room/' + mine.id + '\'"><div><h3>🔑 ' + t('my_room') + ': ' + mine.id + '</h3><span class="muted">' + esc(typeText(mine.type).name) + ' · ' + floorName(mine.floor) + '</span></div><span class="price">›</span></div>' : '') +
    (apps.length && !mine ? '<div class="card"><h3>' + t('my_applications') + '</h3>' + apps.map(function (id) { var r = room(id); return r ? '<a class="city" style="text-decoration:none;color:inherit;padding:6px 0" href="#room/' + id + '"><span>' + t('room_n', {n:id}) + ' · ' + esc(typeText(r.type).name) + '</span><span>›</span></a>' : ''; }).join('') + '</div>' : '') +
    '<div class="card city" onclick="location.hash=\'updates\'"><div style="flex:1"><h3>🏗️ ' + t('build_title') + ' ' + (unread ? '<span class="dot">' + t('new_updates', {n:unread}) + '</span>' : '') + '</h3>' +
      '<span class="muted">' + t('build_progress', {n:buildProgress()}) + (cur > -1 ? ' · ' + t('build_next', {x:esc(D('phases')[cur][0])}) : '') + '</span>' +
      '<div class="bar"><i style="width:' + buildProgress() + '%"></i></div></div><span class="price">›</span></div>' +
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'rooms\'"><span class="ic">🏠</span><b>' + t('tile_rooms') + '</b><span>' + t('tile_rooms_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'pass\'"><span class="ic">🔑</span><b>' + t('tile_pass') + '</b><span>' + t('tile_pass_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'report\'"><span class="ic">🛠️</span><b>' + t('tile_report') + '</b><span>' + t('tile_report_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'help\'"><span class="ic">🆘</span><b>' + t('tile_help') + '</b><span>' + t('tile_help_sub') + '</span></button>' +
    '</div>' +
    (u ? '' : '<div class="card"><h3>' + t('meet_title') + '</h3><p class="muted">' + t('meet_text') + '</p><div class="row"><button class="btn sm" onclick="location.hash=\'signup\'">' + t('create_account') + '</button><button class="btn ghost sm" onclick="location.hash=\'login\'">' + t('log_in') + '</button></div></div>' +
      '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>'),
    bind: bindLangPicker
  };
};

/* ----- rooms ----- */
function roomsOf(tid) { return ROOMS.filter(function (r) { return r.type === tid; }); }
views.rooms = function () {
  return {title:t('rooms_title'), tab:'rooms', html:
    '<p class="muted">' + t('rooms_intro') + '</p>' +
    '<div class="card"><h3>' + t('overview') + '</h3><table class="tbl"><tr><th>' + t('th_type') + '</th><th class="n">' + t('th_size') + '</th><th class="n">' + t('th_rent') + '</th><th class="n">' + t('th_count') + '</th></tr>' +
      HAVEN.types.map(function (tp) { return '<tr><td>' + tp.icon + ' ' + esc(typeText(tp.id).name) + '</td><td class="n">' + tp.m2 + '</td><td class="n">' + eur(total(tp)) + '</td><td class="n">' + roomsOf(tp.id).length + '</td></tr>'; }).join('') +
      '<tr><td><b>' + t('filter_all') + '</b></td><td></td><td></td><td class="n"><b>' + ROOMS.length + '</b></td></tr>' +
      '</table><button class="btn ghost sm block" style="margin-top:10px" onclick="location.hash=\'allrooms\'">' + t('see_all') + '</button></div>' +
    HAVEN.types.map(function (tp) {
      var tx = typeText(tp.id);
      return '<div class="card typecard" onclick="location.hash=\'type/' + tp.id + '\'"><div class="ic">' + tp.icon + '</div><div class="grow"><h3>' + esc(tx.name) + '</h3>' +
        '<div class="muted">' + tp.m2 + ' m² · ' + luxStars(tp.lux) + '</div><span class="tag ok">' + t('n_available', {n:roomsOf(tp.id).length}) + '</span></div>' +
        '<div style="text-align:right"><div class="price">' + eur(total(tp)) + '</div><small class="muted">' + t('per_month') + '</small></div></div>';
    }).join('')
  };
};

function priceBlock(tp) {
  return '<dl class="kv"><dt>' + t('basic_rent') + '</dt><dd>' + eur(tp.rent) + '</dd><dt>' + t('service_costs') + '</dt><dd>' + eur(tp.service) + '</dd>' +
    '<dt class="total">' + t('total_rent') + '</dt><dd class="total" style="color:var(--navy)">' + eur(total(tp)) + '</dd>' +
    '<dt>' + t('deposit') + '</dt><dd>' + eur(tp.rent) + '</dd></dl>' +
    (tp.persons > 1 ? '<p class="muted" style="margin:8px 0 0">' + t('per_person', {price:eur(total(tp) / tp.persons)}) + '</p>' : '');
}
function featureList(tx) { return '<ul class="list">' + tx.features.map(function (f) { return '<li>✓ ' + esc(f) + '</li>'; }).join('') + '</ul>'; }
function roomTileClass(r) { var u = me(); return u && u.room === r.id ? ' mine' : applications().indexOf(r.id) > -1 ? ' req' : ''; }

views.type = function (tid) {
  var tp = type(tid); if (!tp) return views.rooms();
  var tx = typeText(tid), rs = roomsOf(tid);
  return {title:tx.name, back:'rooms', tab:'rooms', html:
    '<div class="card" style="text-align:center"><div style="font-size:3rem">' + tp.icon + '</div><h2>' + esc(tx.name) + '</h2><div>' + luxStars(tp.lux) + '</div><p class="muted" style="margin-top:6px">' + esc(tx.desc) + '</p>' +
      '<span class="tag">' + t('size') + ': ' + tp.m2 + ' m²</span> <span class="tag ok">' + t('n_available', {n:rs.length}) + '</span></div>' +
    '<div class="card">' + priceBlock(tp) + '</div>' +
    '<div class="card"><h3>' + t('features') + '</h3>' + featureList(tx) +
      '<p class="muted" style="margin:8px 0 0">' + (tp.own ? t('allowance_yes') : t('allowance_no')) + '</p></div>' +
    '<div class="card"><h3>' + t('rooms_of_type') + '</h3><div class="roomgrid">' + rs.map(function (r) {
      return '<button class="rtile' + roomTileClass(r) + '" onclick="location.hash=\'room/' + r.id + '\'"><b>' + r.id + '</b><small>' + floorName(r.floor) + '</small></button>';
    }).join('') + '</div></div>'
  };
};

views.allrooms = function () {
  var f = store.get('rf', {type:'all', max:1300});
  var list = ROOMS.filter(function (r) { return (f.type === 'all' || r.type === f.type) && total(type(r.type)) <= f.max; });
  return {title:t('all_rooms_title'), back:'rooms', tab:'rooms', html:
    '<div class="card"><div class="chips" style="margin-top:0"><button class="chip' + (f.type === 'all' ? ' on' : '') + '" data-tf="all">' + t('filter_all') + '</button>' +
      HAVEN.types.map(function (tp) { return '<button class="chip' + (f.type === tp.id ? ' on' : '') + '" data-tf="' + tp.id + '">' + tp.icon + ' ' + esc(typeText(tp.id).name) + '</button>'; }).join('') + '</div>' +
      '<label class="f" for="mx">' + t('max_rent') + ' <span id="mxv">' + eur(f.max) + '</span></label><input id="mx" type="range" min="500" max="1300" step="25" value="' + f.max + '"></div>' +
    '<p class="muted">' + t('n_rooms_shown', {n:list.length}) + '</p>' +
    (list.length ? HAVEN.floors.map(function (_, fl) {
      var rs = list.filter(function (r) { return r.floor === fl; });
      if (!rs.length) return '';
      return '<div class="card"><h3>' + floorName(fl) + '</h3><div class="roomgrid">' + rs.map(function (r) {
        var tp = type(r.type);
        return '<button class="rtile' + roomTileClass(r) + '" onclick="location.hash=\'room/' + r.id + '\'"><b>' + r.id + '</b><small>' + tp.icon + ' ' + eur(total(tp)) + '</small></button>';
      }).join('') + '</div></div>';
    }).join('') : '<div class="empty">' + t('no_rooms') + '</div>'),
    bind: function () {
      document.querySelectorAll('[data-tf]').forEach(function (b) { b.onclick = function () { f.type = b.dataset.tf; store.set('rf', f); render(); }; });
      var r = document.getElementById('mx');
      r.oninput = function () { document.getElementById('mxv').textContent = eur(+r.value); };
      r.onchange = function () { f.max = +r.value; store.set('rf', f); render(); };
    }
  };
};

views.room = function (id) {
  var r = room(id); if (!r) return views.rooms();
  var tp = type(r.type), tx = typeText(r.type), u = me(), apps = applications();
  var isMine = u && u.room === r.id, applied = apps.indexOf(r.id) > -1;
  return {title:t('room_n', {n:r.id}), back:'type/' + r.type, tab:'rooms', html:
    '<div class="card"><div class="row" style="justify-content:space-between"><div><h2 style="margin:0">' + t('room_n', {n:r.id}) + '</h2><span class="muted">' + tp.icon + ' ' + esc(tx.name) + ' · ' + floorName(r.floor) + '</span></div>' +
      '<span class="tag ' + (applied ? 'mid' : 'ok') + '">' + (isMine ? t('status_mine') : applied ? t('status_applied') : t('status_available')) + '</span></div>' +
      '<p style="margin:10px 0 0">' + luxStars(tp.lux) + ' · ' + tp.m2 + ' m²</p><p class="muted" style="margin:4px 0 0">' + t('move_in', {date:longDate(HAVEN.moveIn)}) + '</p></div>' +
    '<div class="card">' + priceBlock(tp) + '</div>' +
    '<div class="card"><h3>' + t('features') + '</h3>' + featureList(tx) + '</div>' +
    (!u ? '<button class="btn block" onclick="location.hash=\'signup\'">' + t('login_to_apply') + '</button>' :
      (applied ? '<button class="btn ghost block" id="withdraw">' + t('withdraw') + '</button>' : (isMine ? '' : '<button class="btn block" id="apply">' + t('apply') + '</button>')) +
      (isMine ? '' : '<button class="btn ghost block" style="margin-top:10px" id="setmine">' + t('set_mine') + '</button><p class="muted" style="margin-top:6px">' + t('set_mine_hint') + '</p>')),
    bind: function () {
      var a = document.getElementById('apply'), w = document.getElementById('withdraw'), s = document.getElementById('setmine');
      if (a) a.onclick = function () { u.apps = (u.apps || []).concat([r.id]); saveMe(u); toast(t('applied_toast')); render(); };
      if (w) w.onclick = function () { u.apps = (u.apps || []).filter(function (x) { return x !== r.id; }); saveMe(u); toast(t('withdrawn')); render(); };
      if (s) s.onclick = function () { u.room = r.id; u.apps = (u.apps || []).filter(function (x) { return x !== r.id; }); saveMe(u); toast(t('mine_toast', {n:r.id})); go('pass'); };
    }
  };
};

/* ----- room pass ----- */
function loginPrompt(msg, icon) {
  return '<div class="empty">' + icon + '<br>' + msg + '<br><br><button class="btn" onclick="location.hash=\'signup\'">' + t('create_account') + '</button> <button class="btn ghost" onclick="location.hash=\'login\'">' + t('log_in') + '</button></div>';
}
views.pass = function () {
  var u = me();
  if (!u) return {title:t('pass_title'), tab:'pass', html:loginPrompt(t('pass_need_login'), '🔑')};
  var r = u.room ? room(u.room) : null;
  if (!r) return {title:t('pass_title'), tab:'pass', html:'<div class="empty">🔑<br>' + t('pass_need_room') + '<br><br><button class="btn" onclick="location.hash=\'rooms\'">' + t('pass_choose_room') + '</button></div>'};
  var doors = [['main','🚪'], ['bikes','🚲'], ['laundry','🧺'], ['room','🛏️']];
  return {title:t('pass_title'), tab:'pass', html:
    '<div class="pass"><div class="top"><img src="icons/logo.png" alt="Haven"><span class="nfc">)))</span></div>' +
      '<div class="lbl" style="margin-top:12px">' + t('pass_resident') + '</div><h3>' + esc(u.name) + '</h3>' +
      '<div class="cols"><div><div class="lbl">' + t('pass_room') + '</div><div class="val">' + r.id + '</div></div><div><div class="lbl">' + t('pass_floor') + '</div><div class="val">' + floorName(r.floor) + '</div></div>' +
      '<div><div class="lbl">' + t('pass_valid') + '</div><div class="val">08/2028</div></div></div></div>' +
    (u.passBlocked ? '<div class="card result bad"><p style="margin:0 0 8px">' + t('pass_blocked') + '</p><button class="btn ghost sm" id="unblock">' + t('pass_unblock') + '</button></div>' :
      '<div class="qrbox"><div id="qr"></div><small>' + t('pass_qr') + '</small><small id="qrt"></small></div>' +
      '<div class="card"><h3>' + t('pass_open') + '</h3><div id="doorout"></div><div class="grid2" style="margin:0">' + doors.map(function (d) {
        return '<button class="tile" data-door="' + d[0] + '"><span class="ic">' + d[1] + '</span><b>' + t('door_' + d[0]) + '</b></button>'; }).join('') + '</div></div>' +
      '<div class="card"><p style="margin:0 0 8px" class="muted">' + t('pass_lost') + '</p><button class="btn danger sm" id="block">' + t('pass_block') + '</button></div>') +
    '<p class="muted" style="text-align:center">' + t('pass_demo') + '</p>',
    bind: function () {
      var ub = document.getElementById('unblock');
      if (ub) { ub.onclick = function () { u.passBlocked = false; saveMe(u); render(); }; return; }
      function drawQR() {
        var el = document.getElementById('qr'); if (!el) return;
        var slot = Math.floor(Date.now() / 30000), left = 30 - Math.floor(Date.now() / 1000) % 30;
        if (el.dataset.slot !== String(slot) && window.qrcode) {
          var q = qrcode(0, 'M'); q.addData('HAVEN|' + r.id + '|' + u.id + '|' + slot); q.make();
          el.innerHTML = q.createSvgTag({cellSize:5, margin:2, scalable:true}); el.dataset.slot = String(slot);
        }
        document.getElementById('qrt').textContent = t('pass_refresh', {n:left});
      }
      drawQR(); timers.push(setInterval(drawQR, 1000));
      document.querySelectorAll('[data-door]').forEach(function (b) {
        b.onclick = function () {
          var out = document.getElementById('doorout'), door = t('door_' + b.dataset.door);
          out.innerHTML = '<div class="waves"><span>📱</span></div><p class="muted" style="text-align:center">' + t('pass_hold') + '</p>';
          if (navigator.vibrate) navigator.vibrate(30);
          timers.push(setTimeout(function () {
            out.innerHTML = '<div class="waves ok"><span>✅</span></div><p style="text-align:center;font-weight:700;color:var(--ok)">' + t('pass_granted', {door:esc(door)}) + '</p>';
            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
          }, 1300));
        };
      });
      document.getElementById('block').onclick = function () { if (confirm(t('confirm_block'))) { u.passBlocked = true; saveMe(u); render(); } };
    }
  };
};

/* ----- report a problem ----- */
function reportStatus(rp) {
  if (rp.closed) return 'done';
  var age = Date.now() - rp.at;
  return age < 2 * 60000 ? 'received' : age < 24 * 3600000 ? 'planned' : 'done';
}
views.report = function () {
  var u = me();
  var head = '<div class="card result bad"><p style="margin:0">🚨 ' + t('report_emergency') + '</p><div class="row" style="margin-top:8px"><a class="btn danger sm" href="tel:112">' + t('em_112') + '</a></div></div>';
  if (!u) return {title:t('report_title'), tab:'report', html:head + loginPrompt(t('report_need_login'), '🛠️')};
  var reps = store.get('reports_' + u.email, []), photo = null;
  return {title:t('report_title'), tab:'report', html: head +
    '<form class="card" id="rpf"><p class="muted" style="margin-top:0">' + t('report_intro') + '</p>' +
    '<label class="f">' + t('r_category') + '</label><select name="cat" required><option value="">' + t('choose') + '</option>' + D('categories').map(function (c, i) { return '<option value="' + i + '">' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('r_location') + '</label><select name="loc" required>' + D('locations').map(function (c, i) { return '<option value="' + i + '">' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('r_urgency') + '</label><div class="chips" style="margin:0"><label class="chip"><input type="radio" name="urg" value="0" checked style="width:auto;margin-right:6px">' + t('r_normal') + '</label><label class="chip"><input type="radio" name="urg" value="1" style="width:auto;margin-right:6px">' + t('r_urgent') + '</label></div>' +
    '<label class="f">' + t('r_desc') + '</label><textarea name="desc" rows="3" required placeholder="' + esc(t('r_desc_ph')) + '"></textarea>' +
    '<label class="f">' + t('r_photo') + '</label><input type="file" name="photo" accept="image/*" capture="environment"><div id="ph" style="margin-top:6px"></div>' +
    '<label class="switch"><span>' + t('r_access') + '</span><input type="checkbox" name="access"></label>' +
    '<button class="btn block" style="margin-top:12px">' + t('r_send') + '</button></form>' +
    '<h2>' + t('my_reports') + '</h2>' +
    (reps.length ? reps.map(function (rp) {
      var st = reportStatus(rp);
      return '<div class="card"><div class="row" style="justify-content:space-between"><b>#' + rp.no + ' · ' + esc(D('categories')[rp.cat]) + '</b><span class="tag ' + (st === 'done' ? 'ok' : st === 'planned' ? 'mid' : '') + '">' + t('st_' + st) + '</span></div>' +
        '<p class="muted" style="margin:4px 0">' + esc(D('locations')[rp.loc]) + (rp.urg ? ' · ⚠️ ' + t('r_urgent') : '') + ' · ' + longDate(new Date(rp.at)) + '</p><p style="margin:0">' + esc(rp.desc) + '</p>' +
        (rp.photo ? '<img class="thumb" style="margin-top:8px" src="' + rp.photo + '" alt="">' : '') +
        (st !== 'done' ? '<div style="margin-top:8px"><button class="btn ghost sm" data-close="' + rp.no + '">' + t('r_close') + '</button></div>' : '') + '</div>';
    }).join('') : '<div class="empty">' + t('no_reports') + '</div>'),
    bind: function () {
      var form = document.getElementById('rpf');
      form.photo.onchange = function () {
        var file = form.photo.files[0]; if (!file) return;
        var img = new Image(), url = URL.createObjectURL(file);
        img.onload = function () {
          var c = document.createElement('canvas'), s = Math.min(1, 240 / Math.max(img.width, img.height));
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          photo = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(url);
          document.getElementById('ph').innerHTML = '<img class="thumb" src="' + photo + '" alt="">';
        };
        img.src = url;
      };
      form.onsubmit = function (e) {
        e.preventDefault();
        var no = 'H' + String(Date.now()).slice(-6);
        reps.unshift({no:no, cat:+form.cat.value, loc:+form.loc.value, urg:form.urg.value === '1', desc:form.desc.value.trim(), access:form.access.checked, photo:photo, at:Date.now()});
        store.set('reports_' + u.email, reps); toast(t('r_sent', {n:no})); render();
      };
      document.querySelectorAll('[data-close]').forEach(function (b) {
        b.onclick = function () { reps.forEach(function (rp) { if (rp.no === b.dataset.close) rp.closed = true; }); store.set('reports_' + u.email, reps); toast(t('r_closed')); render(); };
      });
    }
  };
};

/* ----- construction updates ----- */
views.updates = function () {
  var ph = D('phases'), news = D('news'), notify = store.get('notify', true), cur = currentPhase();
  var seenBefore = new Date(store.get('news_seen', 0));
  store.set('news_seen', new Date().toISOString());
  return {title:t('updates_title'), back:'home', html:
    '<div class="card"><p class="muted" style="margin-top:0">' + t('updates_intro') + '</p><div class="big">' + buildProgress() + '%</div><div class="bar"><i style="width:' + buildProgress() + '%"></i></div>' +
      '<label class="switch"><span>' + t('notify') + '</span><input type="checkbox" id="notify"' + (notify ? ' checked' : '') + '></label></div>' +
    '<div class="card"><h3>' + t('phases') + '</h3><ul class="timeline">' + ph.map(function (p, i) {
      var pr = HAVEN.phases[i], cls = pr >= 100 ? 'done' : i === cur ? 'now' : '';
      return '<li class="' + cls + '"><i></i><b>' + esc(p[0]) + '</b><div class="muted">' + esc(p[1]) + ' · ' + (pr >= 100 ? t('ph_done') : i === cur ? t('ph_now') + ' (' + pr + '%)' : t('ph_next')) + '</div></li>';
    }).join('') + '</ul></div>' +
    '<h2>' + t('news') + '</h2>' + news.map(function (n, i) {
      var d = new Date(HAVEN.news[i]), isNew = d > seenBefore;
      return '<div class="card news"><div class="date">' + longDate(d) + (isNew ? ' <span class="dot">!</span>' : '') + '</div><h3>' + esc(n[0]) + '</h3><p style="margin:0">' + esc(n[1]) + '</p></div>';
    }).join(''),
    bind: function () { document.getElementById('notify').onchange = function (e) { store.set('notify', e.target.checked); toast(e.target.checked ? t('notify_on') : t('notify_off')); }; }
  };
};

/* ----- help ----- */
views.help = function () {
  return {title:t('help_title'), back:'home', html:
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>' + t('tile_budget') + '</b><span>' + t('h_monthly') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'rights\'"><span class="ic">⚖️</span><b>' + t('h_rights') + '</b><span>' + t('h_rights_sub') + '</span></button>' +
    '</div>' +
    '<div class="card"><h3>' + t('emergency') + '</h3><div class="row"><a class="btn danger sm" href="tel:112">' + t('em_112') + '</a><a class="btn ghost sm" href="tel:09008844">' + t('em_police') + '</a></div></div>' +
    '<div class="card"><h3>' + t('questions') + '</h3>' + D('faq').map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div>' +
    '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<div class="card"><h3>' + t('ask_dd') + '</h3><p class="muted">' + t('ask_text') + '</p><form id="cf"><textarea required rows="3" placeholder="' + esc(t('your_q')) + '"></textarea><button class="btn block" style="margin-top:8px">' + t('send') + '</button></form></div>' +
    '<p class="muted" style="text-align:center">' + t('disclaimer') + '</p>',
    bind: function () { bindLangPicker(); document.getElementById('cf').onsubmit = function (e) { e.preventDefault(); e.target.reset(); toast(t('sent_toast')); }; }
  };
};

views.budget = function () {
  var b = store.get('budget2', {income:1100, rent:620, food:250, insurance:40, phone:15, transport:30, study:50, fun:100});
  var fields = ['income','rent','food','insurance','phone','transport','study','fun'];
  return {title:t('budget_title'), back:'help', html:
    '<div class="card"><h3>' + t('budget_q') + '</h3><p class="muted">' + t('budget_intro') + '</p>' +
    fields.map(function (f) { return '<label class="f">' + t('bf_' + f) + '</label><input type="number" inputmode="numeric" min="0" data-b="' + f + '" value="' + b[f] + '">'; }).join('') + '</div><div id="bout"></div>',
    bind: function () {
      function calc() {
        document.querySelectorAll('[data-b]').forEach(function (i) { b[i.dataset.b] = +i.value || 0; });
        store.set('budget2', b);
        var cost = b.rent + b.food + b.insurance + b.phone + b.transport + b.study + b.fun, left = b.income - cost;
        var maxRent = Math.max(0, b.income - (cost - b.rent));
        var lvl = left < 0 ? 'bad' : left < 75 ? 'mid' : 'ok';
        document.getElementById('bout').innerHTML = '<div class="card result ' + lvl + '"><span class="muted">' + t('left_month') + '</span><div class="big">' + eur(left) + '</div>' +
          '<p>' + t('total_costs', {cost:eur(cost), max:eur(maxRent)}) + '</p>' +
          '<p class="muted">' + t('budget_tip') + '</p>' +
          '<button class="btn sm" id="usebud">' + t('use_max', {x:eur(maxRent)}) + '</button></div>';
        document.getElementById('usebud').onclick = function () { store.set('rf', {type:'all', max:Math.max(500, Math.min(1300, Math.floor(maxRent / 25) * 25))}); go('allrooms'); };
      }
      document.querySelectorAll('[data-b]').forEach(function (i) { i.oninput = calc; });
      calc();
    }
  };
};

views.rights = function () {
  return {title:t('rights_title'), back:'help', html:
    '<div class="card"><h3>' + t('r_contract_t') + '</h3><ul class="list"><li>' + t('r_contract_1') + '</li><li>' + t('r_contract_2') + '</li><li>' + t('r_contract_3') + '</li><li>' + t('r_contract_4') + '</li></ul></div>' +
    '<div class="card"><h3>' + t('r_rent_t') + '</h3><p>' + t('r_rent') + '</p><a class="btn sm" href="https://www.huurcommissie.nl/huurcommissie-helpt/huurprijscheck-en-puntentelling" target="_blank" rel="noopener">' + t('r_rent_btn') + '</a></div>' +
    '<div class="card"><h3>' + t('r_dep_t') + '</h3><p>' + t('r_dep') + '</p></div>' +
    '<div class="card"><h3>' + t('r_prob_t') + '</h3><p>' + t('r_prob') + '</p></div>'
  };
};

/* ---------- accounts (demo: stored on this phone only) ---------- */
var COLORS = ['#1F6FB2','#1E8E5A','#B9770E','#8E44AD','#C0392B','#16A085','#2C3E50','#D35400'];
function initials(n) { return String(n || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
function avatar(p) { var c = COLORS[(p.name || '').length % COLORS.length]; return '<div class="av" style="background:' + c + '">' + esc(initials(p.name)) + '</div>'; }
function accounts() { return store.get('accounts', {}); }
function me() { var s = store.get('session', null); return s ? accounts()[s] || null : null; }
function saveMe(u) { var a = accounts(); a[u.email] = u; store.set('accounts', a); }
function hash(pw) {
  if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', new TextEncoder().encode('dd:' + pw)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); });
  return Promise.resolve('plain:' + pw);
}
var COUNTRIES = ['Belgium','Brazil','Bulgaria','China','France','Germany','Greece','India','Indonesia','Italy','Lithuania','Morocco','Netherlands','Nigeria','Poland','Portugal','Romania','Spain','Turkey','Ukraine','United Kingdom','United States','Vietnam','Other'];
var FLAG = {Belgium:'🇧🇪',Brazil:'🇧🇷',Bulgaria:'🇧🇬',China:'🇨🇳',France:'🇫🇷',Germany:'🇩🇪',Greece:'🇬🇷',India:'🇮🇳',Indonesia:'🇮🇩',Italy:'🇮🇹',Lithuania:'🇱🇹',Morocco:'🇲🇦',Netherlands:'🇳🇱',Nigeria:'🇳🇬',Poland:'🇵🇱',Portugal:'🇵🇹',Romania:'🇷🇴',Spain:'🇪🇸',Turkey:'🇹🇷',Ukraine:'🇺🇦','United Kingdom':'🇬🇧','United States':'🇺🇸',Vietnam:'🇻🇳'};
function countryName(c) { return (D('countries') || {})[c] || c; }
// Example profiles for the demo. Not real people. Their texts are "written by the students", so they are not translated.
var DEMO = [
  {id:'d1',name:'Lucía Fernández',country:'Spain',room:'2.05',school:'Avans',study:'International Business',start:'2027-09',buddy:false,about:'Excited to live in a Comfort room! Love cooking, so see you in the kitchen.'},
  {id:'d2',name:'Mateusz Nowak',country:'Poland',room:'',school:'Koning Willem I College',study:'Real Estate',start:'2027-09',buddy:true,about:'Looking for someone to share a duo apartment with. Quiet but social.'},
  {id:'d3',name:'Aisha Bello',country:'Nigeria',room:'4.14',school:'JADS',study:'Data Science',start:'2027-09',buddy:false,about:'I chose a Loft on the top floor. Can not wait for the view!'},
  {id:'d4',name:'Chen Wei',country:'China',room:'1.12',school:'Avans',study:'Engineering',start:'2027-09',buddy:false,about:'Studio Plus with a balcony. Anyone want to start a plant club?'},
  {id:'d5',name:'Giulia Romano',country:'Italy',room:'2.01',school:'Avans',study:'Psychology',start:'2027-09',buddy:false,about:'Basic room, best price. Happy to meet my housemates!'},
  {id:'d6',name:'Arjun Mehta',country:'India',room:'',school:'JADS',study:'Data Science & Entrepreneurship',start:'2027-09',buddy:true,about:'Master\'s student. Looking for a housemate for a duo apartment.'},
  {id:'d7',name:'Léa Dubois',country:'France',room:'0.07',school:'Koning Willem I College',study:'Hospitality',start:'2027-09',buddy:false,about:'Studio on the ground floor, close to the bike storage. Perfect!'},
  {id:'d8',name:'Jonas Becker',country:'Germany',room:'3.06',school:'Avans',study:'Facility Management',start:'2027-09',buddy:false,about:'Cycling fan. Let\'s organise a bike tour in the first week.'},
  {id:'d9',name:'Elena Popescu',country:'Romania',room:'2.10',school:'JADS',study:'Data Science',start:'2027-09',buddy:false,about:'Studio on floor 2. Ask me anything about Den Bosch!'},
  {id:'d10',name:'Mehmet Yılmaz',country:'Turkey',room:'4.03',school:'Avans',study:'Built Environment',start:'2027-09',buddy:false,about:'Top floor Basic room. Budget is tight, so I love the included Wi-Fi 😅'}
];
function residentOf(x) { return {id:'u:' + x.email,name:x.name,country:x.country,room:x.room || '',school:x.school,study:x.study,start:x.start,buddy:x.buddy,about:x.about}; }
function others() {
  var u = me(), lst = DEMO.slice(), a = accounts();
  Object.keys(a).forEach(function (k) { var x = a[k]; if (x.visible && (!u || x.email !== u.email)) lst.push(residentOf(x)); });
  return lst;
}
function person(id) { return others().filter(function (p) { return p.id === id; })[0]; }

function profileFields(u) {
  u = u || {};
  var countries = COUNTRIES.slice().sort(function (a, b) { return a === 'Other' ? 1 : b === 'Other' ? -1 : countryName(a).localeCompare(countryName(b), LANG); });
  return '<label class="f">' + t('full_name') + '</label><input name="name" required value="' + esc(u.name) + '" autocomplete="name">' +
    '<label class="f">' + t('country') + '</label><select name="country" required><option value="">' + t('choose') + '</option>' + countries.map(function (c) { return '<option value="' + esc(c) + '"' + (c === u.country ? ' selected' : '') + '>' + esc(countryName(c)) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('school') + '</label><input name="school" required value="' + esc(u.school) + '" placeholder="' + esc(t('ph_school')) + '">' +
    '<label class="f">' + t('study') + '</label><input name="study" value="' + esc(u.study) + '" placeholder="' + esc(t('ph_study')) + '">' +
    '<label class="f">' + t('start_date') + '</label><input name="start" type="month" value="' + esc(u.start || '2027-09') + '">' +
    '<label class="f">' + t('about') + '</label><textarea name="about" rows="2" placeholder="' + esc(t('ph_about')) + '">' + esc(u.about) + '</textarea>' +
    '<label class="switch"><span>' + t('buddy') + '</span><input type="checkbox" name="buddy"' + (u.buddy ? ' checked' : '') + '></label>' +
    '<label class="switch"><span>' + t('show_profile') + '</span><input type="checkbox" name="visible"' + (u.visible !== false ? ' checked' : '') + '></label>';
}
function readProfile(fd, u) {
  ['name','country','school','study','start','about'].forEach(function (k) { u[k] = (fd.get(k) || '').trim(); });
  u.buddy = fd.get('buddy') === 'on'; u.visible = fd.get('visible') === 'on';
  return u;
}

views.welcome = function () {
  return {title:'Haven', back:'home', html:
    '<div class="card"><h3 style="margin-bottom:0">🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<div class="card hero" style="text-align:center;padding:28px 18px"><img src="icons/logo.png" alt="Haven" style="width:180px;max-width:70%;height:auto;border-radius:12px"><h2 style="margin-top:12px">' + t('welcome_title') + '</h2><p>' + t('welcome_text') + '</p></div>' +
    '<div class="card"><ul class="list"><li>' + t('w_li1') + '</li><li>' + t('w_li2') + '</li><li>' + t('w_li3') + '</li></ul></div>' +
    '<button class="btn block" onclick="location.hash=\'signup\'">' + t('create_student_account') + '</button>' +
    '<button class="btn ghost block" style="margin-top:10px" onclick="location.hash=\'login\'">' + t('have_account') + '</button>' +
    '<button class="btn ghost block" style="margin-top:10px;border-color:transparent" onclick="location.hash=\'home\'">' + t('continue_guest') + '</button>',
    bind: bindLangPicker
  };
};

views.signup = function () {
  return {title:t('signup_title'), back:'welcome', html:
    '<form class="card" id="sf"><h3>' + t('your_account') + '</h3>' +
    '<label class="f">' + t('email') + '</label><input name="email" type="email" required autocomplete="email" placeholder="you@student.nl">' +
    '<label class="f">' + t('password_min') + '</label><input name="pw" type="password" required minlength="6" autocomplete="new-password">' +
    '<h3 style="margin-top:18px">' + t('about_you_h') + '</h3>' + profileFields() +
    '<label class="switch"><span>' + t('agree') + '</span><input type="checkbox" name="agree" required></label>' +
    '<div class="err" id="serr"></div><button class="btn block" style="margin-top:12px">' + t('create_account') + '</button></form>' +
    '<p class="muted" style="text-align:center">' + t('demo_stored') + '</p>',
    bind: function () {
      document.getElementById('sf').onsubmit = function (e) {
        e.preventDefault(); var fd = new FormData(e.target), email = fd.get('email').trim().toLowerCase();
        if (accounts()[email]) { document.getElementById('serr').textContent = t('email_exists'); return; }
        hash(fd.get('pw')).then(function (h) {
          var u = readProfile(fd, {email:email, pw:h, created:new Date().toISOString().slice(0, 10), id:'S' + String(Date.now()).slice(-7), apps:[]});
          saveMe(u); store.set('session', email);
          toast(t('welcome_toast', {name:u.name.split(' ')[0]})); go('home');
        });
      };
    }
  };
};

views.login = function () {
  return {title:t('login_title'), back:'welcome', html:
    '<form class="card" id="lf"><label class="f" style="margin-top:0">' + t('email') + '</label><input name="email" type="email" required autocomplete="email">' +
    '<label class="f">' + t('password') + '</label><input name="pw" type="password" required autocomplete="current-password">' +
    '<div class="err" id="lerr"></div><button class="btn block" style="margin-top:14px">' + t('log_in') + '</button></form>' +
    '<p class="muted" style="text-align:center">' + t('no_account') + ' <a href="#signup">' + t('create_one') + '</a></p>',
    bind: function () {
      document.getElementById('lf').onsubmit = function (e) {
        e.preventDefault(); var fd = new FormData(e.target), email = fd.get('email').trim().toLowerCase(), a = accounts()[email];
        hash(fd.get('pw')).then(function (h) {
          if (!a || a.pw !== h) { document.getElementById('lerr').textContent = t('wrong_login'); return; }
          store.set('session', email); toast(t('welcome_back', {name:a.name.split(' ')[0]})); go('home');
        });
      };
    }
  };
};

views.profile = function () {
  var u = me(), r = u.room ? room(u.room) : null;
  return {title:t('my_profile'), back:'home', html:
    '<div class="idcard"><span class="badge">' + t('student_badge') + '</span><div class="lbl">' + t('card_label') + '</div><h3>' + esc(u.name) + '</h3><div style="opacity:.85">' + esc(u.study || t('student')) + '</div>' +
    '<div class="cols"><div><div class="lbl">' + t('school') + '</div><div class="val">' + esc(u.school) + '</div></div><div><div class="lbl">' + t('pass_room') + '</div><div class="val">' + (r ? r.id + ' · ' + esc(typeText(r.type).name) : t('no_room_yet')) + '</div></div>' +
    '<div><div class="lbl">' + t('student_no') + '</div><div class="val">' + esc(u.id) + '</div></div><div><div class="lbl">' + t('from') + '</div><div class="val">' + (FLAG[u.country] || '') + ' ' + esc(countryName(u.country)) + '</div></div></div></div>' +
    '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<form class="card" id="pf"><h3>' + t('my_details') + '</h3><label class="f">' + t('email') + '</label><input value="' + esc(u.email) + '" disabled>' + profileFields(u) +
    '<button class="btn block" style="margin-top:12px">' + t('save_changes') + '</button></form>' +
    '<div class="card"><h3>' + t('settings') + '</h3>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#help"><span>' + t('help_em') + '</span><span>›</span></a>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#updates"><span>' + t('updates_title') + '</span><span>›</span></a>' +
    '<div class="row" style="margin-top:10px"><button class="btn ghost sm" id="logout">' + t('log_out') + '</button><button class="btn danger sm" id="delacc">' + t('delete_account') + '</button></div></div>' +
    '<p class="muted" style="text-align:center">' + t('member_since', {date:esc(u.created)}) + '</p>',
    bind: function () {
      bindLangPicker();
      document.getElementById('pf').onsubmit = function (e) { e.preventDefault(); saveMe(readProfile(new FormData(e.target), u)); toast(t('profile_saved')); render(); scrollTo(0, 0); };
      document.getElementById('logout').onclick = function () { store.set('session', null); toast(t('logged_out')); go('welcome'); };
      document.getElementById('delacc').onclick = function () {
        if (!confirm(t('confirm_del_acc'))) return;
        var a = accounts(); delete a[u.email]; store.set('accounts', a); store.set('session', null); toast(t('account_deleted')); go('welcome');
      };
    }
  };
};

function floorOf(roomId) { var r = room(roomId); return r ? r.floor : null; }
views.community = function () {
  var u = me(), f = store.get('cf2', 'all'), myFloor = u && u.room ? floorOf(u.room) : null;
  if (f === 'floor' && myFloor === null) f = 'all';
  var lst = others().filter(function (p) {
    if (f === 'floor') return floorOf(p.room) === myFloor;
    if (f === 'buddy') return p.buddy;
    return true;
  });
  var chips = [['all', t('f_all')], ['buddy', t('f_buddy')]];
  if (myFloor !== null) chips.splice(1, 0, ['floor', t('f_floor') + ' (' + floorName(myFloor) + ')']);
  return {title:t('comm_title'), tab:'community', html:
    '<div class="card"><h3>' + t('meet_title') + '</h3><p class="muted">' + t('comm_text') + '</p>' +
    '<div class="chips">' + chips.map(function (x) { return '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    (!u ? '<div class="card result"><p style="margin:0 0 8px">' + t('guest_note') + '</p><button class="btn sm" onclick="location.hash=\'signup\'">' + t('create_account') + '</button></div>' : '') +
    '<p class="muted">' + t('n_students', {n:lst.length}) + '</p>' +
    (lst.length ? lst.map(function (p) {
      var r = p.room ? room(p.room) : null;
      return '<div class="card person" onclick="location.hash=\'student/' + encodeURIComponent(p.id) + '\'">' + avatar(p) +
        '<div class="grow"><h3>' + esc(p.name) + ' ' + (FLAG[p.country] || '') + '</h3><div class="muted">' + esc(p.school) + (r ? ' · ' + t('room_n', {n:r.id}) : '') + '</div>' +
        (p.buddy ? '<span class="tag mid">' + t('buddy_tag') + '</span>' : (r ? '<span class="tag">' + type(r.type).icon + ' ' + esc(typeText(r.type).name) + '</span>' : '')) + '</div><span>›</span></div>';
    }).join('') : '<div class="empty">' + t('no_students') + '<br><button class="btn ghost sm" style="margin-top:10px" data-f="all">' + t('show_everyone') + '</button></div>'),
    bind: function () { document.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { store.set('cf2', b.dataset.f); render(); }; }); }
  };
};

views.student = function (id) {
  var p = person(decodeURIComponent(id)); if (!p) return views.community();
  var u = me(), r = p.room ? room(p.room) : null, same = u && u.room && r && floorOf(u.room) === r.floor;
  return {title:p.name.split(' ')[0], back:'community', tab:'community', html:
    '<div class="card" style="text-align:center">' + avatar(p).replace('class="av"', 'class="av" style="width:72px;height:72px;font-size:1.5rem;margin:0 auto 8px;background:' + COLORS[(p.name || '').length % COLORS.length] + '"') +
    '<h2>' + esc(p.name) + '</h2><p class="muted">' + (FLAG[p.country] || '') + ' ' + t('from_country', {country:esc(countryName(p.country))}) + '</p>' +
    (same ? '<span class="tag ok">' + t('same_floor') + '</span> ' : '') + (p.buddy ? '<span class="tag mid">' + t('buddy_tag') + '</span>' : '') + '</div>' +
    '<div class="card"><ul class="list"><li><b>' + t('lbl_school') + '</b> ' + esc(p.school) + '</li><li><b>' + t('lbl_study') + '</b> ' + esc(p.study || '–') + '</li>' +
    '<li><b>' + t('lbl_room') + '</b> ' + (r ? r.id + ' · ' + esc(typeText(r.type).name) + ' · ' + floorName(r.floor) : '–') + '</li><li><b>' + t('lbl_starts') + '</b> ' + esc(p.start || '–') + '</li></ul>' +
    (p.about ? '<p style="margin-top:10px">“' + esc(p.about) + '”</p>' : '') + '</div>' +
    (!u ? '<button class="btn block" onclick="location.hash=\'signup\'">' + t('create_to_msg') + '</button>' :
      '<button class="btn block" onclick="location.hash=\'chat/' + encodeURIComponent(p.id) + '\'">' + t('send_msg') + '</button>') +
    '<p class="muted" style="margin-top:12px">' + t('safety') + '</p>'
  };
};

views.chat = function (id) {
  id = decodeURIComponent(id); var p = person(id); if (!p) return views.community();
  var u = me(), key = 'chat_' + u.email + '_' + id, msgs = store.get(key, []);
  return {title:p.name, back:'student/' + encodeURIComponent(id), tab:'community', html:
    '<div class="chat" id="msgs">' + (msgs.length ? msgs.map(function (m) { return '<div class="msg' + (m.me ? ' mine' : '') + '">' + esc(m.t) + '<small>' + esc(m.at) + '</small></div>'; }).join('') :
      '<div class="empty">' + t('say_hi', {name:firstName(p.name)}) + '</div>') + '</div>' +
    '<form class="sendbar" id="mf"><input name="t" required placeholder="' + esc(t('write_msg')) + '" autocomplete="off"><button class="btn">' + t('send') + '</button></form>' +
    '<p class="muted" style="margin-top:10px">' + t('auto_replies') + '</p>',
    bind: function () {
      scrollTo(0, document.body.scrollHeight);
      document.getElementById('mf').onsubmit = function (e) {
        e.preventDefault(); var txt = e.target.t.value.trim(); if (!txt) return;
        var now = function () { return new Date().toTimeString().slice(0, 5); };
        msgs.push({me:true, t:txt, at:now()}); store.set(key, msgs); render();
        if (id.indexOf('d') === 0) setTimeout(function () {
          var m = store.get(key, []), R = D('replies'); m.push({me:false, t:R[(m.length >> 1) % R.length], at:now()}); store.set(key, m);
          if (location.hash === '#chat/' + encodeURIComponent(id)) render();
        }, 1200);
        var i = document.querySelector('#mf input'); if (i) i.focus();
      };
    }
  };
};

/* ---------- router ---------- */
var TAB_LABEL = {home:'tab_home', rooms:'tab_rooms', pass:'tab_pass', report:'tab_report', community:'tab_community'};
function render() {
  clearTimers();
  var parts = (location.hash.slice(1) || 'home').split('/');
  var auth = {welcome:1, signup:1, login:1}, u = me();
  if (!u && {profile:1, chat:1}[parts[0]]) parts = ['welcome'];
  if (!u && !location.hash && !store.get('seenWelcome', false)) { parts = ['welcome']; store.set('seenWelcome', true); }
  if (u && auth[parts[0]]) parts = ['home'];
  document.body.classList.toggle('out', !!auth[parts[0]]);
  var $me = document.getElementById('me');
  $me.hidden = !!auth[parts[0]];
  $me.textContent = u ? initials(u.name) : '👤';
  $me.setAttribute('aria-label', u ? t('aria_profile') : t('aria_login'));
  $me.onclick = function () { go(u ? 'profile' : 'welcome'); };
  $back.setAttribute('aria-label', t('aria_back'));
  document.querySelectorAll('.tabs button').forEach(function (b) { b.lastChild.textContent = t(TAB_LABEL[b.dataset.tab]); });
  var fn = views[parts[0]] || views.home;
  var v = fn(parts[1], parts[2]);
  $title.textContent = v.title;
  $view.innerHTML = v.html;
  $back.hidden = !v.back;
  $back.onclick = function () { go(v.back); };
  var tab = v.tab || (TAB_LABEL[parts[0]] ? parts[0] : 'home');
  document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  if (v.bind) v.bind();
}

/* ---------- start ---------- */
fetchLang('en').then(function (en) { EN = en; L = en; return setLang(detectLang()); }).then(function () {
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { go(b.dataset.tab); }; });
  var last = '';
  window.addEventListener('hashchange', function () { render(); if (location.hash !== last) scrollTo(0, 0); last = location.hash; });
  render();
}).catch(function () { $view.innerHTML = '<div class="empty">Could not load the app. Please check your internet connection and try again.</div>'; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
})();
