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

// Un click SIEMPRE va precedido de un hover con ratón real: el cursor
// tiene que entrar en el botón antes de poder pulsarlo. Si dejamos el
// hover Y el click activos a la vez en un dispositivo con ratón, el
// mouseenter abre el menú y, medio segundo después, el propio click
// lo detecta ya abierto y lo alterna, cerrándolo en el acto: parece
// que el menú "no hace nada". Lo mismo pasa en táctil, donde el
// navegador simula ese mismo mouseenter justo antes del click.
// La solución es no mezclar los dos modelos: en dispositivos con
// ratón real usamos solo hover (abrir/cerrar al entrar y salir); en
// táctil, donde no existe el hover, usamos solo el click.
const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// las páginas internas (Portfolio, Sobre mí, Contacto) no llevan
// menú hamburguesa, solo logo + flecha de vuelta, así que este
// bloque se salta entero si no encuentra los elementos
if (menuWrap && menuBtn) {
  if (supportsHover) {
    menuWrap.addEventListener("mouseenter", openMenu);
    menuWrap.addEventListener("mouseleave", scheduleClose);
  } else {
    menuBtn.addEventListener("click", () => {
      menuWrap.classList.contains("is-open") ? closeMenu() : openMenu();
    });
  }
  // al elegir una sección, cerramos el menú de inmediato en vez de
  // esperar a que el ratón lo abandone
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

/* =========================================================
   ESCENA DEL PAISAJE (paisaje.svg) animada con GSAP ScrollTrigger
   El SVG está incrustado directamente en el HTML (no se carga con
   fetch: los navegadores bloquean fetch() sobre archivos locales
   file://, así que incrustarlo garantiza que funcione igual si la
   página se abre con doble clic o servida por http).

   Sus 7 grupos de piezas (sol, pájaros, nube, montañas, suelo,
   sakura, torii) llevan cada uno una clase "layer-*" -algunos
   repartidos en varios grupos, para no alterar el orden de dibujo
   original del SVG- así que un mismo selector like ".layer-sol"
   selecciona y anima a la vez todas las piezas de esa capa.

   Comportamiento al hacer scroll:
   1) la sección se fija en pantalla (pin) durante un tramo,
   2) mientras tanto cada capa aparece en cascada (fade + scale up),
   3) y, a la vez, cada capa se desplaza a una velocidad distinta
      según su profundidad (parallax): las lejanas (sol, nube) casi
      no se mueven, las cercanas (torii, sakura) se mueven más.
   ========================================================= */
const sceneSection = document.getElementById("scene-section");

if (sceneSection && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // gsap.matchMedia() separa por completo el comportamiento en escritorio
  // del de móvil: en escritorio se mantiene tal cual la composición y
  // animación actuales (nada cambia); en móvil arrancamos desde cero una
  // composición propia, pensada para un encuadre vertical, que iremos
  // construyendo capa a capa según se vaya decidiendo qué piezas usar y
  // cómo colocarlas -por eso el bloque mobile empieza vacío.
  const mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
  // profundidad de cada capa (0 = muy lejos, 1 = primer plano):
  // determina cuánto se desplaza respecto al scroll (parallax)
  const layers = [
    { selector: ".layer-sol", depth: 0.15 },
    { selector: ".layer-nube", depth: 0.2 },
    { selector: ".layer-pajaros-1", depth: 0.28 },
    { selector: ".layer-pajaros-2", depth: 0.32 },
    { selector: ".layer-pajaros-3", depth: 0.36 },
    { selector: ".layer-montanas", depth: 0.4 },
    { selector: ".layer-suelo", depth: 0.55 },
    { selector: ".layer-torii-tejado", depth: 0.7 },
    { selector: ".layer-torii-cuerpo", depth: 0.7 },
    { selector: ".layer-torii-base", depth: 0.7 },
    { selector: ".layer-sakura-hojas", depth: 0.8 },
    { selector: ".layer-sakura-ramas", depth: 0.8 },
  ];

  // el rótulo "Sr Milton" no lleva parallax propio ni fundido: cae desde
  // arriba igual que las piezas del torii (ver más abajo, dentro del
  // bloque "TORII"), como una pieza más de la puerta.
  const ROTULO_SELECTOR = ".layer-rotulo";

  // cada pájaro entra por separado, a su propia velocidad: distinto
  // desplazamiento de entrada, distinto instante de arranque (dentro del
  // mismo "hueco" de la cascada) y distinta duración -así no vuelan
  // los tres a la vez, en bloque, sino cada uno a su aire-. Unos entran
  // desde la izquierda y otros desde la derecha (entranceX negativo =
  // izquierda, positivo = derecha), y cada uno lleva su propio aleteo
  // -un pequeño vaivén vertical en forma de onda- mientras vuela, con
  // su propia amplitud y número de ciclos para que no aleteen todos
  // igual ni a la vez.
  const birds = [
    { selector: ".layer-pajaros-1", entranceX: -900, delay: 0, duration: 0.4, bobAmplitude: 45, bobCycles: 2 },
    { selector: ".layer-pajaros-2", entranceX: 1100, delay: 0.05, duration: 0.3, bobAmplitude: 60, bobCycles: 3 },
    { selector: ".layer-pajaros-3", entranceX: -1400, delay: 0.02, duration: 0.45, bobAmplitude: 55, bobCycles: 4 },
  ];

  // el torii son 3 piezas completas (cada una con su rojo y su negro
  // juntos: tejado, cuerpo con los pilares, y la hierba de la base), no
  // fragmentos sueltos por color. Caen una tras otra, pero de abajo
  // arriba -primero la base, luego el cuerpo, y el tejado el último-
  // cada una con más margen entre sí y más despacio que antes.
  const toriiPieces = [
    { selector: ".layer-torii-base", delay: 0, duration: 0.75 },
    { selector: ".layer-torii-cuerpo", delay: 0.3, duration: 0.85 },
    { selector: ".layer-torii-tejado", delay: 0.6, duration: 0.7 },
  ];

  // orden narrativo de aparición (distinto del orden por profundidad):
  // el sol sube justo después de que las montañas ya estén, y los
  // pájaros cierran la cascada como detalle final. Las hojas de la
  // sakura no llevan entrada propia aquí: arrancan a la vez que las
  // ramas (ver más abajo). La nube tampoco lleva su propio hueco: entra
  // en el mismo instante en que empieza a caer el tejado del torii (ver
  // el bloque "TORII" más abajo), no en un punto fijo de la cascada.
  const appearanceOrder = [
    ".layer-montanas",
    ".layer-sol",
    ".layer-suelo",
    "TORII", // marcador especial: las 3 piezas completas del torii (+ la nube y el rótulo, ver abajo)
    ".layer-sakura-ramas",
    "PAJAROS", // marcador especial: los tres pájaros, cada uno con su propia velocidad
  ];

  const STEP = 0.12; // separación entre la aparición de una capa y la siguiente
  const REVEAL_DURATION = 0.5;
  const HOJAS_DURATION = REVEAL_DURATION * 1.8; // las hojas tardan más que las ramas -mismo inicio, final más tarde-
  const sakuraRamasIndex = appearanceOrder.indexOf(".layer-sakura-ramas");

  const toriiIndex = appearanceOrder.indexOf("TORII");
  const lastToriiPiece = toriiPieces[toriiPieces.length - 1];
  const toriiEnd = toriiIndex * STEP + lastToriiPiece.delay + lastToriiPiece.duration;

  const cascadeEnd = Math.max(
    (appearanceOrder.length - 1) * STEP + REVEAL_DURATION,
    sakuraRamasIndex * STEP + HOJAS_DURATION,
    toriiEnd
  );
  const LAKE_DURATION = 0.7;
  // el agua empieza a fluir un poco después de que comienzan a caer las
  // piezas del torii (no en el instante exacto en que arranca la base),
  // para que se perciba claramente que el desencadenante es la puerta
  // cayendo y no una coincidencia con el arranque de la cascada.
  const firstToriiPiece = toriiPieces[0];
  const LAKE_DELAY_AFTER_TORII = 0.18;
  const LAKE_START =
    toriiIndex * STEP + firstToriiPiece.delay + LAKE_DELAY_AFTER_TORII;
  // coordenadas del hueco del lago tal como quedaron incrustadas en el
  // SVG (espacio interno 750x500, antes del escalado x4.1667 del canvas).
  // Estos valores vienen del contorno que el propio usuario redibujó a
  // mano (lago.svg), convertido a puntos y reescalado a este espacio.
  const LAKE_Y = 245.27998037760156;
  const LAKE_HEIGHT = 203.51998371840128;

  // la duración total del recorrido tiene que cubrir lo que tarde más:
  // el resto de la cascada, o el propio llenado del lago (que ahora
  // empieza antes, pero puede terminar después si el resto es más corto)
  const TOTAL_DURATION = Math.max(cascadeEnd, LAKE_START + LAKE_DURATION);

  // algunas capas, además de fundido + escala, entran deslizándose desde
  // un lado: la sakura (ramas y hojas) desde la izquierda, la nube desde
  // la derecha. El sol y los pájaros llevan su propio recorrido (ver más
  // abajo) y no usan este mapa. El valor es el desplazamiento de partida
  // en xPercent (negativo = desde la izquierda, positivo = derecha).
  const entranceX = {
    ".layer-sakura-hojas": -70,
    ".layer-sakura-ramas": -70,
    ".layer-nube": 80,
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    // sin animación: se muestra el paisaje completo y quieto de una vez
    gsap.set(
      layers.map((l) => l.selector),
      { opacity: 1, scale: 1, yPercent: 0, xPercent: 0 }
    );
    const lagoAguaStatic = document.querySelector(".layer-lago-agua");
    if (lagoAguaStatic) {
      gsap.set(lagoAguaStatic, { attr: { height: LAKE_HEIGHT } });
    }
  } else {
    // el sol, en el SVG original, no está centrado horizontalmente (está
    // bastante a la derecha); para que termine "en el centro de la
    // imagen" hay que recolocarlo con un desplazamiento fijo -en % de su
    // propio ancho- que compensa esa diferencia. SUN_FINAL_Y lo baja un
    // poco respecto a su posición original (a la altura del logo).
    const SUN_FINAL_X = -423;
    const SUN_FINAL_Y = 90;

    // punto de partida: la izquierda de la pantalla y más abajo que la
    // posición final -entre las 7 y las 8 de un reloj centrado en esa
    // posición final-. SUN_ARC_* es solo el punto de control de la
    // curva (para que suba en parábola por el camino, no una parada
    // real de la animación).
    const SUN_START_X = -1300;
    const SUN_START_Y = SUN_FINAL_Y + 220;
    const SUN_ARC_X = (SUN_START_X + SUN_FINAL_X) / 2;
    const SUN_ARC_Y = SUN_FINAL_Y - 300;

    // estado inicial: todas las capas ocultas y ligeramente reducidas,
    // listas para la aparición en cascada (y desplazadas si les toca
    // entrar desde un lado). El sol arranca desde la mitad izquierda de
    // la pantalla y traza un arco hasta su posición final.
    const birdEntranceX = Object.fromEntries(birds.map((b) => [b.selector, b.entranceX]));

    // el torii "cae" desde bien arriba del encuadre en vez de aparecer
    // con fundido + escala: por eso parte totalmente opaco y a tamaño
    // normal, solo desplazado hacia arriba (como un objeto real que
    // cuelga fuera de cámara, no algo que se desvanece dentro y fuera)
    const TORII_DROP_Y = -650;

    const isToriiSelector = (selector) => selector.indexOf(".layer-torii-") === 0;
    const isPajarosSelector = (selector) => selector.indexOf(".layer-pajaros-") === 0;

    layers.forEach(({ selector }) => {
      const isSun = selector === ".layer-sol";
      const isTorii = isToriiSelector(selector);
      gsap.set(selector, {
        opacity: isTorii ? 1 : 0,
        scale: isTorii ? 1 : 0.85,
        transformOrigin: "50% 50%",
        xPercent: isSun ? SUN_START_X : entranceX[selector] || birdEntranceX[selector] || 0,
        yPercent: isSun ? SUN_START_Y : isTorii ? TORII_DROP_Y : 0,
      });
    });

    // el rótulo cae igual que el torii: opaco y a tamaño normal desde el
    // principio, solo desplazado hacia arriba fuera de cámara
    gsap.set(ROTULO_SELECTOR, {
      opacity: 1,
      scale: 1,
      transformOrigin: "50% 50%",
      xPercent: 0,
      yPercent: TORII_DROP_Y,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sceneSection,
        start: "top top",
        end: "+=150%",
        scrub: 1,
        pin: true,
      },
    });

    // 1) aparición en cascada (fade + scale up + entrada lateral, o
    // recorrido curvo en el caso del sol)
    appearanceOrder.forEach((selector, i) => {
      const time = i * STEP;

      if (selector === ".layer-sol") {
        // arco real (curva de Bézier cuadrática) desde la mitad de la
        // mitad izquierda hasta la posición actual, con SUN_ARC_* como
        // punto de control. Se calcula a mano en cada frame -en vez de
        // encadenar dos tramos rectos- para que sea una única curva
        // suave de verdad, como el trazo dibujado a mano.
        const sunEl = document.querySelector(selector);
        const sunArcDuration = REVEAL_DURATION * 1.4;
        const sunProgress = { t: 0 };
        tl.to(
          sunProgress,
          {
            t: 1,
            duration: sunArcDuration,
            ease: "sine.inOut",
            onUpdate: () => {
              if (!sunEl) return;
              const t = sunProgress.t;
              const inv = 1 - t;
              const x = inv * inv * SUN_START_X + 2 * inv * t * SUN_ARC_X + t * t * SUN_FINAL_X;
              const y = inv * inv * SUN_START_Y + 2 * inv * t * SUN_ARC_Y + t * t * SUN_FINAL_Y;
              gsap.set(sunEl, { xPercent: x, yPercent: y });
            },
          },
          time
        );
        tl.to(selector, { opacity: 1, scale: 1, duration: sunArcDuration, ease: "power1.out" }, time);
        return;
      }

      if (selector === ".layer-sakura-ramas") {
        // las hojas arrancan en el mismo instante que las ramas, pero
        // con más duración: van un paso por detrás durante toda la
        // aparición y terminan de "florecer" justo después de que la
        // rama ya esté completa
        tl.to(
          selector,
          { opacity: 1, scale: 1, xPercent: 0, duration: REVEAL_DURATION, ease: "power2.out" },
          time
        );
        tl.to(
          ".layer-sakura-hojas",
          { opacity: 1, scale: 1, xPercent: 0, duration: HOJAS_DURATION, ease: "power2.out" },
          time
        );
        return;
      }

      if (selector === "TORII") {
        // las 3 piezas completas del torii (tejado, cuerpo, base) caen
        // desde arriba del encuadre y se van colocando una tras otra, de
        // arriba abajo. "power2.in" acelera la caída como si fuera peso
        // real (empieza despacio, cae cada vez más rápido) y se para en
        // seco al llegar a su sitio, sin rebote; cada pieza tarda lo
        // suyo (duration distinto en toriiPieces), así que caen a
        // velocidades distintas entre sí.
        toriiPieces.forEach(({ selector: pieceSelector, delay, duration }) => {
          tl.to(pieceSelector, { yPercent: 0, duration, ease: "power2.in" }, time + delay);
        });

        // la nube empieza a aparecer justo cuando arranca la caída del
        // tejado (la última pieza del torii en soltarse)
        const tejadoPiece = toriiPieces.find((p) => p.selector === ".layer-torii-tejado");
        tl.to(
          ".layer-nube",
          { opacity: 1, scale: 1, xPercent: 0, duration: REVEAL_DURATION, ease: "power2.out" },
          time + tejadoPiece.delay
        );

        // el rótulo cae justo después, como una pieza más de la puerta
        // (incluso un poco más tarde que el tejado, para que se note que
        // llega detrás de toda la estructura)
        tl.to(
          ROTULO_SELECTOR,
          { yPercent: 0, duration: lastToriiPiece.duration, ease: "power2.in" },
          time + tejadoPiece.delay + 0.1
        );
        return;
      }

      if (selector === "PAJAROS") {
        // cada pájaro entra por separado: su propio desplazamiento de
        // entrada (desde la izquierda o la derecha, según entranceX),
        // su propio pequeño retraso y su propia duración, para que no
        // vuelen los tres a la vez en bloque sino cada uno a su aire y a
        // su propia velocidad. Además de desplazarse en horizontal, cada
        // uno aletea: un vaivén vertical en forma de onda (seno) que se
        // calcula a mano cuadro a cuadro -igual que el arco del sol- para
        // que el movimiento de subida y bajada sea real, no solo una
        // línea recta de entrada.
        birds.forEach(({ selector: birdSelector, entranceX, delay, duration, bobAmplitude, bobCycles }) => {
          const birdEl = document.querySelector(birdSelector);
          const birdProgress = { t: 0 };
          tl.to(
            birdProgress,
            {
              t: 1,
              duration,
              ease: "power3.out",
              onUpdate: () => {
                if (!birdEl) return;
                const t = birdProgress.t;
                const x = entranceX * (1 - t);
                const y = Math.sin(t * bobCycles * Math.PI * 2) * bobAmplitude * (1 - t * 0.3);
                gsap.set(birdEl, { xPercent: x, yPercent: y });
              },
            },
            time + delay
          );
          tl.to(birdSelector, { opacity: 1, scale: 1, duration, ease: "power3.out" }, time + delay);
        });
        return;
      }

      tl.to(selector, { opacity: 1, scale: 1, xPercent: 0, duration: REVEAL_DURATION, ease: "power2.out" }, time);
    });

    // el lago se llena de agua el último de todos: el rectángulo del
    // degradado azul (recortado con la forma del lago) crece desde
    // altura 0 -con la parte de arriba fija, junto a la boca del río-
    // hacia abajo, como si el agua entrara por el río y fuera cubriendo
    // el lago hacia el frente (no subiendo desde la base)
    const lagoAgua = document.querySelector(".layer-lago-agua");
    if (lagoAgua) {
      tl.to(
        lagoAgua,
        {
          attr: { height: LAKE_HEIGHT },
          duration: LAKE_DURATION,
          ease: "sine.inOut",
        },
        LAKE_START
      );
    }

    // 2) parallax por profundidad, en paralelo durante todo el tramo
    // (el sol queda fuera: su propio recorrido curvo ya controla su
    // posición vertical, y mezclarlo con el parallax lo haría temblar)
    layers.forEach(({ selector, depth }) => {
      // el sol tiene su propio recorrido curvo, el torii su propia
      // caída, y los pájaros su propio aleteo: mezclarlos con este
      // parallax genérico haría que todos esos recorridos "temblaran"
      // al competir por yPercent
      if (selector === ".layer-sol" || isToriiSelector(selector) || isPajarosSelector(selector)) return;
      tl.to(selector, { yPercent: -20 * depth, ease: "none", duration: TOTAL_DURATION }, 0);
    });
  }

  });

  mm.add("(max-width: 768px)", () => {
    // TODO: composición mobile -se construye capa a capa, indicando qué
    // piezas del paisaje se usan y en qué posición/tamaño quedan.
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}
