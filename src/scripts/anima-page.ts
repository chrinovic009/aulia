// Animations de la page Anima.astro (orbe, cycle…).
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Orbe : légère inclinaison qui suit la souris
const orbWrap = document.querySelector('[data-orb]');
const orb = document.querySelector('[data-orb-inner]');
if (orbWrap && orb && !reduced) {
  window.addEventListener('pointermove', (e) => {
    const r = orbWrap.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    orb.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 22}deg)`;
  });
}

// Cycle : défilement automatique des cinq étapes
const cycle = document.querySelector('[data-cycle]');
if (cycle) {
  const steps = [...cycle.querySelectorAll('[data-step]')];
  const caption = cycle.querySelector('[data-cy-caption]');
  const bar = cycle.querySelector('[data-cy-bar]');
  const texts = JSON.parse(cycle.getAttribute('data-texts') || '[]');
  let stage = 0;
  let timer;
  const show = (i) => {
    stage = i;
    cycle.setAttribute('data-stage', String(i));
    steps.forEach((s, j) => s.setAttribute('aria-selected', String(i === j)));
    caption.textContent = texts[i];
    caption.classList.remove('in');
    void caption.offsetWidth;
    caption.classList.add('in');
    bar.classList.remove('run');
    void bar.offsetWidth;
    if (!reduced) bar.classList.add('run');
    clearTimeout(timer);
    if (!reduced) timer = setTimeout(() => show((stage + 1) % steps.length), 3600);
  };
  steps.forEach((s, i) => s.addEventListener('click', () => show(i)));
  const io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) { show(stage); io.disconnect(); }
  });
  io.observe(cycle);
}

// Orbite des capacités
const orbit = document.querySelector('[data-orbit]');
if (orbit) {
  const nodes = [...orbit.querySelectorAll('[data-node]')];
  const cards = [...orbit.querySelectorAll('[data-card]')];
  let cur = 0;
  let auto = !reduced;
  const sel = (i) => {
    cur = i;
    nodes.forEach((n, j) => n.classList.toggle('on', i === j));
    cards.forEach((c, j) => c.classList.toggle('on', i === j));
  };
  nodes.forEach((n, i) => {
    n.addEventListener('click', () => { auto = false; sel(i); });
    n.addEventListener('mouseenter', () => { auto = false; sel(i); });
  });
  setInterval(() => { if (auto) sel((cur + 1) % nodes.length); }, 2800);
}

// Scénarios : les étapes s'allument une à une
const scen = document.querySelector('[data-scen]');
if (scen) {
  const tabs = [...scen.querySelectorAll('[data-tab]')];
  const panels = [...scen.querySelectorAll('[data-panel]')];
  let timers = [];
  const play = (i) => {
    timers.forEach(clearTimeout);
    timers = [];
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
    panels.forEach((p, j) => p.classList.toggle('on', i === j));
    const items = [...panels[i].querySelectorAll('.sc-flow li')];
    items.forEach((li) => li.classList.remove('on'));
    items.forEach((li, k) => timers.push(setTimeout(() => li.classList.add('on'), reduced ? 0 : 350 + k * 650)));
  };
  let current = 0;
  tabs.forEach((t, i) => t.addEventListener('click', () => { current = i; play(i); }));
  scen.querySelector('[data-replay]')?.addEventListener('click', () => play(current));
  const io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) { play(0); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(scen);
}
