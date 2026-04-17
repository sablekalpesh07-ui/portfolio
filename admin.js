/**
 * ADMIN DASHBOARD — SCRIPT
 * Features:
 *  - Login / logout with localStorage credentials
 *  - CRUD: read, star, trash, restore, delete messages
 *  - Reply system stored in each message object
 *  - Realtime search + filter (all / unread / read)
 *  - Views: inbox, starred, replied, trash, settings
 *  - Stats counters
 *  - Export JSON
 *  - Seed sample messages
 *  - Dark / Light mode
 *  - Mobile sidebar toggle
 *  - Toast notifications
 *  - Contact form on portfolio saves messages here (shared storage key)
 */

'use strict';

/* ─── STORAGE KEYS ─────────────────────────────────── */
const KEY_MSGS  = 'ar_portfolio_messages';
const KEY_CREDS = 'ar_admin_creds';

/* ─── DEFAULT CREDENTIALS ──────────────────────────── */
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'admin123';

/* ─── STATE ────────────────────────────────────────── */
let currentView   = 'inbox';
let currentFilter = 'all';
let currentMsgId  = null;
let searchQuery   = '';

/* ══════════════════════════════════════════════
   UTILITY HELPERS
══════════════════════════════════════════════ */
function getMessages() {
  try { return JSON.parse(localStorage.getItem(KEY_MSGS) || '[]'); }
  catch { return []; }
}
function saveMessages(msgs) {
  localStorage.setItem(KEY_MSGS, JSON.stringify(msgs));
}
function getCreds() {
  const saved = localStorage.getItem(KEY_CREDS);
  if (saved) try { return JSON.parse(saved); } catch {}
  return { user: DEFAULT_USER, pass: DEFAULT_PASS };
}
function saveCreds(c) { localStorage.setItem(KEY_CREDS, JSON.stringify(c)); }

function genId() { return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function avatarColor(name) {
  // deterministic hue from name
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h},60%,45%)`;
}

/* ── TOAST ── */
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.className = `toast-${type} show`;
  el.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i> ${msg}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');

function isLoggedIn() { return sessionStorage.getItem('ar_admin_authed') === '1'; }
function login()      { sessionStorage.setItem('ar_admin_authed', '1'); showDashboard(); }
function logout()     { sessionStorage.removeItem('ar_admin_authed'); showLogin(); }

function showLogin()     { loginScreen.style.display = 'flex'; dashboard.style.display = 'none'; }
function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display   = 'flex';
  refreshAll();
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const c = getCreds();
  const btn = document.getElementById('loginBtnText');
  const err = document.getElementById('loginError');

  btn.textContent = 'Signing in…';
  setTimeout(() => {
    if (u === c.user && p === c.pass) {
      err.textContent = '';
      login();
    } else {
      err.textContent = 'Incorrect username or password.';
      btn.textContent = 'Sign In';
      document.getElementById('loginPass').value = '';
    }
  }, 600);
});

// Password show/hide
document.getElementById('pwToggle').addEventListener('click', () => {
  const inp  = document.getElementById('loginPass');
  const icon = document.querySelector('#pwToggle i');
  if (inp.type === 'password') { inp.type = 'text';     icon.className = 'fas fa-eye-slash'; }
  else                         { inp.type = 'password'; icon.className = 'fas fa-eye'; }
});

document.getElementById('logoutBtn').addEventListener('click', logout);

// Init
if (isLoggedIn()) showDashboard(); else showLogin();

/* ══════════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════════ */
const html      = document.documentElement;
const themeBtn  = document.getElementById('adminTheme');

function applyTheme(t) {
  html.setAttribute('data-theme', t);
  themeBtn.innerHTML = t === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  localStorage.setItem('ar_admin_theme', t);
}
applyTheme(localStorage.getItem('ar_admin_theme') || 'dark');
themeBtn.addEventListener('click', () => {
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ══════════════════════════════════════════════
   MOBILE SIDEBAR
══════════════════════════════════════════════ */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('sidebarClose').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
const viewTitles = {
  inbox: 'Inbox', starred: 'Starred', replied: 'Replied',
  trash: 'Trash', settings: 'Settings'
};

document.querySelectorAll('.sb-link[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.getAttribute('data-view');
    currentFilter = 'all';
    navigateView(currentView);
    document.getElementById('sidebar').classList.remove('open');
  });
});

function navigateView(view) {
  currentView = view;

  // Update sidebar active
  document.querySelectorAll('.sb-link[data-view]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === view);
  });

  // Topbar title
  document.getElementById('topbarTitle').textContent = viewTitles[view] || view;

  // Show/hide views
  const allViews = ['viewMessages','viewThread','viewSettings'];
  allViews.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  if (view === 'settings') {
    document.getElementById('viewSettings').style.display = 'block';
    document.getElementById('statsRow').style.display = 'none';
    document.getElementById('filterTabs').style.display = 'none';
  } else {
    document.getElementById('viewMessages').style.display = 'block';
    document.getElementById('statsRow').style.display = 'grid';
    document.getElementById('filterTabs').style.display = 'flex';
    const clearTrash = document.getElementById('clearTrashBtn');
    const markAll    = document.getElementById('markAllRead');
    clearTrash.style.display = view === 'trash' ? 'inline-flex' : 'none';
    markAll.style.display    = view === 'trash' || view === 'settings' ? 'none' : 'inline-flex';
    renderMsgList();
  }
  updateStats();
}

/* ══════════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════════ */
document.querySelectorAll('.ftab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    renderMsgList();
  });
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
  renderMsgList();
});

/* ══════════════════════════════════════════════
   STATS
══════════════════════════════════════════════ */
function updateStats() {
  const all  = getMessages().filter(m => !m.trashed);
  const unrd = all.filter(m => !m.read).length;
  const rplied = all.filter(m => m.replies && m.replies.length > 0).length;
  const strd = all.filter(m => m.starred).length;

  document.getElementById('statTotal').textContent   = all.length;
  document.getElementById('statUnread').textContent  = unrd;
  document.getElementById('statReplied').textContent = rplied;
  document.getElementById('statStarred').textContent = strd;

  // Unread badge
  const badge = document.getElementById('unreadBadge');
  badge.textContent = unrd;
  badge.setAttribute('data-count', unrd);
}

/* ══════════════════════════════════════════════
   RENDER MESSAGE LIST
══════════════════════════════════════════════ */
function getFilteredMessages() {
  let msgs = getMessages();

  // View filter
  switch (currentView) {
    case 'inbox'  : msgs = msgs.filter(m => !m.trashed); break;
    case 'starred': msgs = msgs.filter(m => m.starred && !m.trashed); break;
    case 'replied': msgs = msgs.filter(m => m.replies?.length > 0 && !m.trashed); break;
    case 'trash'  : msgs = msgs.filter(m => m.trashed); break;
  }

  // Read filter
  if (currentFilter === 'unread') msgs = msgs.filter(m => !m.read);
  if (currentFilter === 'read')   msgs = msgs.filter(m => m.read);

  // Search
  if (searchQuery) {
    msgs = msgs.filter(m =>
      (m.name    || '').toLowerCase().includes(searchQuery) ||
      (m.email   || '').toLowerCase().includes(searchQuery) ||
      (m.subject || '').toLowerCase().includes(searchQuery) ||
      (m.message || '').toLowerCase().includes(searchQuery)
    );
  }

  // Sort newest first
  return msgs.sort((a,b) => new Date(b.date) - new Date(a.date));
}

function renderMsgList() {
  const list   = document.getElementById('msgList');
  const empty  = document.getElementById('emptyState');
  const msgs   = getFilteredMessages();

  list.innerHTML = '';

  if (msgs.length === 0) {
    empty.style.display = 'flex';
    empty.style.flexDirection = 'column';
    empty.style.alignItems = 'center';
    return;
  }
  empty.style.display = 'none';

  msgs.forEach(msg => {
    const row = document.createElement('div');
    row.className = `msg-row${msg.read ? '' : ' unread'}${msg.starred ? ' starred' : ''}`;
    row.setAttribute('data-id', msg.id);

    const hasReplied = msg.replies && msg.replies.length > 0;

    row.innerHTML = `
      <div class="unread-dot"></div>
      <div class="msg-avatar" style="background:${avatarColor(msg.name)}">${initials(msg.name)}</div>
      <div class="msg-body">
        <div class="msg-from">
          ${escHtml(msg.name || 'Unknown')}
          ${hasReplied ? '<span class="tag-replied"><i class="fas fa-check"></i> Replied</span>' : ''}
        </div>
        <div class="msg-subject">${escHtml(msg.subject || '(No subject)')}</div>
        <div class="msg-preview">${escHtml((msg.message||'').slice(0,80))}…</div>
      </div>
      <div class="msg-meta">
        <span class="msg-date">${formatDate(msg.date)}</span>
        <div class="msg-actions">
          <button class="star-btn${msg.starred?' active':''}" data-id="${msg.id}" title="Star">
            <i class="${msg.starred ? 'fas' : 'far'} fa-star"></i>
          </button>
          ${currentView === 'trash'
            ? `<button class="restore-btn" data-id="${msg.id}" title="Restore"><i class="fas fa-undo"></i></button>`
            : `<button class="trash-btn" data-id="${msg.id}" title="Move to trash"><i class="fas fa-trash"></i></button>`
          }
        </div>
      </div>
    `;

    // Click row → open thread
    row.addEventListener('click', e => {
      if (e.target.closest('.star-btn,.trash-btn,.restore-btn')) return;
      openThread(msg.id);
    });

    // Star
    row.querySelector('.star-btn')?.addEventListener('click', e => {
      e.stopPropagation(); toggleStar(msg.id);
    });
    // Trash
    row.querySelector('.trash-btn')?.addEventListener('click', e => {
      e.stopPropagation(); trashMsg(msg.id);
    });
    // Restore
    row.querySelector('.restore-btn')?.addEventListener('click', e => {
      e.stopPropagation(); restoreMsg(msg.id);
    });

    list.appendChild(row);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ══════════════════════════════════════════════
   MESSAGE ACTIONS
══════════════════════════════════════════════ */
function markRead(id) {
  const msgs = getMessages();
  const m    = msgs.find(m => m.id === id);
  if (m) { m.read = true; saveMessages(msgs); }
}
function toggleStar(id) {
  const msgs = getMessages();
  const m    = msgs.find(m => m.id === id);
  if (m) { m.starred = !m.starred; saveMessages(msgs); }
  renderMsgList(); updateStats();
  toast(m?.starred ? 'Message starred' : 'Star removed', 'info');
}
function trashMsg(id) {
  const msgs = getMessages();
  const m    = msgs.find(m => m.id === id);
  if (m) { m.trashed = true; saveMessages(msgs); }
  renderMsgList(); updateStats();
  toast('Moved to Trash', 'info');
}
function restoreMsg(id) {
  const msgs = getMessages();
  const m    = msgs.find(m => m.id === id);
  if (m) { m.trashed = false; saveMessages(msgs); }
  renderMsgList(); updateStats();
  toast('Message restored', 'success');
}
function deleteForever(id) {
  let msgs = getMessages().filter(m => m.id !== id);
  saveMessages(msgs);
}

document.getElementById('markAllRead').addEventListener('click', () => {
  const msgs = getMessages();
  msgs.forEach(m => { if (!m.trashed) m.read = true; });
  saveMessages(msgs);
  renderMsgList(); updateStats();
  toast('All messages marked as read', 'success');
});

document.getElementById('clearTrashBtn').addEventListener('click', () => {
  if (!confirm('Permanently delete all trashed messages?')) return;
  const msgs = getMessages().filter(m => !m.trashed);
  saveMessages(msgs);
  renderMsgList(); updateStats();
  toast('Trash emptied', 'success');
});

/* ══════════════════════════════════════════════
   THREAD VIEW
══════════════════════════════════════════════ */
function openThread(id) {
  markRead(id);
  currentMsgId = id;
  updateStats();
  renderThread(id);

  document.getElementById('viewMessages').style.display = 'none';
  document.getElementById('viewThread').style.display = 'block';
  document.getElementById('topbarTitle').textContent = 'Message';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderThread(id) {
  const msgs = getMessages();
  const msg  = msgs.find(m => m.id === id);
  if (!msg) return;

  const wrap = document.getElementById('threadWrap');

  const repliesHtml = (msg.replies || []).map(r => `
    <div class="reply-bubble">
      <div class="reply-bubble-header">
        <i class="fas fa-reply"></i>
        <strong>You replied</strong>
        <span>· ${formatDate(r.date)}</span>
      </div>
      <p>${escHtml(r.text)}</p>
    </div>
  `).join('');

  wrap.innerHTML = `
    <div class="thread-header">
      <div class="thread-from-row">
        <div class="thread-avatar" style="background:${avatarColor(msg.name)}">${initials(msg.name)}</div>
        <div>
          <div class="thread-name">${escHtml(msg.name || 'Unknown')}</div>
          <div class="thread-email">${escHtml(msg.email || '')}</div>
          ${msg.phone ? `<div class="thread-phone"><i class="fas fa-phone" style="font-size:.7rem;margin-right:.3rem"></i>${escHtml(msg.phone)}</div>` : ''}
        </div>
      </div>
      <div class="thread-meta-actions">
        <button class="ico-btn${msg.starred?' star-active':''}" id="threadStar" title="Star">
          <i class="${msg.starred?'fas':'far'} fa-star"></i>
        </button>
        <button class="ico-btn" id="threadTrash" title="Trash">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="thread-subject-bar">
      <strong>${escHtml(msg.subject || '(No subject)')}</strong>
      <time>${new Date(msg.date).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})}</time>
    </div>
    <div class="thread-body">${escHtml(msg.message || '')}</div>
    <div class="replies-section">${repliesHtml}</div>
    <div class="reply-form-wrap">
      <div class="reply-form-label">
        <i class="fas fa-reply"></i> Reply to
        <span class="reply-to-pill">${escHtml(msg.email || msg.name || '')}</span>
      </div>
      <textarea class="reply-textarea" id="replyText" placeholder="Write your reply…" maxlength="2000"></textarea>
      <div class="reply-form-footer">
        <span class="reply-char" id="replyChar">0 / 2000</span>
        <div style="display:flex;gap:.6rem;align-items:center;">
          <div id="replySent" class="reply-success" style="display:none;">
            <i class="fas fa-check-circle"></i> Reply saved!
          </div>
          <button class="btn-reply" id="sendReplyBtn">
            <i class="fas fa-paper-plane"></i> Send Reply
          </button>
        </div>
      </div>
    </div>
  `;

  // Char counter
  const ta = document.getElementById('replyText');
  ta.addEventListener('input', () => {
    document.getElementById('replyChar').textContent = `${ta.value.length} / 2000`;
  });

  // Send reply
  document.getElementById('sendReplyBtn').addEventListener('click', () => sendReply(id));

  // Star from thread
  document.getElementById('threadStar').addEventListener('click', () => {
    toggleStar(id);
    const msg2 = getMessages().find(m => m.id === id);
    const btn  = document.getElementById('threadStar');
    btn.className = `ico-btn${msg2?.starred?' star-active':''}`;
    btn.innerHTML = `<i class="${msg2?.starred?'fas':'far'} fa-star"></i>`;
  });

  // Trash from thread
  document.getElementById('threadTrash').addEventListener('click', () => {
    trashMsg(id);
    goBack();
  });
}

function sendReply(id) {
  const ta  = document.getElementById('replyText');
  const text = ta.value.trim();
  if (!text) { toast('Please write a reply first', 'error'); return; }

  const msgs = getMessages();
  const msg  = msgs.find(m => m.id === id);
  if (!msg) return;

  if (!msg.replies) msg.replies = [];
  msg.replies.push({ text, date: new Date().toISOString() });
  saveMessages(msgs);

  // Show success
  ta.value = '';
  document.getElementById('replyChar').textContent = '0 / 2000';
  const sent = document.getElementById('replySent');
  sent.style.display = 'flex';
  setTimeout(() => { sent.style.display = 'none'; }, 4000);

  // Re-render replies section only
  const repliesSection = document.querySelector('.replies-section');
  repliesSection.innerHTML = msg.replies.map(r => `
    <div class="reply-bubble">
      <div class="reply-bubble-header">
        <i class="fas fa-reply"></i>
        <strong>You replied</strong>
        <span>· ${formatDate(r.date)}</span>
      </div>
      <p>${escHtml(r.text)}</p>
    </div>
  `).join('');

  updateStats();
  toast('Reply saved successfully!', 'success');
}

/* ── Back button ── */
document.getElementById('backToInbox').addEventListener('click', goBack);
function goBack() {
  document.getElementById('viewThread').style.display   = 'none';
  document.getElementById('viewMessages').style.display = 'block';
  document.getElementById('topbarTitle').textContent    = viewTitles[currentView] || currentView;
  currentMsgId = null;
  renderMsgList();
}

/* ══════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════ */
// Prefill username
document.getElementById('setUser').value = getCreds().user;

document.getElementById('saveSettings').addEventListener('click', () => {
  const u  = document.getElementById('setUser').value.trim();
  const p  = document.getElementById('setPass').value;
  const pc = document.getElementById('setPassConfirm').value;
  const errEl = document.getElementById('settingsError');
  const okEl  = document.getElementById('settingsSuccess');
  errEl.textContent = '';
  okEl.textContent  = '';

  if (!u) { errEl.textContent = 'Username cannot be empty.'; return; }
  if (p && p !== pc) { errEl.textContent = 'Passwords do not match.'; return; }

  const c = getCreds();
  saveCreds({ user: u, pass: p || c.pass });
  okEl.textContent = 'Credentials updated successfully!';
  document.getElementById('setPass').value = '';
  document.getElementById('setPassConfirm').value = '';
  toast('Settings saved', 'success');
});

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
  const msgs = getMessages();
  const blob = new Blob([JSON.stringify(msgs, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `messages_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Messages exported', 'success');
});

// Nuke all
document.getElementById('nukeBtn').addEventListener('click', () => {
  if (!confirm('Delete ALL messages permanently? This cannot be undone.')) return;
  saveMessages([]);
  refreshAll();
  toast('All messages deleted', 'error');
});

// Seed sample messages
document.getElementById('seedBtn').addEventListener('click', () => {
  const samples = [
    { name:'Priya Sharma',    email:'priya.sharma@gmail.com',   phone:'+91 98765 43210', subject:'Internship Opportunity',           message:'Hi Alex! I came across your portfolio and was really impressed by your work on StudyMind AI. I\'m a recruiter at TechCorp and we have an opening for a summer internship in our AI team. Would you be interested in a quick call this week? We\'d love to learn more about you.' },
    { name:'Marcus Chen',     email:'mchen@startupxyz.io',      phone:'',                subject:'Collaboration on GreenTrack',       message:'Hey! I\'ve been building something very similar to GreenTrack and I think there\'s a lot of room for collaboration. I have the backend infrastructure, you seem to have great frontend skills. Let\'s connect and see if we can build something bigger together.' },
    { name:'Fatima Al-Rashid',email:'f.alrashid@university.edu',phone:'',                subject:'Research Partnership Request',      message:'Dear Alex, I\'m a PhD student researching human-computer interaction and your FocusFlow project aligns perfectly with my thesis work on digital wellness. Would you be open to participating in a user study and potentially co-authoring a paper? I think this could be mutually beneficial.' },
    { name:'Jake Morrison',   email:'jake@freelance.dev',       phone:'+1 555 867 5309', subject:'Freelance Project — Quick Question', message:'Hey Alex, found you through GitHub. I have a client who needs a dashboard built in React with real-time data. Budget is around $2k for about 2–3 weeks of work. Are you available for freelance projects? The scope is pretty well-defined.' },
    { name:'Aisha Nkomo',     email:'aisha.nkomo@ngo.org',      phone:'',                subject:'MediLink — Can we use your code?',  message:'Hello Alex, I work for a healthcare NGO in East Africa and we came across your MediLink project from the hackathon write-up. We\'re looking to deploy a similar solution in rural Kenya and wanted to ask if we could fork your project or potentially partner with you to adapt it for our needs. This would be a non-profit use case.' },
  ];
  const msgs = getMessages();
  samples.forEach((s, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (i * 13 + Math.floor(Math.random()*5)));
    msgs.push({
      id:      genId(),
      ...s,
      date:    d.toISOString(),
      read:    false,
      starred: false,
      trashed: false,
      replies: [],
    });
  });
  saveMessages(msgs);
  refreshAll();
  toast('5 sample messages added!', 'success');
});

/* ══════════════════════════════════════════════
   REFRESH ALL
══════════════════════════════════════════════ */
function refreshAll() {
  updateStats();
  if (currentView !== 'settings') renderMsgList();
}

/* ══════════════════════════════════════════════
   TOAST ELEMENT INJECTION
══════════════════════════════════════════════ */
const toastEl = document.createElement('div');
toastEl.id = 'toast';
document.body.appendChild(toastEl);

/* ══════════════════════════════════════════════
   PORTFOLIO ↔ ADMIN BRIDGE
   The portfolio contact form saves messages with
   this same storage key (KEY_MSGS). This code
   patches the portfolio's form submit handler
   so new submissions appear here automatically.
══════════════════════════════════════════════ */
// This function is exported so portfolio's script.js can call it
window.saveContactMessage = function(data) {
  const msgs = getMessages();
  msgs.push({
    id:      genId(),
    name:    data.name    || '',
    email:   data.email   || '',
    phone:   data.phone   || '',
    subject: data.subject || '',
    message: data.message || '',
    date:    new Date().toISOString(),
    read:    false,
    starred: false,
    trashed: false,
    replies: [],
  });
  saveMessages(msgs);
};