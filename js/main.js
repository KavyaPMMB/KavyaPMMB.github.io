const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero");
const scrollCue = document.querySelector(".scroll-cue");
const navMenu = document.querySelector(".nav-links");
const navLinks = document.querySelectorAll(".nav-links a");
const sections = [...document.querySelectorAll("main section[id]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneNav = window.matchMedia("(max-width: 980px)");
let activeHref = "";

function onScroll() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);

  if (scrollCue && hero) {
    const room = hero.getBoundingClientRect().bottom - 120;
    const fade = Math.min(1, Math.max(0, room / 180));
    scrollCue.style.opacity = String(fade);
    scrollCue.style.pointerEvents = fade < 0.15 ? "none" : "";
  }

  const marker = window.scrollY + 120;
  let current = null;
  for (const section of sections) {
    if (section.offsetTop <= marker) current = section;
  }
  const href = current ? `#${current.id}` : "#top";
  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === href;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  if (href !== activeHref) {
    activeHref = href;
    const active = navMenu.querySelector("a.is-active");
    if (active && phoneNav.matches) {
      const left = active.offsetLeft - (navMenu.clientWidth - active.offsetWidth) / 2;
      navMenu.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
    }
  }
  drawScenes.forEach((scene) => scene.update());
}

const svgNs = "http://www.w3.org/2000/svg";

function createScene(section, svg, nodes, pathFor) {
  const track = document.createElementNS(svgNs, "path");
  const draw = document.createElementNS(svgNs, "path");
  track.setAttribute("class", "line-track");
  draw.setAttribute("class", "line-draw");
  svg.append(track, draw);
  let length = 0;

  function layout() {
    const host = svg.parentElement.getBoundingClientRect();
    if (host.width < 2 || host.height < 2) return;
    svg.setAttribute("viewBox", `0 0 ${host.width} ${host.height}`);
    const d = pathFor(host);
    if (!d) return;
    track.setAttribute("d", d);
    draw.setAttribute("d", d);
    length = draw.getTotalLength();
    draw.style.strokeDasharray = `${length}`;
    update();
  }

  function update() {
    if (!length) return;
    const rect = section.getBoundingClientRect();
    const view = window.innerHeight || 1;
    const start = view * 0.86;
    const finish = view * 0.22;
    const progress = (start - rect.top) / (rect.height + start - finish);
    const amount = reduceMotion ? 1 : Math.min(1, Math.max(0, progress));
    draw.style.strokeDashoffset = String(length * (1 - amount));
    nodes.forEach((node, index) => {
      const mark = nodes.length === 1 ? 0 : index / (nodes.length - 1);
      node.classList.toggle("is-lit", amount >= mark - 0.04);
    });
  }

  return { layout, update };
}

const experience = document.querySelector("#experience");
const skills = document.querySelector("#skills");
const jobNodes = [...document.querySelectorAll(".job-node")];
const skillNodes = [...document.querySelectorAll(".skill-node")];

function experiencePath() {
  const host = document.querySelector(".timeline").getBoundingClientRect();
  const points = jobNodes.map((node) => {
    const box = node.getBoundingClientRect();
    return {
      x: box.left + box.width / 2 - host.left,
      y: box.top + box.height / 2 - host.top,
    };
  });
  if (points.length < 2) return "";
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function skillsPath() {
  const host = document.querySelector(".skill-stage").getBoundingClientRect();
  const cards = skillNodes.map((node) => node.closest("article").getBoundingClientRect());
  const rows = [];
  cards.forEach((card) => {
    const row = rows.find((entry) => Math.abs(entry.top - card.top) < 12);
    if (row) row.cards.push(card);
    else rows.push({ top: card.top, cards: [card] });
  });
  rows.forEach((row) => row.cards.sort((a, b) => a.left - b.left));
  if (!rows.length) return "";

  let pen = null;
  let d = "";
  const move = (x, y) => {
    d += `${pen ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  };

  rows.forEach((row) => {
    const y = row.top - host.top - 16;
    const left = row.cards[0].left - host.left;
    const right = row.cards[row.cards.length - 1].right - host.left;
    if (pen) move(left, y);
    move(left, y);
    move(right, y);
    move(left, y);
  });
  return d.trim();
}

const drawScenes = [
  createScene(experience, document.querySelector(".timeline-svg"), jobNodes, experiencePath),
  createScene(skills, document.querySelector(".skill-svg"), skillNodes, skillsPath),
];

function layoutLines() {
  drawScenes.forEach((scene) => scene.layout());
}

const particles = document.querySelector("#particles");
const particleCtx = particles.getContext("2d");
let dots = [];
let particleFrame = 0;
let particlesOn = !reduceMotion;

function resizeParticles() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  particles.width = Math.floor(window.innerWidth * ratio);
  particles.height = Math.floor(window.innerHeight * ratio);
  particleCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = window.innerWidth < 720 ? 26 : 52;
  dots = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    r: Math.random() * 1.5 + 0.7,
  }));
}

function paintParticles() {
  if (!particlesOn) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  particleCtx.clearRect(0, 0, width, height);
  for (const dot of dots) {
    dot.x += dot.vx;
    dot.y += dot.vy;
    if (dot.x < 0 || dot.x > width) dot.vx *= -1;
    if (dot.y < 0 || dot.y > height) dot.vy *= -1;
    particleCtx.beginPath();
    particleCtx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    particleCtx.fillStyle = "rgba(198, 188, 255, 0.8)";
    particleCtx.fill();
  }
  const reach = width < 720 ? 90 : 120;
  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance < reach) {
        particleCtx.strokeStyle = `rgba(160, 146, 255, ${0.22 * (1 - distance / reach)})`;
        particleCtx.lineWidth = 1;
        particleCtx.beginPath();
        particleCtx.moveTo(dots[i].x, dots[i].y);
        particleCtx.lineTo(dots[j].x, dots[j].y);
        particleCtx.stroke();
      }
    }
  }
  particleFrame = requestAnimationFrame(paintParticles);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    particlesOn = false;
    cancelAnimationFrame(particleFrame);
    return;
  }
  if (!reduceMotion) {
    particlesOn = true;
    paintParticles();
  }
});

window.addEventListener("resize", () => {
  layoutLines();
  resizeParticles();
});

onScroll();
layoutLines();
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("load", layoutLines);
resizeParticles();
if (!reduceMotion) paintParticles();
else particlesOn = false;
