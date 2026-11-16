/* DutchDoor app — works fully offline, data is stored on the phone (localStorage). */
(function () {
'use strict';

/* ---------- storage ---------- */
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('dd_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('dd_' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- data ---------- */
// Indicative rents (euro per month) for a room in a shared student house / a studio. Always check current prices.
var CITIES = [
  {id:'amsterdam',name:'Amsterdam',room:1000,studio:1450,schools:'UvA, VU, HvA',pressure:3,providers:['DUWO','Student Experience','Xior','ROOM.nl'],tip:'The hardest city to find a room. Start 4–6 months early and also look in Diemen, Amstelveen and Zaandam.'},
  {id:'rotterdam',name:'Rotterdam',room:720,studio:1100,schools:'Erasmus, Hogeschool Rotterdam',pressure:2,providers:['SSH','Xior','Stadswonen'],tip:'Areas like Kralingen and Delfshaven are popular with students.'},
  {id:'utrecht',name:'Utrecht',room:780,studio:1200,schools:'UU, HU',pressure:3,providers:['SSH','ROOM.nl','Xior'],tip:'Sign up at ROOM.nl as soon as possible: waiting time counts.'},
  {id:'den-haag',name:'The Hague',room:700,studio:1100,schools:'Haagse Hogeschool, Leiden Univ. campus',pressure:2,providers:['DUWO','Xior','The Social Hub'],tip:'Also look in Rijswijk and Voorburg, they are close by tram.'},
  {id:'leiden',name:'Leiden',room:700,studio:1050,schools:'Leiden University',pressure:3,providers:['DUWO','Xior'],tip:'Few rooms and many students. Use DUWO short-stay for your first months.'},
  {id:'delft',name:'Delft',room:650,studio:1000,schools:'TU Delft',pressure:3,providers:['DUWO','Xior'],tip:'TU Delft has a housing office for international students. Contact them first.'},
  {id:'groningen',name:'Groningen',room:520,studio:850,schools:'RUG, Hanze',pressure:2,providers:['SSH','Lefier','Xior'],tip:'Cheaper than the Randstad, but many internationals arrive in September. Do not arrive without a room.'},
  {id:'eindhoven',name:'Eindhoven',room:630,studio:950,schools:'TU/e, Fontys',pressure:2,providers:['Vestide','Xior','Woonbedrijf'],tip:'Vestide is the main student housing provider. Register early.'},
  {id:'tilburg',name:'Tilburg',room:560,studio:900,schools:'Tilburg University, Fontys, Avans',pressure:2,providers:['Tiwos','Xior','Kamernet'],tip:'Many rooms in private houses. Always check the landlord and contract.'},
  {id:'den-bosch',name:"'s-Hertogenbosch",room:620,studio:950,schools:'Avans, Koning Willem I College, JADS',pressure:2,providers:['Zayaz','Kamernet','Pararius'],tip:'Small city, so look early. Also check rooms in Vught and Rosmalen.'},
  {id:'nijmegen',name:'Nijmegen',room:510,studio:850,schools:'Radboud, HAN',pressure:2,providers:['SSH','Talis','Kamernet'],tip:'SSH has many rooms near the Heyendaal campus.'},
  {id:'maastricht',name:'Maastricht',room:600,studio:900,schools:'Maastricht University, Zuyd',pressure:2,providers:['Maastricht Housing','Xior','The Student Hotel'],tip:'Maastricht Housing is the official partner of the university.'},
  {id:'enschede',name:'Enschede',room:450,studio:750,schools:'University of Twente, Saxion',pressure:1,providers:['Roombeek','Kamernet','UT campus housing'],tip:'One of the cheapest student cities. You can also live on the UT campus.'},
  {id:'arnhem',name:'Arnhem',room:520,studio:850,schools:'HAN, ArtEZ',pressure:1,providers:['SSH','Kamernet','Pararius'],tip:'Good train connection to Nijmegen if you study there.'},
  {id:'breda',name:'Breda',room:580,studio:900,schools:'BUas, Avans',pressure:2,providers:['Xior','Kamernet','Pararius'],tip:'BUas helps first-year international students with housing. Ask them first.'}
];
var PRESSURE = ['', 'Easier', 'Hard', 'Very hard'];

function platforms(c) {
  var n = encodeURIComponent(c.name.replace("'s-", 's-'));
  var slug = c.id === 'den-haag' ? 'den-haag' : c.id;
  return [
    {name:'Kamernet', what:'Rooms in shared houses', url:'https://kamernet.nl/en/for-rent/rooms-' + slug},
    {name:'Pararius', what:'Studios and apartments (agencies)', url:'https://www.pararius.com/apartments/' + slug},
    {name:'HousingAnywhere', what:'Book from abroad, mid-term stays', url:'https://housinganywhere.com/s/' + n + '--Netherlands'},
    {name:'Funda Huur', what:'All rentals in the city', url:'https://www.funda.nl/zoeken/huur?selected_area=%5B%22' + slug + '%22%5D'}
  ];
}

var CHECKLISTS = {
  before: {title:'Before you arrive', items:[
    'Passport or ID card, valid for your whole stay','Birth certificate (with official stamp if needed)','Letter of acceptance from your school',
    'Visa / residence permit arranged (non-EU only, via your school and IND)','A room, or a place to stay for the first weeks',
    'Enough money for the first months (rent, deposit, daily costs)','Travel or health insurance for the first weeks','Appointment at the city hall made online']},
  first: {title:'Your first weeks', items:[
    'Register at the city hall','Get your BSN','Open a Dutch bank account','Apply for DigiD',
    'Arrange health insurance (if you work)','Register with a general doctor (huisarts)','Get a public transport card (OV-chipkaart)','Buy a bike and a good lock']},
  pay: {title:'Before you pay for a room', items:[
    'I have seen the room in real life or by live video call','I did a reverse image search on the photos','I checked the address on Google Maps',
    'I know the full name of the landlord or agency','The agency is listed at the KvK (Chamber of Commerce)','I have a written contract','Registering at this address is allowed']}
};

var SCAM_Q = [
  {q:'Is the rent much lower than normal for this city?', w:3},
  {q:'Is the landlord "abroad" or unable to show the room?', w:4},
  {q:'Do you have to pay before you have seen the room?', w:4},
  {q:'Do they ask for a copy of your passport very early?', w:2},
  {q:'Do they want payment by Western Union, crypto, gift cards or a foreign bank?', w:5},
  {q:'Are they pushing you to decide today?', w:2},
  {q:'Do the photos look like a hotel or show up elsewhere online?', w:3},
  {q:'Do they refuse a written contract, or say you cannot register at the address?', w:3}
];

var STATUS = ['Interested','Viewing planned','Applied','Offer','Signed','Rejected'];

var FAQ = [
  ['How much does a room cost?','A room in a student house costs about €450–1,000 per month, depending on the city. A studio costs more. Use the Rooms tab to compare cities.'],
  ['What is hospiteren?','An interview with the people who already live in the house. They choose who gets the room. Be yourself and ask questions too.'],
  ['How high can the deposit be?','There is a legal maximum (in most cases two months of basic rent). The landlord must pay it back after you move out. Check rijksoverheid.nl for the current rules.'],
  ['Can I register at any address?','Only if the landlord allows it and the place is suitable. Without registration you cannot get a BSN, so check this before you sign.'],
  ['Is my rent too high?','For many rooms the maximum rent depends on a points system. Do the free rent check of the Huurcommissie.'],
  ['Do I need Dutch health insurance?','Usually yes if you have a job, also a small side job. If you only study, your own or a student insurance may be enough.']
];

/* ---------- helpers ---------- */
var $view = document.getElementById('view');
var $title = document.getElementById('title');
var $back = document.getElementById('back');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function eur(n) { n = Math.round(n); return (n < 0 ? '-€' : '€') + Math.abs(n).toLocaleString('nl-NL'); }
function city(id) { return CITIES.filter(function (c) { return c.id === id; })[0]; }
function toast(t) { var e = document.getElementById('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 2200); }
function go(h) { location.hash = h; }
function checklistProgress(key) { var st = store.get('cl_' + key, {}), n = CHECKLISTS[key].items.filter(function (_, i) { return st[i]; }).length; return [n, CHECKLISTS[key].items.length]; }
function bar(n, t) { return '<div class="bar"><i style="width:' + (t ? n / t * 100 : 0) + '%"></i></div>'; }
function fit(price, budget) {
  if (price <= budget) return '<span class="tag ok">Fits your budget</span>';
  if (price <= budget * 1.15) return '<span class="tag mid">Just above budget</span>';
  return '<span class="tag bad">Above budget</span>';
}

/* ---------- views ---------- */
var views = {};

views.home = function () {
  var prefs = store.get('prefs', {city:'', budget:650, type:'room'});
  var rooms = store.get('rooms', []);
  var a = checklistProgress('before'), b = checklistProgress('first');
  var c = city(prefs.city);
  return {title:'DutchDoor', html:
    '<div class="card hero"><h2>Welcome!</h2><p>Find a safe room and get settled in the Netherlands, step by step.</p>' +
    '<button class="btn" style="background:#fff;color:#1F3A5F" onclick="location.hash=\'search\'">Find a room</button></div>' +
    (c ? '<div class="card city" onclick="location.hash=\'city/' + c.id + '\'"><div><h3>Your city: ' + esc(c.name) + '</h3><span class="muted">Room about ' + eur(c.room) + ' / month</span></div><span class="price">›</span></div>' : '') +
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'scam\'"><span class="ic">🛡️</span><b>Scam check</b><span>Is this ad real?</span></button>' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>Budget</b><span>What can I pay?</span></button>' +
      '<button class="tile" onclick="location.hash=\'tracker\'"><span class="ic">📌</span><b>Saved rooms</b><span>' + rooms.length + ' saved</span></button>' +
      '<button class="tile" onclick="location.hash=\'rights\'"><span class="ic">⚖️</span><b>Your rights</b><span>Contract & rent check</span></button>' +
    '</div>' +
    '<div class="card"><h3>Your progress</h3>' +
      '<p class="muted" style="margin:6px 0 0">Before you arrive: ' + a[0] + ' of ' + a[1] + '</p>' + bar(a[0], a[1]) +
      '<p class="muted" style="margin:6px 0 0">First weeks: ' + b[0] + ' of ' + b[1] + '</p>' + bar(b[0], b[1]) +
      '<button class="btn ghost sm" style="margin-top:8px" onclick="location.hash=\'todo\'">Open to-do list</button></div>'
  };
};

views.search = function () {
  var p = store.get('prefs', {city:'', budget:650, type:'room'});
  var q = (store.get('q', '') || '').toLowerCase();
  var list = CITIES.filter(function (c) { return !q || (c.name + ' ' + c.schools).toLowerCase().indexOf(q) > -1; });
  list.sort(function (x, y) { return x[p.type] - y[p.type]; });
  return {title:'Find a room', tab:'search', html:
    '<div class="card"><label class="f" for="q" style="margin-top:0">City or school</label><input id="q" type="search" placeholder="e.g. Utrecht or Fontys" value="' + esc(store.get('q', '')) + '">' +
    '<label class="f">What are you looking for?</label><div class="chips">' +
      '<button class="chip' + (p.type === 'room' ? ' on' : '') + '" data-type="room">Room (shared)</button>' +
      '<button class="chip' + (p.type === 'studio' ? ' on' : '') + '" data-type="studio">Studio</button></div>' +
    '<label class="f" for="budget">Max rent per month: <span id="bv">' + eur(p.budget) + '</span></label>' +
    '<input id="budget" type="range" min="300" max="1600" step="25" value="' + p.budget + '"></div>' +
    '<p class="muted">' + list.length + ' cities · indicative prices, cheapest first</p>' +
    (list.length ? list.map(function (c) {
      return '<div class="card city" onclick="location.hash=\'city/' + c.id + '\'"><div><h3>' + esc(c.name) + '</h3>' +
        '<div class="muted">' + esc(c.schools) + '</div><div style="margin-top:6px">' + fit(c[p.type], p.budget) + ' <span class="tag">' + PRESSURE[c.pressure] + ' to find</span></div></div>' +
        '<div class="price">' + eur(c[p.type]) + '</div></div>';
    }).join('') : '<div class="empty">No city found. Try another name.</div>'),
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
  var mine = p.city === c.id;
  return {title:c.name, back:'search', tab:'search', html:
    '<div class="card"><div class="row" style="justify-content:space-between"><div><span class="muted">Room in a shared house</span><div class="big">' + eur(c.room) + '</div></div>' +
    '<div><span class="muted">Studio</span><div class="big">' + eur(c.studio) + '</div></div></div>' +
    '<p class="muted" style="margin-top:6px">Indicative prices per month. ' + fit(c[p.type], p.budget) + '</p>' +
    '<p><b>Finding a room:</b> ' + PRESSURE[c.pressure] + '</p><p>💡 ' + esc(c.tip) + '</p>' +
    '<button class="btn ' + (mine ? 'ghost' : '') + ' sm" id="setcity">' + (mine ? '✓ This is my city' : 'Set as my city') + '</button></div>' +
    '<h2>Search rooms in ' + esc(c.name) + '</h2><p class="muted">Opens the housing website with ' + esc(c.name) + ' already selected.</p>' +
    platforms(c).map(function (x) {
      return '<a class="card city" style="text-decoration:none;color:inherit" href="' + x.url + '" target="_blank" rel="noopener"><div><h3>' + x.name + '</h3><span class="muted">' + x.what + '</span></div><span class="price">↗</span></a>';
    }).join('') +
    '<div class="card"><h3>Student housing providers here</h3><ul class="list">' + c.providers.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<p class="muted">Ask your school\'s housing office too: ' + esc(c.schools) + '.</p></div>' +
    '<div class="card"><h3>Found a room?</h3><p>Save it, so you can track viewings and do a scam check.</p><button class="btn block" onclick="location.hash=\'room/new/' + c.id + '\'">+ Save a room</button></div>',
    bind: function () { document.getElementById('setcity').onclick = function () { p.city = mine ? '' : c.id; store.set('prefs', p); toast(mine ? 'City removed' : c.name + ' is now your city'); render(); }; }
  };
};

views.tracker = function () {
  var rooms = store.get('rooms', []);
  return {title:'Saved rooms', tab:'tracker', html:
    '<button class="btn block" style="margin-bottom:12px" onclick="location.hash=\'room/new\'">+ Save a room</button>' +
    (rooms.length ? rooms.map(function (r) {
      var cls = r.status === 'Rejected' ? 'bad' : (r.status === 'Signed' || r.status === 'Offer') ? 'ok' : '';
      return '<div class="card city" onclick="location.hash=\'room/' + r.id + '\'"><div><h3>' + esc(r.title || 'Room') + '</h3>' +
        '<div class="muted">' + esc(r.city ? (city(r.city) || {}).name : '') + (r.date ? ' · viewing ' + esc(r.date) : '') + '</div>' +
        '<div style="margin-top:6px"><span class="tag ' + cls + '">' + esc(r.status) + '</span>' + (r.scam != null ? ' <span class="tag ' + (r.scam >= 6 ? 'bad' : r.scam >= 3 ? 'mid' : 'ok') + '">Scam risk: ' + (r.scam >= 6 ? 'high' : r.scam >= 3 ? 'medium' : 'low') + '</span>' : '') + '</div></div>' +
        '<div class="price">' + (r.rent ? eur(r.rent) : '') + '</div></div>';
    }).join('') : '<div class="empty">📌<br>No rooms saved yet.<br>Save rooms you find to keep track of viewings, notes and scam checks.</div>')
  };
};

views.room = function (id, cityId) {
  var rooms = store.get('rooms', []);
  var isNew = id === 'new';
  var r = isNew ? {id:String(Date.now()), title:'', city:cityId || store.get('prefs', {}).city || '', rent:'', link:'', status:'Interested', date:'', notes:''} : rooms.filter(function (x) { return x.id === id; })[0];
  if (!r) return views.tracker();
  return {title:isNew ? 'Save a room' : 'Room', back:'tracker', tab:'tracker', html:
    '<form class="card" id="rf">' +
    '<label class="f" style="margin-top:0">Name or address</label><input name="title" required value="' + esc(r.title) + '" placeholder="e.g. Room Oudegracht 12">' +
    '<label class="f">City</label><select name="city"><option value="">Choose…</option>' + CITIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === r.city ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
    '<label class="f">Rent per month (€)</label><input name="rent" type="number" inputmode="numeric" min="0" value="' + esc(r.rent) + '">' +
    '<label class="f">Link to the ad</label><input name="link" type="url" value="' + esc(r.link) + '" placeholder="https://">' +
    '<label class="f">Status</label><select name="status">' + STATUS.map(function (s) { return '<option' + (s === r.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
    '<label class="f">Viewing / interview date</label><input name="date" type="date" value="' + esc(r.date) + '">' +
    '<label class="f">Notes</label><textarea name="notes" rows="3" placeholder="Questions for the landlord, how the house felt…">' + esc(r.notes) + '</textarea>' +
    '<button class="btn block" style="margin-top:14px">Save</button></form>' +
    (isNew ? '' :
      '<div class="row">' + (r.link ? '<a class="btn ghost sm" href="' + esc(r.link) + '" target="_blank" rel="noopener">Open ad ↗</a>' : '') +
      '<button class="btn ghost sm" onclick="location.hash=\'scam/' + r.id + '\'">🛡️ Scam check</button>' +
      '<button class="btn danger sm" id="del">Delete</button></div>'),
    bind: function () {
      document.getElementById('rf').onsubmit = function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        ['title','city','rent','link','status','date','notes'].forEach(function (k) { r[k] = fd.get(k); });
        r.rent = r.rent ? +r.rent : '';
        if (r.link && !/^https?:\/\//i.test(r.link)) r.link = 'https://' + r.link;
        var list = store.get('rooms', []).filter(function (x) { return x.id !== r.id; });
        list.unshift(r); store.set('rooms', list);
        toast('Room saved'); go('tracker');
      };
      var d = document.getElementById('del');
      if (d) d.onclick = function () { if (confirm('Delete this room?')) { store.set('rooms', rooms.filter(function (x) { return x.id !== r.id; })); toast('Deleted'); go('tracker'); } };
    }
  };
};

views.todo = function () {
  return {title:'To-do', tab:'todo', html: Object.keys(CHECKLISTS).map(function (key) {
    var st = store.get('cl_' + key, {}), cl = CHECKLISTS[key], pr = checklistProgress(key);
    return '<div class="card"><h3>' + cl.title + '</h3><span class="muted">' + pr[0] + ' of ' + pr[1] + ' done</span>' + bar(pr[0], pr[1]) +
      cl.items.map(function (it, i) {
        return '<label class="check' + (st[i] ? ' done' : '') + '"><input type="checkbox" data-cl="' + key + '" data-i="' + i + '"' + (st[i] ? ' checked' : '') + '><span>' + esc(it) + '</span></label>';
      }).join('') +
      (key === 'pay' ? '<p class="muted" style="margin-top:8px">' + (pr[0] === pr[1] ? '✅ Looks good. Still not sure? Contact DutchDoor.' : '⚠️ Do not pay until everything is checked.') + '</p>' : '') + '</div>';
  }).join(''),
    bind: function () {
      document.querySelectorAll('[data-cl]').forEach(function (b) {
        b.onchange = function () { var k = 'cl_' + b.dataset.cl, st = store.get(k, {}); st[b.dataset.i] = b.checked; store.set(k, st); var y = scrollY; render(); scrollTo(0, y); };
      });
    }
  };
};

views.scam = function (roomId) {
  var ans = {};
  var room = roomId ? store.get('rooms', []).filter(function (x) { return x.id === roomId; })[0] : null;
  return {title:'Scam check', back:room ? 'room/' + room.id : 'help', html:
    '<div class="card"><h3>Is this ad real?</h3><p class="muted">' + (room ? 'Checking: <b>' + esc(room.title) + '</b>. ' : '') + 'Answer every question honestly. It takes 1 minute.</p></div>' +
    SCAM_Q.map(function (s, i) {
      return '<div class="card"><p style="margin-bottom:8px">' + (i + 1) + '. ' + s.q + '</p><div class="chips" style="margin:0"><button class="chip" data-q="' + i + '" data-v="1">Yes</button><button class="chip" data-q="' + i + '" data-v="0">No</button><button class="chip" data-q="' + i + '" data-v="0.5">Not sure</button></div></div>';
    }).join('') + '<div id="out"></div>',
    bind: function () {
      document.querySelectorAll('[data-q]').forEach(function (b) {
        b.onclick = function () {
          ans[b.dataset.q] = +b.dataset.v;
          document.querySelectorAll('[data-q="' + b.dataset.q + '"]').forEach(function (x) { x.classList.toggle('on', x === b); });
          var done = Object.keys(ans).length, out = document.getElementById('out');
          if (done < SCAM_Q.length) { out.innerHTML = '<p class="muted" style="text-align:center">' + done + ' of ' + SCAM_Q.length + ' answered</p>'; return; }
          var score = SCAM_Q.reduce(function (s, q, i) { return s + q.w * ans[i]; }, 0);
          var hi = SCAM_Q.some(function (q, i) { return q.w >= 4 && ans[i] === 1; });
          var lvl = (score >= 6 || hi) ? 'bad' : score >= 3 ? 'mid' : 'ok';
          var msg = {bad:['High risk','This looks like a scam. <b>Do not pay anything.</b> Stop contact and report the ad to the website and the Fraudehelpdesk (088 786 73 72).'],
                     mid:['Be careful','Some things are not right. Ask more questions, view the room live and check the landlord at the KvK before you pay.'],
                     ok:['Low risk','No big warning signs. Still: always view the room and sign a written contract before you pay.']}[lvl];
          out.innerHTML = '<div class="card result ' + lvl + '"><h3>' + msg[0] + '</h3><p>' + msg[1] + '</p><button class="btn ghost sm" onclick="location.hash=\'todo\'">Open “before you pay” checklist</button></div>';
          if (room) { var list = store.get('rooms', []); list.forEach(function (x) { if (x.id === room.id) x.scam = (score >= 6 || hi) ? Math.max(score, 6) : score; }); store.set('rooms', list); toast('Result saved to this room'); }
          out.scrollIntoView({behavior:'smooth'});
        };
      });
    }
  };
};

views.budget = function () {
  var b = store.get('budget', {income:1250, rent:650, food:250, insurance:40, phone:20, transport:30, study:50, fun:100});
  var fields = [['income','Money in per month (job, parents, loan, DUO)'],['rent','Rent (incl. service costs)'],['food','Groceries'],['insurance','Health insurance'],['phone','Phone & internet'],['transport','Transport / bike'],['study','Books & study'],['fun','Going out & other']];
  return {title:'Budget', back:'help', html:
    '<div class="card"><h3>What can I pay?</h3><p class="muted">Fill in your own numbers. They stay on your phone.</p>' +
    fields.map(function (f) { return '<label class="f">' + f[1] + '</label><input type="number" inputmode="numeric" min="0" data-b="' + f[0] + '" value="' + b[f[0]] + '">'; }).join('') + '</div><div id="bout"></div>',
    bind: function () {
      function calc() {
        document.querySelectorAll('[data-b]').forEach(function (i) { b[i.dataset.b] = +i.value || 0; });
        store.set('budget', b);
        var cost = b.rent + b.food + b.insurance + b.phone + b.transport + b.study + b.fun, left = b.income - cost;
        var maxRent = Math.max(0, b.income - (cost - b.rent));
        var lvl = left < 0 ? 'bad' : left < 75 ? 'mid' : 'ok';
        document.getElementById('bout').innerHTML = '<div class="card result ' + lvl + '"><span class="muted">Left at the end of the month</span><div class="big">' + eur(left) + '</div>' +
          '<p>Total costs: ' + eur(cost) + '. The highest rent you can pay is about <b>' + eur(maxRent) + '</b>.</p>' +
          '<p class="muted">Tip: as an EU student with a job, you may get DUO student finance. Also check if you can get rent benefit (huurtoeslag) for a studio.</p>' +
          '<button class="btn sm" id="usebud">Use ' + eur(maxRent) + ' as max rent in search</button></div>';
        document.getElementById('usebud').onclick = function () { var p = store.get('prefs', {city:'', budget:650, type:'room'}); p.budget = Math.min(1600, Math.round(maxRent / 25) * 25); store.set('prefs', p); go('search'); };
      }
      document.querySelectorAll('[data-b]').forEach(function (i) { i.oninput = calc; });
      calc();
    }
  };
};

views.rights = function () {
  return {title:'Your rights', back:'help', html:
    '<div class="card"><h3>Check your contract</h3><ul class="list"><li>Start date and how long the contract is</li><li>Rent, and what is included (gas, water, electricity, internet)</li><li>How much the deposit is</li><li>How and when you can end the contract</li></ul></div>' +
    '<div class="card"><h3>Is your rent too high?</h3><p>For many rooms the maximum rent depends on a points system (size, kitchen, bathroom). Check it for free.</p><a class="btn sm" href="https://www.huurcommissie.nl/huurcommissie-helpt/huurprijscheck-en-puntentelling" target="_blank" rel="noopener">Huurcommissie rent check ↗</a></div>' +
    '<div class="card"><h3>Deposit</h3><p>There is a legal maximum and the landlord must pay it back soon after you move out. Check rijksoverheid.nl for current rules.</p></div>' +
    '<div class="card"><h3>Problems with your landlord?</h3><p>Talk to your landlord first and put everything in writing. Not working? Contact DutchDoor or the LSVb housing hotline.</p></div>'
  };
};

views.help = function () {
  return {title:'Help', tab:'help', html:
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'scam\'"><span class="ic">🛡️</span><b>Scam check</b><span>Check an ad</span></button>' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>Budget</b><span>Monthly costs</span></button>' +
      '<button class="tile" onclick="location.hash=\'rights\'"><span class="ic">⚖️</span><b>Your rights</b><span>Contract & rent</span></button>' +
      '<button class="tile" onclick="location.hash=\'steps\'"><span class="ic">🗺️</span><b>Step by step</b><span>How to find a room</span></button>' +
    '</div>' +
    '<div class="card"><h3>Emergency</h3><div class="row"><a class="btn danger sm" href="tel:112">📞 112 Emergency</a><a class="btn ghost sm" href="tel:09008844">Police 0900 8844</a><a class="btn ghost sm" href="tel:0887867372">Fraudehelpdesk</a></div></div>' +
    '<div class="card"><h3>Questions</h3>' + FAQ.map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div>' +
    '<div class="card"><h3>Ask DutchDoor</h3><p class="muted">Not sure about a room or contract? Send us a message.</p><form id="cf"><textarea required rows="3" placeholder="Your question"></textarea><button class="btn block" style="margin-top:8px">Send</button></form></div>' +
    '<p class="muted" style="text-align:center">DutchDoor is a school project (Koning Willem I College). Always check rules on official government websites.</p>',
    bind: function () { document.getElementById('cf').onsubmit = function (e) { e.preventDefault(); e.target.reset(); toast('Thanks! (School project: message not really sent)'); }; }
  };
};

views.steps = function () {
  var s = [['Know your budget','Use the budget tool to see what you can pay.'],['Start early','At least 3 months before you arrive.'],['Look in more places','School housing office, Kamernet, Pararius, HousingAnywhere. Be careful in Facebook groups.'],['View the room','In real life or by live video call. Sometimes there is an interview (hospiteren).'],['Check the contract','Length, rent, deposit, registration allowed?'],['Do the scam check','Before you pay anything.'],['Register your address','At the city hall, to get your BSN.']];
  return {title:'Step by step', back:'help', html:'<div class="card">' + s.map(function (x, i) { return '<div class="step" style="margin-bottom:12px"><b class="n">' + (i + 1) + '</b><div><h3>' + x[0] + '</h3><p class="muted">' + x[1] + '</p></div></div>'; }).join('') + '<button class="btn block" onclick="location.hash=\'search\'">Start searching</button></div>'};
};

/* ---------- router ---------- */
function render() {
  var parts = (location.hash.slice(1) || 'home').split('/');
  var fn = views[parts[0]] || views.home;
  var v = fn(parts[1], parts[2]);
  $title.textContent = v.title;
  $view.innerHTML = v.html;
  $back.hidden = !v.back;
  $back.onclick = function () { go(v.back); };
  var tab = v.tab || (parts[0] in {home:1, search:1, tracker:1, todo:1, help:1} ? parts[0] : 'help');
  if (parts[0] === 'home' || !views[parts[0]]) tab = 'home';
  document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  if (v.bind) v.bind();
}
document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { go(b.dataset.tab); }; });
var last = '';
window.addEventListener('hashchange', function () { render(); if (location.hash !== last) scrollTo(0, 0); last = location.hash; });
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
})();
