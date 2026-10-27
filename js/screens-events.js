/* Screens: calendar (Events | Free Time), event detail, create/edit event, time finder, free time, shared-to list */
(function () {
  const { $, $$, esc, fmt, av, avStyle, stack, empty, toast, sheet, actions, dialog, closeOverlays, pickFriends, audienceLabel, forwardEvent, S, ACT, go, back, rerender, header, IC, mutedIc, moreIc, toggleMute } = APP;
  const db = () => GT.db;
  const caret = IC.caret.replace('<svg', '<svg class="chev"');

  // ======================= Calendar =======================
  const now = new Date();
  const months = {};
  function monthState(key) { if (!months[key]) months[key] = { y: now.getFullYear(), m: now.getMonth() }; return months[key]; }
  let calTab = 'events';

  function evCard(e, onWhite) {
    const st = GT.eventStatus(e);
    const past = e.end && new Date(e.end) < new Date();
    const label = { going: 'GOING', full: 'FULL', cancelled: 'CANCELLED', mine: 'MINE', pending: 'SUGGEST TIME' }[st];
    const club = e.club && GT.club(e.club);
    return `<a class="ev-card${onWhite ? ' on-white' : ''}${past ? ' past' : ''}" href="#event/${e.id}">
      ${label ? `<span class="badge ${st}">${label}</span>` : ''}
      ${avStyle(e.art, 60)}
      <div class="body"><h4${st === 'cancelled' ? ' style="text-decoration:line-through;color:#888"' : ''}>${esc(e.title)}</h4>
        <div class="meta">${IC.clock}<span>${fmt.cardRange(e)}</span></div>
        <div class="meta">${IC.pin}<span>${esc(e.place)}${e.address ? ', ' + esc(e.address) : ''}</span></div>
        ${club ? `<div class="meta">${IC.group}<span>${esc(club.name)}</span></div>` : e.owner !== db().me ? `<div class="meta">${IC.bulbFill}<span>Created by ${esc(GT.person(e.owner).name)}</span></div>` : ''}
      </div></a>`;
  }
  // Pending (time finder) events sit on their first candidate day
  const sortKey = (e) => e.start || (e.tf && e.tf.days[0]);
  function monthList(list, key, { onWhite = false, emptyHtml = '' } = {}) {
    const ms = monthState(key);
    const inMonth = list.filter((e) => { const d = new Date(sortKey(e)); return d.getFullYear() === ms.y && d.getMonth() === ms.m; })
      .sort((a, b) => new Date(sortKey(a)) - new Date(sortKey(b)));
    let html = ''; let lastDay = ''; let todayShown = false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    inMonth.forEach((e) => {
      if (!todayShown && new Date(sortKey(e)) >= today && inMonth.some((x) => new Date(sortKey(x)) < today)) { html += '<div class="today-line">Today</div>'; todayShown = true; }
      const d = fmt.day(sortKey(e)); if (d !== lastDay) { html += `<div class="day-label">${d}</div>`; lastDay = d; }
      html += evCard(e, onWhite);
    });
    return html || emptyHtml;
  }
  function monthHeader(key) {
    const ms = monthState(key);
    return `<div class="month-hdr"><button class="icon-btn" data-act="month" data-key="${key}" data-d="-1" aria-label="Previous month">${IC.back}</button>
      <button class="month-btn" data-act="pickMonth" data-key="${key}">${fmt.month(ms.y, ms.m)} ${IC.caret}</button>
      <button class="icon-btn" data-act="month" data-key="${key}" data-d="1" aria-label="Next month">${IC.next}</button></div>`;
  }
  ACT.month = (el) => { const ms = monthState(el.dataset.key); ms.m += +el.dataset.d; if (ms.m < 0) { ms.m = 11; ms.y--; } if (ms.m > 11) { ms.m = 0; ms.y++; } rerender(); };
  ACT.pickMonth = (el) => {
    const ms = monthState(el.dataset.key);
    let y = ms.y;
    const s = sheet({
      title: 'Jump to month',
      body: `<div style="display:flex;justify-content:center;align-items:center;gap:20px;margin-bottom:12px"><button class="icon-btn" id="pm-prev">${IC.back}</button><b id="pm-y" style="font-size:18px">${y}</b><button class="icon-btn" id="pm-next">${IC.next}</button></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${fmt.MONTHS.map((m, i) => `<button class="btn ${i === ms.m ? 'btn-grad' : 'btn-gray'}" style="height:44px;font-size:16px" data-m="${i}">${m}</button>`).join('')}</div>
        <button class="text-link" id="pm-today" style="display:block;margin:16px auto 0">Today</button>`,
    });
    $('#pm-prev', s).onclick = () => { y--; $('#pm-y', s).textContent = y; };
    $('#pm-next', s).onclick = () => { y++; $('#pm-y', s).textContent = y; };
    $('#pm-today', s).onclick = () => { ms.y = now.getFullYear(); ms.m = now.getMonth(); closeOverlays(); rerender(); };
    $$('[data-m]', s).forEach((b) => { b.onclick = () => { ms.y = y; ms.m = +b.dataset.m; closeOverlays(); rerender(); }; });
  };
  const visibleToMe = (e) => e.owner === db().me || e.attendees.includes(db().me) || e.audience.type !== 'me';

  function ftList(list, key, emptyHtml) {
    const ms = monthState(key);
    const inMonth = list.filter((f) => { const d = new Date(f.start); return d.getFullYear() === ms.y && d.getMonth() === ms.m && new Date(f.end) > new Date(Date.now() - 864e5); })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    let html = ''; let last = '';
    inMonth.forEach((f) => {
      const d = fmt.day(f.start); if (d !== last) { html += `<div class="day-label">${d}</div>`; last = d; }
      const p = GT.person(f.by);
      html += `<button class="ft-card" data-act="openFreetime" data-id="${f.id}"><div class="body"><b>${fmt.time(f.start)} - ${fmt.time(f.end)}</b>${f.note ? `<div class="note">${esc(f.note)}</div>` : ''}</div>${av(p, 40)}</button>`;
    });
    return html || emptyHtml;
  }

  S.events = (a, q) => {
    if (q.tab) calTab = q.tab;
    if (q.day) { const d = new Date(q.day); monthState('events').y = d.getFullYear(); monthState('events').m = d.getMonth(); }
    const seg = `<div class="seg" style="margin-top:8px"><button class="${calTab === 'events' ? 'on' : ''}" data-act="calTab" data-t="events">Events</button><button class="${calTab === 'ft' ? 'on' : ''}" data-act="calTab" data-t="ft">Free Time</button></div>`;
    const body = calTab === 'events'
      ? monthList(db().events.filter(visibleToMe), 'events', { emptyHtml: empty('assets/illus/empty-events.png', 'Have something you want to do<br>with friends?', '<a class="btn btn-grad" href="#create-event">Create event</a>') })
      : ftList(db().freetimes, 'events', empty('assets/illus/empty-freetime.png', 'Have free time?<br>Let your friends know!', '<a class="btn btn-grad" href="#freetime">Create Free Time</a>'));
    return {
      tab: 'events', gray: true,
      html: `<header class="hdr shadow" style="padding-bottom:0">${seg}${monthHeader('events')}</header><div class="ev-list">${body}</div><div style="height:70px"></div>`,
      fab: `<a class="fab" href="${calTab === 'events' ? '#create-event' : '#freetime'}" aria-label="${calTab === 'events' ? 'Create event' : 'Create free time'}">${IC.plus}</a>`,
      mount() { if (q.day) { const t = [...document.querySelectorAll('.day-label')].find((x) => x.textContent === fmt.day(q.day)); if (t) t.scrollIntoView(); } },
    };
  };
  ACT.calTab = (el) => { calTab = el.dataset.t; go('#events', true); rerender(); };

  // ======================= Event detail =======================
  const evTab = {};
  function locationRow(e) {
    const icon = e.virtual ? IC.video.replace('<svg', '<svg style="fill:none;stroke:#555"') : IC.pin;
    return `<button class="ed-row" data-act="locSheet" data-id="${e.id}">${icon}<div><b>${esc(e.place)}</b>${e.address ? ', ' + esc(e.address) : ''}</div></button>`;
  }
  S.event = ([id], q) => {
    const e = GT.event(id); if (!e) return { redirect: '#events' };
    const me = db().me; const st = GT.eventStatus(e); const mine = e.owner === me; const going = e.attendees.includes(me);
    const past = e.end && new Date(e.end) < new Date();
    if (q.tab) evTab[id] = q.tab;
    const tab = evTab[id] || 'details';
    const hdr = header({ title: e.title, fallback: '#events', titleExtra: mutedIc(id), right: `<button class="icon-btn" data-act="eventMenu" data-id="${id}" aria-label="More">${moreIc}</button>` });
    const pending = st === 'pending';
    const seg = pending ? '' : `<div class="pad" style="margin:4px 0 6px"><div class="seg"><button class="${tab === 'details' ? 'on' : ''}" data-act="evTab" data-id="${id}" data-t="details">Event details</button><button class="${tab === 'chat' ? 'on' : ''}" data-act="evTab" data-id="${id}" data-t="chat">Chat</button></div></div>`;
    if (tab === 'chat' && !pending) {
      const c = GT.refChat('event', id);
      return { html: hdr + seg + APP.chatView(c, { embedded: true }), mount: (el) => APP.mountChat(el, c) };
    }
    const imgs = e.images && e.images.length ? `<div class="section-label" style="margin-top:0">Images</div><div class="img-row">${e.images.map((b) => `<img src="${b}" alt="">`).join('')}</div>` : '';
    const descHtml = e.desc ? `<div class="section-label" style="margin-top:0">Description</div><div class="desc">${esc(e.desc)}</div><div class="divider"></div>` : '';

    // ---- Time finder: event still collecting availability (Figma "Time finder" frames)
    if (pending) {
      const markers = Object.keys(e.tf.marks);
      const iMarked = !!e.tf.marks[me];
      const box = mine
        ? `<a class="btn btn-outline" href="#availability?mode=mark&id=${id}">Edit your available time</a><a class="btn btn-grad" href="#availability?mode=final&id=${id}">Set a final time</a>`
        : iMarked ? `<div class="row" style="margin:6px 0 0">${IC.check.replace('<svg', '<svg style="width:18px;height:18px;stroke:var(--going)"')} You marked availability</div><a class="btn btn-outline" href="#availability?mode=mark&id=${id}">Edit your available time</a>`
        : `<a class="btn btn-outline" href="#availability?mode=mark&id=${id}">Mark your available time</a>`;
      return {
        html: `${hdr}<div class="pad">
          <div class="tf-box"><div class="row">${IC.clock.replace('<svg', '<svg style="width:18px;height:18px;fill:#555"')}${stack(markers, 7, 26)}<span>${markers.length} marked availability</span></div>${box}</div>
          ${locationRow(e)}<div class="divider"></div>${descHtml}${imgs}</div>
          ${mine ? `<div class="bottom-bar"><a class="btn btn-outline" href="#create-event?edit=${id}">Edit</a></div>` : '<div style="height:40px"></div>'}`,
      };
    }

    const timeHtml = fmt.sameDay(e.start, e.end)
      ? `<b>${fmt.dayNoPad(e.start)}</b> ${fmt.time(e.start)} - ${fmt.isEOD(e.end) ? 'EOD' : fmt.time(e.end)}`
      : `<b>${fmt.dayNoPad(e.start)}</b> ${fmt.time(e.start)} -<br><b>${fmt.dayNoPad(e.end)}</b> ${fmt.time(e.end)}`;
    const people = e.attendees.map((pid) => {
      const p = GT.person(pid);
      return `<a class="person" href="#${pid === me ? 'account' : 'user/' + pid}">${av(p, 50, { host: pid === e.owner })}<span>${esc(pid === me ? 'You' : p.first)}</span></a>`;
    }).join('');
    const club = e.club && GT.club(e.club);
    // Who it's shared to (owner always sees; others only when "share info visible")
    let shareRow = '';
    if (mine || e.visibleShare) {
      const label = club && e.audience.type === 'me' ? `to ${club.name}` : club ? `${audienceLabel(e.audience)} and ${club.name}` : audienceLabel(e.audience);
      const canView = e.audience.type === 'custom' || club;
      shareRow = `<div class="forward-row" style="margin-bottom:12px">${IC.people}<div>${esc(label.charAt(0).toUpperCase() + label.slice(1))}${mine ? `<div class="sub">This selection is ${e.visibleShare ? 'visible to selected friends' : 'only visible to you'}.</div>` : ''}</div>${canView ? `<a class="text-link" href="#shared-to/${id}" style="margin-left:auto">View</a>` : ''}</div>`;
    }
    let fwdRow = '';
    if (e.forwardedBy && !mine) fwdRow += `<div class="forward-row" style="font-weight:400;margin-bottom:10px">${IC.share}${av(GT.person(e.forwardedBy), 20)}<span>${esc(GT.person(e.forwardedBy).first)} forwarded this event to you.</span></div>`;
    if (e.forwardable || mine) {
      fwdRow += e.myForward
        ? `<div class="forward-row">${IC.share}<span>You forwarded this event.</span>${!e.cancelled && !past ? `<button class="text-link" data-act="forwardEv" data-id="${id}">Edit</button>` : ''}</div>`
        : `<div class="forward-row">${IC.share}<span>${e.forwardable ? 'This event is forward-able.' : 'Friends can’t forward this event.'}</span>${!e.cancelled && !past ? `<button class="text-link" data-act="forwardEv" data-id="${id}">${e.forwardable ? 'Forward' : 'Share'}</button>` : ''}</div>`;
    }
    let actionsHtml = '';
    if (!e.cancelled && !past) {
      if (mine) actionsHtml = `<a class="btn btn-outline" href="#create-event?edit=${id}">Edit</a>`;
      else if (going) actionsHtml = e.forwardable ? `<button class="btn btn-outline" data-act="forwardEv" data-id="${id}">Share to my Friends</button>` : '';
      else if (st === 'full') actionsHtml = `${e.forwardable ? `<button class="btn btn-outline" data-act="forwardEv" data-id="${id}">Share</button>` : ''}<button class="btn btn-grad" disabled>Event is full</button>`;
      else actionsHtml = `${e.forwardable ? `<button class="btn btn-outline" data-act="forwardEv" data-id="${id}">Share</button>` : ''}<button class="btn btn-grad" data-act="joinEv" data-id="${id}">Join</button>`;
    }
    return {
      html: `${hdr}${seg}
        <div class="pad">
          ${e.cancelled ? '<div class="banner-red">This event is cancelled.</div>' : past ? '<div class="notice">This event has ended.</div>' : ''}
          <div class="ed-row">${IC.clock}<div>${timeHtml}${e.tf ? `<div><a class="text-link" style="font-size:14px" href="#availability?mode=view&id=${id}">View marked availability</a></div>` : ''}</div></div>
          ${locationRow(e)}
          ${club ? `<a class="ed-row" href="#club/${club.id}">${IC.group}<div>Club event · <b style="color:var(--blue)">${esc(club.name)}</b></div></a>` : ''}
          <div class="divider"></div>
          <div style="display:flex;align-items:center;justify-content:space-between"><div class="section-label" style="margin:0 0 10px">Attendants <span style="font-weight:400">(${e.attendees.length}${e.limit ? '/' + e.limit : ''})</span></div>${going && !mine && !e.cancelled ? '<span class="pill-going">You are going</span>' : ''}</div>
          <div class="people-grid">${people}</div>
          ${shareRow || fwdRow ? `<div class="divider"></div>${shareRow}${fwdRow}` : ''}
          <div class="divider"></div>
          ${descHtml}${imgs}
        </div>
        ${actionsHtml ? `<div class="bottom-bar">${actionsHtml}</div>` : '<div style="height:40px"></div>'}`,
    };
  };
  ACT.evTab = (el) => { evTab[el.dataset.id] = el.dataset.t; go('#event/' + el.dataset.id, true); rerender(); };
  ACT.forwardEv = (el) => forwardEvent(GT.event(el.dataset.id));
  ACT.joinEv = (el) => { const e = GT.event(el.dataset.id); e.attendees.push(db().me); GT.save(); rerender(); toast('You’re going! Added to your calendar'); };
  // Figma Event-detail-03: action sheet
  ACT.eventMenu = (el) => {
    const e = GT.event(el.dataset.id); const me = db().me; const mine = e.owner === me; const going = e.attendees.includes(me);
    const items = [{ icon: 'bellOff', label: 'Mute event', toggle: db().muted.includes(e.id), run: () => { toggleMute(e.id); setTimeout(rerender, 300); } }];
    if (!e.cancelled && (e.forwardable || mine)) items.push({ icon: 'share', label: 'Share event', run: () => forwardEvent(e) });
    if (mine) {
      if (!e.cancelled) items.push({ icon: 'edit', label: 'Edit event', run: () => go('#create-event?edit=' + e.id) });
      items.push({ icon: 'duplicate', label: 'Duplicate event', run: () => go('#create-event?dup=' + e.id) });
      if (!e.cancelled && e.audience.type !== 'me') items.push({ icon: 'unshare', label: 'Unshare event', run: () => dialog({ title: 'Unshare event?', text: 'Only you will be able to see this event. Friends who joined keep it.', ok: 'Unshare', danger: true, onOk: () => { e.audience = { type: 'me' }; GT.save(); rerender(); toast('Event unshared'); } }) });
      if (!e.cancelled) items.push({ icon: 'cancelEv', label: 'Cancel event', danger: true, run: () => dialog({ title: 'Cancel event?', text: 'All attendants will be notified that this event is cancelled.', ok: 'Cancel event', cancel: 'Keep', danger: true, onOk: () => { e.cancelled = true; GT.save(); rerender(); toast('Event cancelled'); } }) });
      items.push({ icon: 'trash', label: 'Delete event', danger: true, run: () => dialog({ title: 'Are you sure?', text: 'Do you want to delete this? This process cannot be undone.', ok: 'Delete', danger: true, onOk: () => { db().events = db().events.filter((x) => x !== e); GT.save(); go('#events', true); toast('Event deleted'); } }) });
    } else if (going && !e.cancelled) {
      items.push({ icon: 'quit', label: 'Quit event', danger: true, run: () => dialog({ title: 'Quit this event?', text: `You’ll be removed from “${e.title}”.`, ok: 'Quit', danger: true, onOk: () => { e.attendees = e.attendees.filter((x) => x !== me); GT.save(); rerender(); toast('You quit the event'); } }) });
    } else if (going && e.cancelled) {
      items.push({ icon: 'trash', label: 'Remove from my calendar', danger: true, run: () => { e.attendees = e.attendees.filter((x) => x !== me); GT.save(); go('#events', true); } });
    }
    if (!mine) items.push({ icon: 'chat', label: `Message ${GT.person(e.owner).first}`, run: () => go('#chat/' + GT.dmChat(e.owner).id) });
    actions(items);
  };
  // Figma Event-detail-02: tapping the location opens maps / meeting options
  ACT.locSheet = (el) => {
    const e = GT.event(el.dataset.id);
    const copy = (txt, msg) => { try { navigator.clipboard.writeText(txt); } catch (x) { /* ignore */ } toast(msg); };
    if (e.virtual) actions([
      { icon: 'video', label: `open in ${e.virtual.provider === 'zoom' ? 'Zoom' : 'Google Meet'}`, run: () => toast('Opening meeting…') },
      { icon: 'link', label: 'copy meeting url', run: () => copy(e.virtual.url || '', 'Meeting link copied') },
    ]);
    else actions([
      { icon: 'pin', label: 'open in Google Maps', run: () => toast('Opening Google Maps…') },
      { icon: 'pin', label: 'open in Apple Maps', run: () => toast('Opening Apple Maps…') },
      { icon: 'copy', label: 'copy address', run: () => copy(`${e.place}${e.address ? ', ' + e.address : ''}`, 'Address copied') },
    ]);
  };

  // Figma invitation-list-01/02/03 "Shared to"
  S['shared-to'] = ([id]) => {
    const e = GT.event(id); if (!e) return { redirect: '#events' };
    const club = e.club && GT.club(e.club);
    const a = e.audience;
    const ids = a.type === 'custom' ? [...new Set([...(a.friends || []), ...(a.tags || []).flatMap((t) => (GT.tag(t) || { members: [] }).members)])] : [];
    return {
      html: `${header({ title: 'Shared to', shadow: true, fallback: '#event/' + id })}
        ${club ? `<div class="alpha">Club</div><a class="club-row" style="padding:8px 20px" href="#club/${club.id}">${av(club, 40, { sq: true })}<span>${esc(club.name)}</span></a>` : ''}
        ${a.type === 'all' ? `<div class="alpha">All friends of ${esc(GT.person(e.owner).name)}</div>` : ''}
        ${ids.length ? `${club ? '<div class="alpha">Friends</div>' : ''}${ids.map((pid) => GT.person(pid)).map((p) => `<a class="list-row" href="#user/${p.id}">${av(p, 36)}<span class="name">${esc(p.name)}</span></a>`).join('')}` : ''}`,
    };
  };

  // ======================= Create / edit event =======================
  let draft = null; let draftKey = '';
  function roundedStart() { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; }
  function newDraft(q) {
    const src = q.edit ? GT.event(q.edit) : q.dup ? GT.event(q.dup) : null;
    if (src) {
      const d = JSON.parse(JSON.stringify(src));
      d.limitOn = !!d.limit; d.limit = d.limit || 10;
      if (q.dup) { d.id = null; d.title += ' (copy)'; d.cancelled = false; d.tf = null; if (!d.start) { const s = roundedStart(); d.start = s.toISOString(); d.end = new Date(s.getTime() + 2 * 3600e3).toISOString(); } }
      return d;
    }
    const s = q.start ? new Date(q.start) : roundedStart();
    const en = q.end ? new Date(q.end) : new Date(s.getTime() + 2 * 3600e3); // Figma note: start = now+1h, end = start+2h
    const idea = q.idea && GT.idea(q.idea);
    return {
      id: null, title: idea ? idea.text.replace(/\?$/, '') : '', start: s.toISOString(), end: en.toISOString(), noEnd: false, place: '', address: '', virtual: null, desc: '',
      images: [], audience: q.with ? { type: 'custom', friends: [q.with], tags: [] } : q.tag ? { type: 'custom', friends: [], tags: [q.tag] } : { type: 'all' },
      forwardable: !q.with, visibleShare: false, limitOn: false, limit: 10, club: q.club || null, fromIdea: q.idea || null, tf: null, outside: 'none',
    };
  }
  S['create-event'] = (args, q) => {
    const key = location.hash;
    if (!draft || draftKey !== key) { draft = newDraft(q); draftKey = key; }
    const d = draft; const editing = !!d.id;
    const isClubEv = !!q.club;
    const club = d.club && GT.club(d.club);
    const tfPanel = d.tf && d.tf.status !== 'final'
      ? `<div class="panel"><h5>Event time</h5>${editing && Object.keys(d.tf.marks).length > 1 ? `<div class="label-sm">${Object.keys(d.tf.marks).length} people already marked availability</div>` : '<div class="label-sm">Friends will mark when they’re free.</div>'}<a class="text-link" style="font-size:15px;display:block;margin-top:6px" href="#availability?mode=draft">Edit Availability finder</a></div>`
      : `<div class="panel"><h5>Event time</h5>
          <div class="time-row"><span>Starts</span><button type="button" class="time-val" data-act="timeSheet" data-k="start">${fmt.full(d.start)} PDT</button></div>
          <div class="time-row"><span>Ends</span><button type="button" class="time-val" data-act="timeSheet" data-k="end">${d.noEnd ? 'No end time' : fmt.full(d.end) + ' PDT'}</button></div>
          ${editing ? '' : '<div class="hint">Don’t know when is good for you and your friends? Use our <a class="text-link" href="#availability?mode=draft">Availability finder</a></div>'}</div>`;
    const audOpts = [['allfwd', 'to all my friends, allow forwarding'], ['all', 'to all my friends'], ['custom', 'to selected friends'], ['me', 'to myself']];
    const audKey = d.audience.type === 'all' ? (d.forwardable ? 'allfwd' : 'all') : d.audience.type;
    const audSub = d.audience.type === 'custom' ? `${(d.audience.tags || []).length} tags, ${new Set([...(d.audience.friends || []), ...(d.audience.tags || []).flatMap((t) => (GT.tag(t) || { members: [] }).members)]).size} friends selected` : '';
    const audLabel = d.audience.type === 'custom' ? `to selected friends${d.forwardable ? ', allow forwarding' : ''}` : (audOpts.find((o) => o[0] === audKey) || audOpts[0])[1];
    return {
      html: `${header({ title: editing ? 'Edit event' : isClubEv ? 'Create club event' : 'Create event', left: `<button class="icon-btn" data-act="closeCreate" aria-label="Close">${IC.close}</button>` })}
        <form class="form" id="ce-form" novalidate>
          <input class="field" id="ce-title" placeholder="Event name" value="${esc(d.title)}" maxlength="80">
          ${tfPanel}
          <button type="button" class="field" style="text-align:left;display:flex;align-items:center;gap:8px;${d.place ? '' : 'color:#888'}" data-act="locPick">${d.virtual ? IC.video.replace('<svg', '<svg style="width:20px;height:20px;stroke:#666;flex:none"') : ''}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.place ? d.place + (d.address ? ', ' + d.address : '') : 'Event location / meeting url')}</span></button>
          <textarea class="field" id="ce-desc" placeholder="Event description">${esc(d.desc)}</textarea>
          <div class="panel">${d.images.length
            ? `<div class="thumbs">${d.images.map((b, i) => `<span class="ph" style="background-image:url('${b}')"><button type="button" data-act="rmImage" data-i="${i}" aria-label="Remove">×</button></span>`).join('')}<button type="button" class="add-tile" data-act="addImages" aria-label="Add image">${IC.plus}</button></div>`
            : `<button type="button" class="row-btn" data-act="addImages">${IC.image}<span>Add images</span></button>`}</div>
          ${isClubEv ? `<div class="label-sm" style="padding:0 4px">Also want to share to friends outside club?</div>` : ''}
          <div class="panel">
            <button type="button" class="row-btn" data-act="audToggle">${IC.people}<span>${isClubEv && d.audience.type === 'me' ? 'Not now' : esc(audLabel)}${audSub ? `<div class="sub">${audSub}</div>` : ''}</span>${caret}</button>
            ${S._audOpen ? `<div class="dropdown">${(isClubEv ? [['me', 'Not now'], ...audOpts.slice(0, 3)] : audOpts).map(([k, l]) => `<button type="button" class="${k === audKey ? 'on' : ''}" data-act="audSet" data-k="${k}">${k === audKey ? '✓ ' : ''}${l}</button>`).join('')}</div>` : ''}
            ${d.audience.type !== 'me' ? `<div class="sub-line"></div><div class="switch-row"><span class="label-sm">Make share info visible</span><button type="button" class="switch ${d.visibleShare ? 'on' : ''}" data-act="ceToggle" data-k="visibleShare" aria-label="Make share info visible"></button></div>` : ''}
          </div>
          <div class="switch-row" style="padding:0 4px"><span style="font-size:17px">Attendants limit</span>
            <span style="display:flex;align-items:center;gap:10px"><button type="button" class="switch ${d.limitOn ? 'on' : ''}" data-act="ceToggle" data-k="limitOn" aria-label="Attendants limit"></button>${d.limitOn ? `<input type="number" id="ce-limit" min="2" max="500" value="${d.limit}" class="field" style="width:70px;height:36px;padding:0 8px">` : ''}</span></div>
          ${isClubEv ? '' : `<div class="label-sm" style="padding:0 4px">Also want to share to a club?</div>
          <div class="panel"><button type="button" class="row-btn" data-act="ceClub">${IC.group}<span>${club ? esc(club.name) : 'Not now'}</span>${caret}</button></div>`}
          <div class="err" id="ce-err"></div>
        </form>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="ceSubmit">${editing ? 'Save' : 'Create'}</button></div>`,
      mount(el) {
        const bind = (id, k) => { const i = $('#' + id, el); if (i) i.oninput = () => { d[k] = i.value; }; };
        bind('ce-title', 'title'); bind('ce-desc', 'desc');
        const lim = $('#ce-limit', el); if (lim) lim.oninput = () => { d.limit = parseInt(lim.value, 10) || 0; };
        $('#ce-form', el).onsubmit = (e) => { e.preventDefault(); ACT.ceSubmit(); };
      },
    };
  };
  ACT.ceToggle = (el) => { draft[el.dataset.k] = !draft[el.dataset.k]; rerender(); };
  ACT.audToggle = () => { S._audOpen = !S._audOpen; rerender(); };
  ACT.audSet = (el) => {
    const k = el.dataset.k; S._audOpen = false;
    if (k === 'custom') return pickFriends({ title: 'Select friends', withTags: true, selected: draft.audience.type === 'custom' ? draft.audience : {}, done: (r) => { draft.audience = r.friends.length || r.tags.length ? { type: 'custom', ...r } : { type: 'me' }; rerender(); } });
    if (k === 'allfwd') { draft.audience = { type: 'all' }; draft.forwardable = true; }
    if (k === 'all') { draft.audience = { type: 'all' }; draft.forwardable = false; }
    if (k === 'me') { draft.audience = { type: 'me' }; draft.forwardable = false; }
    rerender();
  };
  // Figma Choose-club-to-share
  ACT.ceClub = () => {
    const myClubs = db().clubs.filter((c) => c.members.includes(db().me));
    let pick = draft.club || '';
    const s = sheet({
      title: 'Select a club to share this event',
      body: `<button class="opt ${!pick ? 'sel' : ''}" data-c=""><span class="radio"></span><span>Not now</span></button>` + myClubs.map((c) => `<button class="opt ${pick === c.id ? 'sel' : ''}" data-c="${c.id}"><span class="radio"></span>${av(c, 36, { sq: true })}<span>${esc(c.name)}</span></button>`).join(''),
      foot: '<button class="btn btn-grad" id="cc-save">Save</button>',
    });
    $$('[data-c]', s).forEach((b) => { b.onclick = () => { pick = b.dataset.c; $$('[data-c]', s).forEach((x) => x.classList.toggle('sel', x === b)); }; });
    $('#cc-save', s).onclick = () => { draft.club = pick || null; closeOverlays(); rerender(); };
  };
  // Figma Create-event-image: Camera / Photo Album
  ACT.addImages = () => actions([
    { icon: 'camera', label: 'Camera', run: () => { draft.images.push(GT.PHOTO.building); rerender(); toast('Photo added'); } },
    { icon: 'photo', label: 'Photo Album', run: () => {
      const photos = Object.values(GT.PHOTO); const picked = new Set();
      const s = sheet({ title: 'Photo Album', body: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${photos.map((b, i) => `<button class="ph-pick" data-i="${i}" style="aspect-ratio:1;border-radius:6px;background:url('${b}') center/cover;outline-offset:-3px" aria-label="Photo ${i + 1}"></button>`).join('')}</div>`, foot: '<button class="btn btn-grad" id="ai-done">Add</button>' });
      $$('.ph-pick', s).forEach((b) => { b.onclick = () => { const i = +b.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i); b.style.outline = picked.has(i) ? '3px solid #0077e3' : ''; $('#ai-done', s).textContent = picked.size ? `Add (${picked.size})` : 'Add'; }; });
      $('#ai-done', s).onclick = () => { picked.forEach((i) => draft.images.push(photos[i])); closeOverlays(); rerender(); };
    } },
  ]);
  ACT.rmImage = (el) => { draft.images.splice(+el.dataset.i, 1); rerender(); };

  // Figma Create-event-time-01/02/03: Event time sheet with calendar + time wheel
  function timeSheet(target, k) {
    const t = target; let which = k;
    let view = new Date(t[which] || t.start); view.setDate(1);
    const draw = (el) => {
      const cur = new Date(t[which]);
      const first = new Date(view); const startDow = first.getDay();
      const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      let cells = fmt.DAYS.map((x) => `<span class="dow">${x.toUpperCase()}</span>`).join('');
      for (let i = 0; i < startDow; i++) cells += '<span></span>';
      for (let dd = 1; dd <= daysIn; dd++) {
        const dt = new Date(view.getFullYear(), view.getMonth(), dd);
        const sel = dt.toDateString() === cur.toDateString(); const today = dt.toDateString() === new Date().toDateString();
        cells += `<button data-dd="${dd}" class="${sel ? 'sel' : ''} ${today ? 'today' : ''}">${dd}</button>`;
      }
      const h = cur.getHours(); const m = cur.getMinutes();
      const dim = which === 'end' && t.noEnd;
      $('.ts-body', el).innerHTML = `
        <button class="et-row ${which === 'start' ? 'on' : ''}" data-w="start">Starts ${fmt.full(t.start)} PDT</button>
        <div class="et-row ${which === 'end' ? 'on' : ''}" data-w="end"><span>${t.noEnd ? 'No end time' : `Ends ${fmt.full(t.end)} PDT`}</span><button class="switch ${t.noEnd ? '' : 'on'}" id="ts-noend" aria-label="Has end time"></button></div>
        <div class="${dim ? 'et-dim' : ''}" style="padding:0 20px">
          <div class="cal-hd"><span>${fmt.MONTHS_LONG[view.getMonth()]} ${view.getFullYear()}</span><span><button id="ts-prev" aria-label="Previous month">${IC.back}</button><button id="ts-next" aria-label="Next month">${IC.next}</button></span></div>
          <div class="cal-grid">${cells}</div>
          <div class="time-row" style="margin-top:12px"><span>Time zone</span><b>PDT</b></div>
          <div class="time-pick"><select id="ts-h">${[...Array(12)].map((_, i) => `<option ${((h % 12) || 12) === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>:<select id="ts-m">${[0, 15, 30, 45].map((x) => `<option value="${x}" ${Math.floor(m / 15) * 15 === x ? 'selected' : ''}>${String(x).padStart(2, '0')}</option>`).join('')}</select><select id="ts-ap"><option ${h < 12 ? 'selected' : ''}>AM</option><option ${h >= 12 ? 'selected' : ''}>PM</option></select></div>
        </div>`;
      $$('[data-w]', el).forEach((b) => { b.onclick = (ev) => { if (ev.target.id === 'ts-noend') return; which = b.dataset.w; view = new Date(t[which]); view.setDate(1); draw(el); }; });
      $('#ts-noend', el).onclick = () => { t.noEnd = !t.noEnd; which = 'end'; draw(el); };
      $('#ts-prev', el).onclick = () => { view.setMonth(view.getMonth() - 1); draw(el); };
      $('#ts-next', el).onclick = () => { view.setMonth(view.getMonth() + 1); draw(el); };
      $$('[data-dd]', el).forEach((b) => { b.onclick = () => { const c = new Date(t[which]); c.setFullYear(view.getFullYear(), view.getMonth(), +b.dataset.dd); set(c); draw(el); }; });
      const timeChange = () => { const c = new Date(t[which]); let hh = +$('#ts-h', el).value % 12; if ($('#ts-ap', el).value === 'PM') hh += 12; c.setHours(hh, +$('#ts-m', el).value); set(c); draw(el); };
      ['ts-h', 'ts-m', 'ts-ap'].forEach((id) => { $('#' + id, el).onchange = timeChange; });
    };
    const set = (c) => {
      const dur = new Date(t.end) - new Date(t.start);
      t[which] = c.toISOString();
      if (which === 'start' && new Date(t.end) <= c) t.end = new Date(c.getTime() + Math.max(dur, 3600e3)).toISOString();
    };
    const el = sheet({ title: 'Event time', tall: true, body: '<div class="ts-body" style="margin:0 -20px"></div>' });
    // Swap header right spacer for a Save button (Figma)
    const sp = $('.sheet-hdr .spacer', el); sp.outerHTML = '<button class="hdr-btn" id="ts-save">Save</button>';
    $('#ts-save', el).onclick = () => {
      if (!t.noEnd && new Date(t.end) <= new Date(t.start)) { toast('End time must be after start time'); return; }
      closeOverlays(); rerender();
    };
    draw(el);
  }
  ACT.timeSheet = (el) => timeSheet(draft, el.dataset.k);

  // Figma Create-event-location-01/02/03: In person | Virtual
  const RECENT = [['1134 40th DR SW', 'Bothell, WA 99081'], ['University Village', 'Seattle, WA 98105'], ['Twisted Lime Pub', '14913 Connelly Rd, Snohomish, WA 98011']];
  function locSheet(target) {
    let mode = target.virtual ? 'virtual' : 'person';
    const v = { meet: target.virtual && target.virtual.provider === 'meet' ? target.virtual.code || '' : '', zoom: target.virtual && target.virtual.provider === 'zoom' ? target.virtual.code || '' : '', url: target.virtual ? target.virtual.url || '' : '' };
    const draw = (el) => {
      $('.ls-body', el).innerHTML = `<div class="seg" style="margin-bottom:14px"><button class="${mode === 'person' ? 'on' : ''}" data-m="person">In person</button><button class="${mode === 'virtual' ? 'on' : ''}" data-m="virtual">Virtual</button></div>` + (mode === 'person'
        ? `<div class="search-row"><label class="search">${IC.search}<input id="ls-q" placeholder="Enter location"></label><button class="icon-btn" data-act="soonLoc" aria-label="Use current location">${IC.globe}</button></div>
          <div id="ls-typed"></div>
          ${target.place && !target.virtual ? `<div class="section-label" style="font-size:15px">Currently selected</div><div class="opt">${IC.pin.replace('<svg', '<svg style="width:18px;height:18px;fill:#666"')}<span style="font-size:15px">${esc(target.place)}${target.address ? ', ' + esc(target.address) : ''}</span></div>` : ''}
          <div class="section-label" style="font-size:15px">Recent</div>
          ${RECENT.map(([p, a], i) => `<button class="opt" data-r="${i}">${IC.pin.replace('<svg', '<svg style="width:18px;height:18px;fill:#666"')}<span style="font-size:15px">${esc(p)}, ${esc(a)}</span></button>`).join('')}`
        : `<div class="section-label" style="font-size:15px">Add a virtual meeting code</div>
          <div class="switch-row" style="margin-bottom:10px"><span style="display:flex;gap:8px;align-items:center"><span style="width:22px;height:22px;border-radius:5px;background:linear-gradient(135deg,#34a853,#fbbc04 50%,#4285f4)"></span>Google Meet</span><input class="field" id="ls-meet" style="width:170px;height:38px" value="${esc(v.meet)}" placeholder="abc-defg-hij"></div>
          <div class="switch-row"><span style="display:flex;gap:8px;align-items:center"><span style="width:22px;height:22px;border-radius:50%;background:#2d8cff"></span>Zoom</span><input class="field" id="ls-zoom" style="width:170px;height:38px" value="${esc(v.zoom)}" placeholder="555 0101 222"></div>
          <div class="section-label" style="font-size:15px">Add a virtual meeting link</div>
          <input class="field" id="ls-url" value="${esc(v.url)}" placeholder="Link URL">`);
      $$('[data-m]', el).forEach((b) => { b.onclick = () => { mode = b.dataset.m; draw(el); }; });
      if (mode === 'person') {
        const q = $('#ls-q', el);
        q.oninput = () => { $('#ls-typed', el).innerHTML = q.value.trim() ? `<button class="opt" id="ls-use">${IC.pin.replace('<svg', '<svg style="width:18px;height:18px;fill:var(--blue)"')}<span style="font-size:15px">Use “${esc(q.value.trim())}”</span></button>` : ''; const u = $('#ls-use', el); if (u) u.onclick = () => { target.place = q.value.trim(); target.address = ''; target.virtual = null; closeOverlays(); rerender(); }; };
        $$('[data-r]', el).forEach((b) => { b.onclick = () => { const [p, a] = RECENT[+b.dataset.r]; target.place = p; target.address = a; target.virtual = null; closeOverlays(); rerender(); }; });
      } else {
        ['meet', 'zoom', 'url'].forEach((k) => { $('#ls-' + k, el).oninput = (e) => { v[k] = e.target.value; }; });
      }
    };
    const el = sheet({ title: 'Location', tall: true, body: '<div class="ls-body"></div>', foot: '<button class="btn btn-grad" id="ls-save">Save</button>' });
    draw(el);
    $('#ls-save', el).onclick = () => {
      if (mode === 'person') { closeOverlays(); return; }
      if (!v.meet && !v.zoom && !v.url) { toast('Add a meeting code or link'); return; }
      const provider = v.zoom ? 'zoom' : 'meet';
      target.virtual = { provider, code: v.zoom || v.meet, url: v.url || (provider === 'zoom' ? 'https://zoom.us/j/' + v.zoom.replace(/\s/g, '') : 'https://meet.google.com/' + v.meet) };
      target.place = v.url || (provider === 'zoom' ? 'Zoom ' + v.zoom : 'Google Meet ' + v.meet); target.address = '';
      closeOverlays(); rerender();
    };
  }
  ACT.locPick = () => locSheet(draft);
  ACT.soonLoc = () => { draft.place = 'Current location'; draft.address = 'Bothell, WA 98011'; draft.virtual = null; closeOverlays(); rerender(); toast('Using current location'); };

  ACT.closeCreate = () => {
    const d = draft; const dirty = d && !d.id && (d.title || d.place || d.desc || d.images.length);
    const leave = () => { draft = null; S._audOpen = false; back('#home'); };
    if (dirty) dialog({ title: 'Discard this event?', text: 'Your changes won’t be saved.', ok: 'Discard', danger: true, onOk: leave });
    else leave();
  };
  ACT.ceSubmit = () => {
    const d = draft; const err = $('#ce-err');
    d.title = $('#ce-title').value.trim(); d.desc = $('#ce-desc').value.trim();
    if (!d.title) { err.textContent = 'Give your event a name.'; $('#ce-title').focus(); return; }
    if (!d.tf && !d.noEnd && new Date(d.end) <= new Date(d.start)) { err.textContent = 'The end time must be after the start time.'; return; }
    if (!d.place) { err.textContent = 'Add a location or meeting link.'; return; }
    if (d.limitOn && (!d.limit || d.limit < 2)) { err.textContent = 'Attendants limit must be at least 2.'; return; }
    const end = d.noEnd ? (() => { const x = new Date(d.start); x.setHours(23, 59, 0, 0); return x.toISOString(); })() : d.end;
    const payload = {
      title: d.title, start: d.tf && d.tf.status !== 'final' ? null : d.start, end: d.tf && d.tf.status !== 'final' ? null : end, place: d.place, address: d.address || '', virtual: d.virtual || null, desc: d.desc, images: d.images,
      audience: d.audience, visibleShare: d.visibleShare, forwardable: d.forwardable, limit: d.limitOn ? d.limit : 0, club: d.club, tf: d.tf || null,
    };
    S._audOpen = false;
    if (d.id) {
      Object.assign(GT.event(d.id), payload); GT.save(); draft = null;
      go('#event/' + d.id, true); toast('Saved — attendants notified');
      return;
    }
    const id = GT.uid('e');
    const invited = d.audience.type === 'custom' ? d.audience.friends || [] : [];
    db().events.push({ id, ...payload, owner: db().me, attendees: [db().me], art: d.images[0] || GT.AV[Math.floor(Math.random() * GT.AV.length)], created: new Date().toISOString() });
    if (d.tf) db().feed.push({ kind: 'availability-started', by: db().me, ref: id, at: new Date().toISOString() });
    invited.forEach((fid) => GT.dmChat(fid).messages.push({ by: db().me, event: id, text: '', at: new Date().toISOString() }));
    if (d.fromIdea) { const i = GT.idea(d.fromIdea); if (i) { i.status = 'converted'; i.event = id; } }
    GT.save(); draft = null;
    go('#event/' + id, true); toast(d.tf ? 'Event created — friends can now mark their time' : 'Event created');
  };

  // ======================= Time finder (availability grid) =======================
  // Slots are 30 min from 9:00 to 21:00 (24 per day); key = "dayIndex-slot"
  const SLOTS = 24; const START_H = 9;
  const slotTime = (dayIso, s) => { const d = new Date(dayIso); d.setHours(START_H, 0, 0, 0); d.setMinutes(s * 30); return d; };
  let tfState = null;
  S.availability = (a, q) => {
    const mode = q.mode; // draft | mark | final | view
    const e = q.id && GT.event(q.id);
    if (mode !== 'draft' && !e) return { redirect: '#events' };
    if (!tfState || tfState.key !== location.hash) {
      let days; let marks = {};
      if (mode === 'draft') {
        if (!draft) return { redirect: '#create-event' };
        days = draft.tf ? draft.tf.days : [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d.toISOString(); });
        marks = draft.tf ? JSON.parse(JSON.stringify(draft.tf.marks)) : {};
      } else { days = e.tf.days; marks = JSON.parse(JSON.stringify(e.tf.marks)); }
      tfState = { key: location.hash, mode, days, marks, mine: new Set(marks[db().me] || []), pick: null, offset: 0 };
    }
    const T = tfState;
    const title = { draft: 'Mark your availability', mark: 'Mark your availability', final: 'Finalize time', view: 'Marked availability' }[mode];
    const right = mode === 'view' ? '' : `<button class="hdr-btn" data-act="tfSave">${mode === 'final' ? 'Set' : 'Save'}</button>`;
    const shown = T.days.slice(T.offset, T.offset + 3);
    const others = Object.entries(T.marks).filter(([u]) => u !== db().me);
    const cnt = (k) => others.filter(([, arr]) => arr.includes(k)).length + (mode !== 'draft' && mode !== 'mark' && T.mine.has(k) ? 0 : 0);
    const allCnt = (k) => Object.values(T.marks).filter((arr) => arr.includes(k)).length;
    const nowT = new Date();
    let grid = '';
    for (let s = 0; s < SLOTS; s++) {
      grid += `<div class="hr">${s % 2 === 0 ? `${((START_H + s / 2) % 12) || 12}${START_H + s / 2 >= 12 ? 'PM' : 'AM'}` : ''}</div>`;
      shown.forEach((dIso, di) => {
        const idx = T.offset + di; const k = `${idx}-${s}`;
        const past = slotTime(dIso, s) < nowT; // view logic: only show future time
        const cls = ['tf-cell'];
        if (s % 2 === 1) cls.push('hour');
        if (past) cls.push('h0');
        if (mode === 'final' || mode === 'view') { const n = allCnt(k); if (n) cls.push('h' + Math.min(4, n)); }
        else { const n = cnt(k); if (n) cls.push('h' + Math.min(4, n)); if (T.mine.has(k)) cls.push('mine'); }
        if (T.pick && T.pick.day === idx && s >= T.pick.a && s <= T.pick.b) cls.push('pick');
        const firstWho = (mode !== 'draft') ? Object.entries(T.marks).find(([u, arr]) => arr.includes(k) && !arr.includes(`${idx}-${s - 1}`)) : null;
        grid += `<div class="${cls.join(' ')}" data-k="${k}" data-day="${idx}" data-s="${s}" ${past ? 'data-past="1" style="background:#f6f6f6"' : ''}>${firstWho ? `<span class="who" style="background-image:url('${GT.person(firstWho[0]).art}')"></span>` : ''}${(mode === 'final' || mode === 'view') && allCnt(k) > 1 ? `<span class="n">${allCnt(k)}</span>` : ''}</div>`;
      });
    }
    const mo = fmt.MONTHS[new Date(shown[0]).getMonth()];
    return {
      html: `${header({ title, left: `<button class="icon-btn" data-act="back" data-fallback="#events" aria-label="Close">${IC.close}</button>`, right })}
        <div class="tf-days"><span class="mo">${mo}</span>${shown.map((dIso) => `<span class="d ${fmt.isToday(dIso) ? 'today' : ''}">${fmt.DAYS[new Date(dIso).getDay()].toUpperCase()}<b>${new Date(dIso).getDate()}</b></span>`).join('')}</div>
        <div class="tf-nav"><button data-act="tfShift" data-d="-3" ${T.offset === 0 ? 'disabled' : ''}>‹ Earlier</button><button data-act="tfShift" data-d="3" ${T.offset + 3 >= T.days.length ? 'disabled' : ''}>Later ›</button></div>
        <div class="tf-legend">${mode === 'final' || mode === 'view' ? '<span><i style="background:#bfeed8"></i>More friends free = darker</span>' + (mode === 'final' ? '<span><i style="background:var(--blue)"></i>Final time</span>' : '') : `<span><i style="background:var(--going)"></i>You</span>${others.length ? '<span><i style="background:#bfeed8"></i>Friends</span>' : ''}`}</div>
        <p class="label-sm" style="margin:0 12px 6px">${mode === 'final' ? 'Tap or drag on one day to choose the final time.' : mode === 'view' ? '' : 'Tap or drag to mark when you are free.'}</p>
        <div class="tf-grid" id="tf-grid">${grid}</div>`,
      mount(el) {
        if (mode === 'view') return;
        const g = $('#tf-grid', el); let dragging = false; let addMode = true; let startCell = null;
        const cellAt = (ev) => { const p = ev.touches ? ev.touches[0] : ev; const t = document.elementFromPoint(p.clientX, p.clientY); return t && t.closest('.tf-cell'); };
        const apply = (c) => {
          if (!c || c.dataset.past) return;
          if (mode === 'final') {
            const day = +c.dataset.day; const s = +c.dataset.s;
            if (!startCell || +startCell.dataset.day !== day) return;
            const a0 = +startCell.dataset.s; T.pick = { day, a: Math.min(a0, s), b: Math.max(a0, s) };
            $$('.tf-cell', g).forEach((x) => x.classList.toggle('pick', +x.dataset.day === day && +x.dataset.s >= T.pick.a && +x.dataset.s <= T.pick.b));
          } else {
            const k = c.dataset.k; if (addMode) T.mine.add(k); else T.mine.delete(k); c.classList.toggle('mine', addMode);
          }
        };
        const down = (ev) => { const c = cellAt(ev); if (!c || c.dataset.past) return; ev.preventDefault(); dragging = true; startCell = c; addMode = !T.mine.has(c.dataset.k); apply(c); };
        const move = (ev) => { if (!dragging) return; ev.preventDefault(); apply(cellAt(ev)); };
        const up = () => { dragging = false; };
        g.addEventListener('mousedown', down); g.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        g.addEventListener('touchstart', down, { passive: false }); g.addEventListener('touchmove', move, { passive: false }); g.addEventListener('touchend', up);
      },
    };
  };
  ACT.tfShift = (el) => { tfState.offset = Math.max(0, Math.min(tfState.days.length - 3, tfState.offset + +el.dataset.d)); rerender(); };
  ACT.tfSave = () => {
    const T = tfState; const q = Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
    const me = db().me;
    if (T.mode === 'final') {
      if (!T.pick) { toast('Choose the final time first'); return; }
      const e = GT.event(q.id);
      const s = slotTime(T.days[T.pick.day], T.pick.a); const en = slotTime(T.days[T.pick.day], T.pick.b + 1);
      tfState = null;
      draft = JSON.parse(JSON.stringify(e)); draft.start = s.toISOString(); draft.end = en.toISOString(); draft.limitOn = !!e.limit; draft.limit = e.limit || 10;
      draft.tf.status = 'final'; draft.review = true; draftKey = '#review-event/' + e.id;
      go('#review-event/' + e.id, true);
      return;
    }
    if (!T.mine.size) { toast('Mark at least one time slot'); return; }
    T.marks[me] = [...T.mine];
    if (T.mode === 'draft') { draft.tf = { status: 'collecting', days: T.days, marks: T.marks }; tfState = null; back('#create-event'); toast('Availability saved'); return; }
    const e = GT.event(q.id); e.tf.marks = T.marks; GT.save(); tfState = null;
    back('#event/' + e.id); toast('Your availability is saved');
  };
  // Figma "Review event": the event form with the finalized time
  S['review-event'] = ([id]) => {
    if (!draft || !draft.review) return { redirect: '#event/' + id };
    const v = S['create-event']([], { edit: id });
    v.html = v.html.replace('>Edit event<', '>Review event<').replace('data-act="ceSubmit">Save<', 'data-act="reviewSubmit">Create<')
      .replace('<div class="panel"><h5>Event time</h5>', `<div class="panel"><h5>Event time</h5><div class="label-sm" style="margin-bottom:6px">Review the <a class="text-link" href="#availability?mode=view&id=${id}">Availability finder</a> result</div>`);
    return v;
  };
  ACT.reviewSubmit = () => {
    const d = draft; const id = d.id;
    // Friends who marked availability become attendants
    Object.keys(d.tf.marks).forEach((u) => { if (!d.attendees.includes(u)) d.attendees.push(u); });
    const atts = d.attendees.slice();
    ACT.ceSubmit();
    const e = GT.event(id); if (!e) return;
    e.attendees = atts;
    db().feed.forEach((f) => { if (f.ref === id) f.at = new Date().toISOString(); });
    GT.save();
    setTimeout(() => toast('Final time set \u2014 everyone was notified'), 60);
  };

  // ======================= Free time (Figma "Set Free Time") =======================
  let ftDraft = null;
  S.freetime = () => {
    if (!ftDraft) { const s = roundedStart(); ftDraft = { start: s.toISOString(), end: new Date(s.getTime() + 2 * 3600e3).toISOString(), note: '', audience: { type: 'all' }, forwardable: false }; }
    const d = ftDraft;
    return {
      html: `${header({ title: 'Set Free Time', left: 'close', fallback: '#events' })}
        <div class="form">
          <div class="panel"><h5>Free time</h5>
            <div class="time-row"><span>Starts</span><button type="button" class="time-val" data-act="ftTime" data-k="start">${fmt.full(d.start)} PDT</button></div>
            <div class="time-row"><span>Ends</span><button type="button" class="time-val" data-act="ftTime" data-k="end">${fmt.full(d.end)} PDT</button></div>
          </div>
          <input class="field" id="ft-note" placeholder="Details" value="${esc(d.note)}">
          <div class="panel"><button type="button" class="row-btn" data-act="ftAudience">${IC.people}<span>${esc(audienceLabel(d.audience))}${d.forwardable ? '' : ', not resharable'}</span>${caret}</button></div>
          <div class="err" id="ft-err"></div>
        </div>
        <div style="height:340px"></div>
        <div class="bottom-bar"><button class="btn btn-grad" data-act="ftSave">Post</button></div>`,
      mount(el) { $('#ft-note', el).oninput = (e) => { d.note = e.target.value; }; },
    };
  };
  ACT.ftTime = (el) => timeSheet(ftDraft, el.dataset.k);
  ACT.ftAudience = () => actions([
    { icon: 'people', label: 'To all my friends, not resharable', run: () => { ftDraft.audience = { type: 'all' }; ftDraft.forwardable = false; rerender(); } },
    { icon: 'share', label: 'To all my friends, allow resharing', run: () => { ftDraft.audience = { type: 'all' }; ftDraft.forwardable = true; rerender(); } },
    { icon: 'friends', label: 'To selected friends', run: () => pickFriends({ withTags: true, selected: ftDraft.audience, done: (r) => { ftDraft.audience = r.friends.length || r.tags.length ? { type: 'custom', ...r } : { type: 'all' }; rerender(); } }) },
  ]);
  ACT.ftSave = () => {
    const d = ftDraft;
    if (new Date(d.end) <= new Date(d.start)) { $('#ft-err').textContent = 'The end time must be after the start time.'; return; }
    db().freetimes.push({ id: GT.uid('f'), by: db().me, start: d.start, end: d.end, note: d.note.trim(), audience: d.audience, created: new Date().toISOString() });
    GT.save(); ftDraft = null; calTab = 'ft'; go('#events', true); toast('Free time posted');
  };

  APP.evCard = evCard; APP.monthList = monthList; APP.monthHeader = monthHeader; APP.ftList = ftList;
})();
