/* Small canvas chart helpers (bar chart + histogram) with hover tooltips. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  function palette() {
    const style = getComputedStyle(document.body);
    const get = (name, fallback) => (style.getPropertyValue(name) || fallback).trim();
    return {
      grid: get("--chart-grid", "rgba(255,255,255,.08)"),
      text: get("--muted", "#93a0c0"),
      bar: get("--chart-bar", "#3c5aa6"),
      barTop: get("--chart-bar-top", "#5b82e0"),
      accent: get("--accent", "#ffc233"),
      accent2: get("--accent-deep", "#ff9d1c"),
    };
  }

  function surface(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(240, rect.width || canvas.clientWidth || 600);
    const height = Math.max(120, rect.height || canvas.clientHeight || 200);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function tooltipFor(canvas) {
    const host = canvas.parentElement;
    let tip = host.querySelector(".chart-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tip";
      host.appendChild(tip);
    }
    return tip;
  }

  function bindHover(canvas, hit) {
    const tip = tooltipFor(canvas);
    if (canvas.__hoverBound) {
      canvas.__hoverHit = hit;
      return;
    }
    canvas.__hoverBound = true;
    canvas.__hoverHit = hit;

    canvas.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const found = canvas.__hoverHit ? canvas.__hoverHit(x) : null;
      if (!found) {
        tip.classList.remove("is-on");
        return;
      }
      tip.innerHTML = found.html;
      tip.classList.add("is-on");
      const width = tip.offsetWidth || 140;
      tip.style.left = `${Math.min(Math.max(found.x - width / 2, 4), rect.width - width - 4)}px`;
      tip.style.top = `${Math.max(found.y - tip.offsetHeight - 12, 2)}px`;
    });
    canvas.addEventListener("mouseleave", () => tip.classList.remove("is-on"));
  }

  /**
   * Vertical bars.
   * @param {object} opts values, highlight (Set of label), baseline, labelOf, tipOf, tickEvery
   */
  function bars(canvas, opts) {
    const { ctx, width, height } = surface(canvas);
    const colors = palette();
    const values = opts.values;
    const count = values.length;
    if (!count) return;

    const padTop = 14;
    const padBottom = 22;
    const padSide = 6;
    const plotH = height - padTop - padBottom;
    const slot = (width - padSide * 2) / count;
    const barW = Math.max(2, slot * 0.68);
    const maxValue = Math.max(...values, opts.baseline || 0) * 1.08 || 1;
    const scale = (v) => (v / maxValue) * plotH;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = padTop + plotH - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padSide, y);
      ctx.lineTo(width - padSide, y);
      ctx.stroke();
    }

    values.forEach((value, i) => {
      const label = opts.labelOf ? opts.labelOf(i) : i + 1;
      const highlighted = opts.highlight && opts.highlight.has(label);
      const x = padSide + slot * i + (slot - barW) / 2;
      const h = Math.max(1.5, scale(value));
      const y = padTop + plotH - h;
      const grad = ctx.createLinearGradient(0, y, 0, padTop + plotH);
      if (highlighted) {
        grad.addColorStop(0, colors.accent);
        grad.addColorStop(1, colors.accent2);
      } else {
        grad.addColorStop(0, colors.barTop);
        grad.addColorStop(1, colors.bar);
      }
      ctx.fillStyle = grad;
      if (highlighted) {
        ctx.shadowColor = colors.accent;
        ctx.shadowBlur = 10;
      }
      const radius = Math.min(3, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, padTop + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (opts.baseline) {
      const y = padTop + plotH - scale(opts.baseline);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padSide, y);
      ctx.lineTo(width - padSide, y);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = colors.text;
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(opts.baselineLabel || "expected", width - padSide - 2, y - 4);
    }

    ctx.fillStyle = colors.text;
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    const tickEvery = opts.tickEvery || 5;
    values.forEach((_, i) => {
      const label = opts.labelOf ? opts.labelOf(i) : i + 1;
      if (i === 0 || Number(label) % tickEvery === 0) {
        ctx.fillText(String(label), padSide + slot * i + slot / 2, height - 7);
      }
    });

    bindHover(canvas, (x) => {
      const i = Math.floor((x - padSide) / slot);
      if (i < 0 || i >= count) return null;
      const label = opts.labelOf ? opts.labelOf(i) : i + 1;
      return {
        x: padSide + slot * i + slot / 2,
        y: padTop + plotH - scale(values[i]),
        html: opts.tipOf ? opts.tipOf(i, label, values[i]) : `${label}: ${values[i]}`,
      };
    });
  }

  /** Histogram of already-binned counts, with optional value markers. */
  function histogram(canvas, opts) {
    const { ctx, width, height } = surface(canvas);
    const colors = palette();
    const counts = opts.counts;
    const bin = opts.bin;
    const from = opts.from || 0;
    const to = opts.to != null ? opts.to : counts.length * bin;
    const firstBin = Math.floor(from / bin);
    const lastBin = Math.ceil(to / bin);
    const slice = [];
    for (let b = firstBin; b < lastBin; b++) slice.push(counts[b] || 0);

    const padTop = 16;
    const padBottom = 22;
    const padSide = 6;
    const plotH = height - padTop - padBottom;
    const slot = (width - padSide * 2) / slice.length;
    const maxValue = Math.max(...slice, 1) * 1.08;

    ctx.strokeStyle = colors.grid;
    for (let i = 1; i <= 3; i++) {
      const y = padTop + plotH - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padSide, y);
      ctx.lineTo(width - padSide, y);
      ctx.stroke();
    }

    slice.forEach((value, i) => {
      const x = padSide + slot * i + slot * 0.12;
      const barW = slot * 0.76;
      const h = Math.max(1, (value / maxValue) * plotH);
      const y = padTop + plotH - h;
      const grad = ctx.createLinearGradient(0, y, 0, padTop + plotH);
      grad.addColorStop(0, colors.barTop);
      grad.addColorStop(1, colors.bar);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, h);
    });

    for (const marker of opts.markers || []) {
      // Placed at the exact value, not the bin centre, so two sums in the same
      // bin stay visually distinct.
      const offset = (marker - firstBin * bin) / bin;
      if (offset < 0 || offset >= slice.length) continue;
      const x = padSide + slot * offset;
      ctx.save();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = colors.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x, padTop - 4);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, padTop - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = colors.text;
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    slice.forEach((_, i) => {
      const low = (firstBin + i) * bin;
      if (low % (bin * 4) === 0) ctx.fillText(String(low), padSide + slot * i + slot / 2, height - 7);
    });

    bindHover(canvas, (x) => {
      const i = Math.floor((x - padSide) / slot);
      if (i < 0 || i >= slice.length) return null;
      const low = (firstBin + i) * bin;
      return {
        x: padSide + slot * i + slot / 2,
        y: padTop + plotH - (slice[i] / maxValue) * plotH,
        html: `Sum <b>${low}–${low + bin - 1}</b><br>${slice[i]} drawings (${(
          (slice[i] / (opts.total || 1)) *
          100
        ).toFixed(1)}%)`,
      };
    });
  }

  APP.charts = { bars, histogram };
})(window.LOTTO);
