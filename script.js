document.documentElement.classList.add('js');

const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#mainNav');
const navLinks = document.querySelectorAll('.main-nav a');
const revealEls = document.querySelectorAll('.reveal');
const heroOrb = document.querySelector('.hero-orb');
const portrait = document.querySelector('.about-photo-image');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

portrait?.addEventListener('error', () => {
  portrait.hidden = true;
});
if (portrait?.complete && portrait.naturalWidth === 0) {
  portrait.hidden = true;
}

if (siteHeader && !prefersReducedMotion) {
  siteHeader.classList.add('nav-anim');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      siteHeader.classList.add('nav-ready');
    });
  });
}

const closeMobileNav = () => {
  if (!menuToggle || !mainNav) return;
  mainNav.classList.remove('open');
  menuToggle.classList.remove('is-open');
  siteHeader?.classList.remove('nav-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
};

if (menuToggle && mainNav) {
  menuToggle.setAttribute('aria-label', 'Open navigation');

  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.classList.toggle('is-open', isOpen);
    siteHeader?.classList.toggle('nav-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  // Close on outside tap/click
  document.addEventListener('click', (event) => {
    if (!mainNav.classList.contains('open')) return;
    if (siteHeader && !siteHeader.contains(event.target)) closeMobileNav();
  });

  // Close on Escape and hand focus back to the button
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mainNav.classList.contains('open')) {
      closeMobileNav();
      menuToggle.focus();
    }
  });

  // Reset when the viewport grows to the desktop layout
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches) closeMobileNav();
  });
}

const sectionIds = ['home', 'about', 'projects', 'skills', 'resume', 'contact'];
const sections = sectionIds
  .map((id) => document.getElementById(id))
  .filter((section) => section !== null);

const setActiveNavLink = (activeId) => {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    if (!targetId || !targetId.startsWith('#')) return;
    const target = document.querySelector(targetId);
    if (!target) return;
    event.preventDefault();
    history.replaceState(null, '', targetId);
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    closeMobileNav();
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      } else if (entry.boundingClientRect.top > 0) {
        entry.target.classList.remove('in-view');
      }
    });
  },
  { threshold: 0.05, rootMargin: '0px 0px -8% 0px' }
);

revealEls.forEach((el) => {
  observer.observe(el);
});

const updateNavState = () => {
  let activeId = 'home';
  const viewportCenter = window.scrollY + window.innerHeight * 0.45;
  sections.forEach((section) => {
    if (viewportCenter >= section.offsetTop) {
      activeId = section.id;
    }
  });
  // Short last section can never reach the midpoint — pin it at page bottom
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    activeId = sections[sections.length - 1]?.id ?? activeId;
  }
  setActiveNavLink(activeId);
  if (siteHeader) {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
  }
};

let navTicking = false;
const onScrollNav = () => {
  if (navTicking) return;
  navTicking = true;
  requestAnimationFrame(() => {
    updateNavState();
    navTicking = false;
  });
};

updateNavState();
window.addEventListener('scroll', onScrollNav, { passive: true });
window.addEventListener('resize', onScrollNav, { passive: true });

if (heroOrb && !prefersReducedMotion) {
  const animateOrbOnScroll = () => {
    const offset = Math.min(window.scrollY * 0.06, 22);
    heroOrb.style.translate = `0 ${offset}px`;
  };
  animateOrbOnScroll();
  window.addEventListener('scroll', animateOrbOnScroll, { passive: true });
}

// ─── FIX #2: Contact form — async Formspree handler ──────────────────────────
// Sends the form via fetch so the page never reloads.
// Setup: go to https://formspree.io, create a free form, then replace
//        YOUR_FORM_ID in index.html's <form action="..."> with your real ID.
// ─────────────────────────────────────────────────────────────────────────────
const contactForm = document.getElementById('contactForm');
const submitBtn   = document.getElementById('submitBtn');
const formStatus  = document.getElementById('formStatus');

// The live region (#formStatus) is always in the DOM; we only change what's
// inside it, so screen readers reliably announce the result.
const showStatus = (type, message) => {
  if (!formStatus) return;
  const p = document.createElement('p');
  p.className = `form-status form-${type} visible`;
  const icon = document.createElement('i');
  icon.className = `bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`;
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = message;
  p.append(icon, text);
  formStatus.replaceChildren(p);
};
const clearStatus = () => formStatus?.replaceChildren();

const SUCCESS_MSG = "Message sent! I'll get back to you soon.";
const ERROR_MSG   = 'Something went wrong. Please email me directly.';

if (contactForm) {
  const nameEl    = contactForm.querySelector('#cf-name');
  const emailEl   = contactForm.querySelector('#cf-email');
  const messageEl = contactForm.querySelector('#cf-message');
  const fields    = [nameEl, emailEl, messageEl];

  // Clear the red "empty field" border as soon as the user starts typing
  fields.forEach((el) => {
    el.addEventListener('input', () => {
      el.style.borderColor = '';
      el.removeAttribute('aria-invalid');
    });
  });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (contactForm.action.includes('YOUR_FORM_ID')) {
      showStatus('error', ERROR_MSG);
      return;
    }

    // Catches whitespace-only input (native `required` handles truly empty)
    let firstInvalid = null;
    fields.forEach((el) => {
      if (!el.value.trim()) {
        el.style.borderColor = 'rgba(255,0,127,0.6)';
        el.setAttribute('aria-invalid', 'true');
        firstInvalid = firstInvalid ?? el;
      } else {
        el.style.borderColor = '';
        el.removeAttribute('aria-invalid');
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> <span>Sending…</span>';
    clearStatus();

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        showStatus('success', SUCCESS_MSG);
        contactForm.reset();
        fields.forEach((el) => {
          el.style.borderColor = '';
          el.removeAttribute('aria-invalid');
        });
      } else {
        showStatus('error', ERROR_MSG);
      }
    } catch (_) {
      showStatus('error', ERROR_MSG);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send" aria-hidden="true"></i> <span>Send Message</span>';
    }
  });
}
