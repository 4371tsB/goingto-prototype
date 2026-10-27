/* GoingTo core: helpers, router, overlays, shared pickers. Screens live in screens-*.js. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = window.IC;
  const db = () => GT.db;

  // ---------- Formatting ----------
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const D = (iso) => new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  function ordinal(n) { if (n > 3 && n < 21) return 'th'; return ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; }
  const fmt = {
    time(iso) { const d = D(iso); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${pad(m)}${ap}`; },
    day(iso) { const d = D(iso); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${pad(d.getDate())}`; },
    dayNoPad(iso) { const d = D(iso); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; },
    dayShort(iso) { const d = D(iso); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; },
    slash(iso) { const d = D(iso); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; },
    full(iso) { const d = D(iso); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${fmt.time(iso)}`; },
    isEOD(iso) { const d = D(iso); return d.getHours() === 23 && d.getMinutes() === 59; },
    sameDay(a, b) { return D(a).toDateString() === D(b).toDateString(); },
    isToday(iso) { return D(iso).toDateString() === new Date().toDateString(); },
    cardRange(e) {
      if (!e.start) return 'Time to be decided';
      if (fmt.isEOD(e.end) || (!fmt.sameDay(e.start, e.end) && D(e.end) - D(e.start) > 12 * 3600e3)) return `${fmt.time(e.start)} - EOD`;
      return `${fmt.time(e.start)} - ${fmt.time(e.end)}`;
    },
    longRange(e) {
      if (!e.start) return 'Time to be decided';
      const s = D(e.start).getDate(), en = D(e.end).getDate();
      if (fmt.sameDay(e.start, e.end)) return `${fmt.dayShort(e.start)}${ordinal(s)}, ${fmt.time(e.start)} - ${fmt.isEOD(e.end) ? 'EOD' : fmt.time(e.end)}`;
      return `${fmt.dayShort(e.start)}${ordinal(s)}, ${fmt.time(e.start)} - ${fmt.dayShort(e.end)}${ordinal(en)}, ${fmt.time(e.end)}`;
    },
    rel(iso) {
      const diff = (Date.now() - D(iso)) / 60000;
      if (diff < 1) return 'now';
      if (diff < 60) return `${Math.round(diff)}mins`;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (D(iso) >= today) return `${Math.round(diff / 60)}h`;
      const y = new Date(today); y.setDate(y.getDate() - 1);
      if (D(iso) >= y) return 'Yesterday';
      return fmt.dayShort(iso);
    },
    chatWhen(iso) {
      const d = D(iso); const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d >= today) return fmt.time(iso);
      if (d.getFullYear() !== today.getFullYear()) return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
      return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}`;
    },
    stamp(iso) {
      const d = D(iso); const today = new Date(); today.setHours(0, 0, 0, 0);
      const y = new Date(today); y.setDate(y.getDate() - 1);
      if (d >= today) return fmt.time(iso);
      if (d >= y) return `Yesterday, ${fmt.time(iso)}`;
      return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${fmt.time(iso)}`;
    },
    month(y, m) { return `${MONTHS[m]} ${y}`; },
    DAYS, MONTHS, MONTHS_LONG, ordinal,
  };

  // ---------- Avatars / images ----------
  const isImg = (a) => typeof a === 'string' && /\.(jpe?g|png|webp|gif|svg)$/i.test(a);
  function bgCss(art) { return isImg(art) ? `background-image:url('${art}')` : `background:${art || '#ccc'}`; }
  function av(p, size = 50, opts = {}) {
    const cls = `av av-${size}${opts.sq ? ' sq' : ''}${opts.cls ? ' ' + opts.cls : ''}`;
    const initial = !p.art ? esc((p.name || '?')[0]) : '';
    return `<span class="${cls}" style="${bgCss(p.art || '#bc4a4a')};${opts.style || ''}">${initial}${opts.host ? `<span class="dot-host">${IC.bulbFill}</span>` : ''}</span>`;
  }
  function avStyle(art, w, h, r = '50%') { return `<span class="av" style="width:${w}px;height:${h || w}px;border-radius:${r};${bgCss(art)}"></span>`; }
  function stack(ids, max = 8, size = 30) {
    const list = ids.slice(0, max).map((id) => av(GT.person(id), size)).join('');
    const extra = ids.length - max;
    return `<span class="stack">${list}${extra > 0 ? `<span class="av av-${size} more">+${extra}</span>` : ''}</span>`;
  }
  const logo = (white) => `<img class="logo-img" src="assets/logo-${white ? 'white' : 'color'}.svg" alt="GoingTo">`;
  function empty(img, text, btn) {
    const imgs = Array.isArray(img) ? `<div style="display:flex;justify-content:center;align-items:flex-end">${img.map((s) => `<img src="${s}" alt="" style="width:110px;height:200px;margin:0">`).join('')}</div>` : img ? `<img src="${img}" alt="">` : '';
    return `<div class="empty">${imgs}<div>${text}</div>${btn || ''}</div>`;
  }

  // ---------- Toast ----------
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Overlays ----------
  const root = () => $('#overlay-root');
  function closeOverlays() { root().innerHTML = ''; }
  function sheet({ title, body, foot = '', onMount, tall = false, noHeader = false }) {
    closeOverlays();
    const r = root();
    r.innerHTML = `<div class="scrim" data-act="closeSheet"></div>
      <div class="sheet${tall ? ' tall' : ''}" role="dialog" aria-label="${esc(title || '')}">
        <div class="grabber"></div>
        ${noHeader ? '' : `<div class="sheet-hdr"><button class="icon-btn" data-act="closeSheet" aria-label="Close">${IC.close}</button><h3>${esc(title || '')}</h3><span class="icon-btn spacer"></span></div>`}
        <div class="sheet-body">${body}</div>
        ${foot ? `<div class="sheet-foot">${foot}</div>` : '<div style="height:28px;flex:none"></div>'}
      </div>`;
    const el = $('.sheet', r);
    if (onMount) onMount(el);
    return el;
  }
  // Bottom action sheet (Figma "more" menus): items {icon,label,run,danger,toggle}
  function actions(items) {
    closeOverlays();
    const r = root();
    r.innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="sheet"><div class="grabber"></div><div class="action-list">
      ${items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon ? IC[it.icon] : ''}<span>${esc(it.label)}</span>${it.toggle !== undefined ? `<span class="switch ${it.toggle ? 'on' : ''}"></span>` : ''}</button>`).join('')}</div></div>`;
    $$('.action-list button', r).forEach((b) => { b.onclick = () => { const it = items[+b.dataset.i]; if (it.toggle === undefined) closeOverlays(); else { const sw = b.querySelector('.switch'); sw.classList.toggle('on'); } it.run(b); }; });
  }
  // iOS-style alert (Figma "Are you sure?" dialogs)
  function dialog({ title, text, ok = 'OK', cancel = 'Cancel', danger = false, onOk, single = false }) {
    closeOverlays();
    const r = root();
    r.innerHTML = `<div class="scrim"></div><div class="dialog" role="alertdialog"><h4>${esc(title)}</h4><p>${esc(text)}</p>
      ${single ? `<div class="one"><button class="btn btn-grad" id="dlg-ok">${esc(ok)}</button></div>` : `<div class="btns"><button id="dlg-no">${esc(cancel)}</button><button id="dlg-ok" class="${danger ? 'danger' : ''}">${esc(ok)}</button></div>`}</div>`;
    $('#dlg-ok', r).onclick = () => { closeOverlays(); if (onOk) onOk(); };
    const no = $('#dlg-no', r); if (no) no.onclick = closeOverlays;
  }
  // Dark popover menu anchored under an element (Figma chat/friends "+" menus)
  function menu(anchor, items) {
    closeOverlays();
    const phone = $('#phone').getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const r = root();
    r.innerHTML = `<div class="pop-scrim" data-act="closeSheet"></div><div class="pop" style="top:${a.bottom - phone.top + 6}px;right:${Math.max(12, phone.right - a.right - 4)}px">
      ${items.map((it, i) => `<button data-i="${i}">${it.icon ? IC[it.icon] : ''}<span>${esc(it.label)}</span></button>`).join('')}</div>`;
    $$('.pop button', r).forEach((b) => { b.onclick = () => { closeOverlays(); items[+b.dataset.i].run(); }; });
  }

  // ---------- Pickers ----------
  // Select friends (+ tags) — Figma "select-friend-01/02": tag chips with counts, A–Z checklist, selected avatars + Save
  function pickFriends({ title = 'Select friends', withTags = false, selected = {}, cta = 'Save', exclude = [], locked = [], done }) {
    const sel = { friends: new Set(selected.friends || []), tags: new Set(selected.tags || []) };
    let q = '';
    const draw = (el) => {
      const fr = GT.friends().filter((p) => !exclude.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase()));
      let html = ''; let L = '';
      fr.forEach((p) => {
        const l = p.name[0].toUpperCase(); if (l !== L) { html += `<div class="alpha" style="padding-left:0">${l}</div>`; L = l; }
        const lock = locked.includes(p.id);
        html += `<button class="list-row${lock ? ' dim' : ''}" style="padding:8px 0" data-id="${p.id}" ${lock ? 'disabled' : ''}><input type="checkbox" class="chk" ${sel.friends.has(p.id) || lock ? 'checked' : ''} tabindex="-1">${av(p, 40)}<span class="name" style="font-size:17px">${esc(p.name)}</span></button>`;
      });
      $('.pf-list', el).innerHTML = html || '<p class="muted">No friends match.</p>';
      if (withTags) $('.pf-tags', el).innerHTML = db().tags.map((t) => { const n = t.members.filter((m) => sel.friends.has(m)).length; return `<button class="chip" style="background:${t.color}" data-tag="${t.id}"><input type="checkbox" class="chk" ${sel.tags.has(t.id) ? 'checked' : ''} tabindex="-1">${esc(t.name)} (${n && !sel.tags.has(t.id) ? n + '/' : ''}${t.members.length})</button>`; }).join('');
      const ids = [...sel.friends];
      $('#pf-sel', el).innerHTML = ids.length || sel.tags.size ? `${stack(ids, 6, 30)}${sel.tags.size ? `<span style="font-size:13px;margin-left:6px">+ ${sel.tags.size} tag${sel.tags.size > 1 ? 's' : ''}</span>` : ''}` : '<span class="muted" style="font-size:14px">No one selected</span>';
    };
    const el = sheet({
      title, tall: true,
      body: `<div class="search" style="margin-bottom:10px">${IC.search}<input placeholder="Search" id="pf-q"></div>
        ${withTags ? `<div class="tags-toggle" style="font-size:16px;margin:6px 0">Tags</div><div class="tag-chips wrap pf-tags"></div>` : ''}
        <div class="pf-list"></div>`,
      foot: `<div id="pf-sel" style="flex:1;display:flex;align-items:center;overflow:hidden"></div><button class="btn btn-grad" id="pf-done" style="flex:0 0 auto;height:36px;font-size:16px">${esc(cta)}</button>`,
    });
    draw(el);
    $('#pf-q', el).oninput = (e) => { q = e.target.value; draw(el); };
    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-id]'); const t = e.target.closest('[data-tag]');
      if (f && !f.disabled) { sel.friends.has(f.dataset.id) ? sel.friends.delete(f.dataset.id) : sel.friends.add(f.dataset.id); draw(el); }
      if (t) { sel.tags.has(t.dataset.tag) ? sel.tags.delete(t.dataset.tag) : sel.tags.add(t.dataset.tag); draw(el); }
    });
    $('#pf-done', el).onclick = () => { closeOverlays(); done({ friends: [...sel.friends], tags: [...sel.tags] }); };
  }

  // Forward / share an event (Figma Event-detail-09/10): to all friends, to some, or unforward
  function forwardEvent(ev) {
    const cur = ev.myForward;
    let choice = cur ? cur.type : 'all';
    const el = sheet({
      title: cur ? 'You forwarded this event' : 'Share to my friends',
      body: `<button class="opt ${choice === 'all' ? 'sel' : ''}" data-c="all"><span class="radio"></span><span>To all my friends</span></button>
        <button class="opt ${choice === 'some' ? 'sel' : ''}" data-c="some"><span class="radio"></span><span>To some in my friend list</span></button>
        ${cur ? '<button class="opt" data-c="un"><span class="radio"></span><span>Unforward</span></button>' : ''}`,
      foot: '<button class="btn btn-grad" id="fw-ok">Confirm</button>',
    });
    $$('[data-c]', el).forEach((b) => { b.onclick = () => { choice = b.dataset.c; $$('[data-c]', el).forEach((x) => x.classList.toggle('sel', x === b)); }; });
    $('#fw-ok', el).onclick = () => {
      if (choice === 'un') { delete ev.myForward; GT.save(); closeOverlays(); APP.rerender(); toast('Event unforwarded'); return; }
      if (choice === 'all') { ev.myForward = { type: 'all' }; GT.save(); closeOverlays(); APP.rerender(); toast('Forwarded to all your friends'); return; }
      pickFriends({ title: 'Select friends', withTags: true, selected: cur && cur.type === 'some' ? cur : {}, done: (r) => {
        if (!r.friends.length && !r.tags.length) return;
        ev.myForward = { type: 'some', ...r };
        r.friends.forEach((fid) => GT.dmChat(fid).messages.push({ by: db().me, event: ev.id, text: '', at: new Date().toISOString() }));
        GT.save(); APP.rerender();
        const n = new Set([...r.friends, ...r.tags.flatMap((t) => GT.tag(t).members)]).size;
        toast(`Forwarded to ${n} friend${n === 1 ? '' : 's'}`);
      } });
    };
  }

  function audienceLabel(a, forwardable) {
    let s;
    if (!a || a.type === 'all') s = 'to all my friends';
    else if (a.type === 'me') s = 'to myself';
    else {
      const total = new Set([...(a.friends || []), ...(a.tags || []).flatMap((t) => (GT.tag(t) || { members: [] }).members)]).size;
      s = (a.friends || []).length === 1 && !(a.tags || []).length ? `to ${GT.person(a.friends[0]).name}` : `to ${total} selected friends`;
    }
    if (forwardable && a && a.type !== 'me') s += ', allow forwarding';
    return s;
  }

  // ---------- QR pattern (deterministic, decorative) ----------
  function qrSvg(seed) {
    let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const n = 25; let cells = '';
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#333"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#333"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && rnd() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg viewBox="0 0 ${n} ${n}" width="100%" height="100%" shape-rendering="crispEdges"><g fill="#333">${cells}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
  }

  // ---------- Router ----------
  const S = {};   // screens: name -> (args, q) => { html, tab, gray, fullBleed, light, fab, mount, redirect }
  const ACT = {}; // click actions: data-act -> (el, ev)
  const PUBLIC = ['splash', 'onboarding', 'signin', 'signup'];
  let current = null;

  function parse() {
    const raw = location.hash.replace(/^#/, '');
    const [path, qs] = raw.split('?');
    const [name, ...args] = (path || '').split('/');
    return { name, args, q: Object.fromEntries(new URLSearchParams(qs || '')), raw };
  }
  // In-app stack so Back never leaves the prototype
  const stackNav = [];
  let replacing = false;
  function track(raw) {
    if (replacing) { stackNav[stackNav.length - 1] = raw; replacing = false; return; }
    if (stackNav.length > 1 && stackNav[stackNav.length - 2] === raw) stackNav.pop();
    else if (stackNav[stackNav.length - 1] !== raw) stackNav.push(raw);
  }
  function go(hash, replace = false) {
    if (replace) { replacing = stackNav.length > 0; location.replace(hash); } else location.hash = hash;
  }
  function back(fallback = '#home') {
    if (stackNav.length > 1) history.back();
    else go(fallback, true);
  }

  function render(keepScroll = false) {
    const r = parse();
    const name = r.name;
    track(r.raw);
    if (!name) { go(db().signedIn ? '#home' : '#splash', true); return; }
    if (!db().signedIn && !PUBLIC.includes(name)) { go('#splash', true); return; }
    if (!S[name]) { go('#home', true); return; }
    closeOverlays();
    const screen = $('#screen');
    const prevScroll = screen.scrollTop;
    const v = S[name](r.args, r.q) || {};
    if (v.redirect) { go(v.redirect, true); return; }
    screen.onscroll = null;
    screen.className = 'screen' + (v.gray ? ' gray' : '') + (v.fullBleed ? ' full-bleed' : '');
    screen.innerHTML = v.html || '';
    $('#statusbar').classList.toggle('light', !!v.light);
    renderTabbar(v.tab);
    $('#fab-root').innerHTML = v.fab || '';
    screen.scrollTop = keepScroll && current === r.raw ? prevScroll : 0;
    current = r.raw;
    if (v.mount) v.mount(screen);
  }
  const rerender = () => render(true);

  function renderTabbar(active) {
    const tb = $('#tabbar');
    if (!active) { tb.classList.remove('show'); tb.innerHTML = ''; return; }
    const tabs = [['home', 'Home', 'home'], ['events', 'Events', 'cal'], ['clubs', 'Clubs', 'clubs'], ['ideas', 'Ideas', 'bulb'], ['chats', 'Chats', 'chat']];
    const unread = db().chats.reduce((n, c) => n + (c.unread || 0), 0);
    const ideaDot = db().ideas.some((i) => i.by === db().me && i.unread);
    tb.innerHTML = tabs.map(([id, label, icon]) => `<a class="tab ${active === id ? 'active' : ''}" href="#${id}">${IC[icon]}<span>${label}</span>${id === 'chats' && unread ? `<span class="unread">${unread}</span>` : ''}${id === 'ideas' && ideaDot ? '<span class="dot-red" style="position:absolute;top:0;right:18px"></span>' : ''}</a>`).join('');
    tb.classList.add('show');
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const fn = ACT[a.dataset.act];
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(a, e); }
  });
  ACT.closeSheet = () => closeOverlays();
  ACT.back = (el) => back(el.dataset.fallback || '#home');
  ACT.go = (el) => go(el.dataset.href);

  window.addEventListener('hashchange', () => render());

  // Common header
  function header({ title = '', left = 'back', right = '', shadow = false, fallback = '#home', titleExtra = '' }) {
    const l = left === 'back' ? `<button class="icon-btn" data-act="back" data-fallback="${fallback}" aria-label="Back">${IC.back}</button>`
      : left === 'close' ? `<button class="icon-btn" data-act="back" data-fallback="${fallback}" aria-label="Close">${IC.close}</button>`
      : left || '<span class="icon-btn spacer"></span>';
    return `<header class="hdr${shadow ? ' shadow' : ''}"><div class="hdr-row">${l}<div class="hdr-title"><span class="t">${esc(title)}</span>${titleExtra}</div>${right || '<span class="icon-btn spacer"></span>'}</div></header>`;
  }
  const mutedIc = (id) => (db().muted || []).includes(id) ? IC.bellOff.replace('<svg', '<svg style="width:20px;height:20px;stroke:#888"') : '';
  const moreIc = IC.more.replace('<svg', '<svg style="fill:#555;stroke:none"');
  function toggleMute(id) {
    const m = db().muted; const on = m.includes(id);
    if (on) m.splice(m.indexOf(id), 1); else m.push(id);
    GT.save(); toast(on ? 'Notifications on' : 'Notifications muted'); return !on;
  }
  function liveSearch(el, id, setter) {
    const i = $('#' + id, el); if (!i) return;
    i.oninput = () => { setter(i.value); rerender(); const n = $('#' + id); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  }

  window.APP = { $, $$, esc, fmt, av, avStyle, stack, bgCss, logo, empty, toast, sheet, actions, dialog, menu, closeOverlays, pickFriends, audienceLabel, forwardEvent, qrSvg, S, ACT, go, back, render, rerender, header, IC, mutedIc, moreIc, toggleMute, liveSearch };
})();
