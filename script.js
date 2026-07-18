/* =========================================================
   SONIDO AL PASAR EL RATÓN POR EL LOGO
   Nota: los navegadores solo permiten reproducir audio con sonido
   tras una interacción real del usuario (un click, no un simple
   hover). Si el ratón pasa por el logo antes de que la persona haya
   hecho ningún click en la página, el primer intento puede fallar en
   silencio; en cuanto haya un click en cualquier parte, sonará con
   normalidad en los siguientes hovers.
   ========================================================= */
const logoWrap = document.querySelector(".logo-wrap");
const logoSound = new Audio("assets/latigo.mp3");
logoSound.preload = "auto";

if (logoWrap) {
  logoWrap.addEventListener("mouseenter", () => {
    logoSound.currentTime = 0;
    logoSound.play().catch(() => {
      /* bloqueado por la política de autoplay hasta el primer click; se ignora */
    });
  });
}

/* =========================================================
   MENÚ HAMBURGUESA
   Se abre al pasar el ratón (como en el diseño original) y
   también con un click, para que funcione igual en pantallas
   táctiles donde no existe el hover.
   ========================================================= */
const menuWrap = document.getElementById("menu-wrap");
const menuBtn = document.getElementById("menu-btn");

// El menú es más alto que ancho, así que llegar hasta "Contacto" (el
// enlace más lejano del botón) obliga a recorrer bastante distancia
// con el ratón. Cerrando el menú en el mismo instante en que el
// cursor roza el borde del área "hoverable" (aunque sea una fracción
// de segundo, por un movimiento no perfectamente vertical) el enlace
// se desvanecía antes de poder pulsarlo. Con un pequeño margen de
// espera antes de cerrar -y cancelando ese cierre si el ratón vuelve
// a entrar- da tiempo de sobra a alcanzar cualquier enlace.
let closeTimer = null;

function openMenu() {
  clearTimeout(closeTimer);
  menuWrap.classList.add("is-open");
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  clearTimeout(closeTimer);
  menuWrap.classList.remove("is-open");
  menuBtn.setAttribute("aria-expanded", "false");
}
function scheduleClose() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(closeMenu, 350);
}

// las páginas internas (Portfolio, Sobre mí, Contacto) no llevan
// menú hamburguesa, solo logo + flecha de vuelta, así que este
// bloque se salta entero si no encuentra los elementos
if (menuWrap && menuBtn) {
  menuWrap.addEventListener("mouseenter", openMenu);
  menuWrap.addEventListener("mouseleave", scheduleClose);
  menuBtn.addEventListener("click", () => {
    menuWrap.classList.contains("is-open") ? closeMenu() : openMenu();
  });
  // al elegir una sección, cerramos el menú de inmediato en vez de
  // esperar a que el ratón lo abandone
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

/* =========================================================
   ESCENARIO DE FÍSICA (Matter.js)
   Las piezas del logo (las letras "Milton" y los dos trazos
   del sombrero) caen con gravedad dentro del recuadro y se
   pueden arrastrar con el ratón/dedo.

   El SVG se incrusta aquí como texto en lugar de cargarlo con
   fetch("assets/logo-srmilton.svg"): los navegadores bloquean
   fetch() sobre archivos locales (file://) por seguridad, así
   que si esta página se abriera con doble clic en lugar de
   servirla por http, la animación se quedaría vacía. Incrustando
   el SVG no depende de esa petición y funciona en ambos casos.
   ========================================================= */
const LOGO_SVG_SOURCE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 368"><defs><style>.cls-1{fill:#792528;}.cls-2{fill:#fff;}</style></defs><title>Recurso 2</title><g id="Capa_2" data-name="Capa 2"><g id="Capa_1-2" data-name="Capa 1"><circle class="cls-1" cx="184" cy="184" r="184"/><g id="Capa_2-2" data-name="Capa 2"><path class="cls-2" d="M208.08,115.29a8.48,8.48,0,0,0-1.52-4.79c-.92-1.27-2.44-1.86-4.54-1.94h-3.45v15h4.29C206.48,123.63,208.25,120.85,208.08,115.29Z"/><path class="cls-2" d="M290.26,190.4c-2.53-19.28-22.48-19-45.89-14.06,1.09-14.48,3.11-37.39,5-47.32,3.29-17,12.46-68,12.46-68h-.33c0-8.92-33.6-16.16-74.94-16.16s-74.94,7.24-74.94,16.16a2.82,2.82,0,0,0,.26,1.18c.17.37,9.26,50.1,12.54,66.77,1.94,9.93,4,32.84,5.05,47.32-23.4-4.89-43.36-5.22-45.88,14.06C81.78,204.8,94.16,226.86,187,226.86S292.11,204.8,290.26,190.4Zm-109-75.78a5.94,5.94,0,0,1,.51-2.19,9.18,9.18,0,0,1,4-4A15.44,15.44,0,0,1,193,107h12a10,10,0,0,1,6.48,2.19,8.05,8.05,0,0,1,2.78,6.65,11.24,11.24,0,0,1-1.43,5.64,9,9,0,0,1-4.05,3.71l8.26,13c4.88,7.32,9.09,11.28,12.62,12-3.45.26-5.89.34-7.32,0-3.12-.59-6.15-2.61-9.09-6.23a44.08,44.08,0,0,1-3.37-4.88q-1.51-2.53-4.8-7.58L201.51,126h-2.94v8.42a3.27,3.27,0,0,0,1.34,2.69,4.5,4.5,0,0,0,2.36,1.18v1.43h-14v-1.43a4.5,4.5,0,0,0,2.36-1.18,3.54,3.54,0,0,0,1.35-2.69V109.32a3.26,3.26,0,0,0-.25-.68.52.52,0,0,0-.59-.17,5,5,0,0,0-3.37,1.86,6.15,6.15,0,0,0-1.18,3.53,9.9,9.9,0,0,0,.59,3.54,3.39,3.39,0,0,0,1.68,2.19,7.41,7.41,0,0,1-3.7.42,4.13,4.13,0,0,1-2.36-1.09,3.91,3.91,0,0,1-1.35-1.94A5.71,5.71,0,0,1,181.22,114.62Zm-35.36,19.87.76-13.13a14.39,14.39,0,0,0,.92,2.27,20,20,0,0,0,1.27,2.69c.16.43.67,1.35,1.34,2.61a14.62,14.62,0,0,0,1.94,2.87l2.27,2.36a9,9,0,0,0,2.87,2.1c.92.42,2.1.76,3.36,1.18a17.55,17.55,0,0,0,4.21.42,7.75,7.75,0,0,0,6.4-3.7,8.69,8.69,0,0,0,1.1-7.58c-.4-1.52-1.74-3-4-4.3a86.52,86.52,0,0,0-8.42-4.29,53.69,53.69,0,0,1-7.5-3.87,16,16,0,0,1-5.3-5.65,9.59,9.59,0,0,1-1.43-6.31A11.7,11.7,0,0,1,148,96.35,12.85,12.85,0,0,1,154.19,92a27.81,27.81,0,0,1,9.94-1.68c7.75,0,13.3,1.68,16.84,5l-.59,10.27-2.11-3.2-3.28-4a18,18,0,0,0-5.05-4,12.52,12.52,0,0,0-5.89-1.51,7.52,7.52,0,0,0-5.14,2.1,6.52,6.52,0,0,0-2.36,4.89,7.7,7.7,0,0,0,2.78,5.81,19.87,19.87,0,0,0,6.4,3.87c2.36.93,5.05,2.1,8,3.45a29.58,29.58,0,0,1,6.82,4.21,10.72,10.72,0,0,1,3.37,5.56,12.11,12.11,0,0,1,0,6,15.86,15.86,0,0,1-2.36,5.13c-3.2,4.47-8.84,6.65-17,6.65a37.75,37.75,0,0,1-11.37-1.6A16.21,16.21,0,0,1,145.86,134.49Zm95.73,70.31s-23.07,2.61-32.5,1.93c-11.11-.75-21.22-6.4-31.57-10.44-6.23-2.35-21.64-10.44-21.64-10.44l86.81-2.78Z"/><path class="cls-2" d="M83.3,226.77H95.85l11.28,53.8L118,238.05h12.29v2.28a4.16,4.16,0,0,0-2.86,1.68,6.14,6.14,0,0,0-1.52,4.21v41.93a6,6,0,0,0,1.52,4.21c1.09,1.18,2,1.77,2.86,1.77v2.19H113.61v-2.19c.84,0,1.77-.59,2.86-1.77a6,6,0,0,0,1.52-4.21V256.83c-1.35,4.38-3.45,10.95-6.15,19.7s-4.8,15.41-6.14,19.79h-2l-6.4-19.87c-2.78-8.84-5-32.75-6.4-37.13v48.83a6,6,0,0,0,1.6,4.21,4.19,4.19,0,0,0,2.86,1.77v2.19h-12v-2.19c.84,0,1.77-.59,2.78-1.77a5.76,5.76,0,0,0,1.6-4.21V236.37a5.82,5.82,0,0,0-1.6-4.21,4.22,4.22,0,0,0-2.78-1.68Z"/><path class="cls-2" d="M134.41,244.12h16.67v2.27a4.19,4.19,0,0,0-2.86,1.77,6.46,6.46,0,0,0-1.6,4.38V288a6.37,6.37,0,0,0,1.6,4.3,4.19,4.19,0,0,0,2.86,1.77v2.27H134.41v-2.27c.84,0,1.77-.59,2.78-1.77a6.13,6.13,0,0,0,1.6-4.3V252.54a6.18,6.18,0,0,0-1.6-4.38c-1-1.18-1.94-1.77-2.78-1.77Z"/><path class="cls-2" d="M153.77,244.12h16.59v2.27c-.84,0-1.77.59-2.78,1.77a6.13,6.13,0,0,0-1.6,4.38v41.09h9.68a7.41,7.41,0,0,0,3-.68,6.29,6.29,0,0,0,2.52-2l1.77-2.27a14.53,14.53,0,0,0,1.43-2.7c.59-1.18.93-1.77.93-1.85l-.42,12.21H153.77v-2.27c.85,0,1.77-.59,2.78-1.77a6,6,0,0,0,1.6-4.3V252.54a6.13,6.13,0,0,0-1.6-4.38c-1-1.18-1.93-1.77-2.78-1.77Z"/><path class="cls-2" d="M178.53,244.12h35.19l.84,12.21a18.85,18.85,0,0,0-5-5.56c-2.45-2-6.91-3-9.52-3V288a6.09,6.09,0,0,0,1.6,4.3,4.19,4.19,0,0,0,2.86,1.77v2.27H187.87v-2.27a4.18,4.18,0,0,0,2.87-1.77,6.13,6.13,0,0,0,1.6-4.3V247.82h-2a12.09,12.09,0,0,0-7.57,3,17.69,17.69,0,0,0-5,5.39Z"/><path class="cls-2" d="M220.46,251.78c3.79-5.05,8.25-7.66,13.55-7.66s9.77,2.61,13.47,7.66a30.34,30.34,0,0,1,5.65,18.44c0,7.24-1.86,13.3-5.65,18.44s-8.16,7.66-13.47,7.66-9.76-2.53-13.55-7.66-5.64-11.29-5.64-18.44S216.67,256.83,220.46,251.78Zm20.71,1.51c-1.85-3.95-4.29-5.89-7.16-5.89s-5.3,1.94-7.15,5.89-2.87,9.6-2.87,16.93.93,12.88,2.87,16.92,4.21,6,7.15,6,5.31-2,7.16-6,2.78-9.68,2.78-16.92S243,257.25,241.17,253.29Z"/><path class="cls-2" d="M264.32,237.89l20,41.67V236.2a6,6,0,0,0-1.6-4.12c-1.1-1.1-2-1.69-2.86-1.69v-3.62h11.95v3.62a4.39,4.39,0,0,0-2.86,1.69,5.65,5.65,0,0,0-1.6,4.12v60.12H284l-23.49-40.5v32.5a5.83,5.83,0,0,0,1.51,4.13c1.1,1.09,2,1.68,2.86,1.68v2.19H253v-2.19c.84,0,1.77-.59,2.86-1.68a5.84,5.84,0,0,0,1.52-4.13V253.21c0-1.68-.42-10.36-1.43-11.45a4.31,4.31,0,0,0-2.86-1.68v-2.19Z"/></g></g></g></svg>
`;

// color de las piezas al caer: el mismo tono granate del círculo del
// logotipo nuevo, para que se vean sobre el fondo crema de la página
// (las piezas del SVG original son blancas, pensadas para ir sobre el
// círculo, no sobre el fondo de la web)
const PIECE_FILL = "#792528";

function waitForMatter(cb) {
  if (!window.Matter) {
    setTimeout(() => waitForMatter(cb), 50);
    return;
  }
  cb();
}

function setupLogoPhysics() {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const width = stage.clientWidth;
  const height = stage.clientHeight || 480;

  // Extrae del SVG las piezas que "caen": las dos formas del sombrero
  // y las seis letras de "Milton". El círculo granate de fondo es un
  // <circle>, no un <path>, así que querySelectorAll("path") ya lo
  // deja fuera automáticamente sin necesidad de filtrar por id.
  const doc = new DOMParser().parseFromString(LOGO_SVG_SOURCE, "image/svg+xml");
  const paths = [...doc.querySelectorAll("path")];

  // SVG oculto de solo medición, para leer el bounding box real de cada trazo
  const measureSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  measureSvg.setAttribute("viewBox", "0 0 368 368");
  measureSvg.style.cssText = "position:absolute;left:-9999px;width:368px;height:368px;";
  document.body.appendChild(measureSvg);

  const maxDim = 96;
  const pieces = paths.map((p, i) => {
    const clone = p.cloneNode(true);
    measureSvg.appendChild(clone);
    const bbox = clone.getBBox();
    measureSvg.removeChild(clone);
    const scale = maxDim / Math.max(bbox.width, bbox.height);
    const w = Math.max(bbox.width * scale, 14);
    const h = Math.max(bbox.height * scale, 14);
    return { d: p.getAttribute("d"), bbox, w, h, index: i };
  });
  document.body.removeChild(measureSvg);

  const { Engine, Composite, Bodies, Mouse, MouseConstraint, Runner, Events } = Matter;

  const engine = Engine.create();
  engine.gravity.y = 0.7;
  engine.positionIterations = 12;
  engine.velocityIterations = 10;

  const groundThickness = 200;
  const centerY = height / 2;

  const ground = Bodies.rectangle(width / 2, centerY + groundThickness / 2, width * 2, groundThickness, { isStatic: true });
  const leftWall = Bodies.rectangle(-10, height / 2, 20, height * 2, { isStatic: true });
  const rightWall = Bodies.rectangle(width + 10, height / 2, 20, height * 2, { isStatic: true });
  Composite.add(engine.world, [ground, leftWall, rightWall]);

  // crea el elemento SVG de cada pieza una sola vez; su posición se
  // actualiza en cada tick del motor de física (más barato que
  // recrear el DOM en cada frame)
  pieces.forEach((piece, i) => {
    const x = width / 2 + (Math.random() - 0.5) * (width * 0.6);
    const y = -30 - i * 55;
    piece.body = Bodies.rectangle(x, y, piece.w, piece.h, {
      restitution: 0.3,
      friction: 0.5,
      chamfer: { radius: 4 },
      angle: (Math.random() - 0.5) * 0.8,
    });
    Composite.add(engine.world, piece.body);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("viewBox", `${piece.bbox.x} ${piece.bbox.y} ${piece.bbox.width} ${piece.bbox.height}`);
    svgEl.setAttribute("width", piece.w);
    svgEl.setAttribute("height", piece.h);
    svgEl.classList.add("stage-piece");

    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", piece.d);
    pathEl.setAttribute("fill", PIECE_FILL);
    svgEl.appendChild(pathEl);

    stage.appendChild(svgEl);
    piece.el = svgEl;
  });

  const mouse = Mouse.create(stage);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  Composite.add(engine.world, mouseConstraint);

  function renderPieces() {
    pieces.forEach((piece) => {
      piece.el.style.left = `${piece.body.position.x - piece.w / 2}px`;
      piece.el.style.top = `${piece.body.position.y - piece.h / 2}px`;
      piece.el.style.transform = `rotate(${piece.body.angle}rad)`;
    });
  }

  const runner = Runner.create();
  Runner.run(runner, engine);
  Events.on(engine, "afterUpdate", renderPieces);
  renderPieces();
}

// solo tiene sentido esperar a Matter.js (y solo la home carga su
// script) si esta página realmente tiene el escenario de física
if (document.getElementById("stage")) {
  waitForMatter(setupLogoPhysics);
}
