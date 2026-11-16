/* DutchDoor app — works offline, data is stored on the phone (localStorage).
   All texts live in lang/<code>.json. English (en.json) is the base and the fallback. */
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
// t('key', {name:'x'}) -> translated UI text with {placeholders} filled in
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

/* ---------- data (language independent) ---------- */
// Indicative rents (euro per month) for a room in a shared student house / a studio. Always check current prices.
var CITIES = [
  {id:'amsterdam',name:'Amsterdam',room:1000,studio:1450,schools:'UvA, VU, HvA',pressure:3,providers:['DUWO','Student Experience','Xior','ROOM.nl']},
  {id:'rotterdam',name:'Rotterdam',room:720,studio:1100,schools:'Erasmus, Hogeschool Rotterdam',pressure:2,providers:['SSH','Xior','Stadswonen']},
  {id:'utrecht',name:'Utrecht',room:780,studio:1200,schools:'UU, HU',pressure:3,providers:['SSH','ROOM.nl','Xior']},
  {id:'den-haag',name:'Den Haag',room:700,studio:1100,schools:'Haagse Hogeschool, Leiden University (campus Den Haag)',pressure:2,providers:['DUWO','Xior','The Social Hub']},
  {id:'leiden',name:'Leiden',room:700,studio:1050,schools:'Leiden University',pressure:3,providers:['DUWO','Xior']},
  {id:'delft',name:'Delft',room:650,studio:1000,schools:'TU Delft',pressure:3,providers:['DUWO','Xior']},
  {id:'groningen',name:'Groningen',room:520,studio:850,schools:'RUG, Hanze',pressure:2,providers:['SSH','Lefier','Xior']},
  {id:'eindhoven',name:'Eindhoven',room:630,studio:950,schools:'TU/e, Fontys',pressure:2,providers:['Vestide','Xior','Woonbedrijf']},
  {id:'tilburg',name:'Tilburg',room:560,studio:900,schools:'Tilburg University, Fontys, Avans',pressure:2,providers:['Tiwos','Xior','Kamernet']},
  {id:'den-bosch',name:"'s-Hertogenbosch",room:620,studio:950,schools:'Avans, Koning Willem I College, JADS',pressure:2,providers:['Zayaz','Kamernet','Pararius']},
  {id:'nijmegen',name:'Nijmegen',room:510,studio:850,schools:'Radboud, HAN',pressure:2,providers:['SSH','Talis','Kamernet']},
  {id:'maastricht',name:'Maastricht',room:600,studio:900,schools:'Maastricht University, Zuyd',pressure:2,providers:['Maastricht Housing','Xior','The Student Hotel']},
  {id:'enschede',name:'Enschede',room:450,studio:750,schools:'University of Twente, Saxion',pressure:1,providers:['Roombeek','Kamernet','UT campus housing']},
  {id:'arnhem',name:'Arnhem',room:520,studio:850,schools:'HAN, ArtEZ',pressure:1,providers:['SSH','Kamernet','Pararius']},
  {id:'breda',name:'Breda',room:580,studio:900,schools:'BUas, Avans',pressure:2,providers:['Xior','Kamernet','Pararius']}
];
function cityName(c) { return (D('city_names') || {})[c.id] || c.name; }

function platforms(c) {
  var n = encodeURIComponent(c.name.replace("'s-", 's-'));
  return [
    {name:'Kamernet', what:t('plat_kamernet'), url:'https://kamernet.nl/en/for-rent/rooms-' + c.id},
    {name:'Pararius', what:t('plat_pararius'), url:'https://www.pararius.com/apartments/' + c.id},
    {name:'HousingAnywhere', what:t('plat_ha'), url:'https://housinganywhere.com/s/' + n + '--Netherlands'},
    {name:'Funda Huur', what:t('plat_funda'), url:'https://www.funda.nl/zoeken/huur?selected_area=%5B%22' + c.id + '%22%5D'}
  ];
}

var LIST_KEYS = ['before', 'first', 'pay'];
// Link URLs and in-app targets for the guides. The link labels are in the language files (same order).
var GUIDE_META = {
  'before-1': {links:['https://www.government.nl/topics/legalisation-of-documents']},
  'before-2': {links:['https://www.studielink.nl']},
  'before-3': {links:['https://ind.nl/en/residence-permits/study']},
  'before-4': {go:'search'},
  'before-5': {links:['https://duo.nl/particulier/international-student/'], go:'budget'},
  'before-6': {links:['https://www.government.nl/topics/health-insurance']},
  'before-7': {links:['https://www.government.nl/topics/personal-data/registering-in-the-brp']},
  'first-0': {links:['https://www.government.nl/topics/personal-data/registering-in-the-brp']},
  'first-1': {links:['https://www.government.nl/topics/personal-data/citizen-service-number-bsn']},
  'first-3': {links:['https://www.digid.nl/en']},
  'first-4': {links:['https://www.government.nl/topics/health-insurance','https://www.belastingdienst.nl/wps/wcm/connect/en/individuals/content/healthcare-allowance']},
  'first-6': {links:['https://www.ov-chipkaart.nl/en','https://www.ns.nl/en']},
  'first-7': {links:['https://swapfiets.nl/en']},
  'pay-1': {links:['https://lens.google.com','https://tineye.com']},
  'pay-2': {links:['https://maps.google.com']},
  'pay-3': {links:['https://www.kadaster.nl/']},
  'pay-4': {links:['https://www.kvk.nl/en/search/']},
  'pay-5': {links:['https://www.huurcommissie.nl/huurcommissie-helpt/huurprijscheck-en-puntentelling'], go:'rights'}
};
var SCAM_W = [3, 4, 4, 2, 5, 2, 3, 3];
// Stored room status values (English keys, kept for saved data). Shown translated.
var STATUS_KEYS = ['Interested','Viewing planned','Applied','Offer','Signed','Rejected'];
function statusLabel(s) { var i = STATUS_KEYS.indexOf(s); return i > -1 ? D('status')[i] : s; }

/* ---------- helpers ---------- */
var $view = document.getElementById('view');
var $title = document.getElementById('title');
var $back = document.getElementById('back');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function eur(n) { n = Math.round(n); return (n < 0 ? '-€' : '€') + Math.abs(n).toLocaleString('nl-NL'); }
function city(id) { return CITIES.filter(function (c) { return c.id === id; })[0]; }
function toast(s) { var e = document.getElementById('toast'); e.textContent = s; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 2200); }
function go(h) { location.hash = h; }
function list(key) { return D('checklists')[key]; }
function checklistProgress(key) { var st = store.get('cl_' + key, {}), items = list(key).items, n = items.filter(function (_, i) { return st[i]; }).length; return [n, items.length]; }
function bar(n, tot) { return '<div class="bar"><i style="width:' + (tot ? n / tot * 100 : 0) + '%"></i></div>'; }
function fit(price, budget) {
  if (price <= budget) return '<span class="tag ok">' + t('fit_ok') + '</span>';
  if (price <= budget * 1.15) return '<span class="tag mid">' + t('fit_mid') + '</span>';
  return '<span class="tag bad">' + t('fit_bad') + '</span>';
}
function firstName(n) { return esc(String(n || '').split(' ')[0]); }

/* ---------- views ---------- */
var views = {};

views.home = function () {
  var prefs = store.get('prefs', {city:'', budget:650, type:'room'});
  var rooms = store.get('rooms', []);
  var a = checklistProgress('before'), b = checklistProgress('first');
  var c = city(prefs.city), u = me(), vw = viewer();
  return {title:'DutchDoor', html:
    '<div class="card hero"><h2>' + (u ? t('home_hi', {name:firstName(u.name)}) : t('home_welcome')) + '</h2><p>' + t('home_intro') + '</p>' +
    '<button class="btn" style="background:#fff;color:#1F3A5F" onclick="location.hash=\'search\'">' + t('find_room') + '</button></div>' +
    (c ? '<div class="card city" onclick="location.hash=\'city/' + c.id + '\'"><div><h3>' + t('your_city', {city:esc(cityName(c))}) + '</h3><span class="muted">' + t('room_about', {price:eur(c.room)}) + '</span></div><span class="price">›</span></div>' : '') +
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'scam\'"><span class="ic">🛡️</span><b>' + t('tile_scam') + '</b><span>' + t('tile_scam_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>' + t('tile_budget') + '</b><span>' + t('tile_budget_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'community\'"><span class="ic">👋</span><b>' + t('tile_students') + '</b><span>' +
        (vw.city ? t('students_in_city', {n:others().filter(function (x) { return x.city === vw.city; }).length}) : t('students_total', {n:others().length})) + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'help\'"><span class="ic">🆘</span><b>' + t('tile_help') + '</b><span>' + t('tile_help_sub') + '</span></button>' +
    '</div>' +
    (rooms.length ? '<div class="card city" onclick="location.hash=\'tracker\'"><div><h3>📌 ' + t('saved_rooms') + '</h3><span class="muted">' + t('n_saved', {n:rooms.length}) + '</span></div><span class="price">›</span></div>' : '') +
    (u ? '' : '<div class="card"><h3>' + t('meet_title') + '</h3><p class="muted">' + t('meet_text') + '</p><div class="row"><button class="btn sm" onclick="location.hash=\'signup\'">' + t('create_account') + '</button><button class="btn ghost sm" onclick="location.hash=\'login\'">' + t('log_in') + '</button></div></div>') +
    '<div class="card"><h3>' + t('progress') + '</h3>' +
      '<p class="muted" style="margin:6px 0 0">' + t('progress_before', {n:a[0], total:a[1]}) + '</p>' + bar(a[0], a[1]) +
      '<p class="muted" style="margin:6px 0 0">' + t('progress_first', {n:b[0], total:b[1]}) + '</p>' + bar(b[0], b[1]) +
      '<button class="btn ghost sm" style="margin-top:8px" onclick="location.hash=\'todo\'">' + t('open_todo') + '</button></div>' +
    (u ? '' : '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>'),
    bind: bindLangPicker
  };
};

views.search = function () {
  var p = store.get('prefs', {city:'', budget:650, type:'room'});
  var q = (store.get('q', '') || '').toLowerCase();
  var lst = CITIES.filter(function (c) { return !q || (c.name + ' ' + cityName(c) + ' ' + c.schools).toLowerCase().indexOf(q) > -1; });
  lst.sort(function (x, y) { return x[p.type] - y[p.type]; });
  return {title:t('search_title'), tab:'search', html:
    '<div class="card"><label class="f" for="q" style="margin-top:0">' + t('city_or_school') + '</label><input id="q" type="search" placeholder="' + esc(t('search_ph')) + '" value="' + esc(store.get('q', '')) + '">' +
    '<label class="f">' + t('looking_for') + '</label><div class="chips">' +
      '<button class="chip' + (p.type === 'room' ? ' on' : '') + '" data-type="room">' + t('type_room') + '</button>' +
      '<button class="chip' + (p.type === 'studio' ? ' on' : '') + '" data-type="studio">' + t('type_studio') + '</button></div>' +
    '<label class="f" for="budget">' + t('max_rent') + ' <span id="bv">' + eur(p.budget) + '</span></label>' +
    '<input id="budget" type="range" min="300" max="1600" step="25" value="' + p.budget + '"></div>' +
    '<p class="muted">' + t('n_cities', {n:lst.length}) + '</p>' +
    (lst.length ? lst.map(function (c) {
      return '<div class="card city" onclick="location.hash=\'city/' + c.id + '\'"><div><h3>' + esc(cityName(c)) + '</h3>' +
        '<div class="muted">' + esc(c.schools) + '</div><div style="margin-top:6px">' + fit(c[p.type], p.budget) + ' <span class="tag">' + D('pressure_tag')[c.pressure] + '</span></div></div>' +
        '<div class="price">' + eur(c[p.type]) + '</div></div>';
    }).join('') : '<div class="empty">' + t('no_city') + '</div>'),
    bind: function () {
      var qi = document.getElementById('q');
      qi.addEventListener('input', function () { store.set('q', qi.value); render(); var n = document.getElementById('q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
      document.querySelectorAll('[data-type]').forEach(function (b) { b.onclick = function () { p.type = b.dataset.type; store.set('prefs', p); render(); }; });
      var r = document.getElementById('budget');
      r.oninput = function () { document.getElementById('bv').textContent = eur(r.value); };
      r.onchange = function () { p.budget = +r.value; store.set('prefs', p); render(); };
    }
  };
};

views.city = function (id) {
  var c = city(id); if (!c) return views.search();
  var p = store.get('prefs', {city:'', budget:650, type:'room'});
  var mine = p.city === c.id, nm = esc(cityName(c));
  return {title:cityName(c), back:'search', tab:'search', html:
    '<div class="card"><div class="row" style="justify-content:space-between"><div><span class="muted">' + t('room_shared') + '</span><div class="big">' + eur(c.room) + '</div></div>' +
    '<div><span class="muted">' + t('studio') + '</span><div class="big">' + eur(c.studio) + '</div></div></div>' +
    '<p class="muted" style="margin-top:6px">' + t('indicative') + ' ' + fit(c[p.type], p.budget) + '</p>' +
    '<p><b>' + t('finding_room') + '</b> ' + D('pressure')[c.pressure] + '</p><p>💡 ' + esc(D('city_tips')[c.id]) + '</p>' +
    '<button class="btn ' + (mine ? 'ghost' : '') + ' sm" id="setcity">' + (mine ? t('this_my_city') : t('set_my_city')) + '</button></div>' +
    '<h2>' + t('search_in', {city:nm}) + '</h2><p class="muted">' + t('opens_site', {city:nm}) + '</p>' +
    platforms(c).map(function (x) {
      return '<a class="card city" style="text-decoration:none;color:inherit" href="' + x.url + '" target="_blank" rel="noopener"><div><h3>' + x.name + '</h3><span class="muted">' + x.what + '</span></div><span class="price">↗</span></a>';
    }).join('') +
    '<div class="card"><h3>' + t('providers_here') + '</h3><ul class="list">' + c.providers.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<p class="muted">' + t('ask_office', {x:esc(c.schools)}) + '</p></div>' +
    '<div class="card"><h3>' + t('found_room') + '</h3><p>' + t('found_room_text') + '</p><button class="btn block" onclick="location.hash=\'room/new/' + c.id + '\'">' + t('save_room_btn') + '</button></div>',
    bind: function () { document.getElementById('setcity').onclick = function () { p.city = mine ? '' : c.id; store.set('prefs', p); toast(mine ? t('city_removed') : t('now_your_city', {city:cityName(c)})); render(); }; }
  };
};

views.tracker = function () {
  var rooms = store.get('rooms', []);
  return {title:t('saved_title'), tab:'tracker', html:
    '<button class="btn block" style="margin-bottom:12px" onclick="location.hash=\'room/new\'">' + t('save_room_btn') + '</button>' +
    (rooms.length ? rooms.map(function (r) {
      var cls = r.status === 'Rejected' ? 'bad' : (r.status === 'Signed' || r.status === 'Offer') ? 'ok' : '';
      var rc = r.city ? city(r.city) : null;
      return '<div class="card city" onclick="location.hash=\'room/' + r.id + '\'"><div><h3>' + esc(r.title || t('room_default')) + '</h3>' +
        '<div class="muted">' + (rc ? esc(cityName(rc)) : '') + (r.date ? ' · ' + t('viewing_on', {date:esc(r.date)}) : '') + '</div>' +
        '<div style="margin-top:6px"><span class="tag ' + cls + '">' + esc(statusLabel(r.status)) + '</span>' +
        (r.scam != null ? ' <span class="tag ' + (r.scam >= 6 ? 'bad' : r.scam >= 3 ? 'mid' : 'ok') + '">' + t('scam_risk', {lvl:t(r.scam >= 6 ? 'risk_high' : r.scam >= 3 ? 'risk_mid' : 'risk_low')}) + '</span>' : '') + '</div></div>' +
        '<div class="price">' + (r.rent ? eur(r.rent) : '') + '</div></div>';
    }).join('') : '<div class="empty">📌<br>' + t('no_rooms_1') + '<br>' + t('no_rooms_2') + '</div>')
  };
};

views.room = function (id, cityId) {
  var rooms = store.get('rooms', []);
  var isNew = id === 'new';
  var r = isNew ? {id:String(Date.now()), title:'', city:cityId || store.get('prefs', {}).city || '', rent:'', link:'', status:'Interested', date:'', notes:''} : rooms.filter(function (x) { return x.id === id; })[0];
  if (!r) return views.tracker();
  return {title:isNew ? t('save_room_title') : t('room_title'), back:'tracker', tab:'tracker', html:
    '<form class="card" id="rf">' +
    '<label class="f" style="margin-top:0">' + t('f_name_addr') + '</label><input name="title" required value="' + esc(r.title) + '" placeholder="' + esc(t('ph_room')) + '">' +
    '<label class="f">' + t('f_city') + '</label><select name="city"><option value="">' + t('choose') + '</option>' + CITIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === r.city ? ' selected' : '') + '>' + esc(cityName(c)) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('f_rent') + '</label><input name="rent" type="number" inputmode="numeric" min="0" value="' + esc(r.rent) + '">' +
    '<label class="f">' + t('f_link') + '</label><input name="link" type="url" value="' + esc(r.link) + '" placeholder="https://">' +
    '<label class="f">' + t('f_status') + '</label><select name="status">' + STATUS_KEYS.map(function (s) { return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + esc(statusLabel(s)) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('f_date') + '</label><input name="date" type="date" value="' + esc(r.date) + '">' +
    '<label class="f">' + t('f_notes') + '</label><textarea name="notes" rows="3" placeholder="' + esc(t('ph_notes')) + '">' + esc(r.notes) + '</textarea>' +
    '<button class="btn block" style="margin-top:14px">' + t('save') + '</button></form>' +
    (isNew ? '' :
      '<div class="row">' + (r.link ? '<a class="btn ghost sm" href="' + esc(r.link) + '" target="_blank" rel="noopener">' + t('open_ad') + '</a>' : '') +
      '<button class="btn ghost sm" onclick="location.hash=\'scam/' + r.id + '\'">🛡️ ' + t('scam_check') + '</button>' +
      '<button class="btn danger sm" id="del">' + t('delete') + '</button></div>'),
    bind: function () {
      document.getElementById('rf').onsubmit = function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        ['title','city','rent','link','status','date','notes'].forEach(function (k) { r[k] = fd.get(k); });
        r.rent = r.rent ? +r.rent : '';
        if (r.link && !/^https?:\/\//i.test(r.link)) r.link = 'https://' + r.link;
        var lst = store.get('rooms', []).filter(function (x) { return x.id !== r.id; });
        lst.unshift(r); store.set('rooms', lst);
        toast(t('room_saved')); go('tracker');
      };
      var d = document.getElementById('del');
      if (d) d.onclick = function () { if (confirm(t('confirm_del_room'))) { store.set('rooms', rooms.filter(function (x) { return x.id !== r.id; })); toast(t('deleted')); go('tracker'); } };
    }
  };
};

views.guide = function (key, i) {
  var cl = list(key), g = D('guides')[key + '-' + i], meta = GUIDE_META[key + '-' + i] || {};
  if (!cl || !g) return views.todo();
  i = +i; var st = store.get('cl_' + key, {}), done = !!st[i], next = i + 1 < cl.items.length ? i + 1 : null;
  var links = (meta.links || []).map(function (url, n) { return [g.links[n] || url, url]; });
  function sec(h, body) { return '<div class="card"><h3>' + h + '</h3>' + body + '</div>'; }
  return {title:t('howto_title'), back:'todo', tab:'todo', html:
    '<p class="muted" style="margin-bottom:4px">' + t('step_of', {list:esc(cl.title), n:i + 1, total:cl.items.length}) + '</p><h2>' + esc(cl.items[i]) + '</h2>' +
    '<div class="card"><p style="margin:0">' + esc(g.why) + '</p>' +
      '<div class="row" style="margin-top:10px"><span class="tag">💶 ' + esc(g.cost) + '</span>' + (g.time ? '<span class="tag">⏱️ ' + esc(g.time) + '</span>' : '') + '</div></div>' +
    sec(t('how_do'), g.steps.map(function (s, n) { return '<div class="step" style="margin:8px 0"><b class="n">' + (n + 1) + '</b><p style="margin:3px 0 0">' + esc(s) + '</p></div>'; }).join('')) +
    (g.bring.length ? sec(t('what_bring'), '<ul class="list">' + g.bring.map(function (b) { return '<li>📄 ' + esc(b) + '</li>'; }).join('') + '</ul>') : '') +
    (g.tip ? '<div class="card result mid"><b>💡 ' + t('tip') + '</b><p style="margin:4px 0 0">' + esc(g.tip) + '</p></div>' : '') +
    (links.length || meta.go ? sec(t('useful_links'), '<div class="row">' +
      (meta.go ? '<a class="btn sm" href="#' + meta.go + '">' + esc(g.go) + '</a>' : '') +
      links.map(function (l) { return '<a class="btn ghost sm" href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; }).join('') + '</div>' +
      (links.length ? '<p class="muted" style="margin:8px 0 0">' + t('check_official') + '</p>' : '')) : '') +
    '<button class="btn block' + (done ? ' ghost' : '') + '" id="gdone">' + (done ? t('done_undo') : t('mark_done')) + '</button>' +
    (next !== null ? '<button class="btn ghost block" style="margin-top:10px" onclick="location.hash=\'guide/' + key + '/' + next + '\'">' + t('next', {x:esc(cl.items[next])}) + '</button>' : '') +
    '<p class="muted" style="text-align:center;margin-top:14px">' + t('stuck') + '</p>',
    bind: function () {
      document.getElementById('gdone').onclick = function () {
        st[i] = !done; store.set('cl_' + key, st); toast(done ? t('marked_not_done') : t('nice_done'));
        if (!done && next !== null) go('guide/' + key + '/' + next); else render();
      };
    }
  };
};

views.todo = function () {
  return {title:t('todo_title'), tab:'todo', html: '<p class="muted">' + t('todo_intro') + '</p>' + LIST_KEYS.map(function (key) {
    var st = store.get('cl_' + key, {}), cl = list(key), pr = checklistProgress(key);
    return '<div class="card"><h3>' + esc(cl.title) + '</h3><span class="muted">' + t('n_done', {n:pr[0], total:pr[1]}) + '</span>' + bar(pr[0], pr[1]) +
      cl.items.map(function (it, i) {
        return '<div class="check' + (st[i] ? ' done' : '') + '"><input type="checkbox" aria-label="' + esc(t('done_aria')) + '" data-cl="' + key + '" data-i="' + i + '"' + (st[i] ? ' checked' : '') + '>' +
          '<a class="howto" href="#guide/' + key + '/' + i + '"><span>' + esc(it) + '</span><small>' + t('how_arrange') + '</small></a></div>';
      }).join('') +
      (key === 'pay' ? '<p class="muted" style="margin-top:8px">' + (pr[0] === pr[1] ? t('pay_ok') : t('pay_warn')) + '</p>' : '') + '</div>';
  }).join(''),
    bind: function () {
      document.querySelectorAll('[data-cl]').forEach(function (b) {
        b.onchange = function () { var k = 'cl_' + b.dataset.cl, st = store.get(k, {}); st[b.dataset.i] = b.checked; store.set(k, st); var y = scrollY; render(); scrollTo(0, y); };
      });
    }
  };
};

views.scam = function (roomId) {
  var ans = {}, Q = D('scam');
  var room = roomId ? store.get('rooms', []).filter(function (x) { return x.id === roomId; })[0] : null;
  return {title:t('scam_title'), back:room ? 'room/' + room.id : 'help', html:
    '<div class="card"><h3>' + t('scam_q_title') + '</h3><p class="muted">' + (room ? t('checking', {x:'<b>' + esc(room.title) + '</b>'}) + ' ' : '') + t('scam_intro') + '</p></div>' +
    Q.map(function (q, i) {
      return '<div class="card"><p style="margin-bottom:8px">' + (i + 1) + '. ' + esc(q) + '</p><div class="chips" style="margin:0"><button class="chip" data-q="' + i + '" data-v="1">' + t('yes') + '</button><button class="chip" data-q="' + i + '" data-v="0">' + t('no') + '</button><button class="chip" data-q="' + i + '" data-v="0.5">' + t('not_sure') + '</button></div></div>';
    }).join('') + '<div id="out"></div>',
    bind: function () {
      document.querySelectorAll('[data-q]').forEach(function (b) {
        b.onclick = function () {
          ans[b.dataset.q] = +b.dataset.v;
          document.querySelectorAll('[data-q="' + b.dataset.q + '"]').forEach(function (x) { x.classList.toggle('on', x === b); });
          var n = Object.keys(ans).length, out = document.getElementById('out');
          if (n < Q.length) { out.innerHTML = '<p class="muted" style="text-align:center">' + t('n_answered', {n:n, total:Q.length}) + '</p>'; return; }
          var score = SCAM_W.reduce(function (s, w, k) { return s + w * ans[k]; }, 0);
          var hi = SCAM_W.some(function (w, k) { return w >= 4 && ans[k] === 1; });
          var lvl = (score >= 6 || hi) ? 'bad' : score >= 3 ? 'mid' : 'ok';
          out.innerHTML = '<div class="card result ' + lvl + '"><h3>' + t('res_' + lvl + '_t') + '</h3><p>' + t('res_' + lvl) + '</p><button class="btn ghost sm" onclick="location.hash=\'todo\'">' + t('open_pay_list') + '</button></div>';
          if (room) { var lst = store.get('rooms', []); lst.forEach(function (x) { if (x.id === room.id) x.scam = (score >= 6 || hi) ? Math.max(score, 6) : score; }); store.set('rooms', lst); toast(t('result_saved')); }
          out.scrollIntoView({behavior:'smooth'});
        };
      });
    }
  };
};

views.budget = function () {
  var b = store.get('budget', {income:1250, rent:650, food:250, insurance:40, phone:20, transport:30, study:50, fun:100});
  var fields = ['income','rent','food','insurance','phone','transport','study','fun'];
  return {title:t('budget_title'), back:'help', html:
    '<div class="card"><h3>' + t('budget_q') + '</h3><p class="muted">' + t('budget_intro') + '</p>' +
    fields.map(function (f) { return '<label class="f">' + t('bf_' + f) + '</label><input type="number" inputmode="numeric" min="0" data-b="' + f + '" value="' + b[f] + '">'; }).join('') + '</div><div id="bout"></div>',
    bind: function () {
      function calc() {
        document.querySelectorAll('[data-b]').forEach(function (i) { b[i.dataset.b] = +i.value || 0; });
        store.set('budget', b);
        var cost = b.rent + b.food + b.insurance + b.phone + b.transport + b.study + b.fun, left = b.income - cost;
        var maxRent = Math.max(0, b.income - (cost - b.rent));
        var lvl = left < 0 ? 'bad' : left < 75 ? 'mid' : 'ok';
        document.getElementById('bout').innerHTML = '<div class="card result ' + lvl + '"><span class="muted">' + t('left_month') + '</span><div class="big">' + eur(left) + '</div>' +
          '<p>' + t('total_costs', {cost:eur(cost), max:eur(maxRent)}) + '</p>' +
          '<p class="muted">' + t('budget_tip') + '</p>' +
          '<button class="btn sm" id="usebud">' + t('use_max', {x:eur(maxRent)}) + '</button></div>';
        document.getElementById('usebud').onclick = function () { var p = store.get('prefs', {city:'', budget:650, type:'room'}); p.budget = Math.min(1600, Math.round(maxRent / 25) * 25); store.set('prefs', p); go('search'); };
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

views.help = function () {
  return {title:t('help_title'), back:'home', html:
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'scam\'"><span class="ic">🛡️</span><b>' + t('tile_scam') + '</b><span>' + t('h_check_ad') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>' + t('tile_budget') + '</b><span>' + t('h_monthly') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'rights\'"><span class="ic">⚖️</span><b>' + t('h_rights') + '</b><span>' + t('h_rights_sub') + '</span></button>' +
      '<button class="tile" onclick="location.hash=\'steps\'"><span class="ic">🗺️</span><b>' + t('h_steps') + '</b><span>' + t('h_steps_sub') + '</span></button>' +
    '</div>' +
    '<div class="card"><h3>' + t('emergency') + '</h3><div class="row"><a class="btn danger sm" href="tel:112">' + t('em_112') + '</a><a class="btn ghost sm" href="tel:09008844">' + t('em_police') + '</a><a class="btn ghost sm" href="tel:0887867372">' + t('em_fraud') + '</a></div></div>' +
    '<div class="card"><h3>' + t('questions') + '</h3>' + D('faq').map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div>' +
    '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<div class="card"><h3>' + t('ask_dd') + '</h3><p class="muted">' + t('ask_text') + '</p><form id="cf"><textarea required rows="3" placeholder="' + esc(t('your_q')) + '"></textarea><button class="btn block" style="margin-top:8px">' + t('send') + '</button></form></div>' +
    '<p class="muted" style="text-align:center">' + t('disclaimer') + '</p>',
    bind: function () { bindLangPicker(); document.getElementById('cf').onsubmit = function (e) { e.preventDefault(); e.target.reset(); toast(t('sent_toast')); }; }
  };
};

views.steps = function () {
  return {title:t('steps_title'), back:'help', html:'<div class="card">' + D('steps').map(function (x, i) { return '<div class="step" style="margin-bottom:12px"><b class="n">' + (i + 1) + '</b><div><h3>' + esc(x[0]) + '</h3><p class="muted">' + esc(x[1]) + '</p></div></div>'; }).join('') + '<button class="btn block" onclick="location.hash=\'search\'">' + t('start_searching') + '</button></div>'};
};

/* ---------- accounts (demo: stored on this phone only) ---------- */
var COLORS = ['#1F6FB2','#1E8E5A','#B9770E','#8E44AD','#C0392B','#16A085','#2C3E50','#D35400'];
function initials(n) { return String(n || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
function avatar(p) { var c = COLORS[(p.name || '').length % COLORS.length]; return '<div class="av" style="background:' + c + '">' + esc(initials(p.name)) + '</div>'; }
function accounts() { return store.get('accounts', {}); }
function me() { var s = store.get('session', null); return s ? accounts()[s] || null : null; }
function viewer() { return me() || {guest:true, name:'', city:store.get('prefs', {}).city || '', school:''}; }
function saveMe(u) { var a = accounts(); a[u.email] = u; store.set('accounts', a); }
function hash(pw) {
  if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', new TextEncoder().encode('dd:' + pw)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); });
  return Promise.resolve('plain:' + pw);
}
// Countries are stored in English (key) and shown translated.
var COUNTRIES = ['Belgium','Brazil','Bulgaria','China','France','Germany','Greece','India','Indonesia','Italy','Lithuania','Morocco','Netherlands','Nigeria','Poland','Portugal','Romania','Spain','Turkey','Ukraine','United Kingdom','United States','Vietnam','Other'];
var FLAG = {Belgium:'🇧🇪',Brazil:'🇧🇷',Bulgaria:'🇧🇬',China:'🇨🇳',France:'🇫🇷',Germany:'🇩🇪',Greece:'🇬🇷',India:'🇮🇳',Indonesia:'🇮🇩',Italy:'🇮🇹',Lithuania:'🇱🇹',Morocco:'🇲🇦',Netherlands:'🇳🇱',Nigeria:'🇳🇬',Poland:'🇵🇱',Portugal:'🇵🇹',Romania:'🇷🇴',Spain:'🇪🇸',Turkey:'🇹🇷',Ukraine:'🇺🇦','United Kingdom':'🇬🇧','United States':'🇺🇸',Vietnam:'🇻🇳'};
function countryName(c) { return (D('countries') || {})[c] || c; }
// Example profiles for the demo. Not real people. Their texts are written by "the students", so they are not translated.
var DEMO = [
  {id:'d1',name:'Lucía Fernández',country:'Spain',city:'den-bosch',school:'Avans',study:'International Business',start:'2027-09',looking:true,about:'Looking for a room in Den Bosch from September. Love cooking and padel!'},
  {id:'d2',name:'Mateusz Nowak',country:'Poland',city:'den-bosch',school:'Koning Willem I College',study:'Real Estate',start:'2027-09',looking:true,about:'Want to share a house with 2–3 other students. Quiet but social.'},
  {id:'d3',name:'Aisha Bello',country:'Nigeria',city:'eindhoven',school:'TU/e',study:'Data Science',start:'2027-08',looking:false,about:'Found a room at Vestide. Happy to give tips about Eindhoven!'},
  {id:'d4',name:'Chen Wei',country:'China',city:'tilburg',school:'Tilburg University',study:'Economics',start:'2027-09',looking:true,about:'Arriving in August. Anyone want to look for a studio together?'},
  {id:'d5',name:'Giulia Romano',country:'Italy',city:'utrecht',school:'UU',study:'Psychology',start:'2027-09',looking:true,about:'Registered at ROOM.nl. Searching in Utrecht or Zeist.'},
  {id:'d6',name:'Arjun Mehta',country:'India',city:'delft',school:'TU Delft',study:'Civil Engineering',start:'2027-08',looking:true,about:'Master\'s student. Looking for housemates for a 3-bedroom place.'},
  {id:'d7',name:'Léa Dubois',country:'France',city:'rotterdam',school:'Erasmus',study:'Law',start:'2027-09',looking:false,about:'Living in Kralingen. Ask me anything about Rotterdam.'},
  {id:'d8',name:'Jonas Becker',country:'Germany',city:'groningen',school:'Hanze',study:'Facility Management',start:'2027-09',looking:true,about:'Want to arrive early to find a place. Cycling fan.'},
  {id:'d9',name:'Elena Popescu',country:'Romania',city:'den-bosch',school:'JADS',study:'Data Science & Entrepreneurship',start:'2027-09',looking:false,about:'Already have a room in Rosmalen, happy to help you find one!'},
  {id:'d10',name:'Mehmet Yılmaz',country:'Turkey',city:'amsterdam',school:'HvA',study:'Built Environment',start:'2027-09',looking:true,about:'Searching in Amsterdam and Diemen. Budget is tight 😅'},
  {id:'d11',name:'Sofia Costa',country:'Portugal',city:'maastricht',school:'Maastricht University',study:'European Studies',start:'2027-08',looking:true,about:'Anyone else starting in Maastricht? Let\'s meet up!'},
  {id:'d12',name:'Nguyen Thi Lan',country:'Vietnam',city:'breda',school:'BUas',study:'Tourism',start:'2027-09',looking:false,about:'Got housing through BUas. Ask me how it works.'}
];
function others() {
  var u = me(), lst = DEMO.slice(), a = accounts();
  Object.keys(a).forEach(function (k) { var x = a[k]; if (x.visible && (!u || x.email !== u.email)) lst.push({id:'u:' + x.email,name:x.name,country:x.country,city:x.city,school:x.school,study:x.study,start:x.start,looking:x.looking,about:x.about}); });
  return lst;
}
function person(id) { return others().filter(function (p) { return p.id === id; })[0]; }

function profileFields(u) {
  u = u || {};
  var countries = COUNTRIES.slice().sort(function (a, b) { return a === 'Other' ? 1 : b === 'Other' ? -1 : countryName(a).localeCompare(countryName(b), LANG); });
  return '<label class="f">' + t('full_name') + '</label><input name="name" required value="' + esc(u.name) + '" autocomplete="name">' +
    '<label class="f">' + t('country') + '</label><select name="country" required><option value="">' + t('choose') + '</option>' + countries.map(function (c) { return '<option value="' + esc(c) + '"' + (c === u.country ? ' selected' : '') + '>' + esc(countryName(c)) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('study_city') + '</label><select name="city" required><option value="">' + t('choose') + '</option>' + CITIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === u.city ? ' selected' : '') + '>' + esc(cityName(c)) + '</option>'; }).join('') + '</select>' +
    '<label class="f">' + t('school') + '</label><input name="school" required value="' + esc(u.school) + '" placeholder="' + esc(t('ph_school')) + '">' +
    '<label class="f">' + t('study') + '</label><input name="study" value="' + esc(u.study) + '" placeholder="' + esc(t('ph_study')) + '">' +
    '<label class="f">' + t('start_date') + '</label><input name="start" type="month" value="' + esc(u.start || '2027-09') + '">' +
    '<label class="f">' + t('about') + '</label><textarea name="about" rows="2" placeholder="' + esc(t('ph_about')) + '">' + esc(u.about) + '</textarea>' +
    '<label class="switch"><span>' + t('still_looking') + '</span><input type="checkbox" name="looking"' + (u.looking !== false ? ' checked' : '') + '></label>' +
    '<label class="switch"><span>' + t('show_profile') + '</span><input type="checkbox" name="visible"' + (u.visible !== false ? ' checked' : '') + '></label>';
}
function readProfile(fd, u) {
  ['name','country','city','school','study','start','about'].forEach(function (k) { u[k] = (fd.get(k) || '').trim(); });
  u.looking = fd.get('looking') === 'on'; u.visible = fd.get('visible') === 'on';
  return u;
}

views.welcome = function () {
  return {title:'DutchDoor', back:'home', html:
    '<div class="card"><h3 style="margin-bottom:0">🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<div class="card hero" style="text-align:center;padding:28px 18px"><img src="icons/icon.svg" width="72" height="72" alt=""><h2 style="margin-top:12px">' + t('welcome_title') + '</h2><p>' + t('welcome_text') + '</p></div>' +
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
          var u = readProfile(fd, {email:email, pw:h, created:new Date().toISOString().slice(0, 10), id:'S' + String(Date.now()).slice(-7)});
          saveMe(u); store.set('session', email);
          var p = store.get('prefs', {city:'', budget:650, type:'room'}); p.city = u.city; store.set('prefs', p);
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
  var u = me(), c = city(u.city);
  return {title:t('my_profile'), back:'home', html:
    '<div class="idcard"><span class="badge">' + t('student_badge') + '</span><div class="lbl">' + t('card_label') + '</div><h3>' + esc(u.name) + '</h3><div style="opacity:.85">' + esc(u.study || t('student')) + '</div>' +
    '<div class="cols"><div><div class="lbl">' + t('school') + '</div><div class="val">' + esc(u.school) + '</div></div><div><div class="lbl">' + t('city') + '</div><div class="val">' + (c ? esc(cityName(c)) : '') + '</div></div>' +
    '<div><div class="lbl">' + t('student_no') + '</div><div class="val">' + esc(u.id) + '</div></div><div><div class="lbl">' + t('from') + '</div><div class="val">' + (FLAG[u.country] || '') + ' ' + esc(countryName(u.country)) + '</div></div></div></div>' +
    '<div class="card"><h3>🌐 ' + t('language') + '</h3>' + langPicker() + '</div>' +
    '<form class="card" id="pf"><h3>' + t('my_details') + '</h3><label class="f">' + t('email') + '</label><input value="' + esc(u.email) + '" disabled>' + profileFields(u) +
    '<button class="btn block" style="margin-top:12px">' + t('save_changes') + '</button></form>' +
    '<div class="card"><h3>' + t('settings') + '</h3>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#help"><span>' + t('help_em') + '</span><span>›</span></a>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#todo"><span>' + t('my_todo') + '</span><span>›</span></a>' +
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

views.community = function () {
  var u = viewer(), f = store.get('cf', 'city');
  if (u.guest && (f === 'school' || (f === 'city' && !u.city))) f = 'all';
  var lst = others().filter(function (p) {
    if (f === 'city') return p.city === u.city;
    if (f === 'school') return p.school.toLowerCase() === (u.school || '').toLowerCase();
    if (f === 'looking') return p.looking;
    return true;
  });
  var uc = city(u.city), cn = uc ? esc(cityName(uc)) : t('my_city');
  var chips = [['city', t('f_in', {city:cn})], ['school', t('f_at', {school:u.school ? esc(u.school) : t('my_school')})], ['looking', t('f_looking')], ['all', t('f_all')]]
    .filter(function (x) { return !u.guest || (x[0] !== 'school' && (x[0] !== 'city' || u.city)); });
  return {title:t('comm_title'), tab:'community', html:
    '<div class="card"><h3>' + t('meet_title') + '</h3><p class="muted">' + t('comm_text') + '</p>' +
    '<div class="chips">' + chips.map(function (x) { return '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    (u.guest ? '<div class="card result"><p style="margin:0 0 8px">' + t('guest_note') + '</p><button class="btn sm" onclick="location.hash=\'signup\'">' + t('create_account') + '</button></div>' : '') +
    '<p class="muted">' + t('n_students', {n:lst.length}) + '</p>' +
    (lst.length ? lst.map(function (p) {
      var pc = city(p.city);
      return '<div class="card person" onclick="location.hash=\'student/' + encodeURIComponent(p.id) + '\'">' + avatar(p) +
        '<div class="grow"><h3>' + esc(p.name) + ' ' + (FLAG[p.country] || '') + '</h3><div class="muted">' + esc(p.school) + ' · ' + (pc ? esc(cityName(pc)) : '') + '</div>' +
        (p.looking ? '<span class="tag mid">' + t('looking_room') + '</span>' : '<span class="tag ok">' + t('has_room') + '</span>') + '</div><span>›</span></div>';
    }).join('') : '<div class="empty">' + t('no_students') + '<br><button class="btn ghost sm" style="margin-top:10px" data-f="all">' + t('show_everyone') + '</button></div>'),
    bind: function () { document.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { store.set('cf', b.dataset.f); render(); }; }); }
  };
};

views.student = function (id) {
  var p = person(decodeURIComponent(id)); if (!p) return views.community();
  var u = viewer(), c = city(p.city), tags = [];
  if (u.city && p.city === u.city) tags.push(t('same_city'));
  if (u.school && p.school.toLowerCase() === u.school.toLowerCase()) tags.push(t('same_school'));
  return {title:p.name.split(' ')[0], back:'community', tab:'community', html:
    '<div class="card" style="text-align:center">' + avatar(p).replace('class="av"', 'class="av" style="width:72px;height:72px;font-size:1.5rem;margin:0 auto 8px;background:' + COLORS[(p.name || '').length % COLORS.length] + '"') +
    '<h2>' + esc(p.name) + '</h2><p class="muted">' + (FLAG[p.country] || '') + ' ' + t('from_country', {country:esc(countryName(p.country))}) + '</p>' +
    tags.map(function (x) { return '<span class="tag ok" style="margin:2px">' + x + '</span>'; }).join('') + '</div>' +
    '<div class="card"><ul class="list"><li><b>' + t('lbl_school') + '</b> ' + esc(p.school) + '</li><li><b>' + t('lbl_study') + '</b> ' + esc(p.study || '–') + '</li><li><b>' + t('lbl_city') + '</b> ' + (c ? esc(cityName(c)) : '') + '</li><li><b>' + t('lbl_starts') + '</b> ' + esc(p.start || '–') + '</li>' +
    '<li><b>' + t('lbl_housing') + '</b> ' + (p.looking ? t('still_looking_room') : t('has_room')) + '</li></ul>' + (p.about ? '<p style="margin-top:10px">“' + esc(p.about) + '”</p>' : '') + '</div>' +
    (u.guest ? '<button class="btn block" onclick="location.hash=\'signup\'">' + t('create_to_msg') + '</button>' :
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
function render() {
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
  document.querySelectorAll('.tabs button').forEach(function (b) { b.lastChild.textContent = t('tab_' + {home:'home', search:'rooms', tracker:'saved', todo:'todo', community:'community'}[b.dataset.tab]); });
  var fn = views[parts[0]] || views.home;
  var v = fn(parts[1], parts[2]);
  $title.textContent = v.title;
  $view.innerHTML = v.html;
  $back.hidden = !v.back;
  $back.onclick = function () { go(v.back); };
  var tab = v.tab || (parts[0] in {home:1, search:1, tracker:1, todo:1, community:1} ? parts[0] : 'home');
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
