/* ========== STARS — Core App (vanilla JS) ========== */
(function () {
  'use strict';

  // ----- Storage helpers -----
  const KEY = {
    users: 'stars.users',
    rooms: 'stars.rooms',
    bookings: 'stars.bookings',
    equipment: 'stars.equipment',
    notifications: 'stars.notifications',
    session: 'stars.session',
    settings: 'stars.settings',
    theme: 'stars.theme',
  };
  const db = {
    get(k, d = []) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };

  // ----- Tiny utils -----
  const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => { if(!d) return '—'; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' }); };
  const fmtDateTime = (d) => { if(!d) return '—'; const x = new Date(d); return isNaN(x) ? d : x.toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' }); };
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Naive "encryption" — base64 with salt. NOT secure, simulation only.
  const hashPw = (pw) => btoa(unescape(encodeURIComponent('stars:' + pw)));
  const toast = (icon, title) => {
    if (!window.Swal) return alert(title);
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2200, timerProgressBar: true });
  };

  // ----- Seed default data on first run -----
  function seed() {
    if (!localStorage.getItem(KEY.users)) {
      db.set(KEY.users, [{
        id: uid('u'), fullName: 'System Administrator', studentStaffID: 'ADM-001',
        email: 'admin@stars.com', phone: '+60 12-345 6789',
        password: hashPw('admin123'), role: 'admin', registrationDate: new Date().toISOString(),
      }]);
    }
    if (!localStorage.getItem(KEY.rooms)) {
      db.set(KEY.rooms, [
        { roomNumber: 'BK-101', roomName: 'Senate Boardroom',     location: 'Block A — Chancellery',     capacity: 24, status: 'Available' },
        { roomNumber: 'BK-102', roomName: 'Faculty Meeting Room', location: 'Block B — Engineering',     capacity: 16, status: 'Available' },
        { roomNumber: 'BK-203', roomName: 'Innovation Lab',       location: 'Block C — FSKTM',           capacity: 30, status: 'Available' },
        { roomNumber: 'BK-301', roomName: 'Discussion Room 1',    location: 'Library — Level 3',         capacity: 8,  status: 'Available' },
        { roomNumber: 'BK-302', roomName: 'Seminar Hall A',       location: 'Block D — Auditorium',      capacity: 120, status: 'Maintenance' },
        { roomNumber: 'BK-401', roomName: 'Postgrad Lounge',      location: 'Block E — Postgraduate',    capacity: 12, status: 'Available' },
      ]);
    }
    if (!localStorage.getItem(KEY.equipment)) {
      db.set(KEY.equipment, [
        { equipmentID: 'EQ-001', equipmentName: 'Projector (Epson EB-X51)', quantity: 8,  availabilityStatus: 'Available' },
        { equipmentID: 'EQ-002', equipmentName: 'Wireless Microphone',       quantity: 12, availabilityStatus: 'Available' },
        { equipmentID: 'EQ-003', equipmentName: 'Whiteboard (Portable)',     quantity: 5,  availabilityStatus: 'Available' },
        { equipmentID: 'EQ-004', equipmentName: 'Laptop (HP EliteBook)',     quantity: 10, availabilityStatus: 'Available' },
        { equipmentID: 'EQ-005', equipmentName: 'HDMI / VGA Adapter Kit',    quantity: 15, availabilityStatus: 'Available' },
      ]);
    }
    if (!localStorage.getItem(KEY.bookings)) db.set(KEY.bookings, []);
    if (!localStorage.getItem(KEY.notifications)) db.set(KEY.notifications, []);
    if (!localStorage.getItem(KEY.settings)) db.set(KEY.settings, { systemName: 'STARS — UTHM', timezone: 'Asia/Kuala_Lumpur', allowRegistration: true });
  }

  // ----- Session -----
  function currentUser() { return db.get(KEY.session, null); }
  function setSession(u) { db.set(KEY.session, u); }
  function logout() { localStorage.removeItem(KEY.session); window.location.href = 'login.html'; }
  function requireAuth(role) {
    const u = currentUser();
    if (!u) { window.location.replace('login.html'); return null; }
    if (role && u.role !== role) { window.location.replace(u.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html'); return null; }
    return u;
  }

  // ----- Theme -----
  function applyTheme() {
    const t = localStorage.getItem(KEY.theme) || 'light';
    document.documentElement.setAttribute('data-theme', t);
  }
  function toggleTheme() {
    const t = (localStorage.getItem(KEY.theme) || 'light') === 'light' ? 'dark' : 'light';
    localStorage.setItem(KEY.theme, t); applyTheme();
    document.querySelectorAll('.theme-ic').forEach(i => i.className = `theme-ic fa-solid ${t === 'dark' ? 'fa-sun' : 'fa-moon'}`);
  }

  // ----- Notifications -----
  function pushNotif(message, type = 'info', forUserId = null) {
    const arr = db.get(KEY.notifications);
    arr.unshift({ notificationID: uid('n'), message, type, date: new Date().toISOString(), forUserId });
    db.set(KEY.notifications, arr);
  }
  function getNotifs(userId) {
    return db.get(KEY.notifications).filter(n => !n.forUserId || n.forUserId === userId).slice(0, 20);
  }

  // ----- Auth: login + register -----
  function login(email, password, role) {
    const users = db.get(KEY.users);
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === hashPw(password) && x.role === role);
    if (!u) return { ok: false, error: 'Invalid credentials or role mismatch.' };
    setSession({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, studentStaffID: u.studentStaffID });
    return { ok: true, user: u };
  }
  function register(data) {
    const users = db.get(KEY.users);
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) return { ok: false, error: 'Email already registered.' };
    const u = { id: uid('u'), ...data, password: hashPw(data.password), role: 'user', registrationDate: new Date().toISOString() };
    users.push(u); db.set(KEY.users, users);
    return { ok: true, user: u };
  }

  // ============================================================
  //                     APP SHELL RENDERER
  // ============================================================
  const NAV = {
    user: [
      { id: 'dashboard',  label: 'Dashboard',      icon: 'fa-gauge-high' },
      { id: 'rooms',      label: 'Rooms',          icon: 'fa-door-open' },
      { id: 'bookings',   label: 'My Bookings',    icon: 'fa-calendar-check' },
      { id: 'newbooking', label: 'New Booking',    icon: 'fa-square-plus' },
      { id: 'equipment',  label: 'Equipment',      icon: 'fa-toolbox' },
      { id: 'reports',    label: 'My Reports',     icon: 'fa-file-lines' },
      { id: 'profile',    label: 'Profile',        icon: 'fa-user' },
      { id: 'settings',   label: 'Settings',       icon: 'fa-gear' },
    ],
    admin: [
      { id: 'dashboard',  label: 'Dashboard',      icon: 'fa-gauge-high' },
      { id: 'analytics',  label: 'Analytics',      icon: 'fa-chart-line' },
      { id: 'bookings',   label: 'All Bookings',   icon: 'fa-calendar-days' },
      { id: 'rooms',      label: 'Rooms',          icon: 'fa-door-open' },
      { id: 'equipment',  label: 'Equipment',      icon: 'fa-toolbox' },
      { id: 'users',      label: 'Users',          icon: 'fa-users' },
      { id: 'reports',    label: 'Reports',        icon: 'fa-file-export' },
      { id: 'profile',    label: 'Profile',        icon: 'fa-user' },
      { id: 'settings',   label: 'Settings',       icon: 'fa-gear' },
    ],
  };

  function initials(name) { return (name || '?').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase(); }

  function renderShell(user) {
    const items = NAV[user.role];
    const start = location.hash.replace('#','') || 'dashboard';
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-brand">
            <div class="logo-mark"><i class="fa-solid fa-graduation-cap"></i></div>
            <div>
              <div class="name">STARS</div>
              <div class="role">${user.role === 'admin' ? 'Admin Portal' : 'User Portal'}</div>
            </div>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-section">Workspace</div>
            ${items.map(i => `<a class="nav-link ${i.id===start?'active':''}" data-nav="${i.id}"><i class="fa-solid ${i.icon}"></i><span>${i.label}</span></a>`).join('')}
            <div class="nav-section mt-2">Account</div>
            <a class="nav-link" id="navLogout"><i class="fa-solid fa-right-from-bracket"></i><span>Sign out</span></a>
          </nav>
          <div class="sidebar-foot">© ${new Date().getFullYear()} UTHM · STARS v1.0</div>
        </aside>
        <div class="main">
          <header class="topbar">
            <button class="icon-btn mobile-toggle" id="btnSidebar"><i class="fa-solid fa-bars"></i></button>
            <div class="page-title" id="pageTitle">Dashboard</div>
            <div class="spacer"></div>
            <div class="search">
              <i class="fa-solid fa-magnifying-glass text-muted"></i>
              <input id="globalSearch" placeholder="Search rooms, bookings…" />
            </div>
            <button class="icon-btn" id="btnTheme" title="Toggle theme"><i class="theme-ic fa-solid fa-moon"></i></button>
            <div class="dropdown" id="ddNotif">
              <button class="icon-btn"><i class="fa-solid fa-bell"></i><span class="badge-dot"></span></button>
              <div class="dropdown-menu" id="notifMenu" style="min-width:320px"></div>
            </div>
            <div class="dropdown" id="ddUser">
              <div class="user-chip">
                <div class="avatar">${initials(user.fullName)}</div>
                <div class="meta"><div class="name">${escapeHTML(user.fullName)}</div><div class="role">${user.role}</div></div>
                <i class="fa-solid fa-chevron-down text-muted" style="font-size:.7rem;margin-right:.25rem"></i>
              </div>
              <div class="dropdown-menu">
                <div class="dropdown-item" data-nav="profile"><i class="fa-solid fa-user"></i> My Profile</div>
                <div class="dropdown-item" data-nav="settings"><i class="fa-solid fa-gear"></i> Settings</div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" id="ddLogout"><i class="fa-solid fa-right-from-bracket"></i> Sign out</div>
              </div>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>
      <div class="modal-backdrop" id="modal"><div class="modal" id="modalBox"></div></div>
    `;

    // Event wiring
    document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', e => {
      const id = el.getAttribute('data-nav'); go(id);
    }));
    document.getElementById('navLogout').addEventListener('click', () => confirmLogout());
    document.getElementById('ddLogout').addEventListener('click', () => confirmLogout());
    document.getElementById('btnTheme').addEventListener('click', toggleTheme);
    document.getElementById('btnSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    ['ddNotif','ddUser'].forEach(id => {
      const el = document.getElementById(id);
      el.querySelector('.icon-btn, .user-chip').addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown.open').forEach(d => d !== el && d.classList.remove('open'));
        el.classList.toggle('open');
      });
    });
    document.addEventListener('click', () => document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open')));
    document.getElementById('globalSearch').addEventListener('input', e => { window.__search = e.target.value; if(window.__renderPage) window.__renderPage(); });
    renderNotifMenu(user);

    window.go = go;
    function go(id) {
      window.__search = '';
      document.getElementById('globalSearch').value = '';
      document.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n.getAttribute('data-nav') === id && n.classList.contains('nav-link')));
      location.hash = id;
      const title = (NAV[user.role].find(x => x.id === id) || {label: 'Profile'}).label;
      document.getElementById('pageTitle').textContent = title;
      document.getElementById('sidebar').classList.remove('open');
      const fn = PAGES[user.role][id] || PAGES.shared[id];
      const c = document.getElementById('content');
      c.innerHTML = '<div class="center"><div class="spinner"></div></div>';
      setTimeout(() => { fn ? fn(user, c) : (c.innerHTML = '<div class="empty"><i class="fa-solid fa-folder-open"></i><div>Page not found.</div></div>'); }, 80);
    }
    window.addEventListener('hashchange', () => go(location.hash.replace('#','') || 'dashboard'));
    go(start);
  }

  function renderNotifMenu(user) {
    const notifs = getNotifs(user.id);
    const html = notifs.length ? notifs.map(n => `
      <div class="dropdown-item" style="align-items:flex-start;flex-direction:column;gap:.15rem">
        <div style="font-size:.85rem"><i class="fa-solid ${n.type==='success'?'fa-circle-check':n.type==='danger'?'fa-circle-xmark':'fa-circle-info'}"></i> ${escapeHTML(n.message)}</div>
        <div class="text-muted" style="font-size:.7rem">${fmtDateTime(n.date)}</div>
      </div>`).join('<div class="dropdown-divider"></div>')
      : '<div class="empty" style="padding:1.25rem"><i class="fa-regular fa-bell-slash"></i><div>No notifications yet</div></div>';
    document.getElementById('notifMenu').innerHTML = `<div style="padding:.5rem .7rem;font-weight:600">Notifications</div><div class="dropdown-divider"></div>${html}`;
  }

  function confirmLogout() {
    Swal.fire({ title:'Sign out?', text:'You will need to sign in again.', icon:'question', showCancelButton:true, confirmButtonText:'Yes, sign out', confirmButtonColor:'#0F4C81' })
      .then(r => { if (r.isConfirmed) logout(); });
  }

  // ----- Modal helpers -----
  function openModal(title, bodyHTML, opts = {}) {
    const m = document.getElementById('modal'), b = document.getElementById('modalBox');
    b.innerHTML = `
      <div class="modal-h"><h3>${escapeHTML(title)}</h3><button class="icon-btn" id="mClose"><i class="fa-solid fa-xmark"></i></button></div>
      <div id="mBody">${bodyHTML}</div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="mCancel">${opts.cancelText || 'Cancel'}</button>
        <button class="btn btn-primary" id="mOk">${opts.okText || 'Save'}</button>
      </div>`;
    m.classList.add('open');
    return new Promise(res => {
      const close = (v) => { m.classList.remove('open'); res(v); };
      b.querySelector('#mClose').onclick = () => close(null);
      b.querySelector('#mCancel').onclick = () => close(null);
      b.querySelector('#mOk').onclick = () => res({ ok: true, close: () => m.classList.remove('open') });
    });
  }
  function closeModal() { document.getElementById('modal').classList.remove('open'); }

  // ============================================================
  //                          PAGES
  // ============================================================
  const PAGES = { user: {}, admin: {}, shared: {} };

  // ----------- USER: DASHBOARD -----------
  PAGES.user.dashboard = (user, c) => {
    const bookings = db.get(KEY.bookings).filter(b => b.applicantID === user.id);
    const rooms = db.get(KEY.rooms);
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.bookingStatus === 'Pending').length,
      approved: bookings.filter(b => b.bookingStatus === 'Approved').length,
      rejected: bookings.filter(b => b.bookingStatus === 'Rejected').length,
      available: rooms.filter(r => r.status === 'Available').length,
    };
    c.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Welcome back, ${escapeHTML(user.fullName.split(' ')[0])} 👋</h1>
          <div class="sub">Here's what's happening with your room bookings today.</div>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-outline" onclick="go('rooms')"><i class="fa-solid fa-magnifying-glass"></i> View Rooms</button>
          <button class="btn btn-primary" onclick="go('newbooking')"><i class="fa-solid fa-plus"></i> New Booking</button>
        </div>
      </div>
      <div class="stat-grid">
        ${statCard('b1','fa-calendar-check','Total Bookings', stats.total)}
        ${statCard('b2','fa-hourglass-half','Pending', stats.pending)}
        ${statCard('b3','fa-circle-check','Approved', stats.approved)}
        ${statCard('b4','fa-circle-xmark','Rejected', stats.rejected)}
        ${statCard('b5','fa-door-open','Available Rooms', stats.available)}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-h"><h3>Recent Bookings</h3><a onclick="go('bookings')" style="cursor:pointer">View all <i class="fa-solid fa-arrow-right"></i></a></div>
          ${bookingsTable(bookings.slice(0,5), { showRoom:true, showStatus:true, empty:'No bookings yet. Click <b>New Booking</b> to get started.' })}
        </div>
        <div class="card">
          <div class="card-h"><h3>This Month</h3></div>
          ${miniCalendar(bookings)}
        </div>
      </div>
      <div class="grid-2 mt-3">
        <div class="card">
          <div class="card-h"><h3>Recent Activity</h3></div>
          ${activityList(user)}
        </div>
        <div class="card">
          <div class="card-h"><h3>Quick Actions</h3></div>
          <div class="flex gap-1" style="flex-wrap:wrap">
            <button class="btn btn-outline" onclick="go('newbooking')"><i class="fa-solid fa-square-plus"></i> Book a Room</button>
            <button class="btn btn-outline" onclick="go('equipment')"><i class="fa-solid fa-toolbox"></i> Borrow Equipment</button>
            <button class="btn btn-outline" onclick="go('bookings')"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
            <button class="btn btn-outline" onclick="go('profile')"><i class="fa-solid fa-user-pen"></i> Edit Profile</button>
          </div>
        </div>
      </div>
    `;
    window.__renderPage = () => PAGES.user.dashboard(user, c);
  };

  // ----------- USER: ROOMS / NEW BOOKING / BOOKINGS / EQUIPMENT -----------
  PAGES.user.rooms = (user, c) => {
    const rooms = db.get(KEY.rooms);
    const q = (window.__search || '').toLowerCase();
    let locs = [...new Set(rooms.map(r => r.location))];
    const fLoc = window.__fLoc || '';
    const fCap = window.__fCap || '';
    let list = rooms.filter(r =>
      (r.roomNumber + r.roomName + r.location).toLowerCase().includes(q)
      && (!fLoc || r.location === fLoc)
      && (!fCap || r.capacity >= +fCap)
    );
    c.innerHTML = `
      <div class="page-head"><div><h1>Meeting Rooms</h1><div class="sub">Browse available rooms across the campus.</div></div></div>
      <div class="toolbar">
        <select class="form-control" id="fLoc" style="max-width:220px"><option value="">All locations</option>${locs.map(l => `<option ${fLoc===l?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select>
        <select class="form-control" id="fCap" style="max-width:200px">
          <option value="">Any capacity</option>
          <option ${fCap==='8'?'selected':''} value="8">8+</option>
          <option ${fCap==='16'?'selected':''} value="16">16+</option>
          <option ${fCap==='30'?'selected':''} value="30">30+</option>
          <option ${fCap==='50'?'selected':''} value="50">50+</option>
        </select>
      </div>
      <div class="grid-3">
        ${list.length ? list.map(r => roomCard(r, user.role === 'user')).join('') : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-door-closed"></i><div>No rooms match your filters.</div></div>`}
      </div>`;
    document.getElementById('fLoc').addEventListener('change', e => { window.__fLoc = e.target.value; PAGES.user.rooms(user,c); });
    document.getElementById('fCap').addEventListener('change', e => { window.__fCap = e.target.value; PAGES.user.rooms(user,c); });
    document.querySelectorAll('[data-book-room]').forEach(b => b.addEventListener('click', () => { window.__preselectRoom = b.dataset.bookRoom; go('newbooking'); }));
    window.__renderPage = () => PAGES.user.rooms(user, c);
  };

  PAGES.user.newbooking = (user, c) => {
    const rooms = db.get(KEY.rooms).filter(r => r.status === 'Available');
    const equipment = db.get(KEY.equipment).filter(e => e.availabilityStatus === 'Available' && e.quantity > 0);
    const pre = window.__preselectRoom || '';
    window.__preselectRoom = '';
    c.innerHTML = `
      <div class="page-head"><div><h1>Submit Booking Request</h1><div class="sub">Reserve a meeting room and optionally borrow equipment.</div></div></div>
      <div class="card" style="max-width:840px">
        <form id="bookForm">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Meeting / Event Name *</label><input class="form-control" name="meetingName" required maxlength="120" /></div>
            <div class="form-group"><label class="form-label">Chairman / Person In Charge *</label><input class="form-control" name="chairmanName" value="${escapeHTML(user.fullName)}" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Meeting Room *</label>
              <select class="form-control" name="roomNumber" required>
                <option value="">Select a room…</option>
                ${rooms.map(r => `<option value="${r.roomNumber}" ${pre===r.roomNumber?'selected':''}>${r.roomNumber} — ${escapeHTML(r.roomName)} (cap ${r.capacity})</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Expected Attendees *</label><input type="number" class="form-control" name="memberCount" min="1" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Date *</label><input type="date" class="form-control" name="meetingDate" min="${todayISO()}" required /></div>
            <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
              <div><label class="form-label">Start *</label><input type="time" class="form-control" name="startTime" required /></div>
              <div><label class="form-label">End *</label><input type="time" class="form-control" name="endTime" required /></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Borrow Equipment (optional)</label>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.5rem">
              ${equipment.map(e => `<label class="checkbox" style="padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px"><input type="checkbox" name="equipment" value="${e.equipmentID}"> ${escapeHTML(e.equipmentName)}</label>`).join('') || '<div class="text-muted text-sm">No equipment currently available.</div>'}
            </div>
          </div>
          <div class="form-group"><label class="form-label">Remarks</label><textarea class="form-control" rows="3" name="remarks" maxlength="500"></textarea></div>
          <div class="flex gap-1 justify-between">
            <button type="button" class="btn btn-outline" onclick="go('dashboard')"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Submit Request</button>
          </div>
        </form>
      </div>`;
    document.getElementById('bookForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target); const o = Object.fromEntries(f);
      if (o.endTime <= o.startTime) return toast('error','End time must be after start time.');
      const equip = f.getAll('equipment');
      const list = db.get(KEY.bookings);
      list.unshift({
        bookingNumber: 'BK' + Date.now().toString().slice(-7),
        meetingName: o.meetingName, chairmanName: o.chairmanName,
        meetingDate: o.meetingDate, startTime: o.startTime, endTime: o.endTime,
        memberCount: +o.memberCount, roomNumber: o.roomNumber, equipment: equip,
        applicantID: user.id, applicantName: user.fullName,
        bookingStatus: 'Pending', remarks: o.remarks, createdAt: new Date().toISOString(),
      });
      db.set(KEY.bookings, list);
      pushNotif(`New booking request submitted for ${o.roomNumber}`, 'info');
      Swal.fire({ icon:'success', title:'Booking submitted!', text:'Your request is now pending admin approval.', confirmButtonColor:'#0F4C81' }).then(() => go('bookings'));
    });
  };

  PAGES.user.bookings = (user, c) => {
    const all = db.get(KEY.bookings).filter(b => b.applicantID === user.id);
    const q = (window.__search || '').toLowerCase();
    const fStatus = window.__fStatus || '';
    const list = all.filter(b => (b.meetingName+b.bookingNumber+b.roomNumber).toLowerCase().includes(q) && (!fStatus || b.bookingStatus===fStatus));
    c.innerHTML = `
      <div class="page-head"><div><h1>My Bookings</h1><div class="sub">Track the status of every booking you've made.</div></div>
        <button class="btn btn-primary" onclick="go('newbooking')"><i class="fa-solid fa-plus"></i> New Booking</button></div>
      <div class="toolbar">
        <select class="form-control" id="fStatus" style="max-width:200px">
          <option value="">All statuses</option>
          ${['Pending','Approved','Rejected','Cancelled','Completed'].map(s=>`<option ${fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      ${bookingsTable(list, { showRoom:true, showStatus:true, showCancel:true, empty:'No bookings yet.' })}
    `;
    document.getElementById('fStatus').addEventListener('change', e=>{ window.__fStatus=e.target.value; PAGES.user.bookings(user,c); });
    bindBookingRowEvents(user);
    window.__renderPage = () => PAGES.user.bookings(user, c);
  };

  PAGES.user.equipment = (user, c) => {
    const list = db.get(KEY.equipment);
    const q = (window.__search||'').toLowerCase();
    const f = list.filter(e => (e.equipmentName+e.equipmentID).toLowerCase().includes(q));
    c.innerHTML = `
      <div class="page-head"><div><h1>Equipment Catalog</h1><div class="sub">Borrow equipment together with your room booking.</div></div></div>
      <div class="grid-3">
        ${f.map(e => `
          <div class="card">
            <div class="flex justify-between items-center mb-1">
              <div class="ic" style="width:46px;height:46px;border-radius:12px;background:var(--grad-primary);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-toolbox"></i></div>
              <span class="badge ${e.availabilityStatus==='Available'?'badge-success':'badge-muted'}">${e.availabilityStatus}</span>
            </div>
            <h3>${escapeHTML(e.equipmentName)}</h3>
            <div class="text-muted text-sm">${e.equipmentID} · ${e.quantity} available</div>
            <button class="btn btn-outline btn-block mt-2" onclick="go('newbooking')"><i class="fa-solid fa-cart-plus"></i> Add to Booking</button>
          </div>`).join('') || '<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-toolbox"></i><div>No equipment found.</div></div>'}
      </div>`;
    window.__renderPage = () => PAGES.user.equipment(user,c);
  };

  PAGES.user.reports = (user, c) => {
    const bookings = db.get(KEY.bookings).filter(b => b.applicantID === user.id);
    c.innerHTML = reportsView('My Activity Reports', bookings, user);
    bindReportEvents(bookings, 'my-bookings');
  };

  // ----------- ADMIN PAGES -----------
  PAGES.admin.dashboard = (user, c) => {
    const bookings = db.get(KEY.bookings), users = db.get(KEY.users), rooms = db.get(KEY.rooms), equip = db.get(KEY.equipment);
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b=>b.bookingStatus==='Pending').length,
      approved: bookings.filter(b=>b.bookingStatus==='Approved').length,
      rooms: rooms.length, users: users.filter(u=>u.role==='user').length, equip: equip.length,
    };
    c.innerHTML = `
      <div class="page-head">
        <div><h1>Admin Overview</h1><div class="sub">System-wide statistics and the latest booking requests.</div></div>
        <div class="flex gap-1"><button class="btn btn-outline" onclick="go('analytics')"><i class="fa-solid fa-chart-pie"></i> Analytics</button>
        <button class="btn btn-primary" onclick="go('bookings')"><i class="fa-solid fa-list-check"></i> Review Requests</button></div>
      </div>
      <div class="stat-grid">
        ${statCard('b1','fa-calendar','Total Bookings', stats.total)}
        ${statCard('b2','fa-hourglass-half','Pending Approval', stats.pending)}
        ${statCard('b3','fa-circle-check','Approved', stats.approved)}
        ${statCard('b5','fa-door-open','Rooms', stats.rooms)}
        ${statCard('b4','fa-toolbox','Equipment', stats.equip)}
        ${statCard('b1','fa-users','Registered Users', stats.users)}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-h"><h3>Booking Status Breakdown</h3></div>
          <canvas id="chartStatus" height="220"></canvas>
        </div>
        <div class="card">
          <div class="card-h"><h3>Top Rooms Used</h3></div>
          <canvas id="chartRooms" height="220"></canvas>
        </div>
      </div>
      <div class="card mt-3">
        <div class="card-h"><h3>Latest Requests</h3><a onclick="go('bookings')" style="cursor:pointer">Manage all <i class="fa-solid fa-arrow-right"></i></a></div>
        ${bookingsTable(bookings.slice(0,6), { showRoom:true, showUser:true, showStatus:true, showApprove:true, empty:'No bookings yet.' })}
      </div>
    `;
    bindBookingRowEvents(user);
    renderStatusChart('chartStatus', bookings);
    renderRoomsChart('chartRooms', bookings);
    window.__renderPage = () => PAGES.admin.dashboard(user, c);
  };

  PAGES.admin.analytics = (user, c) => {
    const bookings = db.get(KEY.bookings);
    c.innerHTML = `
      <div class="page-head"><div><h1>Analytics Dashboard</h1><div class="sub">Real-time visualisation of bookings, rooms and user activity.</div></div></div>
      <div class="grid-2">
        <div class="card"><div class="card-h"><h3>Monthly Booking Volume</h3></div><canvas id="cMonthly" height="220"></canvas></div>
        <div class="card"><div class="card-h"><h3>Status Distribution</h3></div><canvas id="cStatus" height="220"></canvas></div>
      </div>
      <div class="grid-2 mt-3">
        <div class="card"><div class="card-h"><h3>Most Used Rooms</h3></div><canvas id="cRooms" height="220"></canvas></div>
        <div class="card"><div class="card-h"><h3>User Activity (last 14 days)</h3></div><canvas id="cTrend" height="220"></canvas></div>
      </div>`;
    renderMonthlyChart('cMonthly', bookings);
    renderStatusChart('cStatus', bookings);
    renderRoomsChart('cRooms', bookings);
    renderTrendChart('cTrend', bookings);
  };

  PAGES.admin.bookings = (user, c) => {
    const all = db.get(KEY.bookings);
    const q = (window.__search||'').toLowerCase();
    const fStatus = window.__fStatus || '';
    const list = all.filter(b => (b.meetingName+b.bookingNumber+b.roomNumber+(b.applicantName||'')).toLowerCase().includes(q) && (!fStatus || b.bookingStatus===fStatus));
    c.innerHTML = `
      <div class="page-head"><div><h1>All Bookings</h1><div class="sub">Approve, reject or update any booking request.</div></div></div>
      <div class="toolbar">
        <select class="form-control" id="fStatus" style="max-width:200px">
          <option value="">All statuses</option>
          ${['Pending','Approved','Rejected','Cancelled','Completed'].map(s=>`<option ${fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      ${bookingsTable(list, { showRoom:true, showUser:true, showStatus:true, showApprove:true, showStatusEdit:true, empty:'No bookings.' })}
    `;
    document.getElementById('fStatus').addEventListener('change',e=>{window.__fStatus=e.target.value;PAGES.admin.bookings(user,c);});
    bindBookingRowEvents(user);
    window.__renderPage = () => PAGES.admin.bookings(user, c);
  };

  PAGES.admin.rooms = (user, c) => {
    const rooms = db.get(KEY.rooms);
    const q = (window.__search||'').toLowerCase();
    const list = rooms.filter(r => (r.roomNumber+r.roomName+r.location).toLowerCase().includes(q));
    c.innerHTML = `
      <div class="page-head"><div><h1>Manage Rooms</h1><div class="sub">Add, edit or remove rooms in the system.</div></div>
        <button class="btn btn-primary" id="addRoom"><i class="fa-solid fa-plus"></i> Add Room</button></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Room No.</th><th>Name</th><th>Location</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map(r => `
          <tr><td><b>${r.roomNumber}</b></td><td>${escapeHTML(r.roomName)}</td><td>${escapeHTML(r.location)}</td><td>${r.capacity}</td>
          <td>${statusBadge(r.status)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit-room="${r.roomNumber}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn" data-del-room="${r.roomNumber}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div></td></tr>`).join('') || `<tr><td colspan="6"><div class="empty"><i class="fa-solid fa-door-closed"></i><div>No rooms.</div></div></td></tr>`}
        </tbody></table></div>`;
    document.getElementById('addRoom').onclick = () => roomDialog(null, () => PAGES.admin.rooms(user,c));
    document.querySelectorAll('[data-edit-room]').forEach(b => b.onclick = () => roomDialog(b.dataset.editRoom, () => PAGES.admin.rooms(user,c)));
    document.querySelectorAll('[data-del-room]').forEach(b => b.onclick = () => {
      Swal.fire({title:'Delete room?',icon:'warning',showCancelButton:true,confirmButtonColor:'#DC3545'}).then(r => {
        if (r.isConfirmed) { db.set(KEY.rooms, db.get(KEY.rooms).filter(x => x.roomNumber !== b.dataset.delRoom)); toast('success','Room deleted'); PAGES.admin.rooms(user,c); }
      });
    });
    window.__renderPage = () => PAGES.admin.rooms(user, c);
  };

  PAGES.admin.equipment = (user, c) => {
    const list = db.get(KEY.equipment);
    const q = (window.__search||'').toLowerCase();
    const f = list.filter(e => (e.equipmentName+e.equipmentID).toLowerCase().includes(q));
    c.innerHTML = `
      <div class="page-head"><div><h1>Manage Equipment</h1><div class="sub">Inventory of borrowable equipment.</div></div>
        <button class="btn btn-primary" id="addEq"><i class="fa-solid fa-plus"></i> Add Equipment</button></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Equipment</th><th>Quantity</th><th>Status</th><th></th></tr></thead>
        <tbody>${f.map(e => `
          <tr><td><b>${e.equipmentID}</b></td><td>${escapeHTML(e.equipmentName)}</td><td>${e.quantity}</td>
          <td>${statusBadge(e.availabilityStatus)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit-eq="${e.equipmentID}"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn" data-del-eq="${e.equipmentID}"><i class="fa-solid fa-trash"></i></button>
          </div></td></tr>`).join('') || `<tr><td colspan="5"><div class="empty"><i class="fa-solid fa-toolbox"></i><div>No equipment yet.</div></div></td></tr>`}
        </tbody></table></div>`;
    document.getElementById('addEq').onclick = () => equipDialog(null, () => PAGES.admin.equipment(user,c));
    document.querySelectorAll('[data-edit-eq]').forEach(b => b.onclick = () => equipDialog(b.dataset.editEq, () => PAGES.admin.equipment(user,c)));
    document.querySelectorAll('[data-del-eq]').forEach(b => b.onclick = () => {
      Swal.fire({title:'Delete equipment?',icon:'warning',showCancelButton:true,confirmButtonColor:'#DC3545'}).then(r => {
        if (r.isConfirmed) { db.set(KEY.equipment, db.get(KEY.equipment).filter(x => x.equipmentID !== b.dataset.delEq)); toast('success','Equipment deleted'); PAGES.admin.equipment(user,c); }
      });
    });
    window.__renderPage = () => PAGES.admin.equipment(user, c);
  };

  PAGES.admin.users = (user, c) => {
    const list = db.get(KEY.users);
    const q = (window.__search||'').toLowerCase();
    const f = list.filter(u => (u.fullName+u.email+u.studentStaffID).toLowerCase().includes(q));
    c.innerHTML = `
      <div class="page-head"><div><h1>Manage Users</h1><div class="sub">All registered users and admins.</div></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>User</th><th>ID</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>${f.map(u => `
          <tr><td><div class="flex gap-1 items-center"><div class="avatar">${initials(u.fullName)}</div><b>${escapeHTML(u.fullName)}</b></div></td>
          <td>${escapeHTML(u.studentStaffID)}</td><td>${escapeHTML(u.email)}</td><td>${escapeHTML(u.phone||'—')}</td>
          <td><span class="badge ${u.role==='admin'?'badge-info':'badge-muted'}">${u.role}</span></td>
          <td>${fmtDate(u.registrationDate)}</td>
          <td><div class="row-actions">
            ${u.role!=='admin' ? `<button class="icon-btn" data-del-user="${u.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div></td></tr>`).join('')}
        </tbody></table></div>`;
    document.querySelectorAll('[data-del-user]').forEach(b => b.onclick = () => {
      Swal.fire({title:'Delete user?',text:'This cannot be undone.',icon:'warning',showCancelButton:true,confirmButtonColor:'#DC3545'}).then(r=>{
        if (r.isConfirmed){ db.set(KEY.users, db.get(KEY.users).filter(x=>x.id!==b.dataset.delUser)); toast('success','User removed'); PAGES.admin.users(user,c); }
      });
    });
    window.__renderPage = () => PAGES.admin.users(user, c);
  };

  PAGES.admin.reports = (user, c) => {
    const bookings = db.get(KEY.bookings);
    c.innerHTML = reportsView('System Reports', bookings, user);
    bindReportEvents(bookings, 'all-bookings');
  };

  // ----------- SHARED PAGES -----------
  PAGES.shared.profile = (user, c) => {
    const u = db.get(KEY.users).find(x => x.id === user.id);
    c.innerHTML = `
      <div class="page-head"><div><h1>My Profile</h1><div class="sub">Update your personal information.</div></div></div>
      <div class="grid-2">
        <div class="card">
          <div class="flex gap-2 items-center mb-2">
            <div class="avatar" style="width:64px;height:64px;font-size:1.4rem">${initials(u.fullName)}</div>
            <div><h3>${escapeHTML(u.fullName)}</h3><div class="text-muted">${escapeHTML(u.email)} · <span class="badge badge-info">${u.role}</span></div></div>
          </div>
          <form id="profForm">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" name="fullName" value="${escapeHTML(u.fullName)}" required></div>
              <div class="form-group"><label class="form-label">Student / Staff ID</label><input class="form-control" name="studentStaffID" value="${escapeHTML(u.studentStaffID)}" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Email</label><input class="form-control" name="email" type="email" value="${escapeHTML(u.email)}" required></div>
              <div class="form-group"><label class="form-label">Phone</label><input class="form-control" name="phone" value="${escapeHTML(u.phone||'')}"></div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
          </form>
        </div>
        <div class="card">
          <div class="card-h"><h3>Change Password</h3></div>
          <form id="pwForm">
            <div class="form-group"><label class="form-label">Current Password</label><input class="form-control" type="password" name="current" required></div>
            <div class="form-group"><label class="form-label">New Password</label><input class="form-control" type="password" name="next" minlength="6" required></div>
            <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-control" type="password" name="confirm" minlength="6" required></div>
            <button type="submit" class="btn btn-outline"><i class="fa-solid fa-key"></i> Update Password</button>
          </form>
        </div>
      </div>`;
    document.getElementById('profForm').addEventListener('submit', e => {
      e.preventDefault();
      const o = Object.fromEntries(new FormData(e.target));
      const users = db.get(KEY.users);
      const i = users.findIndex(x => x.id === user.id);
      users[i] = { ...users[i], ...o };
      db.set(KEY.users, users);
      setSession({ ...user, ...o });
      toast('success','Profile updated');
      renderShell({ ...user, ...o });
    });
    document.getElementById('pwForm').addEventListener('submit', e => {
      e.preventDefault();
      const o = Object.fromEntries(new FormData(e.target));
      const users = db.get(KEY.users); const i = users.findIndex(x => x.id === user.id);
      if (users[i].password !== hashPw(o.current)) return toast('error','Current password incorrect');
      if (o.next !== o.confirm) return toast('error','Passwords do not match');
      users[i].password = hashPw(o.next); db.set(KEY.users, users); e.target.reset(); toast('success','Password updated');
    });
  };

  PAGES.shared.settings = (user, c) => {
    const s = db.get(KEY.settings, {});
    const theme = localStorage.getItem(KEY.theme) || 'light';
    c.innerHTML = `
      <div class="page-head"><div><h1>Settings</h1><div class="sub">Preferences and system configuration.</div></div></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-h"><h3>Appearance</h3></div>
          <div class="form-group"><label class="form-label">Theme</label>
            <select class="form-control" id="themeSel">
              <option value="light" ${theme==='light'?'selected':''}>Light</option>
              <option value="dark"  ${theme==='dark' ?'selected':''}>Dark</option>
            </select>
          </div>
        </div>
        ${user.role==='admin' ? `
        <div class="card">
          <div class="card-h"><h3>System</h3></div>
          <form id="sysForm">
            <div class="form-group"><label class="form-label">System Name</label><input class="form-control" name="systemName" value="${escapeHTML(s.systemName||'STARS')}"></div>
            <div class="form-group"><label class="form-label">Timezone</label><input class="form-control" name="timezone" value="${escapeHTML(s.timezone||'Asia/Kuala_Lumpur')}"></div>
            <div class="form-group"><label class="checkbox"><input type="checkbox" name="allowRegistration" ${s.allowRegistration?'checked':''}> Allow new user registration</label></div>
            <button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
          </form>
        </div>` : `
        <div class="card">
          <div class="card-h"><h3>About</h3></div>
          <p class="text-muted text-sm">STARS — Student Attendance & Room Scheduling System. Built as a UTHM university platform demonstration. All data is stored locally in your browser.</p>
        </div>`}
      </div>`;
    document.getElementById('themeSel').addEventListener('change', e => { localStorage.setItem(KEY.theme, e.target.value); applyTheme(); });
    const sf = document.getElementById('sysForm');
    if (sf) sf.addEventListener('submit', e => {
      e.preventDefault();
      const o = Object.fromEntries(new FormData(e.target)); o.allowRegistration = !!o.allowRegistration;
      db.set(KEY.settings, o); toast('success','Settings saved');
    });
  };

  // ============================================================
  //                  Renderable building blocks
  // ============================================================
  function statCard(tone, icon, label, value, delta) {
    return `<div class="stat"><div class="ic ${tone}"><i class="fa-solid ${icon}"></i></div>
      <div class="l">${label}</div><div class="v">${value}</div>${delta?`<div class="d"><i class="fa-solid fa-arrow-trend-up"></i> ${delta}</div>`:''}</div>`;
  }
  function statusBadge(s) {
    const m = {
      Available:'badge-success', Maintenance:'badge-warning', Unavailable:'badge-danger',
      Pending:'badge-warning', Approved:'badge-success', Rejected:'badge-danger', Cancelled:'badge-muted', Completed:'badge-info',
    };
    return `<span class="badge ${m[s]||'badge-muted'}">${s}</span>`;
  }
  function roomCard(r, canBook) {
    return `<div class="card">
      <div class="flex justify-between items-center mb-1">
        <div class="ic" style="width:46px;height:46px;border-radius:12px;background:var(--grad-primary);color:#fff;display:grid;place-items:center"><i class="fa-solid fa-door-open"></i></div>
        ${statusBadge(r.status)}
      </div>
      <h3>${escapeHTML(r.roomName)}</h3>
      <div class="text-muted text-sm"><i class="fa-solid fa-hashtag"></i> ${r.roomNumber} · <i class="fa-solid fa-location-dot"></i> ${escapeHTML(r.location)}</div>
      <div class="text-sm mt-1"><i class="fa-solid fa-users"></i> Capacity: <b>${r.capacity}</b></div>
      ${canBook && r.status==='Available' ? `<button class="btn btn-primary btn-block mt-2" data-book-room="${r.roomNumber}"><i class="fa-solid fa-calendar-plus"></i> Book This Room</button>` : ''}
    </div>`;
  }
  function bookingsTable(list, opts={}) {
    if (!list.length) return `<div class="empty"><i class="fa-regular fa-calendar"></i><div>${opts.empty||'No records.'}</div></div>`;
    return `<div class="table-wrap"><table class="data">
      <thead><tr>
        <th>Booking #</th><th>Meeting</th>${opts.showUser?'<th>Applicant</th>':''}${opts.showRoom?'<th>Room</th>':''}<th>Date / Time</th>${opts.showStatus?'<th>Status</th>':''}<th></th>
      </tr></thead>
      <tbody>${list.map(b => `
        <tr>
          <td><b>${b.bookingNumber}</b></td>
          <td>${escapeHTML(b.meetingName)}<div class="text-muted text-sm">${escapeHTML(b.chairmanName||'')}</div></td>
          ${opts.showUser?`<td>${escapeHTML(b.applicantName||'—')}</td>`:''}
          ${opts.showRoom?`<td>${b.roomNumber}</td>`:''}
          <td>${fmtDate(b.meetingDate)}<div class="text-muted text-sm">${b.startTime} – ${b.endTime}</div></td>
          ${opts.showStatus?`<td>${statusBadge(b.bookingStatus)}</td>`:''}
          <td><div class="row-actions">
            <button class="icon-btn" data-view="${b.bookingNumber}" title="View"><i class="fa-solid fa-eye"></i></button>
            ${opts.showApprove && b.bookingStatus==='Pending' ? `
              <button class="icon-btn" data-approve="${b.bookingNumber}" title="Approve" style="color:var(--success)"><i class="fa-solid fa-check"></i></button>
              <button class="icon-btn" data-reject="${b.bookingNumber}"  title="Reject"  style="color:var(--danger)"><i class="fa-solid fa-xmark"></i></button>` : ''}
            ${opts.showStatusEdit ? `<button class="icon-btn" data-status="${b.bookingNumber}" title="Update status"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
            ${opts.showCancel && (b.bookingStatus==='Pending'||b.bookingStatus==='Approved') ? `<button class="icon-btn" data-cancel="${b.bookingNumber}" title="Cancel" style="color:var(--danger)"><i class="fa-solid fa-ban"></i></button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>`;
  }
  function activityList(user) {
    const ns = getNotifs(user.id).slice(0,6);
    if (!ns.length) return `<div class="empty"><i class="fa-regular fa-bell"></i><div>No activity yet.</div></div>`;
    return ns.map(n => `<div class="activity">
      <div class="ic"><i class="fa-solid ${n.type==='success'?'fa-circle-check':n.type==='danger'?'fa-circle-xmark':'fa-circle-info'}"></i></div>
      <div><div>${escapeHTML(n.message)}</div><div class="t">${fmtDateTime(n.date)}</div></div></div>`).join('');
  }
  function miniCalendar(bookings) {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth();
    const first = new Date(y,m,1), last = new Date(y,m+1,0);
    const days = [];
    for (let i=0;i<first.getDay();i++) days.push(null);
    for (let d=1;d<=last.getDate();d++) days.push(d);
    const has = new Set(bookings.filter(b => { const x=new Date(b.meetingDate); return x.getMonth()===m && x.getFullYear()===y; }).map(b => new Date(b.meetingDate).getDate()));
    return `<div class="text-muted text-sm mb-1">${first.toLocaleString(undefined,{month:'long',year:'numeric'})}</div>
      <div class="cal">
        ${['S','M','T','W','T','F','S'].map(d=>`<div class="dow">${d}</div>`).join('')}
        ${days.map(d => d===null?'<div class="day muted"></div>':`<div class="day ${d===today.getDate()?'today':''}">${d}${has.has(d)?'<span class="dot"></span>':''}</div>`).join('')}
      </div>`;
  }

  // ----- Bookings: row event binding -----
  function bindBookingRowEvents(user) {
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => viewBooking(b.dataset.view));
    document.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => updateBookingStatus(b.dataset.approve, 'Approved'));
    document.querySelectorAll('[data-reject]').forEach(b  => b.onclick = () => updateBookingStatus(b.dataset.reject,  'Rejected', true));
    document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => updateBookingStatus(b.dataset.cancel, 'Cancelled'));
    document.querySelectorAll('[data-status]').forEach(b => b.onclick = () => editStatus(b.dataset.status));
  }
  function viewBooking(num) {
    const b = db.get(KEY.bookings).find(x => x.bookingNumber === num); if (!b) return;
    const equip = (b.equipment||[]).map(id => (db.get(KEY.equipment).find(e=>e.equipmentID===id)||{}).equipmentName).filter(Boolean);
    Swal.fire({
      title: b.meetingName,
      html: `<div style="text-align:left;font-size:.92rem;line-height:1.7">
        <div><b>Booking #:</b> ${b.bookingNumber}</div>
        <div><b>Applicant:</b> ${escapeHTML(b.applicantName||'—')}</div>
        <div><b>Chairman:</b> ${escapeHTML(b.chairmanName||'—')}</div>
        <div><b>Room:</b> ${b.roomNumber}</div>
        <div><b>Date:</b> ${fmtDate(b.meetingDate)} (${b.startTime}–${b.endTime})</div>
        <div><b>Attendees:</b> ${b.memberCount}</div>
        <div><b>Equipment:</b> ${equip.length?equip.join(', '):'—'}</div>
        <div><b>Status:</b> ${b.bookingStatus}</div>
        <div><b>Remarks:</b> ${escapeHTML(b.remarks||'—')}</div>
      </div>`,
      confirmButtonColor:'#0F4C81'
    });
  }
  function updateBookingStatus(num, status, askRemark=false) {
    const apply = (remark) => {
      const list = db.get(KEY.bookings);
      const i = list.findIndex(x => x.bookingNumber === num); if (i<0) return;
      list[i].bookingStatus = status; if (remark) list[i].remarks = remark;
      db.set(KEY.bookings, list);
      pushNotif(`Booking ${num} ${status.toLowerCase()}`, status==='Approved'?'success':status==='Rejected'?'danger':'info', list[i].applicantID);
      toast('success', `Booking ${status.toLowerCase()}`);
      if (window.__renderPage) window.__renderPage();
    };
    if (askRemark) {
      Swal.fire({title:`Reject booking ${num}?`, input:'textarea', inputLabel:'Reason / remarks', inputPlaceholder:'Tell the user why…', showCancelButton:true, confirmButtonColor:'#DC3545'})
        .then(r => { if (r.isConfirmed) apply(r.value); });
    } else {
      Swal.fire({title:`Mark as ${status}?`, icon:'question', showCancelButton:true, confirmButtonColor:'#0F4C81'})
        .then(r => { if (r.isConfirmed) apply(); });
    }
  }
  function editStatus(num) {
    const b = db.get(KEY.bookings).find(x => x.bookingNumber === num);
    Swal.fire({
      title: `Update status — ${num}`,
      input: 'select', inputOptions: { Pending:'Pending', Approved:'Approved', Rejected:'Rejected', Cancelled:'Cancelled', Completed:'Completed' },
      inputValue: b.bookingStatus, showCancelButton: true, confirmButtonColor:'#0F4C81'
    }).then(r => { if (r.isConfirmed) updateBookingStatus(num, r.value); });
  }

  // ----- Admin dialogs: Room / Equipment -----
  async function roomDialog(roomNumber, refresh) {
    const rooms = db.get(KEY.rooms);
    const r = roomNumber ? rooms.find(x => x.roomNumber === roomNumber) : { roomNumber:'', roomName:'', location:'', capacity:10, status:'Available' };
    const res = await openModal(roomNumber ? 'Edit Room' : 'Add Room', `
      <form id="rForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Room Number *</label><input class="form-control" name="roomNumber" value="${escapeHTML(r.roomNumber)}" ${roomNumber?'readonly':''} required></div>
          <div class="form-group"><label class="form-label">Room Name *</label><input class="form-control" name="roomName" value="${escapeHTML(r.roomName)}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Location *</label><input class="form-control" name="location" value="${escapeHTML(r.location)}" required></div>
          <div class="form-group"><label class="form-label">Capacity *</label><input type="number" class="form-control" name="capacity" min="1" value="${r.capacity}" required></div>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" name="status">${['Available','Maintenance','Unavailable'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
      </form>`);
    if (!res) return;
    const o = Object.fromEntries(new FormData(document.getElementById('rForm')));
    if (!o.roomNumber || !o.roomName) return toast('error','Required fields missing');
    o.capacity = +o.capacity;
    const list = db.get(KEY.rooms);
    if (roomNumber) { const i = list.findIndex(x => x.roomNumber === roomNumber); list[i] = { ...list[i], ...o }; }
    else { if (list.some(x => x.roomNumber === o.roomNumber)) return toast('error','Room number already exists'); list.push(o); }
    db.set(KEY.rooms, list); res.close(); toast('success','Room saved'); refresh();
  }
  async function equipDialog(id, refresh) {
    const list = db.get(KEY.equipment);
    const e = id ? list.find(x => x.equipmentID === id) : { equipmentID:'EQ-'+String(list.length+1).padStart(3,'0'), equipmentName:'', quantity:1, availabilityStatus:'Available' };
    const res = await openModal(id?'Edit Equipment':'Add Equipment', `
      <form id="eForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Equipment ID *</label><input class="form-control" name="equipmentID" value="${escapeHTML(e.equipmentID)}" ${id?'readonly':''} required></div>
          <div class="form-group"><label class="form-label">Name *</label><input class="form-control" name="equipmentName" value="${escapeHTML(e.equipmentName)}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Quantity *</label><input type="number" min="0" class="form-control" name="quantity" value="${e.quantity}" required></div>
          <div class="form-group"><label class="form-label">Status</label><select class="form-control" name="availabilityStatus">${['Available','Unavailable'].map(s=>`<option ${e.availabilityStatus===s?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>
      </form>`);
    if (!res) return;
    const o = Object.fromEntries(new FormData(document.getElementById('eForm')));
    o.quantity = +o.quantity;
    if (id) { const i = list.findIndex(x => x.equipmentID === id); list[i] = { ...list[i], ...o }; }
    else { if (list.some(x => x.equipmentID === o.equipmentID)) return toast('error','Equipment ID already exists'); list.push(o); }
    db.set(KEY.equipment, list); res.close(); toast('success','Equipment saved'); refresh();
  }

  // ----- Reports view -----
  function reportsView(title, bookings, user) {
    return `
      <div class="page-head"><div><h1>${title}</h1><div class="sub">Filter, export and print booking reports.</div></div></div>
      <div class="card">
        <div class="toolbar">
          <label class="text-sm">From <input type="date" class="form-control" id="rFrom" style="display:inline-block;width:auto"></label>
          <label class="text-sm">To <input type="date" class="form-control" id="rTo" style="display:inline-block;width:auto"></label>
          <select class="form-control" id="rStatus" style="max-width:180px"><option value="">All statuses</option>${['Pending','Approved','Rejected','Cancelled','Completed'].map(s=>`<option>${s}</option>`).join('')}</select>
          <div class="spacer" style="flex:1"></div>
          <button class="btn btn-outline" id="btnPrint"><i class="fa-solid fa-print"></i> Print</button>
          <button class="btn btn-outline" id="btnCSV"><i class="fa-solid fa-file-csv"></i> CSV</button>
          <button class="btn btn-primary" id="btnPDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
        <div id="rOut">${bookingsTable(bookings, { showRoom:true, showUser:user.role==='admin', showStatus:true, empty:'No bookings.' })}</div>
      </div>
      <div class="grid-2 mt-3">
        <div class="card"><div class="card-h"><h3>Status Distribution</h3></div><canvas id="rStatusChart" height="220"></canvas></div>
        <div class="card"><div class="card-h"><h3>Room Usage</h3></div><canvas id="rRoomsChart" height="220"></canvas></div>
      </div>`;
  }
  function bindReportEvents(allBookings) {
    const apply = () => {
      const from = document.getElementById('rFrom').value;
      const to   = document.getElementById('rTo').value;
      const st   = document.getElementById('rStatus').value;
      const f = allBookings.filter(b => (!from || b.meetingDate>=from) && (!to || b.meetingDate<=to) && (!st || b.bookingStatus===st));
      document.getElementById('rOut').innerHTML = bookingsTable(f, { showRoom:true, showUser:true, showStatus:true, empty:'No bookings in this range.' });
      window.__reportData = f;
      renderStatusChart('rStatusChart', f);
      renderRoomsChart('rRoomsChart', f);
    };
    ['rFrom','rTo','rStatus'].forEach(id => document.getElementById(id).addEventListener('change', apply));
    document.getElementById('btnPrint').onclick = () => window.print();
    document.getElementById('btnCSV').onclick = () => exportCSV(window.__reportData || allBookings);
    document.getElementById('btnPDF').onclick = () => exportPDF(window.__reportData || allBookings);
    apply();
  }
  function exportCSV(rows) {
    const cols = ['bookingNumber','meetingName','applicantName','roomNumber','meetingDate','startTime','endTime','memberCount','bookingStatus','remarks'];
    const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `stars-report-${todayISO()}.csv`; a.click();
  }
  function exportPDF(rows) {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>STARS Report</title>
      <style>body{font-family:Inter,sans-serif;padding:24px;color:#1a2233}h1{color:#0F4C81}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#0F4C81;color:#fff}</style>
      </head><body><h1>STARS — Booking Report</h1><div>Generated ${new Date().toLocaleString()}</div>
      <table><thead><tr><th>Booking #</th><th>Meeting</th><th>Applicant</th><th>Room</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.bookingNumber}</td><td>${r.meetingName}</td><td>${r.applicantName||''}</td><td>${r.roomNumber}</td><td>${r.meetingDate}</td><td>${r.startTime}–${r.endTime}</td><td>${r.bookingStatus}</td></tr>`).join('')}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  }

  // ----- Charts -----
  const CHART_COLORS = ['#0F4C81','#1E88E5','#4FC3F7','#FFC107','#FF9800','#28A745','#DC3545','#6f42c1'];
  let charts = {};
  function makeChart(id, cfg) {
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id); if (!el || !window.Chart) return;
    charts[id] = new Chart(el, cfg);
  }
  function renderStatusChart(id, bookings) {
    const labels = ['Pending','Approved','Rejected','Cancelled','Completed'];
    const data = labels.map(l => bookings.filter(b => b.bookingStatus === l).length);
    makeChart(id, { type:'doughnut', data:{ labels, datasets:[{ data, backgroundColor:['#FFC107','#28A745','#DC3545','#9aa4b8','#1E88E5'], borderWidth:0 }] },
      options:{ plugins:{ legend:{ position:'bottom' } }, cutout:'62%' } });
  }
  function renderRoomsChart(id, bookings) {
    const map = {}; bookings.forEach(b => map[b.roomNumber] = (map[b.roomNumber]||0)+1);
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
    makeChart(id, { type:'bar', data:{ labels:entries.map(e=>e[0]), datasets:[{ label:'Bookings', data:entries.map(e=>e[1]), backgroundColor:'#0F4C81', borderRadius:6 }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } } });
  }
  function renderMonthlyChart(id, bookings) {
    const months = Array.from({length:12},(_,i)=>i);
    const labels = months.map(i => new Date(2000,i,1).toLocaleString(undefined,{month:'short'}));
    const data = months.map(i => bookings.filter(b => new Date(b.meetingDate).getMonth()===i).length);
    makeChart(id, { type:'line', data:{ labels, datasets:[{ label:'Bookings', data, borderColor:'#1E88E5', backgroundColor:'rgba(30,136,229,0.15)', fill:true, tension:0.35, pointBackgroundColor:'#0F4C81' }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } } });
  }
  function renderTrendChart(id, bookings) {
    const days = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(13-i)); return d.toISOString().slice(0,10); });
    const data = days.map(d => bookings.filter(b => (b.createdAt||'').slice(0,10) === d).length);
    makeChart(id, { type:'bar', data:{ labels:days.map(d=>d.slice(5)), datasets:[{ label:'New requests', data, backgroundColor:'#FFC107', borderRadius:6 }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } } });
  }

  // ============================================================
  //                         EXPORT
  // ============================================================
  window.STARS = {
    seed, applyTheme, toggleTheme,
    currentUser, requireAuth, logout,
    login, register, hashPw,
    db, KEY, toast,
    renderShell,
  };

  // boot
  seed();
  applyTheme();
})();