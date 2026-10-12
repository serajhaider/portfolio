import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function setYear() {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function toast(message, type = 'success') {
  const el = $("#toast");
  if (!el) return;
  
  el.innerHTML = `${message}<button class="toast-close" aria-label="Close" onclick="this.parentElement.classList.remove('is-on')">&times;</button>`;
  el.className = "toast";
  if (type === 'error') el.classList.add("toast-error");
  else if (type === 'success') el.classList.add("toast-success");
  
  el.classList.add("is-on");
  
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-on"), 5000);
}

function toastError(msg) { toast(msg, 'error'); }
function toastSuccess(msg) { toast(msg, 'success'); }

function setupNav() {
  const toggle = $(".nav__toggle");
  const links = $("[data-nav-links]");
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
  });

  links.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) setOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (window.innerWidth > 760) return;
    if (e.target.closest(".nav")) return;
    setOpen(false);
  });
}

function animateCounters() {
  const items = $$("[data-count]");
  if (!items.length) return;
  if (prefersReducedMotion()) {
    for (const el of items) el.textContent = el.dataset.count || "0";
    return;
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const dur = 900;

  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        const el = ent.target;
        const to = Number(el.dataset.count || 0);
        const start = performance.now();
        const from = 0;
        const tick = (now) => {
          const t = clamp((now - start) / dur, 0, 1);
          el.textContent = String(Math.round(from + (to - from) * easeOut(t)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      }
    },
    { threshold: 0.45 }
  );

  for (const el of items) io.observe(el);
}

function setupContactForm() {
  const form = $("#contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    // Client-side validation: Check empty
    let hasError = false;
    const inputs = form.querySelectorAll("input, textarea");
    inputs.forEach(input => {
      input.classList.remove("input-error");
      if (!input.value.trim()) {
        input.classList.add("input-error");
        setTimeout(() => input.classList.remove("input-error"), 400);
        hasError = true;
      }
    });

    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn?.innerHTML || "Send";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span>Sending...';
    }

    try {
      const res = await fetch(`contact.php`, {
        method: "POST",
        body: fd,
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Network error or invalid server response.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }

      form.reset();
      
      // Success state for button
      if (submitBtn) {
        submitBtn.innerHTML = "✓ Message Sent";
        submitBtn.style.background = "linear-gradient(135deg, #4ade80, #22c55e)";
        submitBtn.style.color = "#000";
        submitBtn.style.borderColor = "#22c55e";
        
        // Reset button after 4 seconds
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
          submitBtn.style = "";
        }, 4000);
      }
      
      toastSuccess(data.message || "Message sent successfully!");
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
      toastError(err.message || "Could not send message. Please try again.");
    }
  });
}

function setupFakeCvDownload() {
  // Logic removed so actual download occurs
}

function setupThree() {
  const canvas = $("#bg3d");
  if (!canvas) return () => {};

  const reduced = prefersReducedMotion();
  if (reduced) return () => {};

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  camera.position.set(0, 0.6, 8.5);

  // Deep space particles
  const pointsCount = 3500;
  const positions = new Float32Array(pointsCount * 3);
  const sizes = new Float32Array(pointsCount);
  const colors = new Float32Array(pointsCount * 3);

  const palette = [
    new THREE.Color("#3b82f6"), // Blue
    new THREE.Color("#8b5cf6"), // Purple
    new THREE.Color("#0d9488"), // Teal / deep cyan
    new THREE.Color("#1e3a8a"), // Dark blue
    new THREE.Color("#4fd1c5"), // Light teal
  ];

  for (let i = 0; i < pointsCount; i++) {
    // Spread evenly in a large cube
    const x = THREE.MathUtils.randFloatSpread(50);
    const y = THREE.MathUtils.randFloatSpread(50);
    const z = THREE.MathUtils.randFloatSpread(50);
    positions.set([x, y, z], i * 3);

    sizes[i] = Math.random();

    const col = palette[Math.floor(Math.random() * palette.length)];
    colors.set([col.r, col.g, col.b], i * 3);
  }

  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  ptsGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  ptsGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

  const ptsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      varying float vFade;
      varying vec3 vColor;
      void main() {
        vec3 p = position;
        vColor = aColor;
        
        // Drifting slowly
        float t = uTime * 0.15;
        p.x += sin(p.z * 0.1 + t) * 1.5;
        p.y += cos(p.x * 0.1 + t) * 1.5;
        
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = length(mv.xyz);
        
        // Fade far and very close particles
        vFade = smoothstep(45.0, 10.0, d) * smoothstep(1.0, 4.0, d);
        
        // Size variation
        gl_PointSize = (1.5 + aSize * 2.5) * (90.0 / d);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vFade;
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = dot(uv, uv);
        float alpha = smoothstep(0.25, 0.0, r) * vFade;
        float glow = exp(-r * 8.0) * 0.5 * vFade;
        // Boost particle opacity per user request
        gl_FragColor = vec4(vColor, min((alpha + glow) * 1.5, 0.7));
      }
    `,
  });

  const particles = new THREE.Points(ptsGeo, ptsMat);
  scene.add(particles);

  // Torus Knot Wireframe (faint orange)
  const wireGeo = new THREE.TorusKnotGeometry(7, 1.8, 128, 24);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffcc66, // Brighter orange accent
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });
  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(wireGeo),
    wireMat
  );
  wireframe.position.set(0, 0, -15);
  scene.add(wireframe);

  // Deep space fog
  scene.fog = new THREE.FogExp2(0x050611, 0.03);

  // Interaction
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    const cx = e.clientX / window.innerWidth;
    const cy = e.clientY / window.innerHeight;
    mouse.tx = (cx - 0.5) * 2;
    mouse.ty = (cy - 0.5) * 2;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  // Resize
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Pause rendering when not visible
  let running = true;
  const vis = () => {
    running = !document.hidden;
  };
  document.addEventListener("visibilitychange", vis);

  const clock = new THREE.Clock();
  const tick = () => {
    if (!running) return requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    ptsMat.uniforms.uTime.value = t;

    // Smooth mouse interpolation
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // Gentle parallax via camera
    camera.position.x = mouse.x * 2.0;
    camera.position.y = 0.6 + -mouse.y * 2.0;
    camera.lookAt(0, 0, -5);

    // Slow rotate wireframe
    wireframe.rotation.x = t * 0.1 + mouse.y * 0.1;
    wireframe.rotation.y = t * 0.12 + mouse.x * 0.15;
    wireframe.rotation.z = t * 0.05;

    // Subtle drift for particles group
    particles.rotation.y = t * 0.02 + mouse.x * 0.05;
    particles.rotation.x = -mouse.y * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", vis);
    renderer.dispose();
    ptsGeo.dispose();
    ptsMat.dispose();
    wireGeo.dispose();
    wireMat.dispose();
  };
}

function setupSplashScreen() {
  const splash = $("#splash-screen");
  if (!splash) {
    document.body.classList.add("page-loaded");
    return;
  }
  if (prefersReducedMotion()) {
    splash.style.display = "none";
    document.body.classList.add("page-loaded");
    return;
  }
  
  setTimeout(() => {
    splash.classList.add("is-hidden");
    setTimeout(() => {
      document.body.classList.add("page-loaded");
    }, 600);
  }, 2000);
}

function setupScrollAnimations() {
  const els = $$("[data-animate]");
  if (!els.length) return;
  if (prefersReducedMotion()) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add("is-visible");
        observer.unobserve(ent.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach(el => io.observe(el));
}

function setupScrollProgressAndParallax() {
  const bar = $("#scroll-progress-bar");
  const topbar = $(".topbar");
  const canvas = $(".hero__canvas");
  
  let ticking = false;
  
  const update = () => {
    const scrollY = window.scrollY;
    if (bar) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = clamp(scrollY / maxScroll, 0, 1);
      bar.style.width = `${progress * 100}%`;
    }
    
    if (topbar) {
      if (scrollY > 50) {
        topbar.classList.add("is-scrolled");
      } else {
        topbar.classList.remove("is-scrolled");
      }
    }
    
    if (canvas && !prefersReducedMotion()) {
      canvas.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
    ticking = false;
  };
  
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

function setupCustomCursor() {
  const dot = $("#cursor-dot");
  const outline = $("#cursor-outline");
  const text = $(".cursor-text", outline);
  if (!dot || !outline) return;

  if (window.matchMedia("(hover: none)").matches || prefersReducedMotion()) {
    dot.style.display = "none";
    outline.style.display = "none";
    document.body.style.cursor = "auto";
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  const tick = () => {
    outlineX += (mouseX - outlineX) * 0.2;
    outlineY += (mouseY - outlineY) * 0.2;
    outline.style.transform = `translate(${outlineX}px, ${outlineY}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const interactables = $$("a, button, input, textarea, .card, .social-icon");
  interactables.forEach(el => {
    el.addEventListener("mouseenter", () => {
      outline.classList.add("is-hover");
    });
    el.addEventListener("mouseleave", () => {
      outline.classList.remove("is-hover");
    });
  });
}

function setupToTop() {
  const toTop = $(".toTop");
  if (!toTop) return;

  toTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Boot
setYear();
setupNav();
animateCounters();
setupContactForm();
setupFakeCvDownload();
setupSplashScreen();
setupScrollAnimations();
setupScrollProgressAndParallax();
setupCustomCursor();
setupToTop();

const cleanup3d = setupThree();
window.addEventListener("beforeunload", () => cleanup3d?.());

