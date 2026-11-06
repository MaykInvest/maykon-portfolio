(function( ) {
  "use strict";

  /**
   * Once the page is scrolled down: darker header (.scrolled on <body>)
   * and the scroll-to-top button appears
   */
  const scrollTop = document.querySelector('.scroll-top');

  function onScroll() {
    const scrolled = window.scrollY > 100;
    document.body.classList.toggle('scrolled', scrolled);
    scrollTop.classList.toggle('active', scrolled);
  }

  document.addEventListener('scroll', onScroll);
  window.addEventListener('load', onScroll);

  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.menu-btn');

  mobileNavToggleBtn.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('menu-open');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
    // Tell screen readers whether the menu is open
    mobileNavToggleBtn.setAttribute('aria-expanded', isOpen);
    mobileNavToggleBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  /**
   * Animation on scroll.
   * Runs now (this script is at the end of <body>), not on 'load':
   * 'load' waits for every image, and until AOS runs the content stays invisible
   */
  AOS.init({
    duration: 600,
    easing: 'ease-in-out',
    once: true
  });

  /**
   * Init typed.js (home page only)
   */
  const selectTyped = document.querySelector('.typed');
  if (selectTyped) {
    new Typed('.typed', {
      strings: selectTyped.dataset.typedItems.split(',').map(item => item.trim()),
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * 3D cube logo (header, every page): turns to follow the mouse
   */
  const cubeScene = document.querySelector('.cube-scene');
  const cube = document.querySelector('.cube');

  if (cubeScene && cube) {
    cubeScene.addEventListener('mousemove', (e) => {
      const rect = cubeScene.getBoundingClientRect();

      // Mouse position inside the logo, from -1 to 1
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      cube.style.transform = `rotateX(${-y * 25}deg) rotateY(${x * 25}deg)`;
    });

    cubeScene.addEventListener('mouseleave', () => {
      cube.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  /**
   * About page: timeline.
   * The bright line fills up while you scroll (--progress, 0 to 1),
   * and each year gets .is-reached once the line gets to its dot.
   */
  const timeline = document.querySelector('section.timeline');

  if (timeline) {
    const items = timeline.querySelectorAll('.timeline-item');
    const phone = window.matchMedia('(max-width: 640px)');
    let ticking = false;

    function updateTimeline() {
      ticking = false;
      const lineEnd = window.innerHeight * 0.6; // the line reaches 60% down the screen
      const box = timeline.getBoundingClientRect();
      const progress = Math.min(Math.max((lineEnd - box.top) / box.height, 0), 1);
      timeline.style.setProperty('--progress', progress.toFixed(3));

      items.forEach(item => {
        const r = item.getBoundingClientRect();
        // Where the dot is: middle of the item on desktop, next to the icon on phones
        const dotY = phone.matches ? r.top + 40 : r.top + r.height / 2;
        item.classList.toggle('is-reached', dotY <= lineEnd);
      });
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateTimeline);
      }
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateTimeline();
  }

  /**
   * Skills page: flip cards
   * Click (or tap, or Enter/Space on the keyboard) turns the card:
   * front = icon, back = details.
   * On hover the card tilts toward the mouse and a light follows it
   * (skipped when the system asks for reduced motion).
   */
  const skillCards = document.querySelectorAll('.skill-card');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  skillCards.forEach(card => {
    // Make the card reachable with Tab and announced as a button
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', 'false');

    function flipCard() {
      const flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped);
    }

    card.addEventListener('click', flipCard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Space would scroll the page
        flipCard();
      }
    });

    if (reduceMotion) return;

    let bounds;

    function tiltToMouse(event) {
      // Mouse position measured from the center of the card
      const centerX = event.clientX - bounds.left - bounds.width / 2;
      const centerY = event.clientY - bounds.top - bounds.height / 2;
      const distance = Math.sqrt(centerX ** 2 + centerY ** 2);

      card.style.transform = `
        perspective(1500px)
        scale3d(1.04, 1.04, 1.04)
        rotate3d(${centerY / 100}, ${-centerX / 100}, 0, ${Math.log(distance + 1) * 2}deg)
      `;

      // Light position in % of the card size
      card.style.setProperty('--glow-x', `${50 + (centerX * 2 / bounds.width) * 100}%`);
      card.style.setProperty('--glow-y', `${50 + (centerY * 2 / bounds.height) * 100}%`);
    }

    card.addEventListener('mouseenter', () => {
      bounds = card.getBoundingClientRect();
      card.classList.add('is-tilting');
      card.addEventListener('mousemove', tiltToMouse);
    });

    card.addEventListener('mouseleave', () => {
      card.removeEventListener('mousemove', tiltToMouse);
      card.classList.remove('is-tilting');
      card.style.transform = '';
      card.style.removeProperty('--glow-x');
      card.style.removeProperty('--glow-y');
    });
  });

  /**
   * Portfolio page: project cards
   * The "+" button opens the details (one card open at a time),
   * and the card tilts in 3D following the mouse.
   */
  const projectCards = document.querySelectorAll('.project > .project-card');
  let topLayer = 10; // the last opened card is drawn on top

  projectCards.forEach(card => {
    const wrap = card.parentElement; // .project, the perspective container
    const toggleBtn = card.querySelector('.toggle-btn');

    // Open / close the details
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = card.classList.contains('open');

      projectCards.forEach(c => {
        c.classList.remove('open');
        c.querySelector('.toggle-btn').setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen) {
        card.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true'); // tells screen readers the details are open
        card.style.zIndex = topLayer++;
      }
    });

    // 3D tilt: dx/dy go from -1 to 1 (center of the card = 0), max ±11deg.
    // The shadow moves the opposite way to give depth.
    wrap.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);

      card.style.transform = `rotateX(${-dy * 11}deg) rotateY(${dx * 11}deg) translateZ(10px)`;
      card.style.boxShadow = `${-dx * 20}px ${-dy * 20}px 60px rgba(0,0,0,0.65), inset 0 2px 0 rgba(255,255,255,0.05)`;
    });

    wrap.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
      card.style.boxShadow = '0 2px 0 rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.6)';
    });

    // Small "press" effect on click
    wrap.addEventListener('mousedown', () => {
      card.style.transform = 'rotateX(0) rotateY(0) translateZ(2px) scale(0.985)';
    });
    wrap.addEventListener('mouseup', () => {
      card.style.transform = 'rotateX(0) rotateY(0) translateZ(10px)';
    });
  });

  /**
   * Portfolio page: one preview window for every project.
   * Before it opens, it takes the image, title and colors of the clicked card.
   */
  const previewModal = document.getElementById('preview-modal');

  if (previewModal) {
    previewModal.addEventListener('show.bs.modal', (event) => {
      const button = event.relatedTarget; // the clicked image button
      const cardImg = button.querySelector('img');
      const modalImg = previewModal.querySelector('img');

      modalImg.src = cardImg.src;
      modalImg.alt = cardImg.alt;
      previewModal.querySelector('.modal-title').textContent = button.dataset.title;
      // Same border and title color as the card
      const project = button.closest('.project');
      for (const name of ['--accent-rgb', '--accent-light']) {
        previewModal.style.setProperty(name, project.style.getPropertyValue(name));
      }
    });
  }

  /**
   * Contact page: send the form to Formspree without leaving the page,
   * then show the "thank you" window (Bootstrap modal)
   */
  const contactForm = document.querySelector('.contact form');
  const successModalEl = document.getElementById('sent-modal');

  if (contactForm && successModalEl) {
    const successModal = new bootstrap.Modal(successModalEl);
    const userNameSpan = document.getElementById('sender-name');
    const submitBtn = contactForm.querySelector('.submit-btn');
    const formError = document.getElementById('form-error');

    // Shows (or hides, with no message) the error line above the button
    function showFormError(message) {
      if (!formError) return;
      formError.textContent = message || '';
      formError.classList.toggle('d-none', !message);
    }

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // don't reload the page

      const formData = new FormData(contactForm);
      const originalContent = submitBtn.innerHTML;
      showFormError();

      // Loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          userNameSpan.textContent = formData.get('name');
          successModal.show();
          contactForm.reset();
        } else {
          showFormError("Oops! There was a problem sending your message. Please try again or email me directly.");
        }
      } catch (error) {
        showFormError("Connection error. Please check your internet and try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
      }
    });
  }

  /**
   * Contact page: "Available now" / "Closed" badge (Mon–Fri, 08:00–18:00)
   */
  const statusBadge = document.getElementById('status-badge');

  // Turns minutes into "Xh Ym left"
  function timeLeft(start, end) {
    const diff = end - start;
    return `${Math.floor(diff / 60)}h ${diff % 60}m left`;
  }

  function updateWorkStatus() {
    // Use Brazil time (my working hours), not the visitor's own timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;

    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday')); // 0 = Sunday ... 6 = Saturday
    const currentMinutes = Number(part('hour')) * 60 + Number(part('minute'));
    const openMinutes = 8 * 60;   // 08:00
    const closeMinutes = 18 * 60; // 18:00

    const spinner = document.getElementById('status-spinner');
    const text = document.getElementById('status-text');

    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    if (isOpen) {
      statusBadge.className = "badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25";
      spinner.classList.remove('d-none');
      text.innerText = "Available Now";
      return;
    }

    statusBadge.className = "badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25";
    spinner.classList.add('d-none');

    let message;
    if (isWeekday && currentMinutes < openMinutes) {
      message = timeLeft(currentMinutes, openMinutes);                 // weekday, before 08:00
    } else if (day >= 1 && day <= 4) {
      message = timeLeft(currentMinutes, openMinutes + 24 * 60);       // Mon–Thu, after 18:00
    } else {
      message = "Opens Monday";                                        // Friday night or weekend
    }

    text.innerText = `Closed • ${message}`;
  }

  if (statusBadge) {
    updateWorkStatus();
    setInterval(updateWorkStatus, 60000); // update every minute
  }

  /**
   * Contact page: copy the email when the clipboard button is clicked
   */
  const copyEmailBtn = document.getElementById('copy-email');

  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = document.getElementById('email-text').innerText;
      const icon = document.getElementById('copy-icon');

      navigator.clipboard.writeText(email).then(() => {
        // Show a check mark for 2 seconds
        icon.classList.replace('bi-clipboard', 'bi-check2-all');
        icon.classList.add('text-success');

        setTimeout(() => {
          icon.classList.replace('bi-check2-all', 'bi-clipboard');
          icon.classList.remove('text-success');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  }

})();
