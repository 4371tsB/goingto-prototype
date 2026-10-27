/* Screens: chats, chat detail, clubs, ideas, account, settings */
(function () {
  const { $, $$, esc, fmt, av, avStyle, stack, empty, toast, sheet, actions, dialog, menu, closeOverlays, pickFriends, S, ACT, go, back, rerender, header, IC, mutedIc, moreIc, toggleMute, liveSearch } = APP;
  const db = () => GT.db;

  // ======================= Chat list =======================
  function chatTitle(c) {
    if (c.kind === 'dm') return GT.person(c.ref).name;
    if (c.kind === 'event') { const e = GT.event(c.ref); return e ? e.title : 'Event chat'; }
    if (c.kind === 'club') { const cl = GT.club(c.ref); return cl ? cl.name : 'Club chat'; }
    if (c.kind === 'idea') { const i = GT.idea(c.ref); return i ? i.text : 'Idea'; }
    return c.title || 'Group chat';
  }
  function chatAvatar(c) {
    if (c.kind === 'dm') return av(GT.person(c.ref), 50);
    if (c.kind === 'club') { const cl = GT.club(c.ref); return cl ? av(cl, 50, { sq: true }) : ''; }
    if (c.kind === 'event') return `<span class="av av-50" style="background:#7fb6ee">${IC.calendarMini.replace('<svg', '<svg style="width:24px;height:24px;stroke:#fff"')}</span>`;
    return `<span class="av av-50" style="background:linear-gradient(135deg,#7ad9c6,#8ec5f5)">${IC.chats.replace('<svg', '<svg style="width:26px;height:26px;stroke:#fff"')}</span>`;
  }
  function lastText(c) {
    const m = c.messages[c.messages.length - 1]; if (!m) return 'Say hi 👋';
    const who = m.by === db().me ? 'You: ' : c.kind !== 'dm' ? GT.person(m.by).first + ': ' : '';
    if (m.event) { const e = GT.event(m.event); return who + 'Shared an event' + (e ? ': ' + e.title : ''); }
    if (m.card) return who + 'Shared a contact card';
    if (m.img) return who + 'Sent a photo';
    return who + m.text;
  }
  const lastAt = (c) => { const m = c.messages[c.messages.length - 1]; return m ? m.at : '1970-01-01'; };

  let chatQ = '';
  S.chats = () => {
    const visible = db().chats.filter((c) => (c.kind !== 'event' || GT.event(c.ref)) && (c.kind !== 'club' || GT.club(c.ref)) && c.kind !== 'idea' && (c.messages.length || c.kind === 'group'));
    // Search box can search friends name, club title and event title (Figma note)
    const list = visible.filter((c) => chatTitle(c).toLowerCase().includes(chatQ.toLowerCase())).sort((a, b) => new Date(lastAt(b)) - new Date(lastAt(a)));
    return {
      tab: 'chats',
      html: `<header class="hdr shadow"><div class="hdr-row"><div class="hdr-title">Chats</div></div>
        <div class="search-row" style="margin-bottom:0"><label class="search">${IC.search}<input id="chat-q" placeholder="Search" value="${esc(chatQ)}"></label><button class="plus-dark" data-act="chatsPlus" aria-label="New">${IC.plus}</button></div></header>
        ${list.map((c) => `<a class="chat-row${c.unread ? ' unread-row' : ''}" href="#chat/${c.id}">${chatAvatar(c)}<div class="mid"><div class="top"><span class="ttl">${esc(chatTitle(c))}</span>${c.unread ? '' : `<span class="when">${fmt.chatWhen(lastAt(c))}</span>`}</div><div class="last">${esc(lastText(c))}</div></div>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</a>`).join('')
          || (chatQ ? '<div class="empty">No chats found.</div>' : empty('assets/illus/empty-chats.png', 'Want to chat with friends?<br>Start chatting now!', '<button class="btn btn-grad" data-act="startChat">Send message</button>'))}
        <div style="height:20px"></div>`,
      mount(el) { liveSearch(el, 'chat-q', (v) => { chatQ = v; }); },
    };
  };
  ACT.chatsPlus = (el) => menu(el, [
    { icon: 'chat', label: 'Start a chat', run: () => startChat(false) },
    { icon: 'chats', label: 'Start group chat', run: () => startChat(true) },
    { icon: 'addFriend', label: 'Add friend', run: () => go('#add-friend') },
    { icon: 'qr', label: 'Scan QR code', run: () => go('#scan') },
  ]);
  ACT.startChat = () => startChat(false);
  function startChat(group) {
    pickFriends({
      title: group ? 'New group chat' : 'Start a chat', cta: group ? 'Create' : 'Chat', done: ({ friends }) => {
        if (!friends.length) return;
        if (!group || friends.length === 1) return go('#chat/' + GT.dmChat(friends[0]).id);
        const c = { id: GT.uid('ch-g'), kind: 'group', ref: null, members: [db().me, ...friends], title: friends.map((f) => GT.person(f).first).join(', '), unread: 0, messages: [] };
        db().chats.unshift(c); GT.save(); go('#chat/' + c.id);
      },
    });
  }

  // ======================= Chat view (shared by DMs, events, clubs, ideas) =======================
  const replyTo = {}; const trayOpen = {};
  function chatView(c, { embedded = false } = {}) {
    let html = ''; let lastTs = 0; let prevBy = null;
    c.messages.forEach((m, i) => {
      const t = new Date(m.at).getTime();
      if (t - lastTs > 3600e3) { html += `<div class="stamp">${fmt.stamp(m.at)}</div>`; prevBy = null; }
      lastTs = t;
      const mine = m.by === db().me; const p = GT.person(m.by);
      const showAv = prevBy !== m.by; prevBy = m.by;
      let body;
      if (m.event) {
        const e = GT.event(m.event);
        body = e ? `<a class="biz-card" href="#event/${e.id}">${avStyle(e.art, 44, 44, '8px')}<span><b>${esc(e.title)}</b><small>${e.start ? fmt.dayNoPad(e.start) + ' · ' + fmt.time(e.start) : 'Time to be decided'}</small><small style="color:var(--blue)">View event</small></span></a>` : '<div class="bubble">Event no longer available</div>';
      } else if (m.card) {
        const cp = GT.person(m.card);
        body = `<a class="biz-card" href="#user/${cp.id}">${av(cp, 40)}<span><b>${esc(cp.name)}</b><small>Contact card</small></span></a>`;
      } else if (m.img) body = `<div class="bubble img" data-mi="${i}"><img src="${m.img}" alt="Photo"></div>`;
      else body = `<div class="bubble" data-mi="${i}">${m.reply ? `<div class="quote">${esc(m.reply)}</div>` : ''}${esc(m.text)}</div>`;
      const name = showAv && (c.kind !== 'dm') ? `<div class="sender">${esc(mine ? 'You' : p.name)}</div>` : '';
      html += `<div class="msg${mine ? ' me' : ''}">${showAv ? `<a href="#${mine ? 'account' : 'user/' + p.id}">${av(p, 40)}</a>` : '<span class="av av-40 ghost"></span>'}<div>${name}${body}</div></div>`;
    });
    if (!c.messages.length) html = '<div class="empty" style="color:#999">No messages yet. Say hi!</div>';
    const notFriend = c.kind === 'dm' && !GT.isFriend(c.ref);
    if (notFriend) html += `<div class="chat-notice">You can’t chat with ${esc(GT.person(c.ref).first)} since you are not friends anymore, <a class="text-link" style="font-weight:400" href="#add-friend-form/${c.ref}">send friend request</a> to chat again.</div>`;
    const rp = replyTo[c.id];
    return `<div class="chat-wrap"${embedded ? ' style="min-height:calc(100% - 100px)"' : ''}><div class="msgs" id="msgs">${html}</div>
      <div class="composer-wrap">
        ${rp ? `<div class="reply-bar"><span><b>Reply to ${esc(rp.who)}</b><br>${esc(rp.text)}</span><button data-act="cancelReply" data-id="${c.id}" aria-label="Cancel reply">×</button></div>` : ''}
        <form class="composer" id="composer"><button type="button" class="icon-btn" data-act="chatPlus" data-id="${c.id}" aria-label="More">${IC.plusBox}</button><input id="msg-in" placeholder="Enter" autocomplete="off" ${notFriend ? 'disabled' : ''}><button type="button" class="icon-btn" data-act="emoji" aria-label="Emoji">${IC.smile}</button></form>
        ${trayOpen[c.id] ? `<div class="tray"><button data-act="trayPhoto" data-id="${c.id}"><span class="ti">${IC.photo}</span>Photos</button><button data-act="trayCamera" data-id="${c.id}"><span class="ti">${IC.camera}</span>Camera</button><button data-act="trayContact" data-id="${c.id}"><span class="ti">${IC.contact}</span>Contact</button><button data-act="trayEvent" data-id="${c.id}"><span class="ti">${IC.calendarMini}</span>Event</button></div>` : ''}
      </div></div>`;
  }
  const REPLIES = ['Sounds good!', 'Haha yes 😂', 'Let me check and get back to you.', 'I’m in!', 'Perfect, see you then.', '👍'];
  function scrollEnd() { const s = $('#screen'); s.scrollTop = s.scrollHeight; }
  function send(c, msg) {
    c.messages.push({ by: db().me, at: new Date().toISOString(), ...msg }); GT.save(); rerender(); scrollEnd();
    const replier = c.kind === 'dm' ? (GT.isFriend(c.ref) ? c.ref : null) : c.kind === 'group' ? c.members[1] : c.kind === 'club' ? (GT.club(c.ref) || {}).owner : c.kind === 'idea' ? (GT.idea(c.ref) || {}).by : (GT.event(c.ref) || {}).owner;
    if (replier && replier !== db().me) setTimeout(() => {
      c.messages.push({ by: replier, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: new Date().toISOString() }); GT.save();
      if (location.hash.includes(c.id) || location.hash.includes(c.ref)) { rerender(); scrollEnd(); }
    }, 1500);
  }
  function mountChat(el, c, keepTop) {
    c.unread = 0; GT.save(); if (!keepTop) scrollEnd();
    $('#composer', el).onsubmit = (e) => {
      e.preventDefault(); const text = $('#msg-in').value.trim(); if (!text) return;
      const rp = replyTo[c.id]; delete replyTo[c.id];
      send(c, { text, reply: rp ? `${rp.who}: ${rp.text}` : undefined });
      $('#msg-in').focus();
    };
    // Long-press (or right-click) a bubble: Copy / Reply (others) or Copy / Delete (mine) — Figma CLub-detail-04
    let timer;
    const open = (b) => {
      const i = +b.dataset.mi; const m = c.messages[i]; const mine = m.by === db().me;
      const phone = $('#phone').getBoundingClientRect(); const r = b.getBoundingClientRect();
      const root = $('#overlay-root');
      root.innerHTML = `<div class="pop-scrim" data-act="closeSheet"></div><div class="msg-pop" style="top:${r.top - phone.top - 40}px;left:${Math.min(r.left - phone.left + 10, 260)}px"><button id="mp-copy">Copy</button><button id="mp-2">${mine ? 'Delete' : 'Reply'}</button></div>`;
      $('#mp-copy', root).onclick = () => { try { navigator.clipboard.writeText(m.text || ''); } catch (x) { /* ignore */ } closeOverlays(); toast('Copied'); };
      $('#mp-2', root).onclick = () => {
        closeOverlays();
        if (mine) { c.messages.splice(i, 1); GT.save(); rerender(); toast('Message deleted'); }
        else { replyTo[c.id] = { who: GT.person(m.by).name, text: m.text || 'Photo' }; rerender(); scrollEnd(); $('#msg-in').focus(); }
      };
    };
    $$('[data-mi]', el).forEach((b) => {
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); open(b); });
      b.addEventListener('pointerdown', () => { timer = setTimeout(() => open(b), 450); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(timer)));
    });
  }
  APP.chatView = chatView; APP.mountChat = mountChat;
  const ideaChat = (iid) => ({ id: 'idea-' + iid, kind: 'idea', ref: iid, unread: 0, messages: GT.idea(iid).comments });
  const chatOf = (id) => (id.startsWith('idea-') ? ideaChat(id.slice(5)) : db().chats.find((x) => x.id === id));
  ACT.cancelReply = (el) => { delete replyTo[el.dataset.id]; rerender(); };
  ACT.chatPlus = (el) => { trayOpen[el.dataset.id] = !trayOpen[el.dataset.id]; rerender(); scrollEnd(); };
  ACT.emoji = () => { const i = $('#msg-in'); i.value += '😊'; i.focus(); };
  ACT.trayPhoto = (el) => {
    const c = chatOf(el.dataset.id); const photos = Object.values(GT.PHOTO);
    const s = sheet({ title: 'Photos', body: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${photos.map((b, i) => `<button data-i="${i}" style="aspect-ratio:1;border-radius:6px;background:url('${b}') center/cover" aria-label="Photo ${i + 1}"></button>`).join('')}</div>` });
    $$('[data-i]', s).forEach((b) => { b.onclick = () => { closeOverlays(); trayOpen[c.id] = false; send(c, { img: photos[+b.dataset.i], text: '' }); }; });
  };
  ACT.trayCamera = (el) => { const c = chatOf(el.dataset.id); trayOpen[c.id] = false; send(c, { img: GT.PHOTO.forest, text: '' }); };
  // Figma "Share business card": pick a friend → contact card bubble
  ACT.trayContact = (el) => {
    const c = chatOf(el.dataset.id);
    const s = sheet({ title: 'Share business card', body: `<div class="search" style="margin-bottom:10px">${IC.search}<input id="bc-q" placeholder="Search"></div><div id="bc-list"></div>` });
    const draw = (q = '') => { $('#bc-list', s).innerHTML = GT.friends().filter((p) => p.id !== c.ref && p.name.toLowerCase().includes(q.toLowerCase())).map((p) => `<button class="opt" data-p="${p.id}">${av(p, 36)}<span>${esc(p.name)}</span></button>`).join(''); };
    draw(); $('#bc-q', s).oninput = (e) => draw(e.target.value);
    s.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; closeOverlays(); trayOpen[c.id] = false; send(c, { card: b.dataset.p, text: '' }); toast('Business card sent'); });
  };
  ACT.trayEvent = (el) => {
    const c = chatOf(el.dataset.id);
    const evs = db().events.filter((e) => (e.owner === db().me || e.attendees.includes(db().me)) && (!e.end || new Date(e.end) > new Date()) && !e.cancelled);
    const s = sheet({ title: 'Share an event', body: evs.map((e) => `<button class="opt" data-e="${e.id}">${avStyle(e.art, 40)}<span>${esc(e.title)}<div class="sub">${e.start ? fmt.dayNoPad(e.start) : 'Time to be decided'}</div></span></button>`).join('') || '<p class="muted">No upcoming events.</p>' });
    $$('[data-e]', s).forEach((b) => { b.onclick = () => { closeOverlays(); trayOpen[c.id] = false; send(c, { event: b.dataset.e, text: '' }); }; });
  };

  S.chat = ([id]) => {
    const c = GT.chat(id); if (!c) return { redirect: '#chats' };
    return {
      html: header({ title: chatTitle(c), fallback: '#chats', shadow: true, titleExtra: mutedIc(id), right: `<button class="icon-btn" data-act="chatMenu" data-id="${id}" aria-label="More">${moreIc}</button>` }) + chatView(c),
      mount: (el) => mountChat(el, c),
    };
  };
  ACT.chatMenu = (el) => {
    const c = GT.chat(el.dataset.id);
    const items = [{ icon: 'bellOff', label: 'Mute chat', toggle: db().muted.includes(c.id), run: () => { toggleMute(c.id); setTimeout(rerender, 300); } }];
    if (c.kind === 'dm') { items.push({ icon: 'friends', label: 'View profile', run: () => go('#user/' + c.ref) }); items.push({ icon: 'createEvent', label: 'Create 1 on 1 event', run: () => go('#create-event?with=' + c.ref) }); }
    if (c.kind === 'event') items.push({ icon: 'calendarMini', label: 'View event', run: () => go('#event/' + c.ref) });
    if (c.kind === 'club') items.push({ icon: 'clubs', label: 'View club', run: () => go('#club/' + c.ref) });
    items.push({ icon: 'trash', label: 'Clear chat history', danger: true, run: () => dialog({ title: 'Are you sure?', text: 'Messages in this chat will be removed from this device.', ok: 'Clear', danger: true, onOk: () => { c.messages = []; GT.save(); rerender(); } }) });
    actions(items);
  };

  // ======================= Clubs =======================
  let clubQ = '';
  S.clubs = () => {
    const me = db().me; const match = (c) => c.name.toLowerCase().includes(clubQ.toLowerCase());
    const owned = db().clubs.filter((c) => c.owner === me && match(c));
    const joined = db().clubs.filter((c) => c.owner !== me && c.members.includes(me) && match(c));
    const row = (c) => `<a class="club-row" href="#club/${c.id}">${av(c, 50, { sq: true })}<span style="flex:1">${esc(c.name)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</a>`;
    const none = !owned.length && !joined.length && !db().clubInvites.length;
    return {
      tab: 'clubs',
      html: `<header class="hdr"><div class="hdr-row"><div class="hdr-title" style="font-size:24px">Clubs</div></div>
        <div class="search-row"><label class="search">${IC.search}<input id="club-q" placeholder="Search" value="${esc(clubQ)}"></label><a class="plus-dark" href="#create-club" aria-label="Create club">${IC.plus}</a></div></header>
        ${none && !clubQ ? empty('assets/illus/empty-clubs.png', 'Are you a bookworm or a sports fan?<br>Create a club for you and your friends!', '<a class="btn btn-grad" href="#create-club">Create club</a>') : `<div class="pad">
          ${db().clubInvites.length ? `<div class="section-label">Invitations</div>${db().clubInvites.map((i) => `<button class="club-row" style="width:100%;text-align:left" data-act="clubInvite" data-club="${i.club}">${av(i, 50, { sq: true })}<span style="flex:1">${esc(i.name)}<div class="muted" style="font-size:13px">from ${esc(GT.person(i.from).name)}</div></span><span class="btn btn-grad btn-sm">View</span></button>`).join('')}<div class="divider"></div>` : ''}
          <div class="section-label">Owned clubs</div>${owned.map(row).join('') || '<p class="muted" style="margin-left:10px">You don’t own any clubs yet.</p>'}
          <div class="divider"></div>
          <div class="section-label">Joined clubs</div>${joined.map(row).join('') || '<p class="muted" style="margin-left:10px">No joined clubs.</p>'}
        </div>`}`,
      mount(el) { liveSearch(el, 'club-q', (v) => { clubQ = v; }); },
    };
  };

  const clubTab = {}; const aboutOpen = {};
  const canCreate = (c) => c.permission !== 'mods' || c.owner === db().me || c.mediators.includes(db().me);
  S.club = ([id]) => {
    const c = GT.club(id); if (!c) return { redirect: '#clubs' };
    const tab = clubTab[id] || 'events';
    const chat = GT.refChat('club', id);
    const isMember = c.members.includes(db().me);
    const isMod = c.owner === db().me || c.mediators.includes(db().me);
    const reqs = isMod ? c.requests.length : 0;
    const shown = c.members.slice(0, 8); const extra = c.members.length - shown.length;
    const top = `<div class="cover" style="background-image:url('${c.cover || c.art}')"><button class="icon-btn" style="left:16px" data-act="back" data-fallback="#clubs" aria-label="Back">${IC.back}</button><button class="icon-btn" style="right:16px" data-act="clubMenu" data-id="${id}" aria-label="More">${IC.more.replace('<svg', '<svg style="fill:#fff"')}</button></div>
      <div class="pad">
        <div class="club-title">${esc(c.name)}${mutedIc(id)}</div>
        ${aboutOpen[id] ? `<div class="desc" style="font-size:15px;margin:6px 0">${esc(c.about || 'No description yet.')}</div><button class="text-link" data-act="clubAbout" data-id="${id}">Read less</button>` : '<button class="text-link" data-act="clubAbout" data-id="' + id + '">About us</button>'}
        <div class="divider"></div>
        <a href="#club-members/${id}" style="display:block"><div style="display:flex;justify-content:space-between;align-items:center"><div class="section-label" style="margin-top:0;font-size:20px">Club members (${c.members.length})</div>${reqs ? `<span class="unread">${reqs}</span>` : ''}</div>
        <div class="member-strip">${shown.map((m) => av(GT.person(m), 36)).join('')}${extra > 0 ? `<span class="av av-36 more">+${extra}</span>` : ''}</div></a>
        <div class="divider"></div>
        <div style="display:flex;gap:10px;align-items:center"><button class="icon-btn" style="background:var(--field);border-radius:8px" data-act="clubShare" data-id="${id}" aria-label="Invite to club">${IC.shareOut}</button>
          <div class="seg" style="flex:1"><button class="${tab === 'events' ? 'on' : ''}" data-act="clubTab" data-id="${id}" data-t="events">Events</button><button class="${tab === 'chat' ? 'on' : ''}" data-act="clubTab" data-id="${id}" data-t="chat">Chat${(chat.unread || c.unread) && tab !== 'chat' ? '<span class="dot-red"></span>' : ''}</button></div></div>
      </div>`;
    if (tab === 'chat') { c.unread = 0; return { fullBleed: true, light: true, html: top + '<div style="height:10px"></div>' + chatView(chat, { embedded: true }), mount: (el) => { mountChat(el, chat); lightOnCover(); } }; }
    return {
      fullBleed: true, light: true,
      html: `${top}<div class="pad">${APP.monthHeader('club-' + id)}</div><div class="ev-list">${APP.monthList(db().events.filter((e) => e.club === id), 'club-' + id, { onWhite: true, emptyHtml: '<div class="empty">No club events this month.</div>' })}</div><div style="height:60px"></div>`,
      fab: isMember && canCreate(c) ? `<a class="fab no-tab" href="#create-event?club=${id}" aria-label="Create club event">${IC.plus}</a>` : '',
      mount: lightOnCover,
    };
  };
  // Status bar is white over the cover photo, dark once scrolled past it
  function lightOnCover() { const scr = $('#screen'); const sb = $('#statusbar'); const f = () => sb.classList.toggle('light', scr.scrollTop < 150); scr.onscroll = f; f(); }
  ACT.clubTab = (el) => { clubTab[el.dataset.id] = el.dataset.t; rerender(); };
  ACT.clubAbout = (el) => { aboutOpen[el.dataset.id] = !aboutOpen[el.dataset.id]; rerender(); };
  ACT.clubShare = (el) => go('#club-invite/' + el.dataset.id);
  ACT.clubMenu = (el) => {
    const c = GT.club(el.dataset.id); const owner = c.owner === db().me;
    const items = [{ icon: 'bellOff', label: 'Mute club', toggle: db().muted.includes(c.id), run: () => { toggleMute(c.id); setTimeout(rerender, 300); } },
      { icon: 'addFriend', label: owner ? 'Add members' : 'Invite friends', run: () => go('#club-invite/' + c.id) }];
    if (owner) items.push({ icon: 'edit', label: 'Edit club', run: () => go('#create-club?edit=' + c.id) });
    if (!owner && c.members.includes(db().me)) items.push({ icon: 'quit', label: 'Leave club', danger: true, run: () => dialog({ title: 'Leave club?', text: `You’ll stop seeing ${c.name} events.`, ok: 'Leave', danger: true, onOk: () => { c.members = c.members.filter((m) => m !== db().me); c.mediators = c.mediators.filter((m) => m !== db().me); GT.save(); go('#clubs', true); toast('You left the club'); } }) });
    if (owner) items.push({ icon: 'trash', label: 'Delete club', danger: true, run: () => dialog({ title: 'Are you sure?', text: 'This removes the club for all members. This process cannot be undone.', ok: 'Delete', danger: true, onOk: () => { db().clubs = db().clubs.filter((x) => x !== c); GT.save(); go('#clubs', true); toast('Club deleted'); } }) });
    actions(items);
  };

  // Figma Club-member-member / mediator / owner
  S['club-members'] = ([id]) => {
    const c = GT.club(id); if (!c) return { redirect: '#clubs' };
    const amOwner = c.owner === db().me; const amMod = amOwner || c.mediators.includes(db().me);
    const regular = c.members.filter((m) => m !== c.owner && !c.mediators.includes(m));
    const row = (m) => { const p = GT.person(m); return `<div class="list-row" style="min-height:52px"><a href="#${m === db().me ? 'account' : 'user/' + m}" style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">${av(p, 36)}<span class="name" style="font-size:17px">${esc(m === db().me ? p.name + ' (you)' : p.name)}</span></a>${amOwner && m !== c.owner ? `<button class="icon-btn" data-act="memberMenu" data-c="${id}" data-id="${m}" aria-label="Manage">${moreIc}</button>` : ''}</div>`; };
    return {
      html: `<header class="hdr shadow"><div class="hdr-row"><button class="icon-btn" data-act="back" data-fallback="#club/${id}" aria-label="Back">${IC.back}</button><div class="hdr-title">Club members</div><span class="icon-btn spacer"></span></div>
        <div class="search-row" style="margin-bottom:0"><label class="search">${IC.search}<input placeholder="Search" id="cm-q"></label><a class="icon-btn" href="#club-invite/${id}" aria-label="Invite">${IC.addFriend}</a></div></header>
        ${amMod ? `<a class="special-row" href="#club-requests/${id}" style="margin-top:8px"><span class="sq-ic">${IC.friends}</span><span class="name">Club member requests</span>${c.requests.length ? `<span class="unread">${c.requests.length}</span>` : ''}</a>` : ''}
        <div id="cm-list"><div class="alpha">Owner</div>${row(c.owner)}
        ${c.mediators.length ? `<div class="alpha">Mediator</div>${c.mediators.map(row).join('')}` : ''}
        ${regular.length ? `<div class="alpha">Member</div>${regular.map(row).join('')}` : ''}</div>`,
      mount(el) { $('#cm-q', el).oninput = (e) => { const v = e.target.value.toLowerCase(); $$('#cm-list .list-row', el).forEach((r) => { r.style.display = r.textContent.toLowerCase().includes(v) ? '' : 'none'; }); }; },
    };
  };
  ACT.memberMenu = (el) => {
    const c = GT.club(el.dataset.c); const m = el.dataset.id; const isMed = c.mediators.includes(m);
    actions([
      { icon: 'personCheck', label: isMed ? 'Assign as member' : 'Assign as mediator', run: () => { if (isMed) c.mediators = c.mediators.filter((x) => x !== m); else c.mediators.push(m); GT.save(); rerender(); toast(isMed ? `${GT.person(m).first} is now a member` : `${GT.person(m).first} is now a mediator`); } },
      { icon: 'personX', label: 'Delete member', danger: true, run: () => dialog({ title: 'Are you sure?', text: `Remove ${GT.person(m).name} from the club?`, ok: 'Delete', danger: true, onOk: () => { c.members = c.members.filter((x) => x !== m); c.mediators = c.mediators.filter((x) => x !== m); GT.save(); rerender(); toast('Member removed'); } }) },
    ]);
  };
  // Figma Clubreq-01
  S['club-requests'] = ([id]) => {
    const c = GT.club(id); if (!c) return { redirect: '#clubs' };
    return {
      html: `${header({ title: 'Club member requests', shadow: true, fallback: '#club-members/' + id })}
        ${c.requests.map((r, i) => { const p = GT.person(r.from); return `<div class="person-card">${av(p, 50)}<div class="mid"><div class="nm">${esc(p.name)}</div><div class="why">${IC.friends.replace('<svg', '<svg style="width:12px;height:12px;stroke:#777;fill:none"')}<span>${esc(r.note)}</span></div><div class="req-btns"><button class="btn btn-gray" data-act="clubReq" data-c="${id}" data-i="${i}" data-ok="0">Ignore</button><button class="btn btn-grad" style="flex:1" data-act="clubReq" data-c="${id}" data-i="${i}" data-ok="1">Accept</button></div></div></div>`; }).join('') || '<div class="empty" style="padding-top:200px;color:#999">No more member requests.</div>'}`,
    };
  };
  ACT.clubReq = (el) => {
    const c = GT.club(el.dataset.c); const r = c.requests.splice(+el.dataset.i, 1)[0];
    if (el.dataset.ok === '1' && !c.members.includes(r.from)) c.members.push(r.from);
    GT.save(); rerender(); toast(el.dataset.ok === '1' ? `${GT.person(r.from).name} joined the club` : 'Request ignored');
  };
  // Figma Club-invite-mediator/member (Invite friends) and Club-invite-owner (Add members with role)
  const inviteSel = {};
  S['club-invite'] = ([id]) => {
    const c = GT.club(id); if (!c) return { redirect: '#clubs' };
    const owner = c.owner === db().me;
    if (!inviteSel[id]) inviteSel[id] = {};
    const sel = inviteSel[id];
    const list = GT.friends().filter((p) => !c.members.includes(p.id));
    return {
      html: `<div class="fill">${header({ title: owner ? 'Add members' : 'Invite friends', shadow: true, fallback: '#club/' + id })}
        <div class="pad" style="margin-top:10px"><label class="search">${IC.search}<input placeholder="Search" id="ci-q"></label></div>
        <div id="ci-list" style="flex:1">${list.map((p) => `<div class="list-row"><button data-act="ciPick" data-c="${id}" data-id="${p.id}" style="display:flex;align-items:center;gap:12px;flex:1;text-align:left"><input type="checkbox" class="chk" ${sel[p.id] ? 'checked' : ''} tabindex="-1">${av(p, 36)}<span class="name" style="font-size:17px">${esc(p.name)}</span></button>
          ${owner && sel[p.id] ? `<select class="role-select" data-role="${p.id}"><option value="member" ${sel[p.id] === 'member' ? 'selected' : ''}>Member</option><option value="mediator" ${sel[p.id] === 'mediator' ? 'selected' : ''}>Mediator</option></select>` : ''}</div>`).join('') || '<div class="empty">All your friends are already in this club.</div>'}</div>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="ciSend" data-c="${id}" ${Object.keys(sel).length ? '' : 'disabled'}>Invite${Object.keys(sel).length ? ` (${Object.keys(sel).length})` : ''}</button></div></div>`,
      mount(el) {
        $$('[data-role]', el).forEach((s) => { s.onchange = () => { sel[s.dataset.role] = s.value; }; });
        $('#ci-q', el).oninput = (e) => { const v = e.target.value.toLowerCase(); $$('#ci-list .list-row', el).forEach((r) => { r.style.display = r.textContent.toLowerCase().includes(v) ? '' : 'none'; }); };
      },
    };
  };
  ACT.ciPick = (el) => { const sel = inviteSel[el.dataset.c]; if (sel[el.dataset.id]) delete sel[el.dataset.id]; else sel[el.dataset.id] = 'member'; rerender(); };
  ACT.ciSend = (el) => {
    const c = GT.club(el.dataset.c); const sel = inviteSel[c.id]; const n = Object.keys(sel).length;
    if (c.owner === db().me) Object.entries(sel).forEach(([u, role]) => { if (!c.members.includes(u)) c.members.push(u); if (role === 'mediator' && !c.mediators.includes(u)) c.mediators.push(u); });
    delete inviteSel[c.id]; GT.save(); back('#club/' + c.id);
    toast(c.owner === db().me ? `Added ${n} member${n > 1 ? 's' : ''}` : `Invited ${n} friend${n > 1 ? 's' : ''}`);
  };

  // Figma Create-club-01/02/03
  let clubDraft = null;
  S['create-club'] = (a, q) => {
    const editing = q.edit && GT.club(q.edit);
    if (!clubDraft || clubDraft.key !== location.hash) clubDraft = { key: location.hash, name: editing ? editing.name : '', about: editing ? editing.about : '', art: editing ? (editing.cover || editing.art) : GT.PHOTO.cover, members: {}, permission: editing ? editing.permission || 'all' : 'all', permOpen: false };
    const d = clubDraft;
    const ids = Object.keys(d.members);
    return {
      fullBleed: true, light: true,
      html: `<div class="fill"><div class="cover" style="background-image:url('${d.art}')"><button class="icon-btn" style="left:16px" data-act="back" data-fallback="#clubs" aria-label="Close">${IC.close}</button>
          <div class="mid-btns"><button data-act="clubCover" aria-label="Upload cover">${IC.imgAdd}</button><button data-act="clubShuffle" aria-label="Shuffle cover">${IC.shuffle}</button></div></div>
        <div class="form" style="padding-top:20px">
          <input class="field" id="cc-name" placeholder="Club name" value="${esc(d.name)}" maxlength="60">
          <input class="field" id="cc-about" placeholder="Club description" value="${esc(d.about)}">
          ${editing ? '' : ids.length
            ? `<div class="panel"><div class="member-chips">${ids.map((u) => `<div class="member-chip">${av(GT.person(u), 50)}<button class="x" data-act="ccRm" data-id="${u}" aria-label="Remove">×</button>${esc(GT.person(u).first)}<br>(${d.members[u] === 'mediator' ? 'Mediator' : 'Member'})</div>`).join('')}<button class="member-chip" data-act="ccAdd"><span class="add">${IC.edit}</span></button></div></div>`
            : `<button type="button" class="panel row-btn" data-act="ccAdd">${IC.group}<span>Add members</span></button>`}
          <div class="panel"><button type="button" class="row-btn" data-act="ccPerm">${IC.lock}<span>${d.permission === 'all' ? 'Allow everyone create events' : 'You and mediators can create events'}</span>${IC.caret.replace('<svg', '<svg class="chev"')}</button>
            ${d.permOpen ? `<div class="dropdown">${[['all', 'Allow everyone create events'], ['mods', 'You and mediators can create events']].map(([k, l]) => `<button class="${d.permission === k ? 'on' : ''}" data-act="ccPermSet" data-k="${k}">${d.permission === k ? '✓ ' : ''}${l}</button>`).join('')}</div>` : ''}</div>
          <div class="err" id="cc-err"></div>
        </div>
        <div style="flex:1"></div>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="clubSave">${editing ? 'Save' : 'Create'}</button></div></div>`,
      mount(el) { $('#cc-name', el).oninput = (e) => { d.name = e.target.value; }; $('#cc-about', el).oninput = (e) => { d.about = e.target.value; }; },
    };
  };
  const COVERS = [GT.PHOTO.cover, GT.PHOTO.forest, GT.PHOTO.interior, GT.PHOTO.travel, GT.PHOTO.beach, GT.PHOTO.sunset, GT.PHOTO.building];
  ACT.clubShuffle = () => { const i = COVERS.indexOf(clubDraft.art); clubDraft.art = COVERS[(i + 1) % COVERS.length]; rerender(); };
  ACT.clubCover = () => {
    const s = sheet({ title: 'Choose a cover', body: `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${COVERS.map((b, i) => `<button data-i="${i}" style="aspect-ratio:2/1;border-radius:8px;background:url('${b}') center/cover" aria-label="Cover ${i + 1}"></button>`).join('')}</div>` });
    $$('[data-i]', s).forEach((b) => { b.onclick = () => { clubDraft.art = COVERS[+b.dataset.i]; closeOverlays(); rerender(); }; });
  };
  ACT.ccAdd = () => {
    const d = clubDraft;
    pickFriends({ title: 'Add members', cta: 'Invite', selected: { friends: Object.keys(d.members) }, done: ({ friends }) => {
      const next = {}; friends.forEach((f) => { next[f] = d.members[f] || 'member'; }); d.members = next;
      if (!friends.length) return rerender();
      // Owner sets a role per member (Figma: Mediator / Member dropdown)
      const s = sheet({ title: 'Member roles', body: friends.map((f) => `<div class="list-row" style="padding:8px 0">${av(GT.person(f), 36)}<span class="name" style="font-size:16px">${esc(GT.person(f).name)}</span><select class="role-select" data-r="${f}"><option value="member" ${next[f] === 'member' ? 'selected' : ''}>Member</option><option value="mediator" ${next[f] === 'mediator' ? 'selected' : ''}>Mediator</option></select></div>`).join(''), foot: '<button class="btn btn-grad" id="mr-ok">Done</button>' });
      $$('[data-r]', s).forEach((x) => { x.onchange = () => { d.members[x.dataset.r] = x.value; }; });
      $('#mr-ok', s).onclick = () => { closeOverlays(); rerender(); };
    } });
  };
  ACT.ccRm = (el) => { delete clubDraft.members[el.dataset.id]; rerender(); };
  ACT.ccPerm = () => { clubDraft.permOpen = !clubDraft.permOpen; rerender(); };
  ACT.ccPermSet = (el) => { clubDraft.permission = el.dataset.k; clubDraft.permOpen = false; rerender(); };
  ACT.clubSave = () => {
    const d = clubDraft; const q = Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
    if (!d.name.trim()) { $('#cc-err').textContent = 'Give your club a name.'; return; }
    if (q.edit) { const c = GT.club(q.edit); Object.assign(c, { name: d.name.trim(), about: d.about.trim(), cover: d.art, art: d.art, permission: d.permission }); GT.save(); clubDraft = null; go('#club/' + c.id, true); toast('Club updated'); return; }
    const ids = Object.keys(d.members);
    const c = { id: GT.uid('c'), name: d.name.trim(), about: d.about.trim(), art: d.art, cover: d.art, owner: db().me, mediators: ids.filter((u) => d.members[u] === 'mediator'), members: [db().me, ...ids], permission: d.permission, requests: [], unread: 0 };
    db().clubs.push(c); GT.save(); clubDraft = null; go('#club/' + c.id, true); toast('Club created');
  };

  // ======================= Ideas =======================
  let ideaTab = 'all';
  function ideaCard(i) {
    const on = i.interested.includes(db().me);
    return `<a class="idea" href="#idea/${i.id}" style="background:${i.bg}"><p>${esc(i.text)}</p><div class="foot">${av(GT.person(i.by), 20)}<span class="grow"></span>
      <button class="stat${on ? ' on' : ''}" data-act="interest" data-id="${i.id}" aria-label="Interested">${IC.bulb}${i.interested.length || ''}</button>
      <span class="stat">${IC.chat}${i.comments.length || ''}</span></div></a>`;
  }
  // Figma Ideatank Mine / Interested: list with status
  function ideaRow(i, showAuthor) {
    const on = i.interested.includes(db().me);
    return `<a class="idea-row" href="#idea/${i.id}">${i.unread ? '<span class="dot-red"></span>' : ''}<div class="top">${showAuthor ? av(GT.person(i.by), 30) : ''}<span>${esc(i.text)}</span></div>
      <div class="bot"><span class="status ${i.status}">${esc(i.status)}</span><button class="stat${on ? ' on' : ''}" data-act="interest" data-id="${i.id}" aria-label="Interested">${IC.bulb}${i.interested.length}</button><span class="stat">${IC.chat}${i.comments.length}</span></div></a>`;
  }
  APP.ideaRow = ideaRow;
  S.ideas = () => {
    const me = db().me;
    const mineUnread = db().ideas.some((i) => i.by === me && i.unread);
    let body;
    if (ideaTab === 'all') {
      const list = db().ideas.filter((i) => i.status === 'active');
      body = list.length ? `<div class="masonry">${list.map(ideaCard).join('')}</div>` : empty(['assets/illus/empty-ideas-boy.png', 'assets/illus/empty-ideas-lamp.png'], 'Share your idea or ask a question', '<button class="btn btn-grad" data-act="newIdea">Create idea</button>');
    } else {
      const list = db().ideas.filter((i) => ideaTab === 'mine' ? i.by === me : i.interested.includes(me) && i.by !== me);
      body = list.length ? list.map((i) => ideaRow(i, ideaTab === 'interested')).join('') + '<div style="height:120px"></div>' : `<div class="empty">${ideaTab === 'mine' ? 'You haven’t shared any ideas yet.' : 'Tap the light bulb on ideas you like.'}</div>`;
    }
    return {
      tab: 'ideas',
      html: `<header class="hdr shadow"><div style="padding-top:10px"><div class="seg">${[['all', 'All ideas'], ['mine', 'Mine'], ['interested', 'Interested']].map(([k, l]) => `<button class="${ideaTab === k ? 'on' : ''}" data-act="ideaTab" data-t="${k}">${l}${k === 'mine' && mineUnread && ideaTab !== 'mine' ? ' <span class="dot-red"></span>' : ''}</button>`).join('')}</div></div></header>${body}`,
      fab: `<button class="fab" data-act="newIdea" aria-label="New idea">${IC.plus}</button>`,
    };
  };
  ACT.ideaTab = (el) => { ideaTab = el.dataset.t; rerender(); };
  ACT.interest = (el) => { const i = GT.idea(el.dataset.id); const me = db().me; const on = i.interested.includes(me); i.interested = on ? i.interested.filter((x) => x !== me) : [...i.interested, me]; GT.save(); rerender(); if (!on) toast('Marked as interested'); };
  const IDEA_BG = ['#efeaf7', '#fbece9', '#e9f0fb', '#eaf4f1', '#f1f9e9', '#f3f3ea'];
  // Figma Add-idea-01: "Share your idea or ask a question" + Publish
  ACT.newIdea = () => {
    const s = sheet({
      title: '', noHeader: true,
      body: `<div class="section-label">Share your idea or ask a question</div><input class="field" id="ni-text" placeholder="Anyone want to go hiking?" maxlength="140"><div style="text-align:center;margin-top:16px"><button class="btn btn-grad" id="ni-ok" style="height:40px;width:130px" disabled>Publish</button></div>`,
    });
    const t = $('#ni-text', s); setTimeout(() => t.focus(), 250);
    t.oninput = () => { $('#ni-ok', s).disabled = !t.value.trim(); };
    const publish = () => { if (!t.value.trim()) return; db().ideas.unshift({ id: GT.uid('i'), text: t.value.trim(), by: db().me, bg: IDEA_BG[Math.floor(Math.random() * IDEA_BG.length)], interested: [], comments: [], status: 'active', at: new Date().toISOString() }); GT.save(); closeOverlays(); ideaTab = 'all'; go('#ideas'); rerender(); toast('Idea published'); };
    $('#ni-ok', s).onclick = publish; t.onkeydown = (e) => { if (e.key === 'Enter') publish(); };
  };
  // Figma Ideatank-detail-01/02/03: header, interested avatars, comments as chat
  S.idea = ([id]) => {
    const i = GT.idea(id); if (!i) return { redirect: '#ideas' };
    const p = GT.person(i.by); const mine = i.by === db().me; const on = i.interested.includes(db().me);
    i.unread = false; GT.save();
    // Comments are a chat thread (shared chat component); the thread object is transient
    const chat = ideaChat(id);
    const stateRow = i.status === 'done' ? `<div class="state">${IC.eyeHide} Marked as done</div>` : i.status === 'converted' ? `<div class="state">${IC.calCheck} Converted to an event ${i.event && GT.event(i.event) ? `<a class="text-link" href="#event/${i.event}">View event</a>` : ''}</div>` : '';
    return {
      html: `${header({ title: mine ? 'My ideas' : `Idea by ${p.first}`, fallback: '#ideas', shadow: true, right: `<button class="icon-btn" data-act="ideaMenu" data-id="${id}" aria-label="More">${moreIc}</button>` })}
        <div class="idea-head">
          ${mine ? `<div class="by"><span class="t" style="margin:0">${fmt.time(i.at)} ${fmt.slash(i.at)}</span></div>` : `<div class="by">${av(p, 30)}<a href="#user/${p.id}">${esc(p.name)}</a><span class="t">${fmt.rel(i.at)}</span></div>`}
          <p>${esc(i.text)}</p>
          <div class="stats"><button class="stat${on ? ' on' : ''}" data-act="interest" data-id="${id}" aria-label="Interested">${IC.bulb}</button><a href="#idea-likes/${id}">${stack(i.interested, 8, 30)}</a><span style="flex:1"></span><span class="stat">${IC.chat}${i.comments.length}</span></div>
          ${mine && i.status === 'active' ? `<div class="acts"><button class="btn btn-outline" data-act="ideaDone" data-id="${id}">Mark as done</button><a class="btn btn-grad" href="#create-event?idea=${id}">Convert to event</a></div>` : stateRow}
        </div>` + chatView(chat, { embedded: true }),
      mount: (el) => mountChat(el, chat, true),
    };
  };
  ACT.ideaDone = (el) => { const i = GT.idea(el.dataset.id); i.status = 'done'; GT.save(); rerender(); toast('Marked as done'); };
  ACT.ideaMenu = (el) => {
    const i = GT.idea(el.dataset.id); const mine = i.by === db().me;
    const items = [];
    if (!mine) items.push({ icon: 'createEvent', label: 'Turn into an event', run: () => go('#create-event?idea=' + i.id) });
    if (mine && i.status !== 'archived') items.push({ icon: 'eyeHide', label: 'Archive idea', run: () => { i.status = 'archived'; GT.save(); rerender(); toast('Idea archived'); } });
    if (mine && i.status !== 'active') items.push({ icon: 'bulb', label: 'Reopen idea', run: () => { i.status = 'active'; GT.save(); rerender(); } });
    if (mine) items.push({ icon: 'trash', label: 'Delete idea', danger: true, run: () => dialog({ title: 'Are you sure?', text: 'Do you want to delete this idea? This process cannot be undone.', ok: 'Delete', danger: true, onOk: () => { db().ideas = db().ideas.filter((x) => x !== i); GT.save(); go('#ideas', true); toast('Idea deleted'); } }) });
    else items.push({ icon: 'report', label: 'Report idea', run: () => toast('Thanks — we’ll take a look') });
    actions(items);
  };
  S['idea-likes'] = ([id]) => {
    const i = GT.idea(id); if (!i) return { redirect: '#ideas' };
    return { html: `${header({ title: 'Who liked the idea', shadow: true, fallback: '#idea/' + id })}${i.interested.map((u) => GT.person(u)).map((p) => `<a class="list-row" href="#${p.id === db().me ? 'account' : 'user/' + p.id}">${av(p, 36)}<span class="name">${esc(p.name)}</span></a>`).join('') || '<div class="empty">No one yet.</div>'}` };
  };

  // ======================= Account =======================
  let acctTab = 'events';
  S.account = () => {
    const me = GT.me();
    const mine = db().events.filter((e) => e.owner === me.id || e.attendees.includes(me.id));
    return {
      html: `${header({ title: 'My account' })}
        <div class="pad">
          <div style="display:flex;align-items:center;gap:18px;margin:6px 0">${av(me, 80)}<span style="font-size:26px;font-weight:700;flex:1">${esc(me.name)}</span><a class="icon-btn" href="#qr" aria-label="My QR code">${IC.qrFull}</a></div>
          <div class="acct-grid">
            <a href="#edit-profile">${IC.edit}Edit profile</a><a href="#friends">${IC.friends}My friends</a>
            <a href="#tags">${IC.tag}Manage tags</a><a href="#settings">${IC.gear}Settings</a>
          </div>
        </div>
        <div class="folder-tabs"><button class="${acctTab === 'events' ? 'on' : ''}" data-act="acctTab" data-t="events">Events</button><button class="${acctTab === 'ideas' ? 'on' : ''}" data-act="acctTab" data-t="ideas">My ideas</button></div>
        <div style="background:var(--canvas);min-height:460px">
          ${acctTab === 'events' ? `<div class="pad">${APP.monthHeader('acct')}</div><div class="ev-list">${APP.monthList(mine, 'acct', { emptyHtml: '<div class="empty">No events this month.</div>' })}</div>` : (db().ideas.filter((i) => i.by === me.id).map((i) => ideaRow(i, false).replace('class="idea-row"', 'class="idea-row" style="background:transparent"')).join('') || '<div class="empty">No ideas yet.</div>')}
        </div>`,
    };
  };
  ACT.acctTab = (el) => { acctTab = el.dataset.t; rerender(); };
  // Figma Account-02 Edit profile
  let pic = null;
  S['edit-profile'] = () => {
    const me = GT.me(); const art = pic || me.art;
    return {
      html: `<div class="fill">${header({ title: 'Edit profile', fallback: '#account' })}
        <div style="text-align:center;margin:10px 0 20px">${APP.avStyle(art, 120)}<button class="text-link" data-act="changePic" style="display:block;margin:10px auto 0;font-size:15px">Change picture</button></div>
        <div class="form"><input class="field" id="ep-first" value="${esc(me.first)}" placeholder="First name"><input class="field" id="ep-last" value="${esc(me.last)}" placeholder="Last name"></div>
        <div style="flex:1"></div>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="saveProfile">Save</button></div></div>`,
    };
  };
  ACT.changePic = () => {
    const s = sheet({ title: 'Change picture', body: `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${GT.AV.map((src) => `<button data-src="${src}" class="av" style="width:56px;height:56px;background-image:url('${src}')" aria-label="Avatar"></button>`).join('')}</div>` });
    $$('[data-src]', s).forEach((b) => { b.onclick = () => { pic = b.dataset.src; closeOverlays(); rerender(); }; });
  };
  ACT.saveProfile = () => {
    const me = GT.me(); const f = $('#ep-first').value.trim(); if (!f) { toast('Enter your first name'); return; }
    me.first = f; me.last = $('#ep-last').value.trim(); me.name = (me.first + ' ' + me.last).trim(); if (pic) me.art = pic; pic = null;
    GT.save(); back('#account'); toast('Profile updated');
  };
  // Figma Account-03 Settings
  S.settings = () => ({
    html: `<div class="fill">${header({ title: 'Settings', fallback: '#account' })}
      <a class="set-row" href="#connected">Connected account ${IC.next.replace('<svg', '<svg style="width:18px;height:18px;stroke:#555;fill:none"')}</a>
      <a class="set-row" href="#notifications">Notifications <span class="muted" style="font-size:15px">${db().settings.notifications ? 'On' : 'Off'}</span></a>
      <button class="set-row" data-act="legal">Terms of Services ${IC.next.replace('<svg', '<svg style="width:18px;height:18px;stroke:#555;fill:none"')}</button>
      <button class="set-row" data-act="legal">Privacy Policy ${IC.next.replace('<svg', '<svg style="width:18px;height:18px;stroke:#555;fill:none"')}</button>
      <div class="pad" style="display:flex;flex-direction:column;gap:12px;margin-top:20px">
        <button class="btn btn-gray" style="color:var(--danger);height:40px;font-size:16px" data-act="deleteAccount">Delete account</button>
        <button class="btn btn-gray" style="height:40px;font-size:16px" data-act="signOut">Sign out</button>
        <button class="link-btn" data-act="resetDemo" style="margin-top:6px">Reset demo data</button>
      </div>
      <div style="flex:1"></div>
      <p class="fine" style="padding-bottom:30px">Contact us at <a href="mailto:support@goingto.app">support@goingto.app</a></p></div>`,
  });
  // Figma Account-04 Connected account / Account-05 Link email
  S.connected = () => ({
    html: `${header({ title: 'Connected account', fallback: '#settings' })}
      <div class="set-row"><span style="display:flex;gap:10px;align-items:center"><span style="color:#4285f4;font-weight:700">G</span>${esc(GT.me().first.toLowerCase())}@gmail.com</span><button class="switch ${db().connected.google ? 'on' : ''}" data-act="toggleGoogle" aria-label="Google connected"></button></div>
      ${db().connected.email ? `<div class="set-row"><span style="display:flex;gap:10px;align-items:center">${IC.mail.replace('<svg', '<svg style="width:20px;height:20px;stroke:#555"')}${esc(db().connected.email)}</span><span class="muted" style="font-size:14px">Linked</span></div>` : '<a class="set-row" href="#link-email">Link email</a>'}`,
  });
  ACT.toggleGoogle = () => { db().connected.google = !db().connected.google; GT.save(); rerender(); };
  S['link-email'] = () => ({
    html: `<div class="fill">${header({ title: 'Link email', fallback: '#connected' })}
      <div class="form"><input class="field" id="le-email" type="email" placeholder="Enter email"><div class="pw-wrap"><input class="field" id="le-pw" type="password" placeholder="Enter password"></div><div class="err" id="le-err"></div></div>
      <div style="flex:1"></div><div class="bottom-bar"><button class="btn btn-grad" data-act="linkEmail">Save</button></div></div>`,
  });
  ACT.linkEmail = () => {
    const em = $('#le-email').value.trim(); const pw = $('#le-pw').value;
    if (!/^\S+@\S+\.\S+$/.test(em)) { $('#le-err').textContent = 'Enter a valid email address.'; return; }
    if (pw.length < 8) { $('#le-err').textContent = 'Password need to be at least 8 characters'; return; }
    db().connected.email = em; GT.save(); back('#connected'); toast('Email linked');
  };
  ACT.signOut = () => dialog({ title: 'Sign out?', text: 'You can sign back in any time.', ok: 'Sign out', onOk: () => { db().signedIn = false; GT.save(); go('#signin', true); } });
  ACT.deleteAccount = () => dialog({ title: 'Are you sure?', text: 'Do you want to delete your account? This process cannot be undone.', ok: 'Delete', danger: true, onOk: () => { GT.reset(); go('#splash', true); toast('Account deleted (demo data reset)'); } });
  ACT.resetDemo = () => dialog({ title: 'Reset demo data?', text: 'All events, chats and changes you made will go back to the original demo content.', ok: 'Reset', danger: true, onOk: () => { GT.reset(); GT.db.signedIn = true; GT.db.onboarded = true; GT.save(); go('#home', true); APP.render(); toast('Demo data reset'); } });
})();
