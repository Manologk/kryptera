# DESIGN.md — CryptoFlux Trading
> Inspired by Wise's design system: bright green accent, friendly and clear.  
> Reference: [Wise (getdesign.md)](https://getdesign.md/wise/design-md) — run `npx getdesign@latest add wise` for upstream token updates.

## 1. Visual Theme & Atmosphere
Mood: Trustworthy, friendly, approachable. Green signals "go" and "success".
Density: Comfortable. Generous whitespace with enough structure to convey precision.

## 2. Color Palette
--color-primary: #9fe870        (CTA, active, success)
--color-primary-dark: #6fcf3a   (hover)
--color-primary-subtle: #edfde3 (light green bg)
--color-text: #0e0f0c
--color-text-muted: #6b7280
--color-bg: #f5f7f2
--color-surface: #ffffff
--color-border: #e2e8e0
--color-error: #ef4444

## 3. Typography
Font: Plus Jakarta Sans (body/headings)
Mono: JetBrains Mono (amounts, rates)

## 4. Components
Buttons: border-radius 12px, primary uses --color-primary bg, dark text
Cards: border-radius 20px, border 1px solid --color-border, padding 28px
Inputs: border-radius 12px, focus ring with green

## 5. Layout
Max width: 480px (forms), 960px (dashboard), 1200px (admin)
Page padding: 16px mobile, 32px desktop

## 6. Do's and Don'ts
DO: Keep amounts in monospace. Show full conversion breakdown.
DON'T: Use dark backgrounds. Use red for non-errors.
