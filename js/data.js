/* GoingTo mock data store — window.GT. Persisted to localStorage (key goingto_v2). */
(function () {
  const KEY = 'goingto_v2';
  const VERSION = 2;

  // Real imagery exported from the Figma file (assets/av, assets/photo, assets/illus)
  const AV = Array.from({ length: 35 }, (_, i) => `assets/av/av${String(i + 1).padStart(2, '0')}.jpg`);
  const PHOTO = {
    forest: 'assets/photo/forest.jpg', interior: 'assets/photo/interior.jpg', travel: 'assets/photo/travel.jpg',
    beach: 'assets/photo/beach.jpg', sunset: 'assets/photo/sunset.jpg', building: 'assets/photo/building.jpg',
    cover: 'assets/photo/cover-default.jpg',
  };

  const ME = 'u0';
  const people = [
    ['u0', 'Minnie', 'Wang', 0], ['u1', 'Cathy', 'Zhou', 2], ['u2', 'Caroline', 'Zhou', 3], ['u3', 'Jennifer', 'Hanson', 20],
    ['u4', 'Caroline', 'Wang', 9], ['u5', 'Jeremy', 'Outre', 1], ['u6', 'Natalie', 'Moore', 21], ['u7', 'Robert', 'Rominsnatski', 13],
    ['u8', 'Cosmo', 'Zhang', 5], ['u9', 'LiLi', '(Liming’ wife)', 16], ['u10', 'Ross', 'Blakiston', 31], ['u11', 'Liming', 'Wei', 8],
    ['u12', 'Albert', 'Loki', 9], ['u13', 'Alsa', 'Moore', 12], ['u14', 'Bella', 'Ning', 18], ['u15', 'Bellevue', 'Lora', 20],
    ['u16', 'Billy', 'John', 27], ['u17', 'Cat', 'Willy', 23], ['u18', 'Cathy', 'Wong', 10], ['u19', 'Cawley', 'Rofgowaski', 31],
    ['u20', 'Rui', '', 2], ['u21', 'Michael', '', 3], ['u22', 'Mingwan', '', 4], ['u23', 'Xinzhou', '', 6], ['u24', 'Thomas', '', 7],
    ['u25', 'Dingding', '', 28], ['u26', 'Michael', 'Miller', 14], ['u27', 'Michael', 'Pan', 24], ['u28', 'Olivia', 'Moore', 29],
    ['u29', 'Andrew', 'Miller', 15], ['u30', 'Millary', 'Holland', 33], ['u31', 'Sophie', 'Wang', 8], ['u32', 'Michael', 'Saucer', 22],
    ['u33', 'Michael', 'Spacer', 30], ['u34', 'Caroline', 'Zhou', 19],
  ].map(([id, first, last, a]) => ({ id, first, last, name: (first + ' ' + last).trim(), art: AV[a] }));

  const friendIds = ['u1','u2','u4','u5','u6','u7','u8','u9','u10','u11','u12','u13','u14','u15','u16','u17','u18','u19','u20','u21','u22','u23','u24','u25','u31'];

  const tags = [
    { id: 't1', name: 'Family', color: '#dcebc0', members: ['u9','u11','u14','u18'] },
    { id: 't2', name: 'Schoolmates', color: '#f7edd4', members: ['u12','u13','u16','u17','u19'] },
    { id: 't3', name: 'Game', color: '#d4e6f7', members: ['u5','u6','u7','u8','u24'] },
    { id: 't4', name: 'Language', color: '#e6dcfa', members: ['u1','u2','u20','u21'] },
    { id: 't5', name: 'Boardgame', color: '#f8d6d6', members: ['u4','u15','u23'] },
  ];

  function at(dayOffset, h, m = 0) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dayOffset); d.setHours(h, m);
    return d.toISOString();
  }
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const nowPlus = (min) => { const d = new Date(Date.now() + min * 60000); d.setSeconds(0, 0); d.setMinutes(Math.round(d.getMinutes() / 15) * 15); return d.toISOString(); };
  const dayKey = (off) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d.toISOString(); };

  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam ac posuere velit, maximus feugiat turpis. Curabitur feugiat tempus sagittis. Cras et dignissim ex, vel placerat neque.\n\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.';

  // audience: { type: 'all' | 'custom' | 'me', friends, tags }; forwardable: may friends re-share
  const events = [
    { id: 'e0', title: 'Camping trip - Mary park hiking trail', start: nowPlus(-60), end: nowPlus(180), place: 'Parking lot', address: '14913 Connelly Rd, Snohomish, WA 98024', art: PHOTO.forest, owner: 'u0', attendees: ['u0','u1','u2','u20','u21'], limit: 0, forwardable: true, visibleShare: false, audience: { type: 'all' }, club: null, desc: 'Meet at the parking lot. We’ll do the 6 mile loop and picnic at the lake.', images: [PHOTO.forest], created: ago(2000) },
    { id: 'e1', title: 'Camping trip in May', start: at(1, 10), end: at(2, 17), place: '14913 Connelly Rd', address: 'Snohomish, Washington, 98024', art: AV[2], owner: 'u1', attendees: ['u1','u2','u20','u21','u0'], limit: 0, forwardable: true, visibleShare: true, audience: { type: 'all' }, club: null, desc: 'Two days at the lake. Bring a tent and sleeping bag — we’ll split groceries. Carpool leaves from Bothell at 9am.', images: [PHOTO.beach, PHOTO.sunset, PHOTO.interior], created: ago(20) },
    { id: 'e2', title: 'Taylor Swift concert', start: at(1, 17), end: at(1, 22), place: 'Tacoma Dome', address: '', art: AV[1], owner: 'u8', attendees: ['u8','u5','u6','u7','u24','u13'], limit: 6, forwardable: false, visibleShare: false, audience: { type: 'all' }, club: null, desc: 'Floor seats! Meet at the north entrance at 4:30.', images: [PHOTO.sunset], created: ago(4000) },
    { id: 'e3', title: 'Concert afterparty', start: at(1, 22, 30), end: at(2, 1), place: 'Twisted Lime Pub', address: '14913 Connelly Rd, Snohomish, WA 98011', art: AV[1], owner: 'u5', attendees: ['u5','u20','u21','u22','u8','u23','u24','u25'], limit: 12, forwardable: true, visibleShare: true, audience: { type: 'all' }, club: null, desc: lorem, images: [PHOTO.beach, PHOTO.sunset, PHOTO.interior], cancelled: true, created: ago(3000) },
    { id: 'e4', title: 'Zoe’s 5th birthday party', start: at(2, 14), end: at(2, 16), place: '12211 30th Dr SE', address: 'Bothell 98011', art: AV[4], owner: 'u0', attendees: ['u0','u4','u15','u18','u23'], limit: 15, forwardable: false, visibleShare: true, audience: { type: 'custom', tags: ['t5'], friends: ['u9','u11'] }, club: null, desc: 'Bouncy house, pizza and cake. Siblings welcome! No gifts please.', images: [PHOTO.building], created: ago(6000) },
    { id: 'e5', title: 'Science fiction meetup', start: at(2, 19), end: at(2, 20), place: 'Edmond Library, Room 1221A', address: '', art: PHOTO.interior, owner: 'u4', attendees: ['u4','u12','u16'], limit: 20, forwardable: true, visibleShare: false, audience: { type: 'all' }, club: 'c1', desc: 'This month: “The Left Hand of Darkness”. Snacks provided.', images: [PHOTO.interior], created: ago(5000) },
    { id: 'e6', title: 'Let’s party', start: at(2, 21, 30), end: at(2, 23, 59), place: 'Shining start club', address: '', art: AV[34], owner: 'u6', attendees: ['u6','u7'], limit: 0, forwardable: true, visibleShare: false, audience: { type: 'all' }, club: null, desc: 'Dancing until late. Dress code: sparkle.', images: [], forwardedBy: 'u7', created: ago(1500) },
    { id: 'e7', title: 'Morning hike: Rattlesnake Ledge', start: at(5, 8), end: at(5, 12), place: 'Rattlesnake Ledge Trailhead', address: 'North Bend, WA 98045', art: PHOTO.forest, owner: 'u2', attendees: ['u2','u1','u20'], limit: 10, forwardable: true, visibleShare: true, audience: { type: 'all' }, club: 'c2', desc: '4 miles round trip, ~1,160 ft gain. Bring water and layers.', images: [PHOTO.forest], created: ago(2500) },
    { id: 'e8', title: 'Design critique night', start: at(8, 18, 30), end: at(8, 20, 30), place: 'Studio 5, Fremont', address: '3400 Stone Way N, Seattle', art: PHOTO.interior, owner: 'u2', attendees: ['u2','u0','u14'], limit: 12, forwardable: true, visibleShare: true, audience: { type: 'all' }, club: 'c1', desc: 'Bring one project you’re stuck on. 5 minutes each.', images: [PHOTO.interior], created: ago(35) },
    { id: 'e9', title: 'Board game brunch', start: at(-3, 11), end: at(-3, 14), place: 'Mox Boarding House', address: '13310 Bel-Red Rd, Bellevue', art: AV[22], owner: 'u11', attendees: ['u11','u9','u0'], limit: 8, forwardable: true, visibleShare: true, audience: { type: 'all' }, club: null, desc: 'Catan, Wingspan and pancakes.', images: [], created: ago(9000) },
    { id: 'e10', title: 'Online bookcase swap', start: at(1, 19), end: at(1, 20), place: 'Zoom', address: '', virtual: { provider: 'zoom', url: 'https://zoom.us/j/5550101' }, art: AV[16], owner: 'u14', attendees: ['u14','u0'], limit: 0, forwardable: true, visibleShare: false, audience: { type: 'all' }, club: null, desc: 'Bring 3 book recommendations.', images: [], created: ago(7000) },
    // Time finder: friend is collecting availability (no fixed time yet)
    { id: 'e11', title: 'Interest groups meet up', start: null, end: null, place: 'Twisted Lime Pub', address: '14913 Connelly Rd, Snohomish, WA 98011', art: AV[23], owner: 'u1', attendees: ['u1'], limit: 12, forwardable: true, visibleShare: false, audience: { type: 'all' }, club: null, desc: 'Let’s find an evening that works for everyone!', images: [PHOTO.sunset],
      tf: { status: 'collecting', days: [dayKey(3), dayKey(4), dayKey(5), dayKey(6), dayKey(7)], marks: { u1: ['0-2','0-3','0-4','1-18','1-19','1-20','2-18','2-19'], u2: ['1-18','1-19','1-20','1-21','2-4','2-5'], u20: ['1-19','1-20','0-3','0-4'], u21: ['1-18','1-19','1-20'] } }, created: ago(25) },
  ];

  const clubs = [
    { id: 'c1', name: 'Interior Design Club', art: PHOTO.interior, cover: PHOTO.interior, owner: 'u0', mediators: ['u2'], members: ['u0','u2','u4','u12','u14','u16','u18','u22'], about: 'We share home makeovers, swap vendor recommendations and meet monthly for a design critique. Everyone is welcome, from first apartments to full renovations.', permission: 'all', requests: [{ from: 'u34', note: 'Invited by Caroline Zhou' }, { from: 'u30', note: 'Invited by Bella Ning' }], unread: 2 },
    { id: 'c2', name: 'Weekend Hiking Group', art: PHOTO.forest, cover: PHOTO.forest, owner: 'u2', mediators: ['u1'], members: ['u2','u1','u0','u20','u21','u22','u5','u8','u9','u10','u11','u13','u15','u17','u19','u25'], about: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus eu lorem ac urna suscipit laoreet eu sit amet nisl. Praesent malesuada turpis turpis, nec imperdiet dui pulvinar suscipit.', permission: 'all', requests: [], unread: 5 },
    { id: 'c3', name: 'Travel around the world together', art: PHOTO.travel, cover: PHOTO.travel, owner: 'u7', mediators: [], members: ['u7','u0','u6','u10'], about: 'Planning group trips and sharing travel deals.', permission: 'mods', requests: [], unread: 0 },
  ];
  const clubInvites = [{ club: 'c4', name: 'Bothell Parents Network', art: AV[17], from: 'u2' }];

  // Ideas: status active | done | converted | archived; comments are a chat thread
  const ideas = [
    { id: 'i1', text: 'Photoshop group discount, join us!', by: 'u5', bg: '#efeaf7', interested: ['u1'], comments: [], status: 'active', at: ago(15) },
    { id: 'i2', text: 'Anybody knows good magicians for kid birthday party?', by: 'u4', bg: '#fbece9', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [{ by: 'u15', text: 'Magic Mike (no, the other one) did my son’s party — kids loved him.', at: ago(300) }], status: 'active', at: ago(900) },
    { id: 'i3', text: 'Standup comedy recommendations?', by: 'u6', bg: '#e9f0fb', interested: ['u0','u1','u2'], comments: [{ by: 'u8', text: 'Comedy Underground on Tuesdays!', at: ago(200) }], status: 'active', at: ago(1200) },
    { id: 'i4', text: 'Pumpkin Patch?', by: 'u18', bg: '#eaf4f1', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [], status: 'active', at: ago(1400) },
    { id: 'i5', text: '3 day (FSS) hiking?', by: 'u2', bg: '#fbece9', interested: ['u1','u20','u21'], comments: [{ by: 'u1', text: 'In! Labor Day weekend?', at: ago(100) }], status: 'active', at: ago(1600) },
    { id: 'i6', text: 'Pumpkin Patch farm recommendations', by: 'u14', bg: '#eef0fa', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [], status: 'active', at: ago(1800) },
    { id: 'i7', text: 'Reliable handyman recommendations?', by: 'u0', bg: '#efeaf7', interested: ['u4','u12','u14'], comments: [{ by: 'u12', text: 'Sending you Joe’s number.', at: ago(60) }, { by: 'u0', text: 'Thank you!', at: ago(50) }], status: 'active', unread: true, at: ago(2000) },
    { id: 'i8', text: 'Anyone knows a good barber/hair stylist?', by: 'u10', bg: '#f1f9e9', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [], status: 'active', at: ago(2200) },
    { id: 'i9', text: 'Mount Rainier 2d trip', by: 'u21', bg: '#eaf4f1', interested: ['u1','u2','u3'], comments: [], status: 'active', at: ago(2400) },
    { id: 'i10', text: 'Yellow stone trip for next summer?', by: 'u7', bg: '#eef0fa', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [], status: 'active', at: ago(2600) },
    { id: 'i11', text: 'Good local concert recommendations?', by: 'u8', bg: '#f3f3ea', interested: ['u0','u1','u2'], comments: [], status: 'active', at: ago(2800) },
    { id: 'i12', text: 'Anyone knows a good swimming lessons?', by: 'u23', bg: '#eaf4f1', interested: ['u1','u2','u3','u5','u6','u7','u8','u9','u10','u11'], comments: [], status: 'active', at: ago(3000) },
    { id: 'i13', text: 'I need a good book store near Bothell!', by: 'u0', bg: '#efeaf7', interested: ['u14'], comments: [], status: 'done', at: ago(5000) },
    { id: 'i14', text: 'Whole weekend hiking?', by: 'u0', bg: '#eaf4f1', interested: ['u1','u2','u20','u21','u5','u8','u9','u10','u11','u13'], comments: [{ by: 'u1', text: 'Yes please', at: ago(4000) }], status: 'converted', event: 'e0', at: ago(8000) },
    { id: 'i15', text: 'Let’s go Las Vegas!', by: 'u8', bg: '#fbece9', interested: ['u5','u6','u7','u8','u9','u10','u11','u13','u24','u0'], comments: [{ by: 'u5', text: 'When?', at: ago(400) }, { by: 'u8', text: 'March?', at: ago(380) }], status: 'active', at: ago(500) },
  ];

  const ts = ago;
  const chats = [
    { id: 'ch-e2', kind: 'event', ref: 'e2', unread: 1, messages: [{ by: 'u8', text: 'Tickets are in everyone’s email!', at: ts(1500) }, { by: 'u0', text: 'Thank you so much!!', at: ts(30) }] },
    { id: 'ch-e0', kind: 'event', ref: 'e0', unread: 0, messages: [{ by: 'u1', text: 'I forget my tent, who can share?', at: ts(60) }, { by: 'u2', text: 'At the grocery store, anyone need anything?', at: ts(10) }, { by: 'u20', text: 'I will be 5 mins late.', at: ts(5) }] },
    { id: 'ch-u5', kind: 'dm', ref: 'u5', unread: 2, messages: [{ by: 'u5', text: 'Go out for lunch today?', at: ts(45) }] },
    { id: 'ch-u6', kind: 'dm', ref: 'u6', unread: 1, messages: [{ by: 'u0', text: 'Want to try the new Thai place Friday?', at: ts(90) }, { by: 'u6', text: 'Sounds good!', at: ts(80) }] },
    { id: 'ch-c1', kind: 'club', ref: 'c1', unread: 0, messages: [{ by: 'u2', text: 'Loved everyone’s mood boards last week.', at: ts(4400) }, { by: 'u0', text: 'Thank you for making that suggestion, it really helped!', at: ts(4300) }] },
    { id: 'ch-c2', kind: 'club', ref: 'c2', unread: 0, messages: [{ by: 'u31', text: 'I will get that to you as soon as possible.', at: ts(3000) }, { by: 'u31', text: 'I will also find out if we need bring any food and drinks.', at: ts(2990) }, { by: 'u0', text: 'Sounds good to me! Can’t wait to see you!', at: ts(2900) }, { by: 'u0', text: 'Hey, that was a lot of fun, we should do it again!', at: ts(2800) }] },
    { id: 'ch-u7', kind: 'dm', ref: 'u7', unread: 0, messages: [{ by: 'u0', text: 'Did you find a hotel in Lisbon?', at: ts(7300) }, { by: 'u7', text: 'I will look up the possibilities, thank you for the tips!', at: ts(7200) }] },
    { id: 'ch-u11', kind: 'dm', ref: 'u11', unread: 0, messages: [
      { by: 'u11', text: 'I will get that to you as soon as possible.', at: ts(8640) },
      { by: 'u11', text: 'I will also find out if we need bring any food and drinks.', at: ts(8639) },
      { by: 'u11', text: 'See you then!', at: ts(8638) },
      { by: 'u0', text: 'Sounds good to me! Can’t wait to see you!', at: ts(8637) },
      { by: 'u0', text: 'Hey, that was a lot of fun, we should do it again!', at: ts(1500) },
      { by: 'u0', text: 'How about this weekend?', at: ts(1499) },
      { by: 'u11', text: 'That will be great, but I am busy on Sat, how about Sun?', at: ts(1490) },
      { by: 'u11', text: 'I will prepare food this time.', at: ts(1489) },
      { by: 'u11', text: 'I need to tell you a bad news.', at: ts(70) },
      { by: 'u11', text: 'I probably can’t make it.', at: ts(69) }] },
    { id: 'ch-u8', kind: 'dm', ref: 'u8', unread: 0, messages: [{ by: 'u8', text: 'That’s a deal!', at: ts(13000) }] },
    { id: 'ch-u9', kind: 'dm', ref: 'u9', unread: 0, messages: [{ by: 'u9', text: 'Sure!', at: ts(14400) }] },
    { id: 'ch-u10', kind: 'dm', ref: 'u10', unread: 0, messages: [{ by: 'u10', text: 'See you at the trailhead.', at: ts(17000) }] },
  ];

  const freetimes = [
    { id: 'f1', by: 'u4', start: at(0, 10), end: at(0, 12), note: 'I need some help, so boring!', audience: { type: 'all' }, created: ago(1500) },
    { id: 'f2', by: 'u5', start: at(1, 7), end: at(1, 12, 30), note: 'Shall we go shopping?', audience: { type: 'all' }, created: ago(600) },
    { id: 'f3', by: 'u11', start: at(1, 11), end: at(1, 12, 30), note: '', audience: { type: 'all' }, created: ago(700) },
    { id: 'f4', by: 'u19', start: at(1, 13), end: at(1, 15, 30), note: 'Nothing to do...', audience: { type: 'all' }, created: ago(800) },
    { id: 'f5', by: 'u14', start: at(2, 7), end: at(2, 20, 30), note: 'Wanna hang out?', audience: { type: 'all' }, created: ago(900) },
    { id: 'f6', by: 'u2', start: at(3, 18), end: at(3, 21), note: 'Open evening — dinner?', audience: { type: 'all' }, created: ago(1000) },
    { id: 'f7', by: 'u20', start: at(4, 9), end: at(4, 13), note: 'Up for a hike', audience: { type: 'all' }, created: ago(1100) },
  ];

  const requests = [
    { id: 'r1', from: 'u28', at: ago(1440), status: 'pending', note: 'Hi, we meet at Mike’s birthday party.' },
    { id: 'r2', from: 'u27', at: ago(2880), status: 'pending', note: '', reason: '1 mutual friend' },
    { id: 'r3', from: 'u34', at: ago(5000), status: 'pending', note: 'Do you play chess? I want to play with you more, could you please add me?', reason: 'From Checkers Club' },
    { id: 'r4', from: 'u3', at: ago(1440), status: 'pending', note: '' },
  ];
  const suggestions = [
    { id: 'u29', reason: '3 mutual friends' }, { id: 'u27', reason: '1 mutual friend' }, { id: 'u30', reason: 'From Checkers Club' },
    { id: 'u26', reason: '3 mutual friends' }, { id: 'u32', reason: 'Live in Bothell, Washington' },
  ];

  const feed = [
    { kind: 'availability-request', by: 'u1', ref: 'e11', at: ago(25) },
    { kind: 'event-created', by: 'u1', ref: 'e1', at: ago(20) },
    { kind: 'club-event', by: 'u2', club: 'c1', ref: 'e8', at: ago(35) },
    { kind: 'club-invite', by: 'u2', club: 'c4', at: ago(52) },
    { kind: 'club-joined', by: 'u2', club: 'c1', at: ago(70) },
    { kind: 'photos', by: 'u1', ref: 'e9', photo: PHOTO.building, at: ago(90) },
    { kind: 'friend-req', by: 'u3', at: ago(1440) },
    { kind: 'suggestion', by: 'u29', at: ago(1500) },
    { kind: 'shared', by: 'u4', ref: 'e7', at: ago(1600) },
    { kind: 'freetime', by: 'u4', ref: 'f1', at: ago(1700) },
    { kind: 'cancelled', by: 'u5', ref: 'e3', at: ago(3000) },
  ];

  function seed() {
    return {
      v: VERSION, me: ME, signedIn: false, onboarded: false, notifAsked: false,
      people, friendIds, tags, events, clubs, clubInvites, ideas, chats, freetimes, requests, suggestions, feed,
      sentRequests: [], blocked: [], notes: { u11: 'Met in park, Dog name is Cookie' }, muted: [], dismissedSetup: [],
      connected: { google: true }, settings: { notifications: true },
    };
  }

  let db;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const parsed = JSON.parse(raw); if (parsed && parsed.v === VERSION) return parsed; }
    } catch (e) { /* storage unavailable */ }
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
  db = load();

  const uid = (p) => p + Math.random().toString(36).slice(2, 8);

  window.GT = {
    AV, PHOTO,
    get db() { return db; },
    save,
    reset() { db = seed(); save(); },
    uid,
    me() { return this.person(db.me); },
    person(id) { return db.people.find((p) => p.id === id) || { id, name: 'Unknown', first: 'Unknown', last: '', art: AV[0] }; },
    isFriend(id) { return db.friendIds.includes(id); },
    friends() { return db.friendIds.map((id) => this.person(id)).sort((a, b) => a.name.localeCompare(b.name)); },
    event(id) { return db.events.find((e) => e.id === id); },
    club(id) { return db.clubs.find((c) => c.id === id); },
    idea(id) { return db.ideas.find((i) => i.id === id); },
    tag(id) { return db.tags.find((t) => t.id === id); },
    tagsFor(pid) { return db.tags.filter((t) => t.members.includes(pid)); },
    chat(id) { return db.chats.find((c) => c.id === id); },
    dmChat(pid) {
      let c = db.chats.find((x) => x.kind === 'dm' && x.ref === pid);
      if (!c) { c = { id: 'ch-' + pid, kind: 'dm', ref: pid, unread: 0, messages: [] }; db.chats.unshift(c); save(); }
      return c;
    },
    refChat(kind, ref) {
      let c = db.chats.find((x) => x.kind === kind && x.ref === ref);
      if (!c) { c = { id: 'ch-' + ref, kind, ref, unread: 0, messages: [] }; db.chats.push(c); save(); }
      return c;
    },
    eventStatus(e) {
      if (e.cancelled) return 'cancelled';
      if (e.tf && e.tf.status === 'collecting') return 'pending';
      if (e.owner === db.me) return 'mine';
      if (e.attendees.includes(db.me)) return 'going';
      if (e.limit && e.attendees.length >= e.limit) return 'full';
      return '';
    },
    mutualFriends(pid) {
      const set = new Set();
      db.tags.forEach((t) => { if (t.members.includes(pid)) t.members.forEach((m) => set.add(m)); });
      db.clubs.forEach((c) => { if (c.members.includes(pid)) c.members.forEach((m) => set.add(m)); });
      set.delete(pid); set.delete(db.me);
      const list = [...set].filter((id) => db.friendIds.includes(id));
      return (list.length ? list : ['u5', 'u20', 'u21', 'u22']).slice(0, 8).map((id) => this.person(id));
    },
    mutualClubs(pid) { return db.clubs.filter((c) => c.members.includes(pid) && c.members.includes(db.me)); },
  };
})();
