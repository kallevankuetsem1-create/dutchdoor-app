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

// "How to arrange this" guides, one per checklist item (key = list-index). General info: always check the official link.
var GUIDES = {
  'before-0': {why:'You need a valid passport or ID card for your visa, the city hall, the bank and your rental contract.',
    steps:['Check the expiry date: it must be valid for your whole stay.','Expires soon? Renew it in your home country before you leave. This can take weeks.','Make a photo or scan and keep it in a safe place (not in your email inbox).'],
    bring:[], cost:'Depends on your country', time:'Renewing can take 2–8 weeks', links:[], tip:'EU students can use an ID card. Non-EU students need a passport.'},
  'before-1': {why:'The city hall sometimes asks for your birth certificate when you register, to put your details in the Dutch population register (BRP).',
    steps:['Ask for a recent copy of your birth certificate in your home country.','Check if it needs an official stamp (apostille or legalisation). This depends on your country.','From an EU country? Ask for a multilingual standard form, then no stamp or translation is needed.','Not in English, Dutch, German or French? You may need a sworn translation.'],
    bring:[], cost:'€10–100, depends on your country', time:'1–6 weeks', links:[['Legalising documents (government.nl)','https://www.government.nl/topics/legalisation-of-documents']], tip:'Arrange this early. It is very hard to do from the Netherlands.'},
  'before-2': {why:'Your letter of acceptance proves you are a student. You need it for your visa, student housing and sometimes the bank.',
    steps:['Download it from your school portal or email.','Save it as PDF on your phone and print one copy.','Also save proof of enrolment (inschrijving) once you have it.'],
    bring:[], cost:'Free', time:'—', links:[['Studielink (enrolment)','https://www.studielink.nl']], tip:'Housing providers like SSH or DUWO often ask for proof of enrolment.'},
  'before-3': {why:'Students from outside the EU/EEA/Switzerland usually need a residence permit to study in the Netherlands.',
    steps:['From the EU/EEA or Switzerland? You do not need a visa. Skip this step.','Non-EU: your school applies for you at the IND. Ask the international office how it works.','Send your documents and pay the fee via your school.','After approval: pick up your MVV (entry visa) at the Dutch embassy if needed.','After arrival: pick up your residence permit card at the IND.'],
    bring:['Passport','Proof of enough money for your stay','Letter of acceptance'], cost:'IND fee (check ind.nl for the current amount)', time:'Start at least 3 months before you travel', links:[['IND – study in the Netherlands','https://ind.nl/en/residence-permits/study']], tip:'Do not book a non-refundable flight before your permit is approved.'},
  'before-4': {why:'Without an address you cannot register at the city hall, and without registration you get no BSN.',
    steps:['Use the Rooms tab to compare cities and open housing websites.','Ask your school\'s housing office: they often have rooms for internationals.','No room yet? Book short stay (hostel, short-stay housing, HousingAnywhere) for your first weeks.','Do the scam check before you pay anything.'],
    bring:[], cost:'See the Rooms tab', time:'Start 3–6 months early', links:[], tip:'Ask in the Community tab: other students may look for housemates.', go:['search','Search rooms']},
  'before-5': {why:'In the first month you pay a lot at once: deposit, first rent, furniture, insurance and a bike.',
    steps:['Use the Budget tool to see your monthly costs.','Count on 1 month deposit + first rent + about €500 for start costs.','Bring a card that works abroad (Visa/Mastercard) until you have a Dutch account.','Check if you can get Dutch student finance (DUO) if you work in NL.'],
    bring:[], cost:'Often €2,000–3,000 for the first month', time:'—', links:[['DUO – student finance for EU students','https://duo.nl/particulier/international-student/']], tip:'Never pay rent with cash or gift cards.', go:['budget','Open budget tool']},
  'before-6': {why:'You must be insured from day one. Medical costs in the Netherlands can be very high.',
    steps:['Check if your own insurance covers you in the Netherlands (EU students: bring your EHIC card).','No cover? Take a student insurance for internationals for your first months.','Will you work in NL? Then you will need Dutch health insurance (see To-do: health insurance).'],
    bring:['EHIC card (EU students)'], cost:'Student insurance from about €30–50 / month', time:'Arrange before you travel', links:[['Health insurance (government.nl)','https://www.government.nl/topics/health-insurance']], tip:'Keep your insurance card or policy on your phone.'},
  'before-7': {why:'Registering is required if you stay longer than 4 months. Appointments can be full for weeks, so book early.',
    steps:['Go to the website of the municipality (gemeente) where you will live.','Search for "registration" or "inschrijven" and book an appointment online.','Pick a date in your first week in the Netherlands.','Save the confirmation email.'],
    bring:['Passport / ID','Rental contract or landlord permission','Birth certificate (if asked)'], cost:'Free', time:'5 minutes online', links:[['Moving to the Netherlands (government.nl)','https://www.government.nl/topics/personal-data/registering-in-the-brp']], tip:'Some cities have a special international desk with English service.'},
  'first-0': {why:'Everyone who stays longer than 4 months must register at the municipality. This gives you a BSN.',
    steps:['Go to your appointment at the city hall (gemeente).','Show your documents and fill in the form.','You often get your BSN at the desk or by post within a few days.'],
    bring:['Passport / ID','Rental contract or signed permission from your landlord','Birth certificate (if asked)','Residence permit (non-EU)'], cost:'Free', time:'Appointment: 15–30 min', links:[['Registering in the BRP','https://www.government.nl/topics/personal-data/registering-in-the-brp']], tip:'Your landlord does not allow registration? That is a red flag. Ask DutchDoor for help.'},
  'first-1': {why:'Your BSN (citizen service number) is your personal number for the government, bank, work, doctor and insurance.',
    steps:['You get your BSN when you register at the city hall.','Write it down and keep the letter in a safe place.','Only give your BSN to official organisations (employer, bank, insurer, government).'],
    bring:[], cost:'Free', time:'Usually within a week after registering', links:[['What is a BSN?','https://www.government.nl/topics/personal-data/citizen-service-number-bsn']], tip:'Never send a photo of your BSN or passport to a landlord you have not met.'},
  'first-2': {why:'Many shops, your rent and your salary need a Dutch or EU bank account. Many places do not accept credit cards.',
    steps:['Choose a bank: ING, ABN AMRO, Rabobank (student accounts) or bunq (fully online).','Open the account online or make an appointment.','Show your passport and BSN. Some online banks let you start without a BSN.','Download the bank app and activate your debit card.'],
    bring:['Passport / ID','BSN','Address in the Netherlands'], cost:'Student accounts: about €0–5 / month', time:'1–2 weeks until you have your card', links:[], tip:'Learn how iDEAL and Tikkie work: everyone uses them to pay and split costs.'},
  'first-3': {why:'DigiD is your digital login for the government: taxes, healthcare allowance (zorgtoeslag), rent benefit and DUO.',
    steps:['Go to digid.nl and click "Apply for DigiD".','Fill in your BSN, date of birth, postcode and house number.','You get an activation letter by post at your address within a few days.','Activate it and install the DigiD app.'],
    bring:['BSN','Registered Dutch address'], cost:'Free', time:'About 5 working days (letter)', links:[['DigiD','https://www.digid.nl/en']], tip:'Your name must be on the mailbox, or the letter may not arrive.'},
  'first-4': {why:'Do you work in the Netherlands, also a small side job? Then Dutch basic health insurance (basisverzekering) is required by law.',
    steps:['Check if you need it: working in NL = yes. Only studying = often your own or student insurance is enough.','Compare insurers on a comparison website and choose a basic insurance.','Sign up within 4 months after you start working. You pay from the start date.','With low income? Apply for zorgtoeslag (healthcare allowance) via DigiD.'],
    bring:['BSN','Bank account'], cost:'About €150 / month, partly paid back via zorgtoeslag', time:'Sign up online in 15 minutes', links:[['Health insurance (government.nl)','https://www.government.nl/topics/health-insurance'],['Zorgtoeslag (Belastingdienst)','https://www.belastingdienst.nl/wps/wcm/connect/en/individuals/content/healthcare-allowance']], tip:'There is a fine if you work and have no Dutch insurance. Do not wait.'},
  'first-5': {why:'In the Netherlands you always go to your general doctor (huisarts) first. Register before you are sick.',
    steps:['Search "huisarts" + your postcode on Google Maps.','Call or check the website: do they accept new patients?','Fill in the registration form of the practice.','Many universities have a student doctor: ask your school.'],
    bring:['Passport / ID','Insurance details','BSN'], cost:'Free (paid by insurance)', time:'Can take a few calls to find a place', links:[], tip:'Emergency? Call 112. Urgent at night or weekend? Call the huisartsenpost.'},
  'first-6': {why:'With an OV-chipkaart you travel by train, bus and tram. You can also tap in with your bank card or phone.',
    steps:['Easiest: tap in and out with your contactless bank card or phone (OVpay).','Want discounts? Order a personal OV-chipkaart online.','Add a discount subscription in the NS app if you travel a lot.','Always check in AND check out, or you pay a high fee.'],
    bring:['Passport photo (for a personal card)'], cost:'Personal card: about €7.50', time:'Card arrives in about 1 week', links:[['OV-chipkaart','https://www.ov-chipkaart.nl/en'],['NS (trains)','https://www.ns.nl/en']], tip:'EU students who work enough hours may get a free student travel product via DUO.'},
  'first-7': {why:'A bike is the cheapest and fastest way to get around in Dutch cities.',
    steps:['Buy a second-hand bike: Marktplaats, Facebook groups or a local bike shop.','Or rent one: Swapfiets (monthly fee, repairs included).','Buy two good locks: a frame lock and a chain lock.','Learn the rules: lights on when it is dark, no phone while cycling.'],
    bring:[], cost:'Second-hand €80–200, Swapfiets about €20 / month', time:'1 day', links:[['Swapfiets','https://swapfiets.nl/en']], tip:'A very cheap bike from a stranger is often stolen. Do not buy it.'},
  'pay-0': {why:'Scammers often cannot show the room because it does not exist or is not theirs.',
    steps:['Ask for a viewing in real life, or a live video call (not a recorded video).','In the video call: ask them to show the street, the front door and the view from the window.','Ask the people who live there questions.'],
    bring:[], cost:'Free', time:'30 minutes', links:[], tip:'"I am abroad and can not show you the room" is the most common scam story.'},
  'pay-1': {why:'Scammers copy photos from other ads or hotels.',
    steps:['Save a photo from the ad.','Upload it to Google Lens or TinEye.','Do the same photos show up in another city or on another website? Then it is a scam.'],
    bring:[], cost:'Free', time:'5 minutes', links:[['Google Lens','https://lens.google.com'],['TinEye','https://tineye.com']], tip:''},
  'pay-2': {why:'Fake ads sometimes use an address that does not exist, or a shop or office building.',
    steps:['Search the address on Google Maps.','Look at Street View: is it a house? Does it look like the photos?','Check the travel time to your school.'],
    bring:[], cost:'Free', time:'5 minutes', links:[['Google Maps','https://maps.google.com']], tip:''},
  'pay-3': {why:'You must know who you rent from. Scammers often only use a first name and WhatsApp.',
    steps:['Ask for the full name of the landlord or the agency.','Search the name online together with words like "scam" or "fraud".','Ask who the owner of the house is. You can check this at the Kadaster (small fee).'],
    bring:[], cost:'Kadaster check about €3', time:'15 minutes', links:[['Kadaster','https://www.kadaster.nl/']], tip:''},
  'pay-4': {why:'A real rental agency is registered at the Chamber of Commerce (KvK).',
    steps:['Go to kvk.nl and search the name of the agency.','Check the address and the KvK number on their website and contract.','Not registered? Do not pay.'],
    bring:[], cost:'Free', time:'5 minutes', links:[['KvK search','https://www.kvk.nl/en/search/']], tip:'Agencies may not charge you "agency costs" if they also work for the landlord.'},
  'pay-5': {why:'A written contract protects you. Without it, it is hard to prove anything.',
    steps:['Ask for the contract before you pay anything.','Check: start date, length, rent, service costs, deposit and notice period.','Do not understand something? Ask DutchDoor or your school to check it.'],
    bring:[], cost:'Free', time:'—', links:[['Check your rent (Huurcommissie)','https://www.huurcommissie.nl/huurcommissie-helpt/huurprijscheck-en-puntentelling']], tip:'Pay the deposit by bank transfer, never in cash.', go:['rights','Your rights']},
  'pay-6': {why:'Without registration at the city hall you get no BSN. Then you cannot work, open a bank account or get insurance.',
    steps:['Ask the landlord in writing: "Can I register at this address?"','Make sure it says so in your contract.','The answer is no? Look for another room.'],
    bring:[], cost:'Free', time:'—', links:[], tip:''}
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
    '<div class="card hero"><h2>Hi ' + esc((me() || {name:''}).name.split(' ')[0]) + '! 👋</h2><p>Find a safe room and get settled in the Netherlands, step by step.</p>' +
    '<button class="btn" style="background:#fff;color:#1F3A5F" onclick="location.hash=\'search\'">Find a room</button></div>' +
    (c ? '<div class="card city" onclick="location.hash=\'city/' + c.id + '\'"><div><h3>Your city: ' + esc(c.name) + '</h3><span class="muted">Room about ' + eur(c.room) + ' / month</span></div><span class="price">›</span></div>' : '') +
    '<div class="grid2">' +
      '<button class="tile" onclick="location.hash=\'scam\'"><span class="ic">🛡️</span><b>Scam check</b><span>Is this ad real?</span></button>' +
      '<button class="tile" onclick="location.hash=\'budget\'"><span class="ic">💶</span><b>Budget</b><span>What can I pay?</span></button>' +
      '<button class="tile" onclick="location.hash=\'community\'"><span class="ic">👋</span><b>Students</b><span>' + others().filter(function (x) { return x.city === (me() || {}).city; }).length + ' in your city</span></button>' +
      '<button class="tile" onclick="location.hash=\'help\'"><span class="ic">🆘</span><b>Help</b><span>Rights, FAQ, 112</span></button>' +
    '</div>' +
    (rooms.length ? '<div class="card city" onclick="location.hash=\'tracker\'"><div><h3>📌 Saved rooms</h3><span class="muted">' + rooms.length + ' saved</span></div><span class="price">›</span></div>' : '') +
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

views.guide = function (key, i) {
  var cl = CHECKLISTS[key], g = GUIDES[key + '-' + i]; if (!cl || !g) return views.todo();
  i = +i; var st = store.get('cl_' + key, {}), done = !!st[i], next = i + 1 < cl.items.length ? i + 1 : null;
  function sec(t, body) { return '<div class="card"><h3>' + t + '</h3>' + body + '</div>'; }
  return {title:'How to', back:'todo', tab:'todo', html:
    '<p class="muted" style="margin-bottom:4px">' + esc(cl.title) + ' · step ' + (i + 1) + ' of ' + cl.items.length + '</p><h2>' + esc(cl.items[i]) + '</h2>' +
    '<div class="card"><p style="margin:0">' + esc(g.why) + '</p>' +
      '<div class="row" style="margin-top:10px"><span class="tag">💶 ' + esc(g.cost) + '</span>' + (g.time && g.time !== '—' ? '<span class="tag">⏱️ ' + esc(g.time) + '</span>' : '') + '</div></div>' +
    sec('How to do it', g.steps.map(function (s, n) { return '<div class="step" style="margin:8px 0"><b class="n">' + (n + 1) + '</b><p style="margin:3px 0 0">' + esc(s) + '</p></div>'; }).join('')) +
    (g.bring.length ? sec('What to bring', '<ul class="list">' + g.bring.map(function (b) { return '<li>📄 ' + esc(b) + '</li>'; }).join('') + '</ul>') : '') +
    (g.tip ? '<div class="card result mid"><b>💡 Tip</b><p style="margin:4px 0 0">' + esc(g.tip) + '</p></div>' : '') +
    (g.links.length || g.go ? sec('Useful links', '<div class="row">' +
      (g.go ? '<a class="btn sm" href="#' + g.go[0] + '">' + esc(g.go[1]) + '</a>' : '') +
      g.links.map(function (l) { return '<a class="btn ghost sm" href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; }).join('') + '</div>' +
      (g.links.length ? '<p class="muted" style="margin:8px 0 0">Rules and prices change. Always check the official website.</p>' : '')) : '') +
    '<button class="btn block' + (done ? ' ghost' : '') + '" id="gdone">' + (done ? '✓ Done — mark as not done' : 'Mark as done') + '</button>' +
    (next !== null ? '<button class="btn ghost block" style="margin-top:10px" onclick="location.hash=\'guide/' + key + '/' + next + '\'">Next: ' + esc(cl.items[next]) + ' ›</button>' : '') +
    '<p class="muted" style="text-align:center;margin-top:14px">Stuck? <a href="#help">Ask DutchDoor</a> or <a href="#community">ask other students</a>.</p>',
    bind: function () {
      document.getElementById('gdone').onclick = function () {
        st[i] = !done; store.set('cl_' + key, st); toast(done ? 'Marked as not done' : 'Nice, done! ✓');
        if (!done && next !== null) go('guide/' + key + '/' + next); else render();
      };
    }
  };
};

views.todo = function () {
  return {title:'To-do', tab:'todo', html: '<p class="muted">Tap a task to see how to arrange it step by step.</p>' + Object.keys(CHECKLISTS).map(function (key) {
    var st = store.get('cl_' + key, {}), cl = CHECKLISTS[key], pr = checklistProgress(key);
    return '<div class="card"><h3>' + cl.title + '</h3><span class="muted">' + pr[0] + ' of ' + pr[1] + ' done</span>' + bar(pr[0], pr[1]) +
      cl.items.map(function (it, i) {
        return '<div class="check' + (st[i] ? ' done' : '') + '"><input type="checkbox" aria-label="Done" data-cl="' + key + '" data-i="' + i + '"' + (st[i] ? ' checked' : '') + '>' +
          '<a class="howto" href="#guide/' + key + '/' + i + '"><span>' + esc(it) + '</span><small>How to arrange this ›</small></a></div>';
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
  return {title:'Help', back:'home', html:
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
// Example profiles for the demo. Not real people.
var DEMO = [
  {id:'d1',name:'Lucía Fernández',country:'Spain',city:'den-bosch',school:'Avans',study:'International Business',start:'2027-09',looking:true,about:'Looking for a room in Den Bosch from September. Love cooking and padel!'},
  {id:'d2',name:'Mateusz Nowak',country:'Poland',city:'den-bosch',school:'Koning Willem I College',study:'Real Estate',start:'2027-09',looking:true,about:'Want to share a house with 2–3 other students. Quiet but social.'},
  {id:'d3',name:'Aisha Bello',country:'Nigeria',city:'eindhoven',school:'TU/e',study:'Data Science',start:'2027-08',looking:false,about:'Found a room at Vestide. Happy to give tips about Eindhoven!'},
  {id:'d4',name:'Chen Wei',country:'China',city:'tilburg',school:'Tilburg University',study:'Economics',start:'2027-09',looking:true,about:'Arriving in August. Anyone want to look for a studio together?'},
  {id:'d5',name:'Giulia Romano',country:'Italy',city:'utrecht',school:'UU',study:'Psychology',start:'2027-09',looking:true,about:'Registered at ROOM.nl. Searching in Utrecht or Zeist.'},
  {id:'d6',name:'Arjun Mehta',country:'India',city:'delft',school:'TU Delft',study:'Civil Engineering',start:'2027-08',looking:true,about:'Masters student. Looking for housemates for a 3-bedroom place.'},
  {id:'d7',name:'Léa Dubois',country:'France',city:'rotterdam',school:'Erasmus',study:'Law',start:'2027-09',looking:false,about:'Living in Kralingen. Ask me anything about Rotterdam.'},
  {id:'d8',name:'Jonas Becker',country:'Germany',city:'groningen',school:'Hanze',study:'Facility Management',start:'2027-09',looking:true,about:'Want to arrive early to find a place. Cycling fan.'},
  {id:'d9',name:'Elena Popescu',country:'Romania',city:'den-bosch',school:'JADS',study:'Data Science & Entrepreneurship',start:'2027-09',looking:false,about:'Already have a room in Rosmalen, happy to help you find one!'},
  {id:'d10',name:'Mehmet Yılmaz',country:'Turkey',city:'amsterdam',school:'HvA',study:'Built Environment',start:'2027-09',looking:true,about:'Searching in Amsterdam and Diemen. Budget is tight 😅'},
  {id:'d11',name:'Sofia Costa',country:'Portugal',city:'maastricht',school:'Maastricht University',study:'European Studies',start:'2027-08',looking:true,about:'Anyone else starting in Maastricht? Let\'s meet up!'},
  {id:'d12',name:'Nguyen Thi Lan',country:'Vietnam',city:'breda',school:'BUas',study:'Tourism',start:'2027-09',looking:false,about:'Got housing through BUas. Ask me how it works.'}
];
var REPLIES = ['Hi! Nice to meet you 😊','Yes, I am still looking. Do you want to search together?','Good tip, thanks! I will check that website.','Let\'s meet at the intro week!','Sure, send me the link of the room.'];
function others() {
  var u = me(), list = DEMO.slice();
  Object.keys(accounts()).forEach(function (k) { var a = accounts()[k]; if (a.visible && (!u || a.email !== u.email)) list.push({id:'u:' + a.email,name:a.name,country:a.country,city:a.city,school:a.school,study:a.study,start:a.start,looking:a.looking,about:a.about}); });
  return list;
}
function person(id) { return others().filter(function (p) { return p.id === id; })[0]; }

function profileFields(u) {
  u = u || {};
  return '<label class="f">Full name</label><input name="name" required value="' + esc(u.name) + '" autocomplete="name">' +
    '<label class="f">Country of origin</label><select name="country" required><option value="">Choose…</option>' + COUNTRIES.map(function (c) { return '<option' + (c === u.country ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
    '<label class="f">City where you will study</label><select name="city" required><option value="">Choose…</option>' + CITIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === u.city ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
    '<label class="f">School</label><input name="school" required value="' + esc(u.school) + '" placeholder="e.g. Avans">' +
    '<label class="f">Study programme</label><input name="study" value="' + esc(u.study) + '" placeholder="e.g. Real Estate">' +
    '<label class="f">Start date</label><input name="start" type="month" value="' + esc(u.start || '2027-09') + '">' +
    '<label class="f">About you</label><textarea name="about" rows="2" placeholder="What kind of house or housemates are you looking for?">' + esc(u.about) + '</textarea>' +
    '<label class="switch"><span>I am still looking for a room</span><input type="checkbox" name="looking"' + (u.looking !== false ? ' checked' : '') + '></label>' +
    '<label class="switch"><span>Show my profile in the community</span><input type="checkbox" name="visible"' + (u.visible !== false ? ' checked' : '') + '></label>';
}
function readProfile(fd, u) {
  ['name','country','city','school','study','start','about'].forEach(function (k) { u[k] = (fd.get(k) || '').trim(); });
  u.looking = fd.get('looking') === 'on'; u.visible = fd.get('visible') === 'on';
  return u;
}

views.welcome = function () {
  return {title:'DutchDoor', html:
    '<div class="card hero" style="text-align:center;padding:28px 18px"><img src="icons/icon.svg" width="72" height="72" alt=""><h2 style="margin-top:12px">Welcome to DutchDoor</h2><p>Your door to student life in the Netherlands. Find a safe room, get settled and meet other students.</p></div>' +
    '<div class="card"><ul class="list"><li>🔎 Search housing in 15 student cities</li><li>🛡️ Check if a room ad is a scam</li><li>👋 Meet students going to your city or school</li></ul></div>' +
    '<button class="btn block" onclick="location.hash=\'signup\'">Create student account</button>' +
    '<button class="btn ghost block" style="margin-top:10px" onclick="location.hash=\'login\'">I already have an account</button>'
  };
};

views.signup = function () {
  return {title:'Create account', back:'welcome', html:
    '<form class="card" id="sf"><h3>Your account</h3>' +
    '<label class="f">Email</label><input name="email" type="email" required autocomplete="email" placeholder="you@student.nl">' +
    '<label class="f">Password (min. 6 characters)</label><input name="pw" type="password" required minlength="6" autocomplete="new-password">' +
    '<h3 style="margin-top:18px">About you</h3>' + profileFields() +
    '<label class="switch"><span>I agree that my profile is visible to other DutchDoor students</span><input type="checkbox" name="agree" required></label>' +
    '<div class="err" id="serr"></div><button class="btn block" style="margin-top:12px">Create account</button></form>' +
    '<p class="muted" style="text-align:center">Demo: your account is only stored on this phone.</p>',
    bind: function () {
      document.getElementById('sf').onsubmit = function (e) {
        e.preventDefault(); var fd = new FormData(e.target), email = fd.get('email').trim().toLowerCase();
        if (accounts()[email]) { document.getElementById('serr').textContent = 'There is already an account with this email. Log in instead.'; return; }
        hash(fd.get('pw')).then(function (h) {
          var u = readProfile(fd, {email:email, pw:h, created:new Date().toISOString().slice(0, 10), id:'S' + String(Date.now()).slice(-7)});
          saveMe(u); store.set('session', email);
          var p = store.get('prefs', {city:'', budget:650, type:'room'}); p.city = u.city; store.set('prefs', p);
          toast('Welcome, ' + u.name.split(' ')[0] + '!'); go('home');
        });
      };
    }
  };
};

views.login = function () {
  return {title:'Log in', back:'welcome', html:
    '<form class="card" id="lf"><label class="f" style="margin-top:0">Email</label><input name="email" type="email" required autocomplete="email">' +
    '<label class="f">Password</label><input name="pw" type="password" required autocomplete="current-password">' +
    '<div class="err" id="lerr"></div><button class="btn block" style="margin-top:14px">Log in</button></form>' +
    '<p class="muted" style="text-align:center">No account yet? <a href="#signup">Create one</a></p>',
    bind: function () {
      document.getElementById('lf').onsubmit = function (e) {
        e.preventDefault(); var fd = new FormData(e.target), email = fd.get('email').trim().toLowerCase(), a = accounts()[email];
        hash(fd.get('pw')).then(function (h) {
          if (!a || a.pw !== h) { document.getElementById('lerr').textContent = 'Email or password is not correct.'; return; }
          store.set('session', email); toast('Welcome back, ' + a.name.split(' ')[0] + '!'); go('home');
        });
      };
    }
  };
};

views.profile = function () {
  var u = me(), c = city(u.city) || {};
  return {title:'My profile', back:'home', html:
    '<div class="idcard"><span class="badge">✓ Student</span><div class="lbl">DutchDoor student card</div><h3>' + esc(u.name) + '</h3><div style="opacity:.85">' + esc(u.study || 'Student') + '</div>' +
    '<div class="cols"><div><div class="lbl">School</div><div class="val">' + esc(u.school) + '</div></div><div><div class="lbl">City</div><div class="val">' + esc(c.name || '') + '</div></div>' +
    '<div><div class="lbl">Student no.</div><div class="val">' + esc(u.id) + '</div></div><div><div class="lbl">From</div><div class="val">' + (FLAG[u.country] || '') + ' ' + esc(u.country) + '</div></div></div></div>' +
    '<form class="card" id="pf"><h3>My details</h3><label class="f">Email</label><input value="' + esc(u.email) + '" disabled>' + profileFields(u) +
    '<button class="btn block" style="margin-top:12px">Save changes</button></form>' +
    '<div class="card"><h3>Settings</h3>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#help"><span>Help & emergency numbers</span><span>›</span></a>' +
    '<a class="city" style="text-decoration:none;color:inherit;padding:8px 0" href="#todo"><span>My to-do lists</span><span>›</span></a>' +
    '<div class="row" style="margin-top:10px"><button class="btn ghost sm" id="logout">Log out</button><button class="btn danger sm" id="delacc">Delete account</button></div></div>' +
    '<p class="muted" style="text-align:center">Member since ' + esc(u.created) + ' · Demo: data stays on this phone.</p>',
    bind: function () {
      document.getElementById('pf').onsubmit = function (e) { e.preventDefault(); saveMe(readProfile(new FormData(e.target), u)); toast('Profile saved'); render(); scrollTo(0, 0); };
      document.getElementById('logout').onclick = function () { store.set('session', null); toast('Logged out'); go('welcome'); };
      document.getElementById('delacc').onclick = function () {
        if (!confirm('Delete your account and profile from this phone?')) return;
        var a = accounts(); delete a[u.email]; store.set('accounts', a); store.set('session', null); toast('Account deleted'); go('welcome');
      };
    }
  };
};

views.community = function () {
  var u = me(), f = store.get('cf', 'city');
  var list = others().filter(function (p) {
    if (f === 'city') return p.city === u.city;
    if (f === 'school') return p.school.toLowerCase() === (u.school || '').toLowerCase();
    if (f === 'looking') return p.looking;
    return true;
  });
  var cn = (city(u.city) || {}).name || 'my city';
  return {title:'Community', tab:'community', html:
    '<div class="card"><h3>Meet other students</h3><p class="muted">See who is going to study where. Find housemates or ask for tips.</p>' +
    '<div class="chips">' + [['city','In ' + cn],['school','At ' + (u.school || 'my school')],['looking','Looking for a room'],['all','Everyone']].map(function (x) {
      return '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>' +
    '<p class="muted">' + list.length + ' students · example profiles for this demo</p>' +
    (list.length ? list.map(function (p) {
      return '<div class="card person" onclick="location.hash=\'student/' + encodeURIComponent(p.id) + '\'">' + avatar(p) +
        '<div class="grow"><h3>' + esc(p.name) + ' ' + (FLAG[p.country] || '') + '</h3><div class="muted">' + esc(p.school) + ' · ' + esc((city(p.city) || {}).name || '') + '</div>' +
        (p.looking ? '<span class="tag mid">Looking for a room</span>' : '<span class="tag ok">Has a room</span>') + '</div><span>›</span></div>';
    }).join('') : '<div class="empty">No students here yet.<br><button class="btn ghost sm" style="margin-top:10px" data-f="all">Show everyone</button></div>'),
    bind: function () { document.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { store.set('cf', b.dataset.f); render(); }; }); }
  };
};

views.student = function (id) {
  var p = person(decodeURIComponent(id)); if (!p) return views.community();
  var u = me(), c = city(p.city) || {}, same = [];
  if (p.city === u.city) same.push('same city'); if (p.school.toLowerCase() === (u.school || '').toLowerCase()) same.push('same school');
  return {title:p.name.split(' ')[0], back:'community', tab:'community', html:
    '<div class="card" style="text-align:center">' + avatar(p).replace('class="av"', 'class="av" style="width:72px;height:72px;font-size:1.5rem;margin:0 auto 8px;background:' + COLORS[(p.name || '').length % COLORS.length] + '"') +
    '<h2>' + esc(p.name) + '</h2><p class="muted">' + (FLAG[p.country] || '') + ' From ' + esc(p.country) + '</p>' +
    (same.length ? '<span class="tag ok">You study in the ' + same.join(' & ') + '</span>' : '') + '</div>' +
    '<div class="card"><ul class="list"><li><b>School:</b> ' + esc(p.school) + '</li><li><b>Study:</b> ' + esc(p.study || '–') + '</li><li><b>City:</b> ' + esc(c.name || '') + '</li><li><b>Starts:</b> ' + esc(p.start || '–') + '</li>' +
    '<li><b>Housing:</b> ' + (p.looking ? 'Still looking for a room' : 'Has a room') + '</li></ul>' + (p.about ? '<p style="margin-top:10px">“' + esc(p.about) + '”</p>' : '') + '</div>' +
    '<button class="btn block" onclick="location.hash=\'chat/' + encodeURIComponent(p.id) + '\'">💬 Send a message</button>' +
    '<p class="muted" style="margin-top:12px">Never send money or your passport to someone you met online. Report strange messages to DutchDoor.</p>'
  };
};

views.chat = function (id) {
  id = decodeURIComponent(id); var p = person(id); if (!p) return views.community();
  var u = me(), key = 'chat_' + u.email + '_' + id, msgs = store.get(key, []);
  return {title:p.name, back:'student/' + encodeURIComponent(id), tab:'community', html:
    '<div class="chat" id="msgs">' + (msgs.length ? msgs.map(function (m) { return '<div class="msg' + (m.me ? ' mine' : '') + '">' + esc(m.t) + '<small>' + esc(m.at) + '</small></div>'; }).join('') :
      '<div class="empty">Say hi to ' + esc(p.name.split(' ')[0]) + '! 👋</div>') + '</div>' +
    '<form class="sendbar" id="mf"><input name="t" required placeholder="Write a message…" autocomplete="off"><button class="btn">Send</button></form>' +
    '<p class="muted" style="margin-top:10px">Demo: replies are automatic.</p>',
    bind: function () {
      scrollTo(0, document.body.scrollHeight);
      document.getElementById('mf').onsubmit = function (e) {
        e.preventDefault(); var t = e.target.t.value.trim(); if (!t) return;
        var now = function () { return new Date().toTimeString().slice(0, 5); };
        msgs.push({me:true, t:t, at:now()}); store.set(key, msgs); render();
        if (id.indexOf('d') === 0) setTimeout(function () {
          var m = store.get(key, []); m.push({me:false, t:REPLIES[(m.length >> 1) % REPLIES.length], at:now()}); store.set(key, m);
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
  if (!u && !auth[parts[0]]) parts = ['welcome'];
  if (u && auth[parts[0]]) parts = ['home'];
  document.body.classList.toggle('out', !u);
  var $me = document.getElementById('me');
  $me.hidden = !u; if (u) { $me.textContent = initials(u.name); $me.onclick = function () { go('profile'); }; }
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
document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { go(b.dataset.tab); }; });
var last = '';
window.addEventListener('hashchange', function () { render(); if (location.hash !== last) scrollTo(0, 0); last = location.hash; });
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
})();
