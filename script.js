

'use strict';

/* ─── LOADER ─────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  // Wait slightly longer than the CSS fill animation (1.8s)
  setTimeout(() => {
    loader.classList.add('hidden');
    document.body.style.overflow = '';
    // Kick off AOS after loader gone
    AOS.init({ duration: 700, once: true, offset: 60 });
    // Start typing after reveal
    startTyping();
  }, 2100);
});
document.body.style.overflow = 'hidden'; // lock scroll during load

/* ─── YEAR IN FOOTER ─────────────────────────────────────── */
document.getElementById('footerYear').textContent = new Date().getFullYear();

/* ─── DARK / LIGHT TOGGLE ────────────────────────────────── */
const html        = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('portfolio-theme', theme);
}

// Load saved preference
applyTheme(localStorage.getItem('portfolio-theme') || 'dark');

themeToggle.addEventListener('click', () => {
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ─── MOBILE NAV TOGGLE ──────────────────────────────────── */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close menu when a link is clicked
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ─── MULTI-PAGE NAVIGATION ──────────────────────────────── */
/**
 * Each nav link has data-page="xxx" matching a section id.
 * We show only the matching .page and hide others.
 * URL hash is updated for shareability.
 */
const pages   = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-link');

function navigateTo(pageId) {
  // Hide all pages
  pages.forEach(p => {
    p.classList.remove('page--active');
    p.style.display = 'none';
  });

  // Show target
  const target = document.getElementById(pageId);
  if (!target) return;
  target.style.display = 'block';
  // Tiny delay so display:block takes effect before animation class
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('page--active');
    });
  });

  // Update nav active state
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
  });

  // Update hash without jumping
  history.pushState(null, '', `#${pageId}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Trigger skill animations when skills page opens
  if (pageId === 'skills') {
    setTimeout(animateSkillBars, 400);
    setTimeout(animateSoftRings, 400);
  }

  // Refresh AOS for new page
  setTimeout(() => AOS.refresh(), 100);
}
window.navigateTo = navigateTo; // expose for inline onclick

// Wire nav links
navBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(btn.getAttribute('data-page'));
  });
});

// Also wire logo click → home
document.querySelector('.nav-logo').addEventListener('click', () => navigateTo('home'));

// Handle initial hash on load
function initPageFromHash() {
  const hash = location.hash.replace('#', '') || 'home';
  // Hide all
  pages.forEach(p => { p.style.display = 'none'; p.classList.remove('page--active'); });
  const target = document.getElementById(hash) || document.getElementById('home');
  target.style.display = 'block';
  target.classList.add('page--active');
  const activeBtn = document.querySelector(`.nav-link[data-page="${target.id}"]`);
  if (activeBtn) {
    navBtns.forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }
  if (target.id === 'skills') {
    setTimeout(animateSkillBars, 600);
    setTimeout(animateSoftRings, 600);
  }
}
// Run after loader finishes (AOS also needs to run)
window.addEventListener('load', () => {
  setTimeout(initPageFromHash, 2200);
});

/* ─── TYPING EFFECT ──────────────────────────────────────── */
const typingWords = [
  'elegant web apps.',
  'beautiful UIs.',
  'impactful APIs.',
  'AI-powered tools.',
  'open-source magic.',
];
let wordIdx  = 0;
let charIdx  = 0;
let deleting = false;
const typingEl  = document.getElementById('typingText');
const typeDelay = 100;  // ms per char
const pauseTime = 2000; // ms before deleting
const deleteDelay = 50;

function startTyping() {
  if (!typingEl) return;
  typeLoop();
}

function typeLoop() {
  const currentWord = typingWords[wordIdx];

  if (!deleting) {
    // Typing forward
    typingEl.textContent = currentWord.substring(0, charIdx + 1);
    charIdx++;
    if (charIdx === currentWord.length) {
      deleting = true;
      setTimeout(typeLoop, pauseTime);
      return;
    }
  } else {
    // Deleting
    typingEl.textContent = currentWord.substring(0, charIdx - 1);
    charIdx--;
    if (charIdx === 0) {
      deleting = false;
      wordIdx  = (wordIdx + 1) % typingWords.length;
    }
  }
  setTimeout(typeLoop, deleting ? deleteDelay : typeDelay);
}

/* ─── SKILL BAR ANIMATION ────────────────────────────────── */
function animateSkillBars() {
  document.querySelectorAll('.skill-fill').forEach(bar => {
    const w = bar.getAttribute('data-width');
    bar.style.width = w + '%';
  });
}

/* ─── SOFT SKILL RINGS ───────────────────────────────────── */
function animateSoftRings() {
  document.querySelectorAll('.soft-ring').forEach(ring => {
    const val   = parseInt(ring.getAttribute('data-val'), 10);
    const circ  = 150.8; // 2π × r (r=24)
    const offset = circ - (circ * val / 100);
    const fg = ring.querySelector('.fg');
    if (fg) fg.style.strokeDashoffset = offset;
  });
}

/* ─── CONTACT FORM VALIDATION ────────────────────────────── */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (validateForm()) {
      simulateSubmit();
    }
  });

  // Real-time validation on blur
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => clearError(field));
  });
}

function validateForm() {
  const fields = ['fname','lname','email','subject','message'];
  let valid = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && !validateField(el)) valid = false;
  });
  return valid;
}

function validateField(field) {
  const id  = field.id;
  const val = field.value.trim();
  const err = document.getElementById(id + 'Err');
  if (!err) return true;

  let msg = '';
  if (!val) {
    msg = 'This field is required.';
  } else if (id === 'email') {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(val)) msg = 'Please enter a valid email address.';
  } else if ((id === 'fname' || id === 'lname') && val.length < 2) {
    msg = 'Please enter at least 2 characters.';
  } else if (id === 'message' && val.length < 20) {
    msg = 'Message must be at least 20 characters.';
  }

  if (msg) {
    err.textContent = msg;
    field.classList.add('error');
    return false;
  }
  err.textContent = '';
  field.classList.remove('error');
  return true;
}

function clearError(field) {
  const err = document.getElementById(field.id + 'Err');
  if (err) err.textContent = '';
  field.classList.remove('error');
}

function simulateSubmit() {
  const btn     = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const success = document.getElementById('formSuccess');

  btn.disabled = true;
  btnText.textContent = 'Sending…';

  // Collect form data
  const msgData = {
    name:    (document.getElementById('fname').value.trim() + ' ' + document.getElementById('lname').value.trim()).trim(),
    email:   document.getElementById('email').value.trim(),
    phone:   '',
    subject: document.getElementById('subject').value.trim(),
    message: document.getElementById('message').value.trim(),
  };

  setTimeout(() => {
    // Save message to localStorage so admin dashboard can read it
    saveMessageToAdmin(msgData);

    btn.disabled = false;
    btnText.textContent = 'Send Message';
    form.reset();
    success.style.display = 'flex';
    setTimeout(() => { success.style.display = 'none'; }, 5000);
  }, 1800);
}

/** Save a contact form submission into the shared admin storage key */
function saveMessageToAdmin(data) {
  const KEY = 'ar_portfolio_messages';
  function genId() { return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
  try {
    const msgs = JSON.parse(localStorage.getItem(KEY) || '[]');
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
    localStorage.setItem(KEY, JSON.stringify(msgs));
  } catch(e) {
    console.warn('Could not save message:', e);
  }
}

/* ─── NAVBAR SCROLL EFFECT ───────────────────────────────── */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 20) {
    navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.25)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});

/* ─── KEYBOARD NAVIGATION ────────────────────────────────── */
document.addEventListener('keydown', e => {
  const pageOrder = ['home','about','skills','projects','education','contact'];
  const active    = document.querySelector('.page--active');
  if (!active) return;
  const idx = pageOrder.indexOf(active.id);
  if (e.key === 'ArrowRight' && idx < pageOrder.length - 1) navigateTo(pageOrder[idx + 1]);
  if (e.key === 'ArrowLeft'  && idx > 0)                    navigateTo(pageOrder[idx - 1]);
});
