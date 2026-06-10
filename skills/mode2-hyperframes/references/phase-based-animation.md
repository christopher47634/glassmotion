# Phase-Based Animation Architecture for seekTo Mode

## Problem

When Playwright calls `seekTo(t)` every frame (30fps), the naive approach of triggering animations once on scene enter causes "dead zones" — the animation plays for 1-2 seconds, then the scene sits static for 10-40 seconds until the next scene.

## Solution: Elapsed-Time Driven Multi-Phase Animation

Instead of triggering animations once, **compute elapsed time within each scene** on every frame and dispatch the correct sub-animation.

### Core Architecture

```javascript
let currentScene = -1;
let sceneStartTime = 0;
let lastScene = -1;
let triggeredPhases = {};

// Phase tracking helpers
function phaseKey(idx, phase) { return `${idx}-${phase}`; }
function isTriggered(idx, phase) { return !!triggeredPhases[phaseKey(idx, phase)]; }
function markTriggered(idx, phase) { triggeredPhases[phaseKey(idx, phase)] = true; }

// Check if element needs animation (prevents re-triggering GSAP tweens)
function needsAnim(selector, prop, target) {
  const el = document.querySelector(selector);
  if (!el) return false;
  const current = parseFloat(getComputedStyle(el)[prop]) || 0;
  return Math.abs(current - target) > 0.01;
}

function gotoScene(idx) {
  if (idx === currentScene) return;
  // ... toggle active class ...
  currentScene = idx;
  sceneStartTime = sceneBounds[idx].start;
  triggeredPhases = {}; // reset for new scene
  animateScene(idx, 0, true); // instant mode on entry
}

function seekTo(seconds) {
  const sceneIdx = sceneBounds.findIndex(b => seconds >= b.start && seconds < b.end);
  if (sceneIdx >= 0) {
    const isNewScene = (sceneIdx !== lastScene);
    if (isNewScene) {
      // Reset sub-animation state
      gotoScene(sceneIdx);
      lastScene = sceneIdx;
    }
    const elapsed = seconds - sceneBounds[sceneIdx].start;
    animateScene(sceneIdx, elapsed, false); // animated mode
  }
  updateSubtitle(seconds);
  updateProgress(seconds);
}
```

### animateScene Function Pattern

Each scene has multiple phases triggered at specific elapsed times:

```javascript
function animateScene(idx, elapsed, instant) {
  const set = instant ? gsap.set : gsap.to;

  if (idx === 0) {
    // Phase 0 (t=0): Title entrance
    if (elapsed < 0.5 && !isTriggered(0, 0)) {
      markTriggered(0, 0);
      set('#title', { opacity: 1, y: 0, duration: instant ? 0 : 0.5 });
    }
    // Phase 1 (t=3s): Subtitle entrance
    if (elapsed >= 3 && elapsed < 3.5 && !isTriggered(0, 1)) {
      markTriggered(0, 1);
      set('#subtitle', { opacity: 1, y: 0, duration: instant ? 0 : 0.4 });
    }
    // Phase 2 (t=6s): Bottom element
    if (elapsed >= 6 && elapsed < 6.5 && !isTriggered(0, 2)) {
      markTriggered(0, 2);
      set('#bottom-box', { opacity: 1, duration: instant ? 0 : 0.5 });
    }
    // Breathing (t≥10s): Continuous subtle animation
    if (elapsed >= 10) startBreathe('#title', 0);
  }

  // ... similar for other scenes ...
}
```

### Key Patterns

**1. Phase window**: Each phase has a trigger window `[start, start+0.5)`. The `isTriggered` flag ensures GSAP tweens are only created once.

**2. Instant vs animated**: When `instant=true` (scene entry or seek-jump), use `gsap.set` (duration=0). When `instant=false` (normal frame progression), use `gsap.to` with animation duration.

**3. Breathing effects**: After main animations complete, add CSS breathing animations to prevent static dead zones:
```css
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.015); opacity: 0.88; }
}
@keyframes breathe-glow {
  0%, 100% { box-shadow: 0 0 0 rgba(77,107,254,0); }
  50% { box-shadow: 0 0 24px rgba(77,107,254,0.25); }
}
```

**4. Complex sub-animations (terminal, jianying)**: Convert timer-based animations to elapsed-time driven:
- Track `termStarted`, `termAnimStart` state
- `renderTerminalInstant(elapsed)` — for seek-jumps, render all steps up to elapsed time
- `renderTerminalFrame()` — for normal playback, use requestAnimationFrame
- Convert step durations to cumulative timestamps for O(1) lookup

### GSAP Guard Pitfall

**Problem**: If `animateScene` is called every frame (30fps) and a GSAP tween has duration > 0, the next frame creates a new tween that overrides the previous one. The animation never completes.

**Solutions**:
1. Use `isTriggered(idx, phase)` flag — only fire GSAP once per phase
2. Use `needsAnim(selector, prop, target)` — check computed style before animating
3. Use `startBreathe()` with CSS animation — not affected by GSAP overrides

### Typical Scene Phase Layout (20-40s scene)

| Elapsed | Phase | Action |
|---------|-------|--------|
| 0-0.5s | enter | Title/main container entrance |
| 2-3s | content-1 | First content block |
| 5-7s | content-2 | Second content block |
| 10-12s | content-3 | Third content block |
| 15s+ | breathe | CSS breathing/pulsing on all visible elements |
| 25s+ | summary | Optional summary/conclusion text |

### Animation State for Complex Components

For terminal/log-style animations that render step by step:

```javascript
let termStarted = false;
let termAnimStart = 0;
const TERM_DURATION = 18; // seconds

// Cumulative timestamps for each step
const termStepTimestamps = [0, 0.8, 3.8, 4.1, 4.9, ...];

function renderTerminalInstant(elapsed) {
  resetTerminal();
  termStarted = true;
  for (let i = 0; i < termSteps.length; i++) {
    if (termStepTimestamps[i] <= elapsed) {
      renderTermStep(termSteps[i]);
    }
  }
}

function renderTerminalFrame() {
  if (!termStarted) return;
  const elapsed = (performance.now() - termAnimStart) / 1000;
  for (let i = 0; i < termSteps.length; i++) {
    if (termStepTimestamps[i] <= elapsed && !termRendered.has(i)) {
      renderTermStep(termSteps[i]);
      termRendered.add(i);
    }
  }
  if (elapsed < TERM_DURATION) requestAnimationFrame(renderTerminalFrame);
}
```

In `animateScene` for the terminal scene:
```javascript
if (elapsed >= 0.8) {
  if (instant && elapsed > 2) {
    renderTerminalInstant(elapsed - 0.8); // seek-jump: instant render
  } else if (!termStarted) {
    termStarted = true;
    termAnimStart = performance.now() - (elapsed - 0.8) * 1000;
    renderTerminalFrame(); // normal: frame-by-frame
  }
}
```
