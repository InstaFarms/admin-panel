---
name: Jarvis Admin
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for efficiency, precision, and high-performance administrative workflows. It embodies a **Corporate / Modern** aesthetic with a technical edge, tailored for power users who require prolonged focus without eye strain. 

The brand personality is authoritative yet unobtrusive. By utilizing a deep, monochromatic foundation punctuated by a vibrant blue primary accent, the UI establishes a clear sense of order and functional hierarchy. The visual language favors high-contrast information density and "just-in-time" UI visibility, ensuring that the interface remains a quiet backdrop to the data it presents.

## Colors

This design system utilizes a sophisticated dark-mode palette rooted in deep navy and slate tones. 

- **Primary:** The vibrant Blue (#3B82F6) is used sparingly for primary actions, active states, and critical selection markers to maintain its high-impact signaling value.
- **Surface Strategy:** Backgrounds follow a "lighter-as-higher" elevation model. The base canvas is the darkest (#0F172A), while cards and workspace containers sit on a slightly lighter slate (#1E293B).
- **Functional Semantics:** Use standard red (#ef4444) for destructive actions (like delete) and amber (#f59e0b) for warnings. Text contrast is strictly maintained at a 4.5:1 ratio or higher for accessibility.

## Typography

The system relies on **Inter** for its exceptional legibility in data-dense environments. 

- **Hierarchy:** Headings use a semi-bold weight and tighter letter-spacing to feel grounded. 
- **Body Copy:** Standard administrative data is set at 14px (body-md) for an optimal balance of density and readability. 
- **Labels:** Meta-information and form labels use 12px uppercase styling with increased letter spacing to differentiate them from interactive data.
- **Monospace:** For ID tags, slugs, or technical parameters, use a monospaced font to ensure character clarity.

## Layout & Spacing

This design system employs a **Fixed Grid** approach for internal content containers to ensure readability, while the global shell (sidebar and top nav) remains fluid.

- **Grid Model:** A 12-column system is used within the main content area.
- **Rhythm:** An 8px linear scale (referenced as units of 4px) governs all padding and margins. 
- **Sticky Elements:** The "Update City" bar or global save actions must be pinned to the bottom of the viewport or container with a subtle backdrop blur to maintain context without obscuring navigation.
- **Density:** Dashboards use a "Compact" density model (8px-12px padding), while long-form editors use "Comfortable" density (16px-24px) to reduce cognitive load.

## Elevation & Depth

In the dark theme, depth is primarily communicated through **Tonal Layers** rather than heavy shadows.

- **Level 0 (Canvas):** The base background (#0F172A).
- **Level 1 (Card/Section):** Surfaces (#1E293B) use a 1px solid border (#334155) to define edges. No shadow.
- **Level 2 (Popovers/Dropdowns):** Elevated surfaces (#334155) use a 12% opacity black shadow with a 16px blur to provide a soft "lift" from the workspace.
- **Active State:** Elements like Segmented Controls use tonal contrast (lighter grey on darker grey) rather than elevation to show state.

## Shapes

The shape language is controlled and "Soft-Industrial." 

- **Primary Radius:** 8px (0.5rem) is the standard for cards, input fields, and large buttons.
- **Small Elements:** Chips, checkboxes, and small utility buttons use 4px (0.25rem) to maintain a precise, technical look.
- **Interactive States:** Focus rings should follow the element's border radius with a 2px offset.

## Components

### Buttons & Inputs
- **Primary Button:** Solid Blue (#3B82F6) with white text. High contrast is mandatory.
- **Secondary/Ghost:** Slate border (#334155) with transparent background.
- **Inputs:** Dark slate background (#0F172A) with a subtle 1px border. On focus, the border transitions to Primary Blue with a subtle outer glow.

### Navigation & Tabs
- **Segmented Controls:** Dark pill-shaped containers where the active item is a slightly lighter grey (#334155) or Primary Blue.
- **Underline Tabs:** Used for primary section switching (e.g., "Detail", "Metadata"). The active state is indicated by a 2px Primary Blue bottom border and high-brightness text.

### Cards & Sticky Bars
- **Cards:** Defined by a 1px border (#334155). Content should have consistent 24px internal padding.
- **Sticky Action Bar:** Located at the bottom of forms. Use a solid background (#1E293B) with a top border to separate it from the scrollable content.

### Selection Controls
- **Checkboxes/Radios:** Primary Blue when checked. Ensure the hit target is at least 44x44px even if the visual icon is smaller.