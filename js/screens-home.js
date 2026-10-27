/* Screens: splash, onboarding, sign in / sign up (+ profile pic, notifications), home feed */
(function () {
  const { $, $$, esc, fmt, av, avStyle, stack, logo, toast, sheet, dialog, closeOverlays, S, ACT, go, rerender, IC } = APP;
  const db = () => GT.db;

  // ======================= Splash & onboarding =======================
  S.splash = () => ({
    fullBleed: true, light: true,
    html: `<div class="splash" data-act="splashNext"><img src="assets/logo-white.svg" alt="GoingTo"></div>`,
    mount() { clearTimeout(S._splashT); S._splashT = setTimeout(() => { if (location.hash === '#splash') ACT.splashNext(); }, 1600); },
  });
  // Leave the splash with a crossfade: a copy of the splash sits over the next screen, the logo
  // lifts and fades, then the gradient dissolves away while the new screen settles into place.
  ACT.splashNext = () => {
    clearTimeout(S._splashT);
    const sp = document.querySelector('#screen .splash'), phone = document.getElementById('phone');
    if (sp && !phone.querySelector('.splash-exit')) {
      const layer = sp.cloneNode(true);
      layer.removeAttribute('data-act');
      layer.classList.add('splash-exit');
      phone.appendChild(layer);
      phone.classList.add('from-splash');
      requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('out')));
      setTimeout(() => { layer.remove(); phone.classList.remove('from-splash'); }, 500);
    }
    go(db().signedIn ? '#home' : db().onboarded ? '#signin' : '#onboarding', true);
  };

  // Copy and art from the Figma "Onboarding splash" frames
  const ONB = [
    { t: 'Stay up to date', p: 'Your central event calendar consolidates all you need to know about you and your friends plans.' },
    { t: 'Start and join\nactivities stress-free', p: 'Our open and casual social environment lets you decide what you want to do with your friends without any obligation.' },
    { t: 'Connect better\nwith your friends', p: 'With the Event, Free Time, Club and Chat features you and your friends have everything you need to connect.' },
  ];
  let onbI = 0;
  S.onboarding = () => {
    const s = ONB[onbI];
    return {
      fullBleed: true,
      html: `<div class="onb o${onbI + 1}"><img src="assets/illus/onb${onbI + 1}.png" alt="">
        <button class="icon-btn x" data-act="onbDone" aria-label="Skip">${IC.close}</button>
        <div class="txt"><h2>${esc(s.t)}</h2><p>${esc(s.p)}</p></div>
        <div class="foot"><div class="dots">${ONB.map((_, i) => `<i class="${i === onbI ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn btn-grad btn-block" data-act="onbNext">${onbI === ONB.length - 1 ? 'Get Started' : 'Next'}</button></div></div>`,
    };
  };
  ACT.onbNext = () => { if (onbI < ONB.length - 1) { onbI++; rerender(); } else ACT.onbDone(); };
  ACT.onbDone = () => { onbI = 0; db().onboarded = true; GT.save(); go('#signin', true); };

  // ======================= Sign in =======================
  S.signin = () => ({
    fullBleed: true,
    html: `<form class="auth" id="signin-form" novalidate>
      ${logo()}
      <input class="field" type="email" id="si-email" placeholder="Email address" autocomplete="username">
      <div class="pw-wrap"><input class="field" type="password" id="si-pw" placeholder="Password" autocomplete="current-password"><button type="button" data-act="togglePw" aria-label="Show password">${IC.eyeOff}</button></div>
      <button type="button" class="text-link" style="text-align:left;font-size:15px" data-act="forgot">Forget password</button>
      <div class="err" id="si-err"></div>
      <button class="btn btn-grad btn-block" type="submit">Sign in</button>
      <div class="or">Or</div>
      <button type="button" class="social" data-act="socialIn" data-p="Google"><span class="s-ic" style="color:#4285f4">G</span><span>Continue with Google</span></button>
      <button type="button" class="social" data-act="socialIn" data-p="Facebook"><span class="s-ic" style="background:#1877f2;color:#fff;border-radius:50%">f</span><span>Continue with Facebook</span></button>
      <button type="button" class="social" data-act="socialIn" data-p="Apple"><span class="s-ic"></span><span>Continue with Apple</span></button>
      <a class="social" href="#signup"><span class="s-ic">${IC.mail.replace('<svg', '<svg style="width:22px;height:22px;stroke:#555"')}</span><span>Sign up with email</span></a>
      <p class="fine">By continuing, you agree to our <button type="button" data-act="legal">Terms of service</button> and <button type="button" data-act="legal">Privacy Policy</button>.</p>
    </form>`,
    mount(el) {
      $('#signin-form', el).onsubmit = (e) => {
        e.preventDefault();
        const em = $('#si-email').value.trim(); const pw = $('#si-pw').value;
        if (!/^\S+@\S+\.\S+$/.test(em)) { $('#si-err').textContent = 'Enter a valid email address.'; return; }
        if (!pw) { $('#si-err').textContent = 'Enter your password.'; return; }
        signIn();
      };
    },
  });
  function signIn(msg) { db().signedIn = true; db().onboarded = true; GT.save(); go('#home', true); if (msg) setTimeout(() => toast(msg), 50); }
  ACT.socialIn = (el) => signIn(`Signed in with ${el.dataset.p}`);
  ACT.togglePw = (el) => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.innerHTML = i.type === 'password' ? IC.eyeOff : IC.eye; };
  ACT.forgot = () => { const em = $('#si-email').value.trim(); toast(em ? `Reset link sent to ${em}` : 'Enter your email first'); };
  ACT.legal = () => sheet({ title: 'Terms & Privacy', body: '<p style="line-height:1.6">Placeholder legal copy for the prototype. GoingTo only shares your events with the people you choose, and never sells your data.</p>' });

  // ======================= Sign up (form → profile pic → notifications) =======================
  const su = { first: '', last: '', email: '', pw: '', pic: null };
  S.signup = (a, q) => {
    const step = q.step || 'form';
    if (step === 'pic') {
      const initial = (su.first || 'M')[0].toUpperCase();
      return {
        fullBleed: true,
        html: `<div class="fill" style="padding-top:54px">${APP.header({ title: 'Add a profile pic', fallback: '#signup' })}
          <div class="profile-chip">${su.pic ? avStyle(su.pic, 44) : `<span class="av" style="width:44px;height:44px;background:#bc4a4a;font-size:20px">${esc(initial)}</span>`}<span>${esc((su.first + ' ' + su.last).trim() || 'You')}</span></div>
          <div style="flex:1"></div>
          <div class="pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:30px">
            <button class="btn btn-grad" data-act="suChoosePic">Choose a pic</button>
            <button class="btn btn-outline" data-act="suTakePic">Take a pic</button>
            <button class="text-link" data-act="suPicDone" style="margin:4px auto">${su.pic ? 'Continue' : 'skip for now'}</button>
          </div></div>`,
      };
    }
    if (step === 'notif') return notifScreen(true);
    return {
      fullBleed: true,
      html: `<div class="fill" style="padding-top:54px">${APP.header({ title: 'Sign up', fallback: '#signin' })}
        <form class="form" id="su-form" novalidate style="padding:10px 30px 0">
          <input class="field" id="su-first" placeholder="First name" autocomplete="given-name" value="${esc(su.first)}">
          <input class="field" id="su-last" placeholder="Last name" autocomplete="family-name" value="${esc(su.last)}">
          <div style="height:14px"></div>
          <div class="field-wrap"><input class="field" id="su-email" type="email" placeholder="Email address" autocomplete="email" value="${esc(su.email)}"><span id="su-em-ic"></span></div>
          <div class="field-wrap"><input class="field" id="su-pw" type="password" placeholder="Password" autocomplete="new-password"><span id="su-pw-ic"></span></div>
          <div class="err" id="su-err" style="text-align:right"></div>
        </form>
        <div style="flex:1"></div>
        <div class="pad" style="padding:0 30px 30px"><button class="btn btn-grad btn-block" data-act="suSubmit">Sign up</button>
        <p class="fine">Already have an account? <a href="#signin" style="font-weight:700">Sign in</a></p></div></div>`,
      mount(el) {
        const em = $('#su-email', el), pw = $('#su-pw', el);
        em.oninput = () => { $('#su-em-ic').innerHTML = /^\S+@\S+\.\S+$/.test(em.value) ? '<span class="ok">✓</span>' : ''; };
        pw.oninput = () => { const ok = pw.value.length >= 8; $('#su-pw-ic').innerHTML = pw.value ? `<span class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '×'}</span>` : ''; $('#su-err').textContent = pw.value && !ok ? 'Password need to be at least 8 characters' : ''; };
        em.oninput();
      },
    };
  };
  ACT.suSubmit = () => {
    su.first = $('#su-first').value.trim(); su.last = $('#su-last').value.trim(); su.email = $('#su-email').value.trim(); su.pw = $('#su-pw').value;
    const err = !su.first ? 'Enter your first name.' : !/^\S+@\S+\.\S+$/.test(su.email) ? 'Enter a valid email address.' : su.pw.length < 8 ? 'Password need to be at least 8 characters' : '';
    if (err) { $('#su-err').textContent = err; return; }
    go('#signup?step=pic');
  };
  ACT.suChoosePic = () => {
    const s = sheet({ title: 'Choose a pic', body: `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${GT.AV.slice(0, 16).map((src) => `<button data-src="${src}" class="av" style="width:64px;height:64px;background-image:url('${src}')" aria-label="Avatar"></button>`).join('')}</div>` });
    $$('[data-src]', s).forEach((b) => { b.onclick = () => { su.pic = b.dataset.src; closeOverlays(); rerender(); }; });
  };
  // Figma sign-up-03/04: camera viewfinder → circular crop → Retake / Save
  ACT.suTakePic = () => {
    const r = $('#overlay-root');
    r.innerHTML = `<div class="camera" style="z-index:44;background-image:url('assets/photo/interior.jpg')"><div class="top"><button class="icon-btn" data-act="closeSheet" aria-label="Close">${IC.back}</button>&nbsp;</div>
      <div class="bottom"><button id="cam-shot" aria-label="Take photo"><span class="ci" style="background:#fff">${IC.camera.replace('<svg', '<svg style="stroke:#333"')}</span></button></div></div>`;
    $('#cam-shot', r).onclick = () => {
      r.innerHTML = `<div class="camera" style="z-index:44;background-image:url('assets/photo/interior.jpg')"><div style="position:absolute;left:50%;top:40%;width:240px;height:240px;transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.45)"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;background:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 20px 40px"><button class="text-link" id="cam-re">Retake</button><button class="btn btn-grad btn-sm" id="cam-save">Save</button></div></div>`;
      $('#cam-re', r).onclick = ACT.suTakePic;
      $('#cam-save', r).onclick = () => { su.pic = 'assets/photo/interior.jpg'; closeOverlays(); rerender(); };
    };
  };
  ACT.suPicDone = () => {
    const me = GT.me(); me.first = su.first || me.first; me.last = su.last; me.name = (me.first + ' ' + me.last).trim(); if (su.pic) me.art = su.pic;
    db().signedIn = true; db().onboarded = true; GT.save();
    go('#signup?step=notif');
  };

  // Figma Notification-iphone-01: ask for push permission
  function notifScreen(fromSignup) {
    return {
      fullBleed: true,
      html: `<div class="fill" style="padding-top:54px">
        <div style="padding:6px 12px 0"><button class="icon-btn" data-act="notifSkip" aria-label="Close">${IC.close}</button></div>
        <div class="notif-page"><img src="assets/illus/notif-hero.png" alt="">
          <h2>Receive notifications to stay connected!</h2>
          <div>Select “allow” to start receiving notifications and you will get all the latest on:</div>
          <ul><li>Your chat messages</li><li>Your event activities</li><li>Your club and friends updates</li></ul>
          <b>Don’t worry! You can mute individual chat or events in the app.</b></div>
        <div style="flex:1"></div>
        <div class="pad" style="padding-bottom:30px;display:flex;flex-direction:column;gap:10px"><button class="btn btn-grad" data-act="notifAllow">Set up now</button><button class="text-link" data-act="notifSkip">Not now</button></div></div>`,
    };
  }
  S.notifications = () => notifScreen(false);
  ACT.notifAllow = () => dialog({ title: '“GoingTo” Would Like to Send You Notifications', text: 'Notifications may include alerts, sounds, and icon badges.', ok: 'Allow', cancel: 'Don’t Allow', onOk: () => { db().settings.notifications = true; db().notifAsked = true; GT.save(); go('#home', true); toast('Notifications on'); } });
  ACT.notifSkip = () => { db().settings.notifications = false; db().notifAsked = true; GT.save(); go('#home', true); };

  // ======================= Home =======================
  function evMeta(e) {
    return `<div class="meta">${IC.clock}<span>${fmt.longRange(e)}</span></div><div class="meta">${IC.pin}<span>${esc(e.place)}${e.address ? ', ' + esc(e.address) : ''}</span></div>`;
  }
  function feedItem(f) {
    const p = GT.person(f.by);
    const top = (avatar, name, action) => `<div class="feed-top">${avatar}<div class="feed-who"><div class="feed-name">${name}</div><div class="feed-act">${action}</div></div><div class="feed-time">${fmt.rel(f.at)}</div></div>`;
    const ev = f.ref && GT.event(f.ref);
    switch (f.kind) {
      case 'event-created': case 'going': case 'cancelled': case 'edited': {
        if (!ev) return '';
        const verb = { going: 'Is going to an event', cancelled: 'Canceled an event', edited: 'Edited an event', 'event-created': 'Created an event' }[f.kind];
        return `<a class="feed-item" href="#event/${ev.id}">${top(av(p, 50), esc(p.name), `<b>${verb}</b>`)}<div class="feed-ev"><h4${ev.cancelled ? ' style="text-decoration:line-through;color:#888"' : ''}>${esc(ev.title)}</h4>${evMeta(ev)}</div></a>`;
      }
      case 'availability-request': {
        if (!ev) return '';
        const done = ev.tf && ev.tf.status === 'final';
        const marked = ev.tf && ev.tf.marks[db().me];
        return `<a class="feed-item" href="#event/${ev.id}">${top(av(p, 50), esc(p.name), `<b>${done ? 'Finalized time for' : 'Requesting availability'}</b>`)}<div class="feed-ev"><h4>${esc(ev.title)}</h4>
          ${done ? evMeta(ev) : `<div class="meta">${IC.clock}<span class="text-link">${marked ? 'You marked your availability' : 'Suggest time works for you'}</span></div><div class="meta">${IC.pin}<span>${esc(ev.place)}${ev.address ? ', ' + esc(ev.address) : ''}</span></div>`}</div></a>`;
      }
      case 'availability-started': {
        if (!ev) return '';
        const n = Object.keys(ev.tf ? ev.tf.marks : {}).length - 1;
        return `<a class="feed-item" href="#event/${ev.id}">${top(av(p, 50), 'You', `<b>${ev.tf && ev.tf.status === 'final' ? 'Finalized time for' : 'Started availability finder'}</b>`)}<div class="feed-ev"><h4>${esc(ev.title)}</h4><div class="meta">${IC.clock}<span class="text-link">${ev.tf && ev.tf.status === 'final' ? fmt.longRange(ev) : n > 0 ? `${n} friends marked availability` : 'Edit availability finder'}</span></div></div></a>`;
      }
      case 'club-event': {
        const c = GT.club(f.club); if (!c || !ev) return '';
        return `<a class="feed-item" href="#event/${ev.id}">${top(av(c, 50, { sq: true }), esc(c.name), `${esc(p.first)} <b>created an event</b>`)}<div class="feed-ev"><h4>${esc(ev.title)}</h4>${evMeta(ev)}</div></a>`;
      }
      case 'club-joined': {
        const c = GT.club(f.club); if (!c) return '';
        return `<a class="feed-item" href="#user/${p.id}">${top(av(c, 50, { sq: true }), esc(c.name), `${av(p, 20)} ${esc(p.name)} <b>Joined</b>`)}</a>`;
      }
      case 'club-invite': {
        const inv = db().clubInvites.find((i) => i.club === f.club);
        const c = inv || GT.club(f.club); if (!c) return '';
        return `<a class="feed-item" href="#" data-act="${inv ? 'clubInvite' : 'go'}" data-href="#club/${f.club}" data-club="${f.club}">${top(av(p, 50), esc(p.name), `Invited you to <b>${esc(c.name)}</b>`)}</a>`;
      }
      case 'friend-req': {
        const r = db().requests.find((x) => x.from === f.by);
        return `<a class="feed-item" href="#requests">${top(av(p, 50), esc(p.name), `<b>${r && r.status === 'accepted' ? 'Is now your friend' : 'Want to be your friend'}</b>`)}</a>`;
      }
      case 'suggestion': {
        const sg = db().suggestions.find((s) => s.id === f.by);
        return `<a class="feed-item" href="#user/${p.id}"><div class="feed-top"><div class="feed-who"><b>Found someone you may know</b><div style="display:flex;align-items:center;gap:8px;margin-top:8px">${av(p, 36)}<div><div style="font-weight:700">${esc(p.name)}</div><div class="meta" style="margin:0">${stack(['u5','u20','u21'], 3, 20)} ${esc(sg ? sg.reason : 'Mutual friends')}</div></div></div></div><div class="feed-time">${fmt.rel(f.at)}</div></div></a>`;
      }
      case 'shared': {
        if (!ev) return '';
        return `<a class="feed-item" href="#event/${ev.id}"><div class="feed-top"><div class="feed-who">${esc(p.name)} <b>shared an event</b></div><div class="feed-time">${fmt.rel(f.at)}</div></div><div style="display:flex;gap:10px;margin-top:10px">${avStyle(ev.art, 50)}<div class="feed-ev" style="margin:0"><h4 style="margin-bottom:2px">${esc(ev.title)}</h4>${evMeta(ev)}</div></div></a>`;
      }
      case 'photos': {
        if (!ev) return '';
        return `<a class="feed-item" href="#event/${ev.id}?tab=chat">${top(av(p, 50), esc(p.name), '<b>Posted photos</b> in event chat')}<div class="feed-ev"><h4>${esc(ev.title)}</h4><img class="feed-photo" src="${f.photo}" alt=""></div></a>`;
      }
      case 'freetime': {
        const ft = db().freetimes.find((x) => x.id === f.ref); if (!ft) return '';
        return `<a class="feed-item" href="#" data-act="openFreetime" data-id="${ft.id}">${top(av(p, 50), esc(p.name), '<b>Created a Free Time</b>')}<div class="feed-ev"><h4>${fmt.isToday(ft.start) ? 'Today' : fmt.dayNoPad(ft.start)}, ${fmt.time(ft.start)} - ${fmt.time(ft.end)}</h4>${ft.note ? `<div class="meta">${esc(ft.note)}</div>` : ''}</div></a>`;
      }
    }
    return '';
  }

  function happeningCard() {
    const now = new Date();
    const e = db().events.find((x) => x.start && !x.cancelled && new Date(x.start) <= now && new Date(x.end) > now && x.attendees.includes(db().me));
    if (!e) return '';
    const st = GT.eventStatus(e);
    const c = GT.refChat('event', e.id);
    const msgs = c.messages.slice(-3).reverse();
    return `<div class="happening-hd">${IC.alarm} Happening...</div>
      <a class="home-card" href="#event/${e.id}" style="position:relative">
        ${st === 'mine' || st === 'going' ? `<span class="badge ${st}" style="border-radius:0 8px 0 6px">${st.toUpperCase()}</span>` : ''}
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">${avStyle(e.art, 50)}<b style="font-size:17px;padding-right:40px">${esc(e.title)}</b></div>
        <div class="ed-row" style="margin:6px 0">${IC.clock}<b>${fmt.time(e.start)} - ${fmt.time(e.end)}</b></div>
        <div class="ed-row" style="margin:6px 0 10px">${IC.pin}<span><b>${esc(e.place)}</b>${e.address ? ', ' + esc(e.address) : ''}</span></div>
        ${msgs.length ? `<div style="border-top:1px solid var(--line);padding-top:6px;margin-bottom:10px">${msgs.map((m) => `<div class="live-msg">${av(GT.person(m.by), 20)}<span>${esc(m.text || 'Shared a photo')}</span><small>${fmt.rel(m.at)}</small></div>`).join('')}</div>` : ''}
        <span class="btn btn-grad btn-sm btn-block" data-act="go" data-href="${e.owner === db().me ? '#create-event?edit=' + e.id : '#event/' + e.id + '?tab=chat'}">${e.owner === db().me ? 'Edit event' : 'Open event chat'}</span>
      </a>`;
  }
  function weekStrip() {
    const days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); days.push(d); }
    const mine = db().events.filter((e) => e.start && !e.cancelled && (e.owner === db().me || e.attendees.includes(db().me)));
    return `<div class="week">${days.map((d) => {
      const evs = mine.filter((e) => new Date(e.start).toDateString() === d.toDateString());
      return `<a class="day-card" href="#events?day=${d.toISOString()}"><b>${fmt.DAYS[d.getDay()]} ${fmt.slash(d.toISOString())}</b>${evs.length ? evs.slice(0, 2).map((e) => `<span class="chip-ev">${esc(e.title)}</span>`).join('') : '<span class="none">Nothing yet...</span>'}</a>`;
    }).join('')}</div>`;
  }
  const SETUP = [
    { id: 'friends', t: 'Add 3 friends', img: 'assets/illus/setup-friends.png', cta: 'Add now', href: '#add-friend', done: () => db().friendIds.length >= 3 && db().sentRequests.length >= 3 },
    { id: 'event', t: 'Create an event', img: 'assets/illus/setup-event.png', cta: 'Create now', href: '#create-event', done: () => db().events.some((e) => e.owner === db().me && e.created > '2026') && false },
    { id: 'club', t: 'Create a club', img: 'assets/illus/setup-club.png', cta: 'Create now', href: '#create-club', done: () => false },
  ];
  function setupCards() {
    const list = SETUP.filter((s) => !db().dismissedSetup.includes(s.id));
    if (!list.length) return '';
    return `<div class="feeds-label" style="margin-top:0">Let’s get set up!</div><div class="setup-row">${list.map((s) => `<div class="setup-card"><button class="x" data-act="dismissSetup" data-id="${s.id}" aria-label="Dismiss">×</button><h5>${s.t}</h5><img src="${s.img}" alt=""><a class="btn btn-grad btn-sm" href="${s.href}">${s.cta}</a></div>`).join('')}</div>`;
  }
  ACT.dismissSetup = (el) => { db().dismissedSetup.push(el.dataset.id); GT.save(); rerender(); };
  function newIdeas() {
    const list = db().ideas.filter((i) => i.status === 'active' && i.by !== db().me).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 3);
    if (!list.length) return '';
    return `<div class="home-card"><h4>New ideas <a href="#ideas">View all</a></h4>${list.map((i) => `<a class="idea-pill" href="#idea/${i.id}">${av(GT.person(i.by), 30)}<span class="t">${esc(i.text)}</span>${i.interested.length ? `<span class="s">${IC.bulb}${i.interested.length}</span>` : ''}${i.comments.length ? `<span class="s">${IC.chat}${i.comments.length}</span>` : ''}</a>`).join('')}</div>`;
  }

  S.home = () => {
    const me = GT.me();
    const items = [...db().feed].sort((a, b) => new Date(b.at) - new Date(a.at));
    return {
      tab: 'home', gray: true,
      html: `<header class="hdr shadow" style="padding-bottom:4px"><div class="home-hdr">${logo()}<a href="#account" aria-label="My account">${av(me, 36)}</a></div></header>
        <div class="quick">
          <a href="#add-friend"><span class="q-ic">${IC.addFriend}</span>Add friend</a>
          <a href="#qr"><span class="q-ic">${IC.qr}</span>QR code</a>
          <a href="#friends"><span class="q-ic">${IC.friends}</span>My Friends</a>
          <a href="#create-event"><span class="q-ic">${IC.createEvent}</span>Create event</a>
        </div>
        ${happeningCard()}
        ${weekStrip()}
        ${setupCards()}
        ${newIdeas()}
        <div class="feeds-label">Feeds</div>
        <div>${items.map(feedItem).join('') || '<div class="empty">Nothing yet. Add friends to see what they’re going to.</div>'}</div>
        <div style="height:10px"></div>`,
    };
  };

  ACT.clubInvite = (el) => {
    const id = el.dataset.club; const inv = db().clubInvites.find((i) => i.club === id); if (!inv) return go('#club/' + id);
    const from = GT.person(inv.from);
    const s = sheet({
      title: 'Club invitation',
      body: `<div style="text-align:center;padding:10px 0">${av(inv, 80, { sq: true })}<h3 style="margin:12px 0 4px">${esc(inv.name)}</h3><p class="muted" style="margin:0">${esc(from.name)} invited you to join</p></div>`,
      foot: '<button class="btn btn-gray" id="ci-no">Ignore</button><button class="btn btn-grad" id="ci-yes">Join club</button>',
    });
    $('#ci-no', s).onclick = () => { db().clubInvites = db().clubInvites.filter((i) => i !== inv); db().feed = db().feed.filter((f) => !(f.club === id && f.kind === 'club-invite')); GT.save(); closeOverlays(); rerender(); toast('Invitation ignored'); };
    $('#ci-yes', s).onclick = () => {
      db().clubs.push({ id, name: inv.name, art: inv.art, cover: GT.PHOTO.cover, owner: inv.from, mediators: [], members: [inv.from, db().me, 'u4', 'u15', 'u23'], about: 'Parents in Bothell sharing kid-friendly events, carpools and recommendations.', permission: 'all', requests: [], unread: 0 });
      db().clubInvites = db().clubInvites.filter((i) => i !== inv); GT.save(); closeOverlays(); go('#club/' + id); toast(`You joined ${inv.name}`);
    };
  };
  ACT.openFreetime = (el) => {
    const ft = db().freetimes.find((x) => x.id === el.dataset.id); if (!ft) return;
    const p = GT.person(ft.by); const mine = ft.by === db().me;
    const s = sheet({
      title: mine ? 'My free time' : `${p.first}’s free time`,
      body: `<div style="display:flex;gap:12px;align-items:center;margin:6px 0 14px">${av(p, 50)}<div><div style="font-size:18px;font-weight:700">${fmt.dayNoPad(ft.start)}</div><div class="muted">${fmt.time(ft.start)} - ${fmt.time(ft.end)}</div></div></div>${ft.note ? `<p style="font-size:16px">“${esc(ft.note)}”</p>` : ''}`,
      foot: mine ? '<button class="btn btn-outline danger" id="ft-del">Delete</button>' : `<button class="btn btn-gray" id="ft-chat">Message</button><button class="btn btn-grad" id="ft-plan">Plan event</button>`,
    });
    if (mine) $('#ft-del', s).onclick = () => { db().freetimes = db().freetimes.filter((x) => x !== ft); GT.save(); closeOverlays(); rerender(); toast('Free time deleted'); };
    else {
      $('#ft-chat', s).onclick = () => { closeOverlays(); go('#chat/' + GT.dmChat(ft.by).id); };
      $('#ft-plan', s).onclick = () => { closeOverlays(); go(`#create-event?with=${ft.by}&start=${encodeURIComponent(ft.start)}&end=${encodeURIComponent(ft.end)}`); };
    }
  };
})();
