(() => {
  const canvas = document.querySelector('#ocean');
  const context = canvas.getContext('2d');
  const trigger = document.querySelector('.degree-toggle');
  const panel = document.querySelector('#telematica');
  let networkOpen = false;

  function setNetwork(open) {
    networkOpen = open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.querySelector('span').textContent = open ? ' −' : ' +';
    panel.hidden = !open;
    if (context && reducedMotion.matches) {
      blend = Number(open);
      render();
    }
  }

  trigger.addEventListener('click', () => setNetwork(!networkOpen));
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setNetwork(false);
    trigger.focus();
  });
  if (!context) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const density = ' .:-=+*#%@';
  const palette = [
    '#232323', '#343434', '#464646', '#5a5a5a',
    '#737373', '#8a8a8a', '#a3a3a3', '#c4c4c4',
  ];
  const shoal = [
    { x: .753, y: .406, scale: 1, phase: .7, depth: 1 },
    { x: .907, y: .224, scale: .43, phase: 2.3, depth: .66 },
    { x: .945, y: .71, scale: .40, phase: 4, depth: .57 },
    { x: .59, y: .23, scale: .27, phase: 5, depth: .44 },
  ];

  let width, height;
  let frame = 0;
  let previous;
  let time = 0;
  let ink;
  let blend = 0;
  const cursor = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    const bounds = canvas.getBoundingClientRect();
    cursor.targetX = event.clientX - bounds.left;
    cursor.targetY = event.clientY - bounds.top;
    if (cursor.strength < .01) {
      cursor.x = cursor.targetX;
      cursor.y = cursor.targetY;
    }
    cursor.targetStrength = 1;
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    cursor.targetStrength = 0;
  });
  window.addEventListener('blur', () => {
    cursor.targetStrength = 0;
  });

  function flow(x, y, reach) {
    const dx = x - cursor.x;
    const dy = y - cursor.y;
    return cursor.strength * Math.exp(-(dx * dx + dy * dy) / (reach * reach));
  }

  function stamp(glyph, x, y, shade) {
    const color = palette[Math.max(0, Math.min(palette.length - 1, shade))];
    if (color !== ink) {
      context.fillStyle = color;
      ink = color;
    }
    const weight = flow(x, y, 115) * .095;
    context.fillText(glyph, x + (x - cursor.x) * weight, y + (y - cursor.y) * weight);
  }

  function jellyfish(fish, index) {
    const compact = mobile.matches;
    const phase = time * (1.48 + index * .13) + fish.phase;
    const pulse = Math.sin(phase);
    const drift = Math.sin(time * .37 + fish.phase);
    const centerX = (compact ? [.51, .82, .18, .15][index] : fish.x) * width
      + drift * (index ? 12 : 22);
    const centerY = (compact ? [.33, .26, .59, .27][index] : fish.y) * height
      + Math.cos(time * .55 + fish.phase) * (index ? 12 : 19);
    const unit = Math.min(width * (compact ? .56 : .36), height * (compact ? .63 : .56), 490) * fish.scale;
    const fontSize = Math.max(7, Math.min(13, unit / 31));
    context.font = `${fontSize}px "DejaVu Sans Mono", monospace`;
    const cellX = fontSize * .66;
    const cellY = fontSize * 1.05;
    const radius = unit * (.47 + .037 * pulse);
    const dome = unit * (.28 - .028 * pulse);
    const rim = unit * .082;
    const shade = Math.round((1 - fish.depth) * 6);

    // Project the bell onto a local character grid. Moving its origin in pixels
    // keeps the drift smooth even as characters change inside the silhouette.
    for (let row = -Math.ceil(dome / cellY); row <= Math.ceil(rim / cellY); row++) {
      const y = row * cellY;
      for (let col = -Math.ceil(radius / cellX); col <= Math.ceil(radius / cellX); col++) {
        const x = col * cellX;
        const nx = x / radius;
        if (Math.abs(nx) > 1) continue;
        const curve = Math.sqrt(1 - nx * nx);
        const top = -curve * dome;
        const bottom = curve * rim + Math.cos(nx * 17 + phase) * cellY * .43;
        if (y < top || y > bottom) continue;

        const edge = Math.min(y - top, bottom - y) / cellY;
        const ribs = Math.cos(nx * 18 + y / dome * nx * 11 - pulse);
        const highlight = Math.exp(-((nx + .23) ** 2) * 5);
        const lit = edge < .88
          ? 5.9 + highlight * 2.7 + ribs * .7
          : 2.2 + highlight * 1.2 + ribs * 1.3 + Math.sin(col * 19 + row * 7) * 1.4;
        const level = Math.max(1, Math.min(9, Math.round(lit)));
        stamp(density[level], centerX + x, centerY + y, Math.min(7, level - shade));
      }
    }

    // A travelling wave delays the motion farther down each tentacle.
    const strands = 11;
    for (let strand = 0; strand < strands; strand++) {
      const anchor = (strand / (strands - 1) - .5) * 1.53;
      const length = unit * (.25 + .37 * Math.cos(anchor * 1.6) + .12 * Math.sin(strand * 12));
      const start = Math.sqrt(1 - anchor * anchor) * rim;
      const steps = Math.ceil(length / cellY);
      const offset = strand * .73;
      const bend = (s) => unit * (
        Math.sin(phase - s * 7 + offset) * s * .085
        + Math.sin(time * .52 - s * 2) * s * .08
        - anchor * s * .15
      );
      for (let step = 1; step <= steps; step++) {
        const s = step / steps;
        const slope = bend(s) - bend((step - 1) / steps);
        const glyph = s > .92 ? '.' : slope > cellX * .27 ? '\\' : slope < -cellX * .27 ? '/' : step % 5 === 0 ? ':' : '|';
        stamp(glyph, centerX + anchor * radius + bend(s), centerY + start + step * cellY, Math.round(6 - s * 4) - shade);
      }
    }
  }

  const particles = Array.from({ length: 225 }, (_, index) => {
    const fraction = (value) => value - Math.floor(value);
    return {
      x: fraction(Math.sin(index * 17.27 + 15) * 17415),
      y: fraction(Math.cos(index * 12.79 + 31) * 21373),
      speed: .001 + (index % 7) * .00026,
    };
  });

  function drawNetwork() {
    const compact = mobile.matches;
    const centerX = width * (compact ? .5 : .765);
    const centerY = height * .48;
    const span = Math.min(width * (compact ? .80 : .42), height * 1.25, 610);
    const tilt = Math.sin(time * .35) * .11 + cursor.strength
      * Math.max(-.35, Math.min(.35, (cursor.x - centerX) / width)) * .32;
    const columns = 18;
    const rows = 12;
    const point = (u, v) => {
      const wave = Math.sin(u * 6 - time * 1.1) * Math.cos(v * 5 + time * .65);
      const scale = 1 + v * .40;
      return [
        centerX + (u * scale + v * tilt) * span,
        centerY + (v * .53 + wave * .042 + u * tilt) * span,
      ];
    };

    context.font = '11px "DejaVu Sans Mono", monospace';
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= columns; col++) {
        const u = col / columns - .5;
        const v = row / rows - .5;
        const [x, y] = point(u, v);
        const local = flow(x, y, 130);
        const packet = Math.sin(time * 2.4 + row * .58 - col * .36);
        const edge = 1 - .5 * Math.max(Math.abs(u), Math.abs(v));
        const shade = Math.round(edge * (3 + (packet > .92 ? 3 : 0)) + local * 2);
        stamp(packet > .92 ? '*' : '+', x, y, shade);

        if (col < columns) {
          for (let step = 1; step <= 2; step++) {
            const [sx, sy] = point(u + step / (columns * 3), v);
            stamp(packet > .93 ? '=' : '-', sx, sy, Math.max(0, shade - 2));
          }
        }
        if (row < rows) {
          const [sx, sy] = point(u, v + .5 / rows);
          const glyph = v > .06 && Math.abs(u) > .23 ? (u < 0 ? '/' : '\\') : ':';
          stamp(glyph, sx, sy, Math.max(0, shade - 2));
        }
      }
    }
  }

  function render() {
    context.clearRect(0, 0, width, height);
    context.font = '10px "DejaVu Sans Mono", monospace';
    particles.forEach((particle, index) => {
      const y = ((particle.y - time * particle.speed) % 1 + 1) % 1 * height;
      const x = particle.x * width + Math.sin(time * .45 + index) * 5;
      stamp(index % 21 === 0 ? '+' : index % 9 === 0 ? ':' : '.', x, y, index % 11 === 0 ? 2 : 0);
    });
    if (blend < .995) {
      context.globalAlpha = 1 - blend;
      for (let index = shoal.length - 1; index >= 0; index--) {
        jellyfish(shoal[index], index);
      }
    }
    if (blend > .005) {
      context.globalAlpha = blend;
      drawNetwork();
    }
    context.globalAlpha = 1;
  }

  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    ink = null;
    render();
  }

  function tick(now) {
    const elapsed = previous === undefined ? 0 : Math.min((now - previous) / 1000, .05);
    const ease = 1 - Math.exp(-elapsed * 8);
    time += elapsed;
    previous = now;
    blend += (Number(networkOpen) - blend) * ease;
    cursor.x += (cursor.targetX - cursor.x) * ease;
    cursor.y += (cursor.targetY - cursor.y) * ease;
    cursor.strength += (cursor.targetStrength - cursor.strength) * ease;
    render();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = undefined;
    if (reducedMotion.matches) {
      cursor.strength = cursor.targetStrength = 0;
      blend = Number(networkOpen);
      render();
    } else if (!document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }

  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(resize).observe(canvas);
  resize();
  sync();
})();
