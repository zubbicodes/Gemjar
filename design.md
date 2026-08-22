# Design — Gemjar

Locked multi-page design system. Future Hallmark runs read this first; pages
defer to it. Amend intentionally—the file is the rule.

## System

- Genre · modern-minimal, warmed by colourful product photography
- Marketing · Catalogue family; product-led split hero and image grids
- App · Workbench family; compact navigation, quick tools, card-led content
- Content · Long Document family; quiet typography and narrow measures
- Theme · studied client DNA from `gemjarsocks.com` and `gemjar.co.uk`
- Axes · light paper / geometric sans / cool teal with restrained coral

## Typography

- Display · Jost 600–700, normal
- Body · Karla 400–700
- Maximum two families; portal and storefront use the same pairing

## Tokens

`apps/web/tokens.css` is canonical. Core values:

```css
:root {
  --color-paper: oklch(98% 0.006 225);
  --color-paper-2: oklch(96% 0.009 225);
  --color-paper-3: oklch(92% 0.014 225);
  --color-ink: oklch(37% 0.014 240);
  --color-ink-2: oklch(48% 0.018 240);
  --color-rule: oklch(88% 0.014 225);
  --color-accent: oklch(55% 0.070 230);
  --color-accent-2: oklch(61% 0.145 10);
  --color-accent-ink: oklch(98% 0.006 225);
  --color-focus: oklch(58% 0.115 230);
}
```

## CTA voice

- Primary · teal fill, compact 10px radius, short verb-first label
- Secondary · white or transparent surface, one-pixel teal rule
- Icon-only controls · 40px square, 10px radius, explicit accessible label

## Motion stance

- Motion-cut; opacity and small transform only
- Silent success; errors stay beside the action that caused them
- Reduced-motion fallback · opacity-only, at most 150ms

## Page rules

- Storefront may use client-owned Shopify photography.
- Portals use no decorative enrichment; live data is the visual content.
- Product catalogues use image cards, never plain product tables.
- Operational orders may remain tables where column comparison matters.
- All pages share logo, teal/coral placement, Jost/Karla, control geometry.

## Exports

### Tailwind mapping

Tailwind v3 consumes the canonical variables through
`apps/web/tailwind.config.ts`; no parallel palette is allowed.

### DTCG

```json
{"color":{"paper":{"$value":"oklch(98% 0.006 225)","$type":"color"},"ink":{"$value":"oklch(37% 0.014 240)","$type":"color"},"accent":{"$value":"oklch(55% 0.070 230)","$type":"color"},"coral":{"$value":"oklch(61% 0.145 10)","$type":"color"}},"font":{"display":{"$value":"Jost, sans-serif","$type":"fontFamily"},"body":{"$value":"Karla, sans-serif","$type":"fontFamily"}}}
```

### shadcn-compatible roles

```css
:root {
  --background: 98% 0.006 225;
  --foreground: 37% 0.014 240;
  --primary: 55% 0.070 230;
  --primary-foreground: 98% 0.006 225;
  --secondary: 96% 0.009 225;
  --border: 88% 0.014 225;
  --ring: 58% 0.115 230;
  --radius: 0.625rem;
}
```
