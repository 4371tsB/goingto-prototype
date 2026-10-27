/* Screens: friends, add friend, requests, suggestions, user detail, tags, QR */
(function () {
  const { $, $$, esc, fmt, av, stack, empty, toast, sheet, actions, dialog, menu, closeOverlays, pickFriends, qrSvg, S, ACT, go, back, rerender, header, IC, moreIc, liveSearch } = APP;
  const db = () => GT.db;
  const TAG_COLORS = ['#dcebc0', '#f7edd4', '#d4e6f7', '#e6dcfa', '#f8d6d6', '#d4f1ec', '#fde3f1'];
  const chev = IC.chev.replace('<svg', '<svg style="width:12px;height:12px;fill:#999"');

  // ======================= Friends list =======================
  let friendQ = ''; let friendTag = null; let tagsOpen = false;
  S.friends = () => {
    const pending = db().requests.filter((r) => r.status === 'pending').length;
    const sugg = db().suggestions.filter((s) => !GT.isFriend(s.id) && !db().sentRequests.includes(s.id)).length;
    let list = GT.friends().filter((p) => p.name.toLowerCase().includes(friendQ.toLowerCase()));
    if (friendTag) { const t = GT.tag(friendTag); list = list.filter((p) => t && t.members.includes(p.id)); }
    let html = ''; let letter = '';
    list.forEach((p) => {
      const L = p.name[0].toUpperCase(); if (L !== letter) { html += `<div class="alpha">${L}</div>`; letter = L; }
      html += `<div class="list-row"><a href="#user/${p.id}" style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">${av(p, 40)}<span class="name">${esc(p.name)}</span></a>
        <a class="act" href="#create-event?with=${p.id}" aria-label="Create 1 on 1 event">${IC.calPlus}</a><button class="act" data-act="dm" data-id="${p.id}" aria-label="Chat">${IC.chat}</button></div>`;
    });
    const tagsShown = tagsOpen ? db().tags : db().tags.slice(0, 3);
    return {
      html: `<header class="hdr shadow"><div class="hdr-row"><button class="icon-btn" data-act="back" aria-label="Back">${IC.back}</button><div class="hdr-title">My friends</div><span class="icon-btn spacer"></span></div>
        <div class="search-row"><label class="search">${IC.search}<input id="fr-q" placeholder="Search" value="${esc(friendQ)}"></label><button class="icon-btn" data-act="friendsPlus" aria-label="Add">${IC.addFriend}</button></div>
        <div style="display:flex;align-items:center;justify-content:space-between"><button class="tags-toggle ${tagsOpen ? 'open' : ''}" data-act="tagsOpen">Tags ${IC.caret}</button>${friendTag ? '<button class="text-link" data-act="clearTag" style="font-size:14px">Clear filter</button>' : ''}</div>
        <div class="tag-chips${tagsOpen ? ' wrap' : ''}">${tagsShown.map((t) => `<button class="chip ${friendTag === t.id ? 'sel' : ''}" style="background:${t.color}" data-act="filterTag" data-id="${t.id}">${esc(t.name)} (${t.members.length})</button>`).join('')}</div>
        ${tagsOpen ? '<a class="text-link" href="#tags" style="display:block;margin-top:10px;font-size:15px">Manage tags</a>' : ''}</header>
        ${pending ? `<a class="special-row" href="#requests"><span class="sq-ic">${IC.addFriend}</span><span class="name">Friend requests</span><span class="unread">${pending}</span></a>` : ''}
        ${sugg ? `<a class="special-row" href="#suggestions"><span class="sq-ic">${IC.friends}</span><span class="name">Friend suggestions</span><span class="unread">${sugg}</span></a>` : ''}
        ${html || (friendQ || friendTag ? '<div class="empty">No friends found.</div>' : empty(['assets/illus/empty-ideas-boy.png'], 'Add friends to start making plans together!', '<a class="btn btn-grad" href="#add-friend">Add friend</a>'))}<div style="height:30px"></div>`,
      mount(el) { liveSearch(el, 'fr-q', (v) => { friendQ = v; }); },
    };
  };
  ACT.tagsOpen = () => { tagsOpen = !tagsOpen; rerender(); };
  ACT.filterTag = (el) => { friendTag = friendTag === el.dataset.id ? null : el.dataset.id; rerender(); };
  ACT.clearTag = () => { friendTag = null; rerender(); };
  ACT.dm = (el) => go('#chat/' + GT.dmChat(el.dataset.id).id);
  ACT.friendsPlus = (el) => menu(el, [
    { icon: 'addFriend', label: 'Add friend', run: () => go('#add-friend') },
    { icon: 'qr', label: 'Scan QR code', run: () => go('#scan') },
  ]);

  // ======================= Add friends =======================
  let addQ = ''; let addLoc = 'All';
  const REASONS = { u26: '3 mutual friends', u27: 'From Checkers Club', u29: '3 mutual friends', u30: 'From Checkers Club', u32: 'Live in Bothell, Washington', u33: 'Live in Bothell, Washington', u28: 'From Checkers Club', u3: '2 mutual friends', u34: 'From Checkers Club' };
  function reqState(p, full) {
    const inc = db().requests.find((r) => r.from === p.id && r.status === 'pending');
    if (GT.isFriend(p.id)) return `<a class="btn btn-gray" href="#user/${p.id}">Friends</a>`;
    if (inc) return `<a class="btn btn-gray" href="#requests">Respond</a>`;
    if (db().sentRequests.includes(p.id)) return '<button class="btn btn-gray" disabled>Requested</button>';
    return `<a class="btn btn-grad" href="#add-friend-form/${p.id}">Add</a>`;
  }
  function personCard(p, reason) {
    const why = reason || REASONS[p.id] || `${GT.mutualFriends(p.id).length} mutual friends`;
    const ic = /mutual/.test(why) ? stack(['u5', 'u20', 'u21'], 3, 16) : /Club/.test(why) ? IC.group : IC.pin;
    return `<div class="person-card"><a href="#user/${p.id}">${av(p, 60)}</a><div class="mid"><a class="nm" href="#user/${p.id}">${esc(p.name)}</a><div class="why">${ic}<span>${esc(why)}</span></div>${reqState(p)}</div></div>`;
  }
  S['add-friend'] = () => {
    const non = db().people.filter((p) => p.id !== db().me && !GT.isFriend(p.id) && !db().blocked.includes(p.id));
    let results = addQ ? non.filter((p) => (p.name + ' ' + p.first.toLowerCase() + '@mail.com').toLowerCase().includes(addQ.toLowerCase())) : [];
    if (addLoc !== 'All') results = results.filter((p) => (REASONS[p.id] || '').includes(addLoc));
    const known = db().suggestions.map((s) => GT.person(s.id)).filter((p) => !GT.isFriend(p.id)).slice(0, 3);
    return {
      html: `${header({ title: 'Add friends', shadow: true })}
        <div class="pad"><div class="search-row"><label class="search">${IC.search}<input id="af-q" placeholder="Enter names or emails" value="${esc(addQ)}"></label></div>
        ${addQ ? `<button class="chip outline" data-act="addLoc" style="margin-bottom:6px">Location: ${esc(addLoc)} ${IC.caret.replace('<svg', '<svg style="width:10px;height:10px;fill:#555"')}</button>` : ''}</div>
        ${addQ ? (results.map((p) => personCard(p)).join('') || `<div class="empty">No one found for “${esc(addQ)}”.<br><button class="btn btn-grad" data-act="inviteLink">Send an invite link</button></div>`)
          : `<div class="section-label" style="margin:16px 20px 4px;font-size:20px">People you might know</div>${known.map((p) => personCard(p, (db().suggestions.find((s) => s.id === p.id) || {}).reason)).join('')}
             <div class="pad" style="display:flex;gap:10px;margin-top:18px"><a class="btn btn-gray" style="flex:1;font-size:15px;height:42px" href="#qr">My QR code</a><button class="btn btn-gray" style="flex:1;font-size:15px;height:42px" data-act="inviteLink">Invite link</button></div>`}
        <div style="height:30px"></div>`,
      mount(el) { liveSearch(el, 'af-q', (v) => { addQ = v; }); },
    };
  };
  ACT.addLoc = () => actions(['All', 'Bothell', 'Club', 'mutual'].map((l) => ({ icon: 'pin', label: l === 'Club' ? 'From my clubs' : l === 'mutual' ? 'Mutual friends' : l === 'All' ? 'Anywhere' : `Live in ${l}`, run: () => { addLoc = l; rerender(); } })));
  ACT.inviteLink = () => { try { navigator.clipboard.writeText('https://goingto.app/invite/minnie'); } catch (e) { /* ignore */ } toast('Invite link copied'); };

  // Figma Addfriend-05/06: greeting + memo (tags, notes) → Send request
  const greet = {};
  S['add-friend-form'] = ([id]) => {
    const p = GT.person(id);
    if (!greet[id]) greet[id] = { text: `I am ${GT.me().first}...`, tags: [], note: '' };
    const g = greet[id];
    return {
      html: `<div class="fill">${header({ title: 'Add friends', fallback: '#add-friend' })}
        <div class="form">
          <div style="display:flex;align-items:center;gap:10px;margin:4px 0">${av(p, 40)}<b style="font-size:17px">${esc(p.name)}</b></div>
          <div class="section-label" style="margin:6px 0 0">Friend request greeting</div>
          <textarea class="field" id="ag-text">${esc(g.text)}</textarea>
          <div class="section-label" style="margin:6px 0 0">Friend memo</div>
          <button type="button" class="panel row-btn" data-act="agTags" data-id="${id}" style="font-size:15px">${IC.tag.replace('<svg', '<svg style="fill:none;stroke:#666"')}<span>${g.tags.length ? g.tags.map((t) => `“${esc(GT.tag(t).name)}”`).join(' ') : 'Assign tags'}</span></button>
          <input class="field" id="ag-note" placeholder="Add notes" value="${esc(g.note)}">
        </div>
        <div style="flex:1"></div>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="agSend" data-id="${id}">Send request</button></div></div>`,
      mount(el) { $('#ag-text', el).oninput = (e) => { g.text = e.target.value; }; $('#ag-note', el).oninput = (e) => { g.note = e.target.value; }; },
    };
  };
  ACT.agTags = (el) => { const g = greet[el.dataset.id]; assignTags(g.tags, (sel) => { g.tags = sel; rerender(); }); };
  ACT.agSend = (el) => {
    const id = el.dataset.id; const g = greet[id];
    if (!db().sentRequests.includes(id)) db().sentRequests.push(id);
    if (g.note) db().notes[id] = g.note;
    db().pendingTags = db().pendingTags || {}; db().pendingTags[id] = g.tags;
    GT.save(); delete greet[id];
    back('#add-friend'); toast(`Friend request sent to ${GT.person(id).name}`);
  };

  // ======================= Friend requests & suggestions =======================
  S.requests = () => {
    const pending = db().requests.filter((r) => r.status === 'pending');
    const card = (r) => { const p = GT.person(r.from); const why = r.reason || REASONS[p.id] || `${GT.mutualFriends(p.id).length} mutual friends`;
      return `<div class="person-card"><a href="#user/${p.id}">${av(p, 50)}</a><div class="mid"><a class="nm" href="#user/${p.id}">${esc(p.name)}</a><div class="why">${/Club/.test(why) ? IC.group : stack(['u5'], 1, 16)}<span>${esc(why)}</span></div>
        <div class="req-btns"><button class="btn btn-gray" data-act="reqNo" data-id="${r.id}">Ignore</button><button class="btn btn-grad" style="flex:1" data-act="reqYes" data-id="${r.id}">Accept</button></div>${r.note ? `<div class="quote">“${esc(r.note)}”</div>` : ''}</div></div>`; };
    return {
      html: `${header({ title: 'Friends requests', shadow: true, fallback: '#friends' })}
        ${pending.length ? pending.map(card).join('') : '<div class="empty" style="padding-top:200px;color:#999">No more friend requests.</div>'}`,
    };
  };
  ACT.reqYes = (el) => {
    const r = db().requests.find((x) => x.id === el.dataset.id); r.status = 'accepted'; if (!GT.isFriend(r.from)) db().friendIds.push(r.from); GT.save(); rerender();
    toast(`You and ${GT.person(r.from).first} are now friends`);
  };
  ACT.reqNo = (el) => { const r = db().requests.find((x) => x.id === el.dataset.id); r.status = 'declined'; GT.save(); rerender(); };
  S.suggestions = () => {
    const list = db().suggestions.filter((s) => !GT.isFriend(s.id));
    return { html: `${header({ title: 'Friends suggestions', shadow: true, fallback: '#friends' })}${list.map((s) => personCard(GT.person(s.id), s.reason)).join('') || '<div class="empty">No suggestions right now.</div>'}` };
  };

  // ======================= QR =======================
  S.qr = () => {
    const me = GT.me();
    return {
      html: `${header({ title: '', fallback: '#account' })}
        <div style="text-align:center;margin-top:-30px"><h3 style="font-size:20px;line-height:1.3;margin:0 0 30px">Scan QR code to<br>add me to your friend list</h3>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px">${av(me, 36)}<span style="font-size:17px">${esc(me.name)}</span></div>
        <div class="qr">${qrSvg(me.id + me.name)}</div></div>
        <div class="qr-actions"><a href="#scan"><span class="ci">${IC.qr}</span>Scan QR code</a><button data-act="inviteLink"><span class="ci">${IC.shareOut}</span>Share QR code</button></div>`,
    };
  };
  // Figma qrcode-01: camera "Focus on your friend's QR code"
  S.scan = () => ({
    fullBleed: true, light: true,
    html: `<div class="camera" style="background-image:url('assets/photo/camera.jpg')">
      <div class="top"><button class="icon-btn" data-act="back" data-fallback="#home" aria-label="Back">${IC.back}</button>Focus on your<br>friend’s QR code</div>
      <div class="frame" data-act="simScan"><i></i><i></i><i></i><i></i></div>
      <div class="bottom"><a href="#qr"><span class="ci">${IC.qr}</span>My QR Code</a></div>
      <p style="position:absolute;bottom:150px;left:0;right:0;text-align:center;color:#fff;font-size:13px;opacity:.85">Tap the frame to simulate a scan</p></div>`,
  });
  ACT.simScan = () => { go('#user/u26', true); setTimeout(() => toast('Found Michael Miller'), 60); };

  // ======================= User detail =======================
  const userTab = {};
  S.user = ([id]) => {
    if (id === db().me) return { redirect: '#account' };
    const p = GT.person(id); const friend = GT.isFriend(id); const blocked = db().blocked.includes(id);
    const inc = db().requests.find((r) => r.from === id && r.status === 'pending');
    const sent = db().sentRequests.includes(id);
    const hdr = header({ title: 'User detail', fallback: '#friends', right: `<button class="icon-btn" data-act="userMenu" data-id="${id}" aria-label="More">${moreIc}</button>` });
    if (friend) {
      // Figma user-detail-04..07: tags, notes, Events | Free Time
      const tab = userTab[id] || 'events';
      const tags = GT.tagsFor(id); const note = db().notes[id];
      const evs = db().events.filter((e) => (e.owner === id || e.attendees.includes(id)) && e.audience.type !== 'me');
      const fts = db().freetimes.filter((f) => f.by === id);
      return {
        gray: false,
        html: `${hdr}<div class="pad">
          <div style="display:flex;align-items:center;gap:14px;margin:6px 0 8px">${av(p, 60)}<span style="font-size:22px;flex:1">${esc(p.name)}</span>
            <a class="icon-btn" href="#create-event?with=${id}" aria-label="Create event">${IC.calPlus.replace('<svg', '<svg style="stroke:var(--blue)"')}</a><button class="icon-btn" data-act="dm" data-id="${id}" aria-label="Chat">${IC.chat.replace('<svg', '<svg style="stroke:var(--blue)"')}</button></div>
          ${note ? `<button data-act="editNote" data-id="${id}" style="font-size:14px;text-align:left;display:flex;gap:6px;align-items:center;margin-bottom:8px">${esc(note)} ${IC.edit.replace('<svg', '<svg style="width:16px;height:16px;stroke:var(--blue)"')}</button>` : `<button class="text-link" data-act="editNote" data-id="${id}" style="display:flex;gap:6px;align-items:center;font-size:15px;margin-bottom:6px">${IC.edit.replace('<svg', '<svg style="width:16px;height:16px;stroke:var(--blue)"')} Add notes</button>`}
          ${tags.length ? `<button class="tag-chips wrap" data-act="userTags" data-id="${id}" style="margin-bottom:10px">${tags.map((t) => `<span class="chip" style="background:${t.color}">${esc(t.name)}</span>`).join('')}</button>` : `<button class="text-link" data-act="userTags" data-id="${id}" style="display:flex;gap:6px;align-items:center;font-size:15px;margin-bottom:10px">${IC.tag.replace('<svg', '<svg style="width:16px;height:16px;stroke:var(--blue)"')} Assign tags</button>`}
        </div>
        <div class="folder-tabs"><button class="${tab === 'events' ? 'on' : ''}" data-act="userTab" data-id="${id}" data-t="events">Events</button><button class="${tab === 'ft' ? 'on' : ''}" data-act="userTab" data-id="${id}" data-t="ft">Free Time</button></div>
        <div style="background:var(--canvas);min-height:520px"><div class="pad">${APP.monthHeader('user-' + id)}</div><div class="ev-list">
          ${tab === 'events' ? APP.monthList(evs, 'user-' + id, { emptyHtml: `<div class="empty">No shared events this month.</div>` }) : APP.ftList(fts, 'user-' + id, '<div class="empty">No free time shared this month.</div>')}</div></div>`,
      };
    }
    let action;
    if (blocked) action = `<button class="btn btn-gray" data-act="unblock" data-id="${id}">Unblock user</button>`;
    else if (inc) action = `<button class="btn btn-grad" data-act="reqYes" data-id="${inc.id}">Accept Friend Request</button>`;
    else if (sent) action = `<button class="btn btn-gray" data-act="cancelReq" data-id="${id}">Cancel Friend Request</button>`;
    else action = `<a class="btn btn-grad" href="#add-friend-form/${id}">Add Friend</a>`;
    const mf = GT.mutualFriends(id); const mc = GT.mutualClubs(id);
    return {
      html: `<div class="fill">${hdr}
        <div class="pad">
          <div style="display:flex;align-items:center;gap:16px;margin:10px 0">${av(p, 60)}<span style="font-size:24px">${esc(p.name)}</span></div>
          <div class="divider"></div>
          <div class="section-label" style="margin-top:0">Mutual friends</div>
          <div class="people-grid">${mf.map((m) => `<a class="person" href="#user/${m.id}">${av(m, 50)}<span>${esc(m.first)}</span></a>`).join('')}</div>
          <div class="divider"></div>
          <div class="section-label" style="margin-top:0">Mutual Clubs</div>
          ${mc.map((c) => `<a class="club-row" href="#club/${c.id}">${av(c, 50, { sq: true })}<span>${esc(c.name)}</span></a>`).join('') || '<p class="muted">No clubs in common.</p>'}
        </div>
        <div style="flex:1;min-height:40px"></div>
        <div class="bottom-bar">${action}</div></div>`,
    };
  };
  ACT.userTab = (el) => { userTab[el.dataset.id] = el.dataset.t; rerender(); };
  ACT.cancelReq = (el) => { db().sentRequests = db().sentRequests.filter((x) => x !== el.dataset.id); GT.save(); rerender(); toast('Friend request cancelled'); };
  ACT.unblock = (el) => { db().blocked = db().blocked.filter((x) => x !== el.dataset.id); GT.save(); rerender(); toast('User unblocked'); };
  // Figma user-detail-07/08: Block / Report, or Delete friend / Block and delete / Report
  ACT.userMenu = (el) => {
    const id = el.dataset.id; const p = GT.person(id);
    const report = { icon: 'report', label: 'Report user', run: () => toast('Thanks — our team will review this account') };
    const removeFriend = () => { db().friendIds = db().friendIds.filter((x) => x !== id); db().tags.forEach((t) => { t.members = t.members.filter((m) => m !== id); }); };
    if (db().blocked.includes(id)) return actions([{ icon: 'personCheck', label: 'Unblock user', run: () => ACT.unblock({ dataset: { id } }) }, report]);
    if (GT.isFriend(id)) return actions([
      { icon: 'card', label: 'Share contact card', run: () => pickFriends({ title: `Send ${p.first}’s card to`, cta: 'Send', exclude: [id], done: ({ friends }) => { friends.forEach((f) => GT.dmChat(f).messages.push({ by: db().me, card: id, text: '', at: new Date().toISOString() })); GT.save(); if (friends.length) toast('Contact card sent'); } }) },
      { icon: 'personX', label: 'Delete friend', run: () => dialog({ title: 'Are you sure?', text: 'Do you want to delete this friend? This process cannot be undone.', ok: 'Delete', danger: true, onOk: () => { removeFriend(); GT.save(); rerender(); toast('Friend deleted'); } }) },
      { icon: 'lock', label: 'Block and delete', danger: true, run: () => dialog({ title: `Block ${p.name}?`, text: 'They won’t be able to see your events or message you.', ok: 'Block', danger: true, onOk: () => { removeFriend(); db().blocked.push(id); GT.save(); rerender(); toast('User blocked'); } }) },
      report,
    ]);
    actions([{ icon: 'lock', label: 'Block user', danger: true, run: () => { db().blocked.push(id); GT.save(); rerender(); toast('User blocked'); } }, report]);
  };
  ACT.editNote = (el) => {
    const id = el.dataset.id;
    const s = sheet({ title: db().notes[id] ? 'Edit notes for your friend' : 'Add notes for your friend', body: `<input class="field" id="nt-v" value="${esc(db().notes[id] || '')}" placeholder="e.g. Met in park, dog name is Cookie">`, foot: '<button class="btn btn-grad" id="nt-ok">Save</button>' });
    setTimeout(() => $('#nt-v', s).focus(), 250);
    $('#nt-ok', s).onclick = () => { const v = $('#nt-v', s).value.trim(); if (v) db().notes[id] = v; else delete db().notes[id]; GT.save(); closeOverlays(); rerender(); };
  };
  // Figma user-detail-10/11: assign tags sheet with chip grid + "Add new tags"
  function assignTags(selected, done) {
    const sel = new Set(selected); let q = ''; let adding = false;
    const draw = (el) => {
      const list = db().tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
      $('.at-body', el).innerHTML = `<div class="tags-toggle" style="font-size:16px">Tags</div><div class="tag-chips wrap">${list.map((t) => `<button class="chip ${sel.has(t.id) ? '' : 'outline'}" style="background:${t.color}" data-t="${t.id}">${esc(t.name)}</button>`).join('')}
        ${adding ? '<input class="field" id="at-new" placeholder="New tag" style="width:130px;height:32px;font-size:14px">' : '<button class="text-link" id="at-add" style="font-size:14px">+ Add new tags</button>'}</div>`;
      $$('[data-t]', el).forEach((b) => { b.onclick = () => { sel.has(b.dataset.t) ? sel.delete(b.dataset.t) : sel.add(b.dataset.t); draw(el); }; });
      const add = $('#at-add', el); if (add) add.onclick = () => { adding = true; draw(el); $('#at-new', el).focus(); };
      const n = $('#at-new', el); if (n) n.onkeydown = (e) => { if (e.key === 'Enter' && n.value.trim()) { const t = { id: GT.uid('t'), name: n.value.trim(), color: TAG_COLORS[db().tags.length % TAG_COLORS.length], members: [] }; db().tags.push(t); sel.add(t.id); adding = false; draw(el); } };
    };
    const el = sheet({ title: 'Assign tags', body: `<div class="search" style="margin-bottom:10px">${IC.search}<input placeholder="Search" id="at-q"></div><div class="at-body"></div>`, foot: '<button class="btn btn-grad" id="at-save">Save</button>' });
    draw(el);
    $('#at-q', el).oninput = (e) => { q = e.target.value; draw(el); };
    $('#at-save', el).onclick = () => { const n = $('#at-new', el); if (n && n.value.trim()) { const t = { id: GT.uid('t'), name: n.value.trim(), color: TAG_COLORS[db().tags.length % TAG_COLORS.length], members: [] }; db().tags.push(t); sel.add(t.id); } closeOverlays(); done([...sel]); };
  }
  ACT.userTags = (el) => {
    const id = el.dataset.id;
    assignTags(GT.tagsFor(id).map((t) => t.id), (sel) => {
      db().tags.forEach((t) => { const has = t.members.includes(id); if (sel.includes(t.id) && !has) t.members.push(id); if (!sel.includes(t.id) && has) t.members = t.members.filter((m) => m !== id); });
      GT.save(); rerender(); toast('Tags updated');
    });
  };
  APP.assignTags = assignTags;

  // ======================= Tags (Figma tag-manage / tag-list) =======================
  S.tags = () => {
    const untagged = GT.friends().filter((p) => !GT.tagsFor(p.id).length);
    return {
      html: `${header({ title: 'Tags', shadow: true, fallback: '#friends' })}
        <div class="pad" style="margin-top:10px"><label class="search">${IC.search}<input placeholder="Search" id="tg-q"></label></div>
        <div id="tg-list">${db().tags.map((t) => `<div class="tag-card" data-name="${esc(t.name.toLowerCase())}"><a class="info" href="#tag/${t.id}"><span class="chip" style="background:${t.color}">${esc(t.name)} (${t.members.length})</span><div class="names">${esc(t.members.map((m) => GT.person(m).name).join(', ') || 'No one yet')}</div></a>
          <button class="icon-btn blue" data-act="renameTag" data-id="${t.id}" aria-label="Rename">${IC.edit}</button><button class="icon-btn red" data-act="deleteTag" data-id="${t.id}" aria-label="Delete">${IC.trash}</button></div>`).join('')}</div>
        <button class="text-link" data-act="newTag" style="margin:14px 20px;font-size:15px">+ Add new tags</button>
        <a class="tag-card" href="#tag/untagged"><div class="info"><b>Non-tagged friends (${untagged.length})</b><div class="names">${esc(untagged.map((p) => p.name).join(', '))}</div></div></a>`,
      mount(el) { $('#tg-q', el).oninput = (e) => { const v = e.target.value.toLowerCase(); $$('#tg-list .tag-card', el).forEach((c) => { c.style.display = c.dataset.name.includes(v) ? '' : 'none'; }); }; },
    };
  };
  function tagNameSheet({ title, name = '', onOk }) {
    const s = sheet({ title, body: `<div class="field-wrap"><input class="field" id="tn-v" value="${esc(name)}" placeholder="Tag name" maxlength="24"><button class="bad" id="tn-clear" style="background:#bbb" aria-label="Clear">×</button></div>`, foot: '<button class="btn btn-grad" id="tn-ok">Save</button>' });
    setTimeout(() => $('#tn-v', s).focus(), 250);
    $('#tn-clear', s).onclick = () => { $('#tn-v', s).value = ''; $('#tn-v', s).focus(); };
    $('#tn-ok', s).onclick = () => { const v = $('#tn-v', s).value.trim(); if (!v) return; closeOverlays(); onOk(v); };
  }
  ACT.renameTag = (el) => { const t = GT.tag(el.dataset.id); tagNameSheet({ title: 'Change tag name', name: t.name, onOk: (v) => { t.name = v; GT.save(); rerender(); toast('Tag renamed'); } }); };
  ACT.deleteTag = (el) => { const t = GT.tag(el.dataset.id); dialog({ title: 'Are you sure?', text: `Do you want to delete “${t.name}”? This process cannot be undone.`, ok: 'Delete', danger: true, onOk: () => { db().tags = db().tags.filter((x) => x !== t); GT.save(); if (location.hash.startsWith('#tag/')) go('#tags', true); else rerender(); toast('Tag deleted'); } }); };
  ACT.newTag = () => tagNameSheet({ title: 'New tag', onOk: (v) => { const t = { id: GT.uid('t'), name: v, color: TAG_COLORS[db().tags.length % TAG_COLORS.length], members: [] }; db().tags.push(t); GT.save(); go('#tag/' + t.id + '?mode=add'); } });

  // Tag detail: list (Add / Remove), remove mode, add mode
  const tagSel = {};
  S.tag = ([id], q) => {
    const untagged = id === 'untagged';
    const t = untagged ? { id, name: 'Non-tagged friends', members: GT.friends().filter((p) => !GT.tagsFor(p.id).length).map((p) => p.id) } : GT.tag(id);
    if (!t) return { redirect: '#tags' };
    const mode = untagged ? 'view' : q.mode || 'view';
    const key = id + mode; if (!tagSel[key] || q.fresh) tagSel[key] = new Set();
    const sel = tagSel[key];
    const pool = mode === 'add' ? GT.friends() : t.members.map((m) => GT.person(m)).sort((a, b) => a.name.localeCompare(b.name));
    let html = ''; let L = '';
    pool.forEach((p) => {
      const l = p.name[0].toUpperCase(); if (l !== L) { html += `<div class="alpha">${l}</div>`; L = l; }
      if (mode === 'view') html += `<a class="list-row" href="#user/${p.id}">${av(p, 36)}<span class="name">${esc(p.name)}</span></a>`;
      else {
        const locked = mode === 'add' && t.members.includes(p.id);
        html += `<button class="list-row${locked ? ' dim' : ''}" data-act="tagPick" data-k="${key}" data-id="${p.id}" ${locked ? 'disabled' : ''}><input type="checkbox" class="chk" ${sel.has(p.id) || locked ? 'checked' : ''} tabindex="-1">${av(p, 36)}<span class="name">${esc(p.name)}</span></button>`;
      }
    });
    const bar = mode === 'view'
      ? (untagged ? '' : `<div class="mode-bar"><a class="text-link" href="#tag/${id}?mode=add&fresh=1">Add</a><a class="text-link" style="color:var(--danger)" href="#tag/${id}?mode=remove&fresh=1">Remove</a></div>`)
      : `<div class="mode-bar"><a class="text-link" href="#tag/${id}" style="color:#666">Cancel</a><button class="btn ${mode === 'remove' ? '' : 'btn-grad'}" style="${mode === 'remove' ? 'background:var(--danger);color:#fff' : ''}" data-act="tagApply" data-id="${id}" data-mode="${mode}" ${sel.size ? '' : 'disabled'}>${mode === 'remove' ? 'Remove' : 'Add'}${sel.size ? ` (${sel.size})` : ''}</button></div>`;
    return {
      html: `<div class="fill">${header({ title: `${t.name} (${t.members.length})`, shadow: true, fallback: '#tags', right: untagged ? '' : `<button class="icon-btn" data-act="tagMenu" data-id="${id}" aria-label="More">${moreIc}</button>` })}
        <div class="pad" style="margin-top:10px"><label class="search">${IC.search}<input placeholder="Search" id="td-q"></label></div>
        <div id="td-list" style="flex:1">${html || '<div class="empty">No one in this tag yet. Tap Add.</div>'}</div>${bar}</div>`,
      mount(el) { $('#td-q', el).oninput = (e) => { const v = e.target.value.toLowerCase(); $$('#td-list .list-row', el).forEach((r) => { r.style.display = r.textContent.toLowerCase().includes(v) ? '' : 'none'; }); }; },
    };
  };
  ACT.tagPick = (el) => {
    const s = tagSel[el.dataset.k]; s.has(el.dataset.id) ? s.delete(el.dataset.id) : s.add(el.dataset.id);
    el.querySelector('.chk').checked = s.has(el.dataset.id);
    const b = $('[data-act="tagApply"]'); b.disabled = !s.size;
    b.textContent = `${b.dataset.mode === 'remove' ? 'Remove' : 'Add'}${s.size ? ` (${s.size})` : ''}`;
  };
  ACT.tagApply = (el) => {
    const t = GT.tag(el.dataset.id); const sel = tagSel[el.dataset.id + el.dataset.mode];
    if (el.dataset.mode === 'add') t.members.push(...[...sel].filter((x) => !t.members.includes(x)));
    else t.members = t.members.filter((m) => !sel.has(m));
    GT.save(); go('#tag/' + t.id, true); toast(el.dataset.mode === 'add' ? `Added ${sel.size} to ${t.name}` : `Removed ${sel.size} from ${t.name}`);
  };
  ACT.tagMenu = (el) => actions([
    { icon: 'edit', label: 'Change tag name', run: () => ACT.renameTag(el) },
    { icon: 'createEvent', label: 'Create event for this tag', run: () => go('#create-event?tag=' + el.dataset.id) },
    { icon: 'trash', label: 'Delete tag', danger: true, run: () => ACT.deleteTag(el) },
  ]);
})();
