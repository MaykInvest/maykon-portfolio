(function () {
  "use strict";

  // People who turn animations off in their system settings
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Every page: once the page is scrolled down, darker header (.scrolled on <body>)
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
   * Every page: mobile menu button. Opens/closes the full-screen menu
   * (the two lines turn into an × with CSS). Escape also closes it.
   */
  const mobileNavToggleBtn = document.querySelector('.menu-btn');

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    // Tell screen readers whether the menu is open
    mobileNavToggleBtn.setAttribute('aria-expanded', open);
    mobileNavToggleBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  mobileNavToggleBtn.addEventListener('click', () => {
    setMenu(!document.body.classList.contains('menu-open'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /**
   * Every page: desktop menu. A soft pill sits behind the current page's link
   * and slides to the link under the mouse, then back when the mouse leaves.
   */
  const navList = document.querySelector('.navmenu ul');

  if (navList) {
    const indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    navList.appendChild(indicator);
    navList.parentElement.classList.add('has-indicator');

    const activeLink = navList.querySelector('.active');

    function moveIndicator(link) {
      if (!link) {
        indicator.style.opacity = 0;
        return;
      }
      const listBox = navList.getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      indicator.style.opacity = 1;
      indicator.style.width = `${linkBox.width}px`;
      // clientLeft = the list's border: the pill is placed inside it
      indicator.style.transform = `translateX(${linkBox.left - listBox.left - navList.clientLeft}px)`;
    }

    // First placement without the slide animation
    indicator.style.transition = 'none';
    moveIndicator(activeLink);
    requestAnimationFrame(() => indicator.style.removeProperty('transition'));

    navList.querySelectorAll('a').forEach(link => {
      link.addEventListener('mouseenter', () => moveIndicator(link));
      link.addEventListener('focus', () => moveIndicator(link));
    });
    navList.addEventListener('mouseleave', () => moveIndicator(activeLink));
    // Fonts load late and the page can be resized: measure again
    window.addEventListener('load', () => moveIndicator(activeLink));
    window.addEventListener('resize', () => moveIndicator(activeLink));
  }

  /**
   * Every page: animation on scroll (AOS).
   * Runs now (this script is at the end of <body>), not on 'load':
   * 'load' waits for every image, and until AOS runs the content stays invisible.
   * .aos-on tells main.css that AOS is working; without it (library blocked or
   * failed to load) main.css shows everything instead of leaving it hidden.
   */
  if (window.AOS) {
    document.documentElement.classList.add('aos-on');
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true
    });
  }

  /**
   * Every page: "next page" buttons: on hover the glass layer drifts away from the mouse.
   * The position is measured from the button itself (not event.offsetX,
   * which jumps when the mouse is over the text or the icon).
   */
  document.querySelectorAll('.btn-next').forEach(button => {
    button.addEventListener('mousemove', (event) => {
      const box = button.getBoundingClientRect();
      button.style.setProperty('--x-motion', `${event.clientX - box.left - box.width / 2}px`);
      button.style.setProperty('--y-motion', `${event.clientY - box.top - box.height / 2}px`);
    });

    button.addEventListener('mouseleave', () => {
      button.style.removeProperty('--x-motion');
      button.style.removeProperty('--y-motion');
    });
  });

  /**
   * Every page: 3D cube logo.
   * The cube tumbles around an axis that keeps drifting (three slow waves
   * whose speeds never line up), so its path never repeats and, over time,
   * every side comes to the front. A light stays still at the top-left:
   * each face gets --light (0 to 1), brighter when it points at the light.
   * On hover the spin speeds up gently.
   */
  const cube = document.querySelector('.cube');

  if (cube && window.DOMMatrix) {
    // Direction each face points to before turning (x right, y down, z toward you)
    const NORMALS = {
      'face-front': [0, 0, 1], 'face-back': [0, 0, -1],
      'face-right': [1, 0, 0], 'face-left': [-1, 0, 0],
      'face-top': [0, -1, 0], 'face-bottom': [0, 1, 0]
    };
    const faces = [...cube.querySelectorAll('.cube-face')].map(face => ({
      face,
      normal: NORMALS[[...face.classList].find(c => NORMALS[c])]
    }));

    // Light from the top-left, a bit in front of the cube
    const L = [-0.45, -0.65, 0.6];
    const len = Math.hypot(...L);
    const light = L.map(v => v / len);

    const scene = cube.closest('.cube-scene');
    let m = new DOMMatrix().rotate(-25, 35, 0); // start at a nice 3D angle
    let t = 0, speed = 1, targetSpeed = 1, last = null;

    scene.addEventListener('mouseenter', () => { targetSpeed = 3; });
    scene.addEventListener('mouseleave', () => { targetSpeed = 1; });

    function draw() {
      cube.style.transform = m.toString();

      faces.forEach(({ face, normal: [x, y, z] }) => {
        // The face's direction after the cube's current turn
        const nx = m.m11 * x + m.m21 * y + m.m31 * z;
        const ny = m.m12 * x + m.m22 * y + m.m32 * z;
        const nz = m.m13 * x + m.m23 * y + m.m33 * z;
        const lit = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
        face.style.setProperty('--light', lit.toFixed(3));
      });
    }

    function frame(time) {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.05);
      last = time;
      speed += (targetSpeed - speed) * Math.min(dt * 3, 1); // ease toward the hover speed
      t += dt;

      // Spin axis drifting slowly in every direction (never the same twice)
      const ax = Math.sin(t * 0.37), ay = Math.cos(t * 0.23 + 1), az = Math.sin(t * 0.13 + 2) * 0.6;
      if (Math.hypot(ax, ay, az) > 0.1) {
        m = new DOMMatrix().rotateAxisAngle(ax, ay, az, 55 * speed * dt).multiply(m); // 55 degrees per second
      }

      draw();
      requestAnimationFrame(frame);
    }

    cube.classList.add('js-driven');
    if (reduceMotion) {
      draw(); // still, but lit
    } else {
      requestAnimationFrame(frame);
    }
  }

  /**
   * Home page: typing effect (typed.js) under the name
   */
  const selectTyped = document.querySelector('.typed');
  if (selectTyped && window.Typed) {
    new Typed('.typed', {
      strings: selectTyped.dataset.typedItems.split(',').map(item => item.trim()),
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
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
   * The "+" button opens the details (one card open at a time).
   */
  const projectCards = document.querySelectorAll('.project > .project-card');

  projectCards.forEach(card => {
    const toggleBtn = card.querySelector('.toggle-btn');

    // Open / close the details
    toggleBtn.addEventListener('click', () => {
      const wasOpen = card.classList.contains('open');

      projectCards.forEach(c => {
        c.classList.remove('open');
        c.querySelector('.toggle-btn').setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen) {
        card.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true'); // tells screen readers the details are open
      }
    });
  });

  /**
   * Portfolio page: category filters.
   * Shows only the projects whose data-category matches the chosen pill;
   * the cards that stay pop in one after another.
   */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projects = document.querySelectorAll('.project[data-category]');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn);
      });

      let shown = 0;
      projects.forEach(project => {
        const match = filter === 'all' || project.dataset.category === filter;
        project.hidden = !match;

        // Close the details of a card that gets hidden
        const card = project.querySelector('.project-card');
        if (!match && card.classList.contains('open')) card.querySelector('.toggle-btn').click();

        project.classList.remove('is-entering');
        if (match) {
          void project.offsetWidth; // restart the animation
          project.style.setProperty('--i', shown++);
          project.classList.add('is-entering');
        }
      });
    });
  });

  /**
   * Portfolio page: one lightbox (<dialog>) for every project.
   * Before it opens, it takes the image, texts, link and colors of the clicked card.
   * Esc, the X button or a click outside the image closes it.
   */
  const preview = document.getElementById('preview');

  if (preview) {
    const previewImg = preview.querySelector('img');

    document.querySelectorAll('.preview-btn').forEach(button => {
      button.addEventListener('click', () => {
        const project = button.closest('.project');
        const cardImg = button.querySelector('img');

        previewImg.src = cardImg.src;
        previewImg.alt = cardImg.alt;
        preview.querySelector('.preview-category').textContent = project.querySelector('.project-category').textContent;
        preview.querySelector('.preview-title').textContent = project.querySelector('.project-title span').textContent;
        preview.querySelector('.preview-link').href = project.querySelector('.github-btn').href;
        preview.style.cssText = project.style.cssText; // same --accent-rgb / --accent-light as the card
        preview.showModal();
      });
    });

    // A click on the dark area around the image lands on the <dialog> itself
    preview.addEventListener('click', (e) => {
      if (e.target === preview) preview.close();
    });
  }

  /**
   * Contact page: send the form to Formspree without leaving the page,
   * then show the "thank you" window (<dialog>)
   */
  const contactForm = document.querySelector('.contact form');
  const successModal = document.getElementById('sent-modal');

  if (contactForm && successModal) {
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
          successModal.showModal();
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

  // navigator.clipboard is missing on some locked-down or old browsers:
  // there the button is hidden (the email link still works)
  if (copyEmailBtn && !navigator.clipboard) {
    copyEmailBtn.style.display = 'none';
  } else if (copyEmailBtn) {
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
