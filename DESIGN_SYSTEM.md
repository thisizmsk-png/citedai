# CitedAI Design System
## Derived from Analysis of 15 Top SaaS/DevTool Landing Pages

Research sources: Linear, Vercel, Stripe, Raycast, PostHog, Ahrefs, Semrush, Notion, Framer, Betterstack, Amie, Deel, Nightwatch, Storylane, and patterns from 100+ dev tool pages (Evil Martians study).

---

## 1. TYPOGRAPHY

### Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
```

**Why Inter over alternatives:**
- Linear, Ahrefs, and dozens of top SaaS products use Inter as primary
- Vercel created Geist (based on Inter principles) but Inter has wider adoption and Tailwind native support
- Inter has optical sizing, tabular nums, and variable weight (100-900) built in
- Plus Jakarta Sans is trendier but less readable at small sizes in dashboards

**Install:**
```bash
npm install @fontsource-variable/inter
```

### Type Scale (Tailwind classes)

| Token              | Size   | Line Height | Weight  | Letter Spacing | Use Case                          |
|--------------------|--------|-------------|---------|----------------|-----------------------------------|
| `text-display`     | 72px   | 1.0         | 700     | -0.04em        | Hero headline (marketing)         |
| `text-h1`          | 48px   | 1.1         | 700     | -0.03em        | Page titles                       |
| `text-h2`          | 36px   | 1.15        | 600     | -0.02em        | Section headings                  |
| `text-h3`          | 24px   | 1.3         | 600     | -0.015em       | Subsection headings               |
| `text-h4`          | 20px   | 1.4         | 600     | -0.01em        | Card titles                       |
| `text-h5`          | 16px   | 1.5         | 600     | 0              | Label headings                    |
| `text-body-lg`     | 18px   | 1.6         | 400     | 0              | Hero subtext, marketing copy      |
| `text-body`        | 16px   | 1.6         | 400     | 0              | Default body                      |
| `text-body-sm`     | 14px   | 1.5         | 400     | 0              | Secondary text, descriptions      |
| `text-caption`     | 13px   | 1.45        | 400     | 0.01em         | Tertiary text, metadata           |
| `text-tiny`        | 12px   | 1.4         | 500     | 0.02em         | Badges, labels, overlines         |
| `text-mono`        | 14px   | 1.5         | 400     | 0              | Code, data, terminal output       |

**Key pattern from research:** Negative letter-spacing on headings (Linear uses -0.04em at display size), positive letter-spacing on tiny/overline text. Every top site follows this.

### Tailwind Config

```js
// tailwind.config.js
fontSize: {
  'display': ['4.5rem',   { lineHeight: '1',    letterSpacing: '-0.04em', fontWeight: '700' }],
  'h1':      ['3rem',     { lineHeight: '1.1',  letterSpacing: '-0.03em', fontWeight: '700' }],
  'h2':      ['2.25rem',  { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
  'h3':      ['1.5rem',   { lineHeight: '1.3',  letterSpacing: '-0.015em', fontWeight: '600' }],
  'h4':      ['1.25rem',  { lineHeight: '1.4',  letterSpacing: '-0.01em', fontWeight: '600' }],
  'h5':      ['1rem',     { lineHeight: '1.5',  letterSpacing: '0',      fontWeight: '600' }],
  'body-lg': ['1.125rem', { lineHeight: '1.6',  letterSpacing: '0',      fontWeight: '400' }],
  'body':    ['1rem',     { lineHeight: '1.6',  letterSpacing: '0',      fontWeight: '400' }],
  'body-sm': ['0.875rem', { lineHeight: '1.5',  letterSpacing: '0',      fontWeight: '400' }],
  'caption': ['0.8125rem',{ lineHeight: '1.45', letterSpacing: '0.01em', fontWeight: '400' }],
  'tiny':    ['0.75rem',  { lineHeight: '1.4',  letterSpacing: '0.02em', fontWeight: '500' }],
}
```

---

## 2. COLOR SYSTEM

### Design Philosophy

Based on research: Linear, Raycast, and Vercel all use a **neutral-first dark palette** with a single strong accent. The amateur mistake is too many accent colors. Stripe is the exception (multi-gradient) but they are a $95B company with a design team of 200+.

### Primitive Palette

```css
/* Neutrals (12-step gray scale, based on Vercel Geist pattern) */
--gray-50:   #fafafa;
--gray-100:  #f4f4f5;
--gray-200:  #e4e4e7;
--gray-300:  #d4d4d8;
--gray-400:  #a1a1aa;
--gray-500:  #71717a;
--gray-600:  #52525b;
--gray-700:  #3f3f46;
--gray-800:  #27272a;
--gray-900:  #18181b;
--gray-950:  #0f0f12;

/* Brand / Primary (desaturated blue-violet, nods to Linear/Stripe sophistication) */
--primary-50:   #eef2ff;
--primary-100:  #e0e7ff;
--primary-200:  #c7d2fe;
--primary-300:  #a5b4fc;
--primary-400:  #818cf8;
--primary-500:  #6366f1;  /* Main brand color */
--primary-600:  #4f46e5;
--primary-700:  #4338ca;
--primary-800:  #3730a3;
--primary-900:  #312e81;

/* Accent (cyan-teal for data/success/highlights) */
--accent-50:   #ecfeff;
--accent-100:  #cffafe;
--accent-200:  #a5f3fc;
--accent-300:  #67e8f9;
--accent-400:  #22d3ee;
--accent-500:  #06b6d4;
--accent-600:  #0891b2;
--accent-700:  #0e7490;
--accent-800:  #155e75;
--accent-900:  #164e63;
```

### Semantic Tokens (Dark Theme)

These map primitives to roles. Components ONLY reference semantic tokens.

```css
:root {
  /* Surfaces */
  --bg-primary:     var(--gray-950);     /* #0f0f12 — page background */
  --bg-secondary:   var(--gray-900);     /* #18181b — cards, panels */
  --bg-tertiary:    var(--gray-800);     /* #27272a — elevated surfaces */
  --bg-hover:       var(--gray-800);     /* hover state on cards */
  --bg-active:      var(--gray-700);     /* active/pressed */
  --bg-overlay:     rgba(0, 0, 0, 0.6); /* modal backdrops */

  /* Text */
  --text-primary:    var(--gray-50);     /* #fafafa — headings, primary */
  --text-secondary:  var(--gray-400);    /* #a1a1aa — body, descriptions */
  --text-tertiary:   var(--gray-500);    /* #71717a — captions, metadata */
  --text-disabled:   var(--gray-600);    /* #52525b */
  --text-inverse:    var(--gray-950);    /* for use on light/accent backgrounds */

  /* Borders */
  --border-default:  var(--gray-800);    /* #27272a — subtle borders */
  --border-hover:    var(--gray-700);    /* #3f3f46 */
  --border-active:   var(--gray-600);    /* #52525b */
  --border-accent:   var(--primary-500); /* focused inputs */

  /* Interactive */
  --brand:           var(--primary-500); /* #6366f1 — CTAs, links, focus rings */
  --brand-hover:     var(--primary-400); /* #818cf8 */
  --brand-active:    var(--primary-600); /* #4f46e5 */

  /* Status / Semantic */
  --success:         #22c55e;            /* green-500 */
  --warning:         #f59e0b;            /* amber-500 */
  --error:           #ef4444;            /* red-500 */
  --info:            var(--accent-500);  /* #06b6d4 */
}
```

### Tailwind Config for Semantic Colors

```js
// tailwind.config.js
colors: {
  background: {
    DEFAULT: 'var(--bg-primary)',
    secondary: 'var(--bg-secondary)',
    tertiary: 'var(--bg-tertiary)',
  },
  foreground: {
    DEFAULT: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-tertiary)',
    disabled: 'var(--text-disabled)',
  },
  border: {
    DEFAULT: 'var(--border-default)',
    hover: 'var(--border-hover)',
    active: 'var(--border-active)',
  },
  brand: {
    DEFAULT: 'var(--brand)',
    hover: 'var(--brand-hover)',
    active: 'var(--brand-active)',
  },
  accent: {
    DEFAULT: 'var(--accent-500)',
    light: 'var(--accent-300)',
  },
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  info: 'var(--info)',
}
```

### Gradient Patterns (from Stripe/Vercel/Raycast research)

```css
/* Hero background glow (Raycast-style radial) */
.hero-glow {
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
    var(--bg-primary);
}

/* Accent text gradient (Vercel-style) */
.text-gradient {
  background: linear-gradient(135deg, var(--primary-400), var(--accent-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Card border glow on hover (Linear-style) */
.card-glow:hover {
  box-shadow: 0 0 0 1px var(--border-hover), 0 0 40px -10px rgba(99, 102, 241, 0.15);
}

/* Mesh gradient (Stripe-style, use sparingly) */
.mesh-gradient {
  background:
    radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
    radial-gradient(at 80% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
    radial-gradient(at 40% 80%, rgba(129, 140, 248, 0.06) 0%, transparent 50%),
    var(--bg-primary);
}
```

---

## 3. SPACING SYSTEM

### Base Unit: 4px

Following Vercel Geist and Tailwind default. All spacing derived from 4px base.

```
4   8   12   16   20   24   32   40   48   64   80   96   128   160
1   2   3    4    5    6    8    10   12   16   20   24   32    40   (Tailwind units)
```

### Section Spacing (from research patterns)

| Context                   | Spacing      | Tailwind     | Source Pattern                          |
|---------------------------|--------------|--------------|-----------------------------------------|
| Page top padding          | 80px         | `pt-20`      | Vercel, Linear (after sticky nav)       |
| Between major sections    | 128-160px    | `py-32`/`py-40` | All studied sites use 120-160px      |
| Section title to content  | 48-64px      | `mb-12`/`mb-16` | Linear, Stripe                       |
| Between cards in grid     | 16-24px      | `gap-4`/`gap-6` | Vercel bento grid                    |
| Card internal padding     | 24-32px      | `p-6`/`p-8`  | Linear, PostHog cards                   |
| Inline element gap        | 8-12px       | `gap-2`/`gap-3` | Button icon + text                   |
| Nav height                | 64px         | `h-16`       | Vercel, Linear, Stripe                  |
| Max content width         | 1280px       | `max-w-7xl`  | Industry standard                       |
| Max text width            | 680px        | `max-w-2xl`  | Readability optimal                     |

### Container System

```html
<!-- Outer wrapper -->
<div class="mx-auto max-w-7xl px-6 lg:px-8">
  <!-- Narrow text container (for hero copy, body text) -->
  <div class="mx-auto max-w-2xl text-center">
    ...
  </div>
</div>
```

---

## 4. COMPONENT PATTERNS

### 4.1 Navigation Bar

**Pattern observed across all 15 sites:** Sticky, translucent, minimal links.

```html
<nav class="fixed top-0 z-50 w-full border-b border-border
            bg-background/80 backdrop-blur-xl">
  <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2">
      <Logo class="h-7 w-7" />
      <span class="text-h5 text-foreground font-semibold">CitedAI</span>
    </a>

    <!-- Center links (3-5 max, per research) -->
    <div class="hidden md:flex items-center gap-8">
      <a class="text-body-sm text-foreground-secondary hover:text-foreground transition-colors">
        Features
      </a>
      <a class="text-body-sm text-foreground-secondary hover:text-foreground transition-colors">
        Pricing
      </a>
      <a class="text-body-sm text-foreground-secondary hover:text-foreground transition-colors">
        Docs
      </a>
    </div>

    <!-- Right CTA cluster -->
    <div class="flex items-center gap-3">
      <a class="text-body-sm text-foreground-secondary hover:text-foreground">
        Sign in
      </a>
      <button class="rounded-lg bg-brand px-4 py-2 text-body-sm font-medium
                      text-white hover:bg-brand-hover transition-colors">
        Get Started
      </button>
    </div>
  </div>
</nav>
```

### 4.2 Hero Section

**Pattern:** Centered layout dominates (85% of dev tool sites per Evil Martians). Tight headline, subdued subtext, dual CTA, optional logo bar below.

```html
<section class="relative overflow-hidden pt-32 pb-20 hero-glow">
  <div class="mx-auto max-w-7xl px-6 text-center">

    <!-- Optional: eyebrow/announcement badge -->
    <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-border
                bg-bg-secondary px-4 py-1.5">
      <span class="text-tiny text-accent uppercase tracking-wider">New</span>
      <span class="text-caption text-foreground-secondary">
        AI-powered citation analysis
      </span>
    </div>

    <!-- Headline: under 8 words / 44 chars (research optimal) -->
    <h1 class="text-display text-foreground mx-auto max-w-4xl
               text-balance">
      Citations that <span class="text-gradient">prove your expertise</span>
    </h1>

    <!-- Subtext -->
    <p class="mt-6 text-body-lg text-foreground-secondary mx-auto max-w-2xl
              text-pretty">
      The SEO tool that tracks where your content gets cited,
      measures real authority, and shows exactly how to earn more.
    </p>

    <!-- Dual CTA (primary + secondary, per research standard) -->
    <div class="mt-10 flex items-center justify-center gap-4">
      <button class="rounded-lg bg-brand px-6 py-3 text-body font-medium
                      text-white shadow-lg shadow-brand/20
                      hover:bg-brand-hover transition-all">
        Start Free Trial
      </button>
      <button class="rounded-lg border border-border px-6 py-3 text-body
                      font-medium text-foreground-secondary
                      hover:bg-bg-secondary hover:text-foreground transition-all">
        View Demo
      </button>
    </div>

    <!-- Logo bar (immediately after hero, per 100-page study) -->
    <div class="mt-16 border-t border-border pt-10">
      <p class="text-caption text-foreground-tertiary mb-6">
        Trusted by SEO teams at
      </p>
      <div class="flex flex-wrap items-center justify-center gap-x-12 gap-y-6
                  opacity-50 grayscale hover:opacity-70 transition-opacity">
        <!-- 5-8 logos, grayscale, 50% opacity (Vercel/Linear pattern) -->
      </div>
    </div>
  </div>
</section>
```

### 4.3 Feature Bento Grid

**Pattern from Vercel, Linear, PostHog:** Mixed-size cards in a bento layout. NOT a uniform grid.

```html
<section class="py-32">
  <div class="mx-auto max-w-7xl px-6">
    <div class="mx-auto max-w-2xl text-center mb-16">
      <h2 class="text-h2 text-foreground">Built for SEO professionals</h2>
      <p class="mt-4 text-body-lg text-foreground-secondary">
        Every feature designed around real citation workflows.
      </p>
    </div>

    <!-- 2-col + 3-col bento (Linear/Vercel pattern) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      <!-- Large feature card (spans 2 cols) -->
      <div class="lg:col-span-2 group rounded-2xl border border-border
                  bg-bg-secondary p-8 transition-all hover:border-border-hover
                  card-glow">
        <h3 class="text-h4 text-foreground">Citation Tracker</h3>
        <p class="mt-2 text-body-sm text-foreground-secondary max-w-md">
          Real-time monitoring of who cites your content across the web.
        </p>
        <!-- Product screenshot / animated UI here -->
        <div class="mt-6 rounded-xl border border-border overflow-hidden">
          <img src="..." alt="Citation dashboard" class="w-full" />
        </div>
      </div>

      <!-- Standard feature card -->
      <div class="group rounded-2xl border border-border bg-bg-secondary p-8
                  transition-all hover:border-border-hover card-glow">
        <h3 class="text-h4 text-foreground">Authority Score</h3>
        <p class="mt-2 text-body-sm text-foreground-secondary">
          Measure citation-weighted domain authority.
        </p>
        <div class="mt-6 rounded-xl border border-border overflow-hidden">
          <img src="..." alt="" class="w-full" />
        </div>
      </div>

      <!-- Row of 3 smaller cards -->
      <div class="rounded-2xl border border-border bg-bg-secondary p-8
                  hover:border-border-hover transition-all card-glow">
        <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg
                    bg-brand/10 text-brand">
          <!-- Icon -->
        </div>
        <h3 class="text-h5 text-foreground">Competitor Analysis</h3>
        <p class="mt-2 text-body-sm text-foreground-secondary">
          See who cites your competitors but not you.
        </p>
      </div>
      <!-- ... repeat 2 more cards -->
    </div>
  </div>
</section>
```

### 4.4 Social Proof / Testimonials

**Pattern (from Evil Martians study):** Curated, not auto-pulled. Avatar + name + company. Positioned AFTER features, not before.

```html
<section class="py-32 bg-bg-secondary">
  <div class="mx-auto max-w-7xl px-6">
    <div class="mx-auto max-w-2xl text-center mb-16">
      <h2 class="text-h2 text-foreground">Trusted by SEO teams</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Testimonial card -->
      <div class="rounded-2xl border border-border bg-background p-8">
        <p class="text-body text-foreground-secondary leading-relaxed">
          "Quote here, kept short and specific to one benefit."
        </p>
        <div class="mt-6 flex items-center gap-3">
          <img src="..." class="h-10 w-10 rounded-full" alt="" />
          <div>
            <p class="text-body-sm font-medium text-foreground">Name</p>
            <p class="text-caption text-foreground-tertiary">
              Title, Company
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 4.5 Stats / Trust Numbers

**Pattern (Stripe):** Big numbers with context. 3-4 max.

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-border py-12">
  <div class="text-center">
    <p class="text-h1 text-foreground font-bold tabular-nums">2.4M+</p>
    <p class="mt-1 text-body-sm text-foreground-tertiary">Citations tracked</p>
  </div>
  <div class="text-center">
    <p class="text-h1 text-foreground font-bold tabular-nums">99.9%</p>
    <p class="mt-1 text-body-sm text-foreground-tertiary">Uptime SLA</p>
  </div>
  <!-- ... -->
</div>
```

### 4.6 Pricing Section

**Pattern (Ahrefs, Linear):** Side-by-side plans, clear feature comparison, annual/monthly toggle.

```html
<section class="py-32">
  <div class="mx-auto max-w-7xl px-6 text-center">
    <h2 class="text-h2 text-foreground">Simple, transparent pricing</h2>
    <p class="mt-4 text-body-lg text-foreground-secondary">
      Start free. Scale as you grow.
    </p>

    <!-- Toggle -->
    <div class="mt-10 inline-flex items-center gap-3 rounded-full border
                border-border bg-bg-secondary p-1">
      <button class="rounded-full px-4 py-2 text-body-sm font-medium
                      bg-brand text-white">Annual</button>
      <button class="rounded-full px-4 py-2 text-body-sm font-medium
                      text-foreground-secondary">Monthly</button>
    </div>

    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
      <!-- Plan card -->
      <div class="rounded-2xl border border-border bg-bg-secondary p-8">
        <h3 class="text-h5 text-foreground">Starter</h3>
        <p class="mt-2 text-caption text-foreground-tertiary">
          For individual creators
        </p>
        <p class="mt-6">
          <span class="text-h1 text-foreground font-bold">$0</span>
          <span class="text-body-sm text-foreground-tertiary">/month</span>
        </p>
        <button class="mt-8 w-full rounded-lg border border-border py-3
                        text-body-sm font-medium text-foreground
                        hover:bg-bg-tertiary transition-colors">
          Get Started
        </button>
        <ul class="mt-8 space-y-3">
          <li class="flex items-center gap-3 text-body-sm text-foreground-secondary">
            <CheckIcon class="h-4 w-4 text-success" />
            100 citations/month
          </li>
        </ul>
      </div>

      <!-- Highlighted plan -->
      <div class="rounded-2xl border-2 border-brand bg-bg-secondary p-8
                  relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full
                    bg-brand px-3 py-1 text-tiny font-medium text-white">
          Most Popular
        </div>
        <h3 class="text-h5 text-foreground">Pro</h3>
        <!-- ... same structure, primary CTA button -->
        <button class="mt-8 w-full rounded-lg bg-brand py-3 text-body-sm
                        font-medium text-white hover:bg-brand-hover
                        transition-colors">
          Start Free Trial
        </button>
      </div>
    </div>
  </div>
</section>
```

### 4.7 Final CTA Section

**Pattern (from 100-page study):** Big, bold, clearly separated background. One focused goal.

```html
<section class="py-32">
  <div class="mx-auto max-w-7xl px-6">
    <div class="rounded-3xl bg-bg-secondary border border-border p-16
                text-center relative overflow-hidden mesh-gradient">
      <h2 class="text-h1 text-foreground relative z-10">
        Start tracking your citations today
      </h2>
      <p class="mt-4 text-body-lg text-foreground-secondary relative z-10
                mx-auto max-w-xl">
        Free to start. No credit card required.
      </p>
      <button class="mt-8 rounded-lg bg-brand px-8 py-4 text-body font-medium
                      text-white shadow-lg shadow-brand/20
                      hover:bg-brand-hover transition-all relative z-10">
        Get Started Free
      </button>
    </div>
  </div>
</section>
```

### 4.8 Dashboard Preview Component

**Pattern (Linear, PostHog, Vercel):** Show the actual product. Bordered, slightly elevated, with realistic data.

```html
<div class="mx-auto max-w-5xl mt-16 rounded-2xl border border-border
            bg-bg-secondary p-1 shadow-2xl shadow-black/20">
  <div class="rounded-xl overflow-hidden">
    <img src="/dashboard-preview.png"
         alt="CitedAI dashboard showing citation analytics"
         class="w-full" />
  </div>
</div>
```

---

## 5. ANIMATION & TRANSITIONS

### Principles (from research)

Linear and Vercel use purposeful, subtle motion. Raycast is the most animated (3D WebGL). For CitedAI, follow the Linear/Vercel minimal approach.

### Transition Defaults

```css
/* Default for all interactive elements */
transition-property: color, background-color, border-color, box-shadow, opacity;
transition-duration: 150ms;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* ease-out */

/* For layout shifts / transforms */
transition-duration: 200ms;
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); /* spring-out */
```

### Scroll-Triggered Reveals

```css
/* Fade-up on scroll (use with IntersectionObserver) */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Tailwind Animation Utilities

```js
// tailwind.config.js
animation: {
  'fade-in': 'fadeIn 0.6s ease-out forwards',
  'fade-up': 'fadeUp 0.6s ease-out forwards',
  'slide-in-right': 'slideInRight 0.4s ease-out forwards',
},
keyframes: {
  fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
  fadeUp: {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  slideInRight: {
    '0%': { opacity: '0', transform: 'translateX(-10px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
}
```

---

## 6. BUTTON SYSTEM

| Variant      | Background         | Text          | Border             | Use Case               |
|--------------|--------------------|---------------|--------------------|------------------------|
| Primary      | `bg-brand`         | white         | none               | Main CTA               |
| Secondary    | transparent        | foreground    | `border-border`    | Secondary actions       |
| Ghost        | transparent        | foreground-secondary | none          | Tertiary, nav links    |
| Destructive  | `bg-error`         | white         | none               | Delete, cancel plan     |
| Brand Subtle | `bg-brand/10`      | brand         | none               | Inline feature CTAs     |

### Size Scale

| Size | Padding        | Font Size    | Height | Border Radius |
|------|----------------|-------------|--------|---------------|
| sm   | `px-3 py-1.5`  | `text-tiny`  | 32px   | `rounded-md`  |
| md   | `px-4 py-2`    | `text-body-sm` | 40px | `rounded-lg`  |
| lg   | `px-6 py-3`    | `text-body`  | 48px   | `rounded-lg`  |
| xl   | `px-8 py-4`    | `text-body`  | 56px   | `rounded-xl`  |

---

## 7. BORDER RADIUS SCALE

```
none: 0
sm:   4px   (0.25rem) — badges, tags
md:   6px   (0.375rem) — buttons, inputs
lg:   8px   (0.5rem) — buttons (default)
xl:   12px  (0.75rem) — cards
2xl:  16px  (1rem) — feature cards, bento items
3xl:  24px  (1.5rem) — hero cards, CTA sections
full: 9999px — pills, avatars, toggles
```

---

## 8. SHADOW SYSTEM

```css
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md:  0 4px 12px rgba(0, 0, 0, 0.3);
--shadow-lg:  0 8px 30px rgba(0, 0, 0, 0.4);
--shadow-xl:  0 16px 50px rgba(0, 0, 0, 0.5);
--shadow-glow: 0 0 40px -10px rgba(99, 102, 241, 0.3); /* brand glow */
```

Note: Dark themes need heavier shadow opacity than light themes. Most devs copy light-mode shadow values and wonder why cards look flat in dark mode.

---

## 9. PAGE LAYOUT STRUCTURE

Based on the consistent pattern across all 15 studied sites:

```
1. Sticky Nav (64px, translucent blur)
2. Hero (centered headline + dual CTA + optional announcement bar)
3. Logo Bar (grayscale, 50% opacity, 5-8 logos)
4. Feature Bento Grid (2+3 col mixed sizes)
5. Product Screenshot / Demo (bordered, elevated)
6. How It Works (3-step numbered or chess layout)
7. Testimonials (3-col grid with avatar + quote)
8. Stats Bar (3-4 big numbers)
9. Pricing (3-col with highlighted plan)
10. FAQ Accordion
11. Final CTA (contained card with gradient background)
12. Footer (4-col links + legal)
```

---

## 10. ANTI-PATTERNS TO AVOID

Observed in research as markers of amateur/AI-generated sites:

1. **Purple-blue gradient everywhere** — one gradient, one location (hero or CTA, not both)
2. **Overly saturated colors on dark backgrounds** — use muted accent tones (opacity 0.1-0.2 for backgrounds)
3. **Uniform grid for features** — use bento (mixed sizes) like Linear/Vercel
4. **Generic stock illustrations** — show actual product UI (all top 15 sites do this)
5. **More than 2 CTA variants per section** — primary + secondary max
6. **Text over busy gradients** — ensure contrast, use overlay or keep gradients behind empty space
7. **Decorative animations** — motion must communicate state change or draw focus, never "just because"
8. **All caps headings** — only acceptable for tiny labels/badges, never for h1-h3
9. **Body text below 14px on dark backgrounds** — readability drops sharply; 16px minimum for body
10. **Gray text below #71717a on dark backgrounds** — fails WCAG contrast; tertiary text floor is gray-500

---

## 11. COMPLETE TAILWIND CONFIG

```js
// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['Geist Mono', 'JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: {
          DEFAULT: '#0f0f12',
          secondary: '#18181b',
          tertiary: '#27272a',
        },
        foreground: {
          DEFAULT: '#fafafa',
          secondary: '#a1a1aa',
          tertiary: '#71717a',
          disabled: '#52525b',
        },
        border: {
          DEFAULT: '#27272a',
          hover: '#3f3f46',
          active: '#52525b',
        },
        brand: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          active: '#4f46e5',
          subtle: 'rgba(99, 102, 241, 0.1)',
        },
        accent: {
          DEFAULT: '#06b6d4',
          light: '#67e8f9',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontSize: {
        'display': ['4.5rem',   { lineHeight: '1',    letterSpacing: '-0.04em', fontWeight: '700' }],
        'h1':      ['3rem',     { lineHeight: '1.1',  letterSpacing: '-0.03em', fontWeight: '700' }],
        'h2':      ['2.25rem',  { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3':      ['1.5rem',   { lineHeight: '1.3',  letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4':      ['1.25rem',  { lineHeight: '1.4',  letterSpacing: '-0.01em', fontWeight: '600' }],
        'h5':      ['1rem',     { lineHeight: '1.5',  letterSpacing: '0em',     fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6',  letterSpacing: '0em',     fontWeight: '400' }],
        'body':    ['1rem',     { lineHeight: '1.6',  letterSpacing: '0em',     fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5',  letterSpacing: '0em',     fontWeight: '400' }],
        'caption': ['0.8125rem',{ lineHeight: '1.45', letterSpacing: '0.01em',  fontWeight: '400' }],
        'tiny':    ['0.75rem',  { lineHeight: '1.4',  letterSpacing: '0.02em',  fontWeight: '500' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'lg': '0 8px 30px rgba(0, 0, 0, 0.4)',
        'xl': '0 16px 50px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 40px -10px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 80px -20px rgba(99, 102, 241, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

---

## RESEARCH SOURCES

- [Evil Martians: 100 Dev Tool Landing Pages Study](https://evilmartians.com/chronicles/we-studied-100-devtool-landing-pages-here-is-what-actually-works-in-2025)
- [SaaSFrame: 10 SaaS Landing Page Trends 2026](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- [Swipe Pages: 12 Best SaaS Landing Page Examples 2026](https://swipepages.com/blog/12-best-saas-landing-page-examples-of-2026/)
- [Vercel Geist Design System — Typography](https://vercel.com/geist/typography)
- [Vercel Geist Design System — Colors](https://vercel.com/geist/colors)
- [Linear Brand Guidelines](https://linear.app/brand)
- [Stripe Accessible Color Systems](https://stripe.com/blog/accessible-color-systems)
- [Stripe Brand Colors (HTML Colors)](https://htmlcolors.com/palette/31/stripe)
- [Demand Curve: Ahrefs Landing Page Teardown](https://www.demandcurve.com/teardowns/ahrefs)
- [Semrush Landing Page Design (Landing Metrics)](https://www.landingmetrics.com/landing-page-design-example/semrush)
- [Veza Digital: SaaS Landing Page Design Patterns That Convert](https://www.vezadigital.com/post/best-saas-landing-page-examples)
- [Tailwind CSS Design Tokens for SaaS (TheFrontKit)](https://thefrontkit.com/blogs/tailwind-css-design-tokens-for-saas)
- [Linear Font Review (WTFont)](https://wtfont.app/en/linear-app-font-review/)
- [Framer: 15 Best Tech Website Designs 2026](https://www.framer.com/blog/tech-website-design-examples/)
- [Genesys Growth: B2B SaaS Landing Pages 2026](https://genesysgrowth.com/blog/designing-b2b-saas-landing-pages)
