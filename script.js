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
   TEXTO "enjoy" ESCRITO A MANO
   Efecto de trazo completándose de izquierda a derecha, como si se
   estuviera escribiendo en ese momento: el texto arranca totalmente
   recortado (clip-path) y se va revelando poco a poco. No depende del
   scroll -arranca solo, nada más cargar la página-, con una pequeña
   pausa inicial (delay) para que no coincida con el primer parpadeo
   de carga de la página.
   ========================================================= */
const enjoyText = document.querySelector(".enjoy-text");
if (enjoyText && window.gsap) {
  gsap.to(enjoyText, {
    clipPath: "inset(0 0% 0 0)",
    duration: 4,
    delay: 0.4,
    ease: "power1.inOut",
  });

  // en cuanto se empieza a hacer scroll, se desvanece despacio (no de
  // golpe): se engancha al mismo disparador que la escena (misma
  // sección, mismo punto de partida "top top"), pero con muy poco
  // recorrido de scroll -apenas hace falta bajar un poco para que
  // desaparezca del todo-
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(enjoyText, {
      opacity: 0,
      ease: "power1.out",
      scrollTrigger: {
        trigger: "#scene-section",
        start: "top top",
        end: "+=15%",
        scrub: 1,
      },
    });
  }
}

/* =========================================================
   BOMBILLA 3D (página Portfolio)
   Modelo importado desde Blender (assets/bombilla.glb, ya reducido de
   ~330.000 a 6.000 triángulos para que cargue rápido en la web) y
   mostrado con Three.js: gira despacio sobre sí misma y el cristal
   lleva un material emisivo cálido cuya intensidad "respira" poco a
   poco, para dar sensación de estar encendida sin ser un parpadeo
   brusco. Todo este bloque se salta entero en páginas que no llevan
   el visor (solo existe en portfolio.html).
   ========================================================= */
const bulbViewer = document.getElementById("bulb-viewer");
// OJO: crear un renderer WebGL puede fallar (tarjeta gráfica bloqueada,
// aceleración por hardware desactivada, demasiados contextos abiertos a
// la vez...) y ese fallo lanza una excepción real, no solo un aviso. Como
// este archivo se comparte con el resto de páginas (menú, escena del
// paisaje), un fallo aquí sin capturar cortaría también esas partes del
// script en cualquier página que vaya después de este bloque. Por eso
// todo el intento de crear el visor 3D va envuelto en un try/catch: si
// falla, sencillamente no se muestra la bombilla (queda el resplandor de
// fondo en CSS) y el resto de la página sigue funcionando con normalidad.
if (bulbViewer && window.THREE) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    // el modelo se recentra en el origen más abajo (bulbMesh.position.sub(center)),
    // así que la cámara tiene que mirar al origen, no a la altura original del .obj.
    // z=32 dejaba la bombilla demasiado cerca -al ser más alta que ancha,
    // se cortaba por arriba y por abajo dentro del visor cuadrado-; con
    // z=46 entra completa, con margen arriba y abajo.
    camera.position.set(0, 0, 46);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    bulbViewer.appendChild(renderer.domElement);

    // luz ambiente + una luz direccional suave para que el cristal
    // transparente tenga algún reflejo y no se vea plano
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    keyLight.position.set(5, 10, 8);
    scene.add(keyLight);

    // bulbGroup contiene el cristal + el filamento juntos, para que giren
    // como una sola pieza. filLight es la luz cálida del filamento, que se
    // guarda aparte para hacerla "respirar".
    let bulbGroup = null;
    let filLight = null;

    const loader = new THREE.GLTFLoader();
    loader.load(
      "assets/bombilla.glb",
      (gltf) => {
        bulbGroup = gltf.scene;

        // 1) el CRISTAL: la carcasa exterior del modelo, hecha
        // semitransparente para poder ver el filamento por dentro.
        // depthWrite:false evita que el cristal "tape" el filamento que
        // tiene detrás, y renderOrder lo dibuja después (por encima).
        bulbGroup.traverse((child) => {
          if (child.isMesh) {
            // el modelo viene de una malla muy reducida (decimada); calcular
            // las normales aquí garantiza que la luz se refleje bien sin
            // depender de si el .glb las trae correctas
            child.geometry.computeVertexNormals();
            child.material = new THREE.MeshStandardMaterial({
              color: 0xeaf2ff,
              roughness: 0.12,
              metalness: 0,
              transparent: true,
              opacity: 0.2,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            child.renderOrder = 2;
          }
        });

        // centrar el modelo (el .obj original venía descentrado) y medir su
        // tamaño para colocar el filamento a escala, dentro de la parte
        // alta del bulbo
        const box = new THREE.Box3().setFromObject(bulbGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        bulbGroup.position.sub(center);
        scene.add(bulbGroup);

        // 2) el FILAMENTO: una espiral (helix) de tubo fino, dorada y
        // luminosa (MeshBasicMaterial = no le afectan las sombras, brilla
        // por sí misma), colocada en el interior alto del cristal.
        const radius = size.x * 0.11;
        const height = size.y * 0.15;
        const yc = size.y * 0.11;
        const turns = 4;
        const segments = 140;
        const pts = [];
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * turns * Math.PI * 2;
          const y = yc - height / 2 + (i / segments) * height;
          pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const filament = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 220, size.x * 0.013, 8, false),
          new THREE.MeshBasicMaterial({ color: 0xffcf7a })
        );
        filament.renderOrder = 1;
        bulbGroup.add(filament);

        // las dos "patas" rectas que en una bombilla real sujetan el
        // filamento desde la base
        [-radius, radius].forEach((lx) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(size.x * 0.013, size.x * 0.013, height * 1.5, 6),
            new THREE.MeshBasicMaterial({ color: 0xffcf80 })
          );
          leg.position.set(lx, yc - height * 0.95, 0);
          leg.renderOrder = 1;
          bulbGroup.add(leg);
        });

        // luz cálida emitida desde el propio filamento, que ilumina el
        // cristal desde dentro y tiñe su alrededor
        filLight = new THREE.PointLight(0xffdca8, 2.4, 40);
        filLight.position.set(0, yc, 0);
        bulbGroup.add(filLight);
      },
      undefined,
      (err) => console.warn("No se pudo cargar bombilla.glb", err)
    );

    function resizeBulbViewer() {
      const size = bulbViewer.clientWidth || 200;
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    resizeBulbViewer();
    window.addEventListener("resize", resizeBulbViewer);

    const clock = new THREE.Clock();
    function animateBulb() {
      requestAnimationFrame(animateBulb);
      const t = clock.getElapsedTime();
      if (bulbGroup) {
        bulbGroup.rotation.y = t * 0.5; // giro lento y constante
        // el filamento "respira": su luz sube y baja despacio, como el
        // titileo suave de una bombilla encendida
        if (filLight) filLight.intensity = 2.1 + Math.sin(t * 3) * 0.5;
      }
      renderer.render(scene, camera);
    }
    animateBulb();
  } catch (err) {
    // sin WebGL disponible (tarjeta gráfica bloqueada, navegador con la
    // aceleración por hardware desactivada, etc.) no se puede dibujar la
    // bombilla en 3D; se deja solo el resplandor de fondo en CSS y el
    // resto de la página sigue funcionando con normalidad
    console.warn("No se pudo iniciar el visor 3D de la bombilla (WebGL no disponible)", err);
  }
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

  // NOTA: se probó ScrollTrigger.normalizeScroll(true) para el problema
  // de la barra de direcciones de Safari en iOS/iPadOS, pero en la
  // práctica dejó el scroll completamente bloqueado en iPad -es un
  // conflicto conocido entre normalizeScroll y elementos con
  // "position: fixed" como la cabecera (.site-header) de esta página-.
  // Se quita: el fallback 100dvh en .scene-section (ver style.css) ya
  // cubre la causa real del desajuste de altura sin ese efecto
  // secundario.

  // NOTA: se probó a cambiar preserveAspectRatio dinámicamente
  // (slice/meet) para evitar el recorte del torii en vertical, pero eso
  // rompía la composición de móvil de más abajo: todas sus cifras
  // (xPercent/yPercent de cada capa) están calculadas a mano asumiendo
  // SIEMPRE "slice" fijo. El SVG se deja tal cual viene en el HTML
  // (slice) y en su lugar se soluciona por el otro lado: haciendo que
  // cualquier pantalla con proporción vertical (no solo los móviles
  // estrechos) reciba la composición de móvil -ver el cambio de mm.add
  // más abajo-, que ya está pensada y calibrada para ese recorte.

  // gsap.matchMedia() separa por completo el comportamiento en escritorio
  // del de móvil: en escritorio se mantiene tal cual la composición y
  // animación actuales (nada cambia); en móvil arrancamos desde cero una
  // composición propia, pensada para un encuadre vertical, que iremos
  // construyendo capa a capa según se vaya decidiendo qué piezas usar y
  // cómo colocarlas -por eso el bloque mobile empieza vacío.
  const mm = gsap.matchMedia();

  // --- Helpers compartidos entre escritorio y móvil ---------------------
  // El arco del sol (curva de Bézier cuadrática) y el aleteo de los
  // pájaros (vaivén senoidal) se calculan a mano cuadro a cuadro con un
  // tween sobre un objeto proxy, en vez de sobre el propio elemento, para
  // que sea una única curva/onda suave (no tramos rectos encadenados).
  // Ambas versiones (escritorio y móvil) usan exactamente la misma fórmula
  // sobre coordenadas distintas, así que se definen aquí -FUERA de los dos
  // bloques mm.add- para que las pueda usar tanto escritorio como móvil.
  function addArcMotion(timeline, el, { startX, startY, arcX, arcY, endX, endY, duration, time, ease = "sine.inOut" }) {
    const progress = { t: 0 };
    timeline.to(
      progress,
      {
        t: 1,
        duration,
        ease,
        onUpdate: () => {
          if (!el) return;
          const t = progress.t;
          const inv = 1 - t;
          const x = inv * inv * startX + 2 * inv * t * arcX + t * t * endX;
          const y = inv * inv * startY + 2 * inv * t * arcY + t * t * endY;
          gsap.set(el, { xPercent: x, yPercent: y });
        },
      },
      time
    );
  }

  function addBirdMotion(timeline, el, { restX = 0, entranceX, delay, duration, bobAmplitude, bobCycles, ease = "power3.out" }) {
    const progress = { t: 0 };
    timeline.to(
      progress,
      {
        t: 1,
        duration,
        ease,
        onUpdate: () => {
          if (!el) return;
          const t = progress.t;
          const x = restX + entranceX * (1 - t);
          const y = Math.sin(t * bobCycles * Math.PI * 2) * bobAmplitude * (1 - t * 0.3);
          gsap.set(el, { xPercent: x, yPercent: y });
        },
      },
      delay
    );
  }

  // La condición ya no es solo "ancho": un iPad en vertical tiene 834px o
  // más de ancho (entraría por la rama de escritorio por puro número de
  // píxeles) pero su proporción es alta y estrecha, mucho más parecida a
  // un móvil que a un monitor. Por eso aquí se añade también la
  // proporción (aspect-ratio): solo se considera "escritorio" una
  // pantalla ancha Y con una proporción razonablemente horizontal
  // (min-aspect-ratio: 4/5, es decir anchura/altura >= 0.8).
  //
  // Pero el aspect-ratio solo no basta: un iPad EN HORIZONTAL sí es
  // ancho y horizontal (ratio > 0.8), así que con solo esa condición
  // seguía cayendo en la rama de escritorio -y ahí el scroll se quedaba
  // bloqueado, porque esta composición nunca se ha probado con un dedo
  // en pantalla, solo con ratón-.
  //
  // Se probó a añadir (hover: hover) y (pointer: fine) para detectar
  // "esto tiene ratón/trackpad de verdad", pero los iPad Pro recientes
  // (con soporte de "hover" para el Apple Pencil) devuelven esas dos
  // condiciones como verdaderas de forma NATIVA aunque no haya ni ratón
  // ni teclado conectado -es una peculiaridad conocida de iPadOS-, así
  // que seguían cayendo en escritorio también en horizontal. La forma
  // fiable de preguntar "¿hay una pantalla táctil disponible en este
  // dispositivo?" es any-pointer (comprueba TODOS los punteros
  // disponibles, no solo el "principal" que reporta el Pencil): un
  // iPad, tenga o no teclado/trackpad, siempre tiene disponible un
  // puntero táctil ("coarse"), mientras que un Mac/PC sin pantalla
  // táctil nunca lo tiene.
  mm.add(
    "(min-width: 769px) and (min-aspect-ratio: 4/5) and (not (any-pointer: coarse))",
    () => {
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
  const LAKE_Y = 239.27998037760156; // subida 6 puntos en total respecto al valor original
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
        addArcMotion(tl, sunEl, {
          startX: SUN_START_X,
          startY: SUN_START_Y,
          arcX: SUN_ARC_X,
          arcY: SUN_ARC_Y,
          endX: SUN_FINAL_X,
          endY: SUN_FINAL_Y,
          duration: sunArcDuration,
          time,
        });
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
          addBirdMotion(tl, birdEl, { entranceX, delay: time + delay, duration, bobAmplitude, bobCycles });
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

  // Complementaria de la condición de arriba: entra aquí cualquier
  // pantalla estrecha (max-width: 768px), cualquier pantalla con
  // proporción vertical (max-aspect-ratio: 4/5) -aunque sea ancha en
  // píxeles, como un iPad Pro en vertical-, o cualquier dispositivo con
  // una pantalla táctil disponible (any-pointer: coarse) -así un iPad en
  // horizontal, que es ancho y horizontal pero se maneja con el dedo,
  // también cae aquí en vez de en la rama de escritorio, sin depender de
  // si además tiene o no soporte de "hover" para el Apple Pencil-.
  mm.add(
    "(max-width: 768px), (max-aspect-ratio: 4/5), (any-pointer: coarse)",
    () => {
    // composición móvil: propia y distinta de la de escritorio, pensada
    // para un encuadre vertical. Reutiliza los mismos recursos del SVG,
    // pero con su propia posición, escala y tiempos para cada capa.
    // El suelo no se usa en esta composición y queda oculto.
    const MOBILE_HIDDEN_SELECTORS = [".layer-suelo"];
    gsap.set(MOBILE_HIDDEN_SELECTORS, { opacity: 0 });

    // el lago (el hueco de agua recortado dentro de la montaña): altura
    // final tal como quedó definida para el lago (LAKE_HEIGHT de la
    // versión de escritorio)
    const MOBILE_LAKE_HEIGHT = 203.51998371840128;
    const lagoAguaMobile = document.querySelector(".layer-lago-agua");

    // IMPORTANTE: hay que calcular la posición (xPercent/yPercent) con
    // el rectángulo a su altura FINAL, no a 0. GSAP calcula esos
    // porcentajes sobre el tamaño del elemento en el momento en que se
    // aplican -si la altura es 0 en ese instante, el cálculo del
    // desplazamiento vertical sale mal (por eso "bajar más" no se
    // traducía en bajar más)-. Por eso primero se deja a su altura
    // completa, se coloca, y solo al final se vuelve a poner a 0 para
    // que arranque desde ahí la animación de relleno.
    if (lagoAguaMobile) {
      gsap.set(lagoAguaMobile, { attr: { height: MOBILE_LAKE_HEIGHT } });
    }

    // la montaña con el lago abarca todo el ancho del lienzo (3125), así
    // que centrarla de verdad significa centrar el propio lago -que es
    // la parte que de verdad se reconoce como "esa montaña"- en mitad
    // del ancho del lienzo (1562.5). El lago está en outer x:[199,1912],
    // centro 1055.5; hacían falta 507 unidades hacia la derecha para
    // centrarlo, más 50 unidades más pedidas después (total 557), además
    // de reducir el tamaño final un 25% (escala 0.75). El desplazamiento
    // se expresa como % del ancho propio de cada elemento -así se mueven
    // la montaña y el lago exactamente lo mismo en píxeles, aunque
    // tengan anchos de caja distintos- y ese % no cambia por aplicar
    // además una escala, porque el porcentaje siempre es relativo a la
    // caja original del elemento, no al tamaño ya escalado.
    const MOBILE_SHIFT_OUTER = 507 + 50;
    const MOBILE_MONTANAS_X = (MOBILE_SHIFT_OUTER / 3125) * 100;
    const MOBILE_SCALE = 0.75; // 25% más pequeño

    // ajuste fino del agua respecto a la montaña, para que encaje bien
    // en el hueco del lago. El ancho/alto propio del rect del lago
    // (outer, antes de escalar) son 1713 y 848 -de ahí sale el % de
    // cada ajuste.
    const MOBILE_LAGO_WIDTH_OUTER = 1713;
    const MOBILE_LAGO_HEIGHT_OUTER = 848;
    // ajuste fino hacia la izquierda respecto al desplazamiento de la
    // montaña, en unidades outer
    const MOBILE_LAGO_X_ADJUST = 166;
    const MOBILE_LAGO_X =
      ((MOBILE_SHIFT_OUTER - MOBILE_LAGO_X_ADJUST) / MOBILE_LAGO_WIDTH_OUTER) * 100;
    // ajuste fino hacia abajo, en unidades outer
    const MOBILE_LAGO_Y_ADJUST = 51;
    const MOBILE_LAGO_Y = (MOBILE_LAGO_Y_ADJUST / MOBILE_LAGO_HEIGHT_OUTER) * 100;

    // mismo efecto de aparición que en la versión de escritorio: fundido
    // (opacidad 0->1) + escalado suave (de 0.85 veces el tamaño final a
    // el tamaño final), disparado por el scroll. Se aplica igual a la
    // montaña y al agua, para que entren juntas como una sola pieza.
    const MOBILE_REVEAL_DURATION = 0.6;
    const mobileEntranceTargets = [".layer-montanas"];

    // cascada por grupos, igual que en la versión de escritorio (donde el
    // desfase STEP=0.12 entre capas es lo que da esa sensación de "una
    // detrás de otra"): antes, en móvil, casi todas las figuras arrancaban
    // juntas en el instante 0 -montaña, sol, nube, sakura y los tres
    // pájaros a la vez-, así que no se notaba ninguna cascada real, solo
    // el torii caía escalonado. Con MOBILE_STEP cada grupo empieza un poco
    // después que el anterior, manteniendo intactas las duraciones y los
    // desfases internos que ya había dentro de cada grupo (p.ej. las
    // hojas de la sakura siguen tardando más que las ramas, y las piezas
    // del torii caen igual de escalonadas entre sí).
    const MOBILE_STEP = 0.13;
    const MOBILE_MONTANA_START = 0;
    const MOBILE_SOL_START = MOBILE_STEP;
    const MOBILE_NUBE_START = MOBILE_STEP * 2;
    const MOBILE_SAKURA_START = MOBILE_STEP * 3;
    const MOBILE_PAJAROS_START = MOBILE_STEP * 4;
    const MOBILE_TORII_START = MOBILE_STEP * 5;

    gsap.set(".layer-montanas", {
      opacity: 0,
      scale: MOBILE_SCALE * 0.85,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_MONTANAS_X,
      yPercent: 0,
    });
    if (lagoAguaMobile) {
      // OJO: el agua NO comparte la animación de "scale" de la montaña
      // (antes sí, dentro de mobileEntranceTargets). Escalar con CSS un
      // rect con clip-path A LA VEZ que se anima su altura (el relleno)
      // hace que, con timings/eases ligeramente distintos entre ambos
      // tweens, el rectángulo y su máscara de recorte se desincronicen
      // -por eso el agua "se movía de su sitio" al terminar-. Con la
      // escala fija desde el principio (nunca se anima) y solo opacidad
      // + altura cambiando, rect y clip-path quedan siempre acoplados.
      gsap.set(lagoAguaMobile, {
        opacity: 0,
        scale: MOBILE_SCALE,
        transformOrigin: "50% 50%",
        xPercent: MOBILE_LAGO_X,
        yPercent: MOBILE_LAGO_Y,
      });
      // ahora que xPercent/yPercent ya quedaron calculados correctamente
      // (con la altura completa), se vuelve a poner a 0 para que la
      // animación de relleno de más abajo empiece desde ahí
      gsap.set(lagoAguaMobile, { attr: { height: 0 } });
    }

    // el sol: posición final ya colocada (MOBILE_SOL_X/Y); ahora llega
    // haciendo el mismo arco curvo (una curva de Bézier cuadrática) que
    // en la versión de escritorio, en vez de un fundido simple. Se
    // reutilizan los mismos desplazamientos relativos que en escritorio
    // (arranca más a la izquierda y más abajo que su posición final, y
    // el punto de control del arco queda más arriba), aplicados sobre
    // la posición final ya ajustada aquí en móvil.
    const MOBILE_SOL_WIDTH_OUTER = 194;
    const MOBILE_SOL_HEIGHT_OUTER = 184;
    const MOBILE_SOL_X = (-600 / MOBILE_SOL_WIDTH_OUTER) * 100;
    const MOBILE_SOL_Y = (200 / MOBILE_SOL_HEIGHT_OUTER) * 100;
    const MOBILE_SOL_SCALE = 1;
    const MOBILE_SOL_START_X = MOBILE_SOL_X - 877;
    const MOBILE_SOL_START_Y = MOBILE_SOL_Y + 220;
    const MOBILE_SOL_ARC_X = (MOBILE_SOL_START_X + MOBILE_SOL_X) / 2;
    const MOBILE_SOL_ARC_Y = MOBILE_SOL_Y - 300;
    gsap.set(".layer-sol", {
      opacity: 0,
      scale: MOBILE_SOL_SCALE * 0.85,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_SOL_START_X,
      yPercent: MOBILE_SOL_START_Y,
    });

    // el torii (las 3 piezas) y el rótulo: caen desde arriba igual que
    // en escritorio (opacos desde el principio, solo desplazándose en
    // vertical), pero desplazados 600 unidades outer a la izquierda
    // respecto a su posición original -que, como el resto de piezas,
    // queda fuera de la franja visible en móvil-. Cada pieza tiene su
    // propio ancho (outer), de ahí sale el % de cada una.
    const MOBILE_TORII_DROP_Y = -650;
    const MOBILE_TORII_SHIFT_OUTER = -600 - 500 + 100 + 150;
    const MOBILE_TORII_DOWN_OUTER = 450;
    const MOBILE_TORII_SCALE = 0.7; // 30% más pequeño
    // el tejado necesitaba además otros 30 puntos de más hacia abajo
    // que el resto de piezas -de ahí el downExtraOuter individual-
    const mobileToriiPieces = [
      { selector: ".layer-torii-base", widthOuter: 397, heightOuter: 114, downExtraOuter: 0, delay: MOBILE_TORII_START + 0, duration: 0.75 },
      { selector: ".layer-torii-cuerpo", widthOuter: 768, heightOuter: 691, downExtraOuter: 0, delay: MOBILE_TORII_START + 0.3, duration: 0.85 },
      { selector: ".layer-torii-tejado", widthOuter: 977, heightOuter: 218, downExtraOuter: 105, delay: MOBILE_TORII_START + 0.6, duration: 0.7 },
    ];
    // restX/restY de cada pieza se calculan una sola vez aquí y se
    // guardan en el propio objeto, para no repetir la misma cuenta más
    // abajo cuando se anima la caída.
    mobileToriiPieces.forEach((piece) => {
      piece.restX = (MOBILE_TORII_SHIFT_OUTER / piece.widthOuter) * 100;
      piece.restY = ((MOBILE_TORII_DOWN_OUTER + piece.downExtraOuter) / piece.heightOuter) * 100;
      // OJO: en móvil el recorte "slice" no oculta nada en vertical (se
      // ve la altura completa del lienzo), a diferencia de escritorio;
      // así que empujar la pieza hacia arriba con yPercent no basta para
      // esconderla del todo al cargar la página -por eso también arranca
      // con opacity 0, y se hace visible justo cuando empieza a caer-
      gsap.set(piece.selector, {
        opacity: 0,
        scale: MOBILE_TORII_SCALE,
        transformOrigin: "50% 50%",
        xPercent: piece.restX,
        yPercent: MOBILE_TORII_DROP_Y + piece.restY,
      });
    });

    const MOBILE_ROTULO_WIDTH_OUTER = 421;
    const MOBILE_ROTULO_HEIGHT_OUTER = 116;
    const MOBILE_ROTULO_DOWN_EXTRA_OUTER = 125;
    const MOBILE_ROTULO_REST_X = (MOBILE_TORII_SHIFT_OUTER / MOBILE_ROTULO_WIDTH_OUTER) * 100;
    const MOBILE_ROTULO_REST_Y =
      ((MOBILE_TORII_DOWN_OUTER + MOBILE_ROTULO_DOWN_EXTRA_OUTER) / MOBILE_ROTULO_HEIGHT_OUTER) * 100;
    gsap.set(".layer-rotulo", {
      opacity: 0,
      scale: MOBILE_TORII_SCALE,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_ROTULO_REST_X,
      yPercent: MOBILE_TORII_DROP_Y + MOBILE_ROTULO_REST_Y,
    });

    // la nube: desplazada 500 unidades outer respecto a su posición
    // original (igual que el resto de piezas, su posición original
    // queda fuera de la franja visible en móvil), un 25% más pequeña, y
    // entrando ahora desde la derecha (antes desde la izquierda). Su
    // ancho propio (outer) es 737, de ahí sale el % del desplazamiento.
    const MOBILE_NUBE_WIDTH_OUTER = 737;
    const MOBILE_NUBE_HEIGHT_OUTER = 240;
    const MOBILE_NUBE_REST_X = (-500 / MOBILE_NUBE_WIDTH_OUTER) * 100;
    const MOBILE_NUBE_REST_Y = (100 / MOBILE_NUBE_HEIGHT_OUTER) * 100;
    const MOBILE_NUBE_ENTRANCE_X = 80; // desplazamiento extra de entrada (positivo = desde la derecha)
    const MOBILE_NUBE_SCALE = 0.75; // 25% más pequeña
    gsap.set(".layer-nube", {
      opacity: 0,
      scale: MOBILE_NUBE_SCALE * 0.85,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_NUBE_REST_X + MOBILE_NUBE_ENTRANCE_X,
      yPercent: MOBILE_NUBE_REST_Y,
    });

    // las ramas y las hojas de la sakura entran desde la izquierda, cada
    // una a su propia velocidad (mismo planteamiento que en escritorio):
    // arrancan juntas pero las hojas tardan más en llegar, así que se ve
    // que una va más rápido que la otra en vez de moverse en bloque.
    //
    // en su posición original del dibujo quedan fuera de la franja
    // vertical que se ve en móvil (el recorte "slice" solo muestra una
    // franja centrada del lienzo ancho), así que hace falta correrlas
    // 50 unidades hacia la derecha -igual que se hizo con la montaña-
    // para que entren en esa franja. Como ramas y hojas tienen anchos
    // de caja distintos, ese mismo desplazamiento en píxeles se expresa
    // como un % distinto para cada una.
    const MOBILE_SAKURA_X_SHIFT_OUTER = 600;
    const MOBILE_SAKURA_RAMAS_WIDTH_OUTER = 1033;
    const MOBILE_SAKURA_HOJAS_WIDTH_OUTER = 1116;
    const MOBILE_SAKURA_RAMAS_REST_X =
      (MOBILE_SAKURA_X_SHIFT_OUTER / MOBILE_SAKURA_RAMAS_WIDTH_OUTER) * 100;
    const MOBILE_SAKURA_HOJAS_REST_X =
      (MOBILE_SAKURA_X_SHIFT_OUTER / MOBILE_SAKURA_HOJAS_WIDTH_OUTER) * 100;
    const MOBILE_SAKURA_ENTRANCE_X = -70; // desplazamiento extra de entrada, sumado a la posición de reposo
    const MOBILE_SAKURA_SCALE = 0.7; // 30% más pequeño

    gsap.set(".layer-sakura-ramas", {
      opacity: 0,
      scale: MOBILE_SAKURA_SCALE * 0.85,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_SAKURA_RAMAS_REST_X + MOBILE_SAKURA_ENTRANCE_X,
    });
    gsap.set(".layer-sakura-hojas", {
      opacity: 0,
      scale: MOBILE_SAKURA_SCALE * 0.85,
      transformOrigin: "50% 50%",
      xPercent: MOBILE_SAKURA_HOJAS_REST_X + MOBILE_SAKURA_ENTRANCE_X,
    });

    const mobileTl = gsap.timeline({
      scrollTrigger: {
        trigger: sceneSection,
        start: "top top",
        end: "+=100%",
        scrub: 1,
        pin: true,
      },
    });

    mobileTl.to(mobileEntranceTargets, {
      opacity: 1,
      scale: MOBILE_SCALE,
      duration: MOBILE_REVEAL_DURATION,
      ease: "power2.out",
    }, MOBILE_MONTANA_START);

    // efecto de relleno del agua, igual que en escritorio: el rectángulo
    // crece en altura desde 0 hasta su altura final -con la parte de
    // arriba fija, ver LAKE_Y en la versión de escritorio- como si el
    // agua fuera cubriendo el lago desde el fondo del río hacia delante
    if (lagoAguaMobile) {
      mobileTl.to(
        lagoAguaMobile,
        { attr: { height: MOBILE_LAKE_HEIGHT }, duration: 0.7, ease: "sine.inOut" },
        MOBILE_MONTANA_START
      );
      // opacidad del agua por separado (ya no comparte tween de escala
      // con la montaña), con la misma duración que el relleno para que
      // ambas terminen exactamente a la vez
      mobileTl.to(lagoAguaMobile, { opacity: 1, duration: 0.7, ease: "sine.inOut" }, MOBILE_MONTANA_START);
    }

    // arco real (curva de Bézier cuadrática), igual que en escritorio:
    // se calcula a mano cuadro a cuadro con un tween sobre un objeto
    // proxy, en vez de sobre el propio elemento, para que sea una única
    // curva suave (no dos tramos rectos encadenados)
    const solElMobile = document.querySelector(".layer-sol");
    const MOBILE_SOL_ARC_DURATION = MOBILE_REVEAL_DURATION * 1.4;
    addArcMotion(mobileTl, solElMobile, {
      startX: MOBILE_SOL_START_X,
      startY: MOBILE_SOL_START_Y,
      arcX: MOBILE_SOL_ARC_X,
      arcY: MOBILE_SOL_ARC_Y,
      endX: MOBILE_SOL_X,
      endY: MOBILE_SOL_Y,
      duration: MOBILE_SOL_ARC_DURATION,
      time: MOBILE_SOL_START,
    });
    mobileTl.to(
      ".layer-sol",
      { opacity: 1, scale: MOBILE_SOL_SCALE, duration: MOBILE_SOL_ARC_DURATION, ease: "power1.out" },
      MOBILE_SOL_START
    );

    mobileTl.to(
      ".layer-nube",
      {
        opacity: 1,
        scale: MOBILE_NUBE_SCALE,
        xPercent: MOBILE_NUBE_REST_X,
        yPercent: MOBILE_NUBE_REST_Y,
        duration: MOBILE_REVEAL_DURATION,
        ease: "power2.out",
      },
      MOBILE_NUBE_START
    );

    // el torii cae pieza a pieza, de abajo arriba (primero la base,
    // luego el cuerpo, el tejado el último), manteniendo fijo el
    // desplazamiento horizontal ya colocado arriba -solo se anima la
    // caída vertical-
    mobileToriiPieces.forEach(({ selector, restY, delay, duration }) => {
      // opacity casi instantánea (0.05s) justo al empezar a caer, para
      // que aparezca de golpe "cayendo" en vez de hacer un fundido lento
      mobileTl.to(selector, { opacity: 1, duration: 0.05, ease: "none" }, delay);
      mobileTl.to(selector, { yPercent: restY, duration, ease: "power2.in" }, delay);
    });

    // el rótulo cae justo después de la última pieza (el tejado), como
    // una pieza más de la puerta
    const mobileLastToriiPiece = mobileToriiPieces[mobileToriiPieces.length - 1];
    mobileTl.to(
      ".layer-rotulo",
      { opacity: 1, duration: 0.05, ease: "none" },
      mobileLastToriiPiece.delay + 0.1
    );
    mobileTl.to(
      ".layer-rotulo",
      { yPercent: MOBILE_ROTULO_REST_Y, duration: mobileLastToriiPiece.duration, ease: "power2.in" },
      mobileLastToriiPiece.delay + 0.1
    );

    // una vez el rótulo queda fijado en su sitio (sobre la montaña
    // gris), el rojo desentona -así que en cuanto termina de caer,
    // cambia a blanco. Se anima el "fill" directamente en línea (más
    // prioridad que la clase .rotulo-cls-1 de los <style> internos del
    // propio SVG), sobre todos los trazos del rótulo.
    mobileTl.to(
      ".layer-rotulo .rotulo-cls-1",
      { fill: "#ffffff", duration: 0.4, ease: "power1.out" },
      mobileLastToriiPiece.delay + 0.1 + mobileLastToriiPiece.duration
    );

    // ramas y hojas arrancan juntas (en el instante de su grupo,
    // MOBILE_SAKURA_START) pero las hojas llevan más duración -van un
    // paso por detrás durante todo el trayecto y terminan "floreciendo"
    // después de que la rama ya haya llegado-
    const MOBILE_SAKURA_RAMAS_DURATION = MOBILE_REVEAL_DURATION;
    const MOBILE_SAKURA_HOJAS_DURATION = MOBILE_REVEAL_DURATION * 1.8;

    mobileTl.to(
      ".layer-sakura-ramas",
      {
        opacity: 1,
        scale: MOBILE_SAKURA_SCALE,
        xPercent: MOBILE_SAKURA_RAMAS_REST_X,
        duration: MOBILE_SAKURA_RAMAS_DURATION,
        ease: "power2.out",
      },
      MOBILE_SAKURA_START
    );
    mobileTl.to(
      ".layer-sakura-hojas",
      {
        opacity: 1,
        scale: MOBILE_SAKURA_SCALE,
        xPercent: MOBILE_SAKURA_HOJAS_REST_X,
        duration: MOBILE_SAKURA_HOJAS_DURATION,
        ease: "power2.out",
      },
      MOBILE_SAKURA_START
    );

    // los pájaros: mismo mecanismo que en escritorio -cada uno entra por
    // separado, con su propio desplazamiento de entrada (izquierda o
    // derecha), su propio retraso y duración, y un aleteo (vaivén
    // vertical en forma de onda) calculado cuadro a cuadro con un tween
    // sobre un objeto proxy en vez de sobre el propio elemento.
    // pajaros-1 es el que queda más abajo en el dibujo original, y
    // pajaros-2 el que queda más arriba (pajaros-3 se deja como está de
    // momento); ambos necesitan un empujón fijo hacia la derecha,
    // expresado en % de su propio ancho (112 y 101 unidades outer
    // respectivamente) para que el desplazamiento en píxeles sea el
    // pedido (100 y 150 unidades outer).
    const mobileBirds = [
      {
        selector: ".layer-pajaros-1",
        entranceX: -900,
        restX: (100 / 112) * 100,
        delay: MOBILE_PAJAROS_START + 0,
        duration: 0.4,
        bobAmplitude: 45,
        bobCycles: 2,
      },
      {
        selector: ".layer-pajaros-2",
        entranceX: 1100,
        restX: ((150 - 200 - 150) / 101) * 100,
        delay: MOBILE_PAJAROS_START + 0.05,
        duration: 0.3,
        bobAmplitude: 60,
        bobCycles: 3,
      },
      {
        selector: ".layer-pajaros-3",
        entranceX: -1400,
        restX: 0,
        delay: MOBILE_PAJAROS_START + 0.02,
        duration: 0.45,
        bobAmplitude: 55,
        bobCycles: 4,
      },
    ];

    gsap.set(
      mobileBirds.map((b) => b.selector),
      { opacity: 0, scale: 0.85, transformOrigin: "50% 50%" }
    );

    mobileBirds.forEach(({ selector, entranceX, restX, delay, duration, bobAmplitude, bobCycles }) => {
      const birdEl = document.querySelector(selector);
      addBirdMotion(mobileTl, birdEl, { restX, entranceX, delay, duration, bobAmplitude, bobCycles });
      mobileTl.to(selector, { opacity: 1, scale: 1, duration, ease: "power3.out" }, delay);
    });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

// =========================================================
// VÍDEO CON SCROLL-SCRUBBING (página Sobre mí, PRUEBA): en vez de
// reproducir un <video>, se dibuja en un <canvas> el fotograma que
// corresponde a la posición del scroll. Los fotogramas son una
// secuencia de imágenes (assets/sobre-mi-frames/) extraída de un
// vídeo de prueba con ffmpeg — NO es el vídeo definitivo, solo sirve
// para validar el efecto antes de renderizar el recorrido de cámara
// real en Twinmotion (ver Guia-video-scroll-Twinmotion.docx).
// =========================================================
const scrollVideoSection = document.getElementById("scroll-video-section");
if (scrollVideoSection && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  const canvas = document.getElementById("scroll-video-canvas");
  const loadingEl = document.getElementById("scroll-video-loading");
  const ctx = canvas.getContext("2d");

  const FRAME_COUNT = 100;
  const framePath = (n) => `assets/sobre-mi-frames/frame_${String(n).padStart(3, "0")}.jpg`;

  const images = [];
  let loadedCount = 0;
  let currentFrame = 0;

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // "cover": escala la imagen para llenar el canvas recortando el
    // sobrante, igual que background-size: cover, para que no se
    // deforme al cambiar el tamaño de ventana.
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function resizeCanvas() {
    canvas.width = scrollVideoSection.clientWidth;
    canvas.height = scrollVideoSection.clientHeight;
    drawFrame(currentFrame);
  }

  // precarga de todos los fotogramas antes de activar el scroll, para
  // que no se vea el canvas en blanco al llegar a la sección
  for (let n = 1; n <= FRAME_COUNT; n++) {
    const img = new Image();
    img.src = framePath(n);
    img.onload = () => {
      loadedCount++;
      if (n === 1) {
        resizeCanvas();
      }
      if (loadedCount === FRAME_COUNT && loadingEl) {
        loadingEl.classList.add("is-hidden");
      }
    };
    images.push(img);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  ScrollTrigger.create({
    trigger: scrollVideoSection,
    start: "top top",
    end: "+=150%",
    pin: true,
    // scrub más alto = más "inercia": el progreso persigue al scroll
    // con un pequeño retardo suavizado, en vez de calcarlo al milímetro
    scrub: 1.2,
    onUpdate: (self) => {
      const idx = Math.min(FRAME_COUNT - 1, Math.round(self.progress * (FRAME_COUNT - 1)));
      if (idx !== currentFrame) {
        currentFrame = idx;
        drawFrame(idx);
      }
    },
  });
}
