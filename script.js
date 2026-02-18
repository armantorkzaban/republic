/* ========================================
   Republic — Interactive Scripts
   ======================================== */

/* Apply stored theme immediately — before any DOMContentLoaded listener fires */
(function(){
  var t = localStorage.getItem('republic-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
})();

document.addEventListener('DOMContentLoaded', () => {
  // ——— Navigation Scroll Effect ———
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });

  // ——— Mobile Navigation Toggle ———
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('nav__toggle--open');
    navLinks.classList.toggle('nav__links--open');
    document.body.style.overflow = navLinks.classList.contains('nav__links--open') ? 'hidden' : '';
  });

  // ——— Theme Toggle (Light / Dark) ———
  const themeToggle = document.getElementById('themeToggle');

  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('republic-theme', next);
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('nav__toggle--open');
      navLinks.classList.remove('nav__links--open');
      document.body.style.overflow = '';
    });
  });

  // ——— Scroll Animations (Intersection Observer) ———
  const animatedElements = document.querySelectorAll('[data-animate]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  animatedElements.forEach((el, index) => {
    // Stagger delay for sibling elements
    el.style.transitionDelay = `${index % 5 * 0.1}s`;
    observer.observe(el);
  });

  // ——— Smooth Scroll for Anchor Links ———
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ——— Copy Wallet Addresses on Click ———
  document.querySelectorAll('.wallet-address__value').forEach(el => {
    el.addEventListener('click', async () => {
      const text = el.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        const original = el.textContent;
        el.textContent = '✓ Copied!';
        el.style.color = '#5B9DF5';
        setTimeout(() => {
          el.textContent = original;
          el.style.color = '';
        }, 2000);
      } catch {
        // Fallback for older browsers
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    });
  });

  // ——— Active Nav Link Highlighting ———
  const sections = document.querySelectorAll('section[id]');
  
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = nav.querySelector(`a[href="#${id}"]`);

      if (link) {
        if (scrollPos >= top && scrollPos < top + height) {
          link.classList.add('nav__link--active');
        } else {
          link.classList.remove('nav__link--active');
        }
      }
    });
  }, { passive: true });

  // ——— Identity Carousel ———
  const carousel = document.querySelector('.id-carousel');
  if (carousel) {
    const slides = carousel.querySelectorAll('.id-carousel__slide');
    const dots = carousel.querySelectorAll('.id-carousel__dot');
    const labels = carousel.querySelectorAll('.id-carousel__label');
    let currentSlide = 0;
    let autoTimer = null;

    function goToSlide(index) {
      slides[currentSlide].classList.remove('id-carousel__slide--active');
      dots[currentSlide].classList.remove('id-carousel__dot--active');
      labels[currentSlide].classList.remove('id-carousel__label--active');

      currentSlide = index;

      slides[currentSlide].classList.add('id-carousel__slide--active');
      dots[currentSlide].classList.add('id-carousel__dot--active');
      labels[currentSlide].classList.add('id-carousel__label--active');
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % slides.length);
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(nextSlide, 6000);
    }

    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    // Click handlers for dots and labels
    [...dots, ...labels].forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.goto, 10);
        if (idx !== currentSlide) {
          goToSlide(idx);
          startAuto(); // reset timer on manual navigation
        }
      });
    });

    // Pause auto on hover, resume on leave
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);

    startAuto();
  }
});
