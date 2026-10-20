---
name: OTLA
description: A light, compact workspace for keeping payments and client follow-ups in order.
colors:
  background: "#ffffff"
  foreground: "#26332d"
  primary: "#263b33"
  primary-foreground: "#ffffff"
  secondary: "#eaf3ed"
  secondary-foreground: "#315e43"
  muted: "#f4f6f5"
  muted-foreground: "#627069"
  accent: "#edf3ef"
  border: "#e6ebe8"
  ring: "#38735b"
  status-overdue: "#944337"
  status-overdue-bg: "#fceee9"
  status-pending: "#795a20"
  status-pending-bg: "#fbf3df"
  status-success: "#315e43"
  status-success-bg: "#eaf3ed"
  sidebar: "#f8faf9"
  sidebar-foreground: "#25312e"
  sidebar-accent: "#e7efeb"
  sidebar-accent-foreground: "#244d3d"
  sidebar-border: "#e3e9e6"
  login-art: "#f4f8f3"
  card: "#FFFFFF"
  card-foreground: "#1A1F36"
  input: "#E6EAF0"
  destructive: "#EF4444"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
  login-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  title:
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    lineHeight: "1.25rem"
  label:
    fontSize: "0.75rem"
    lineHeight: "1rem"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  4xl: "1.625rem"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.75rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.75rem"
  button-ghost:
    rounded: "{rounded.lg}"
    padding: "0 0.75rem"
  input:
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  nav-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.5rem"
  status-overdue:
    backgroundColor: "{colors.status-overdue-bg}"
    textColor: "{colors.status-overdue}"
    rounded: "{rounded.4xl}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "1rem"
---

# Design System: OTLA

## Overview

**Creative North Star: "Un espacio de trabajo claro"**

OTLA uses a compact, light workspace: a narrow white icon rail, grouped pale text navigation, a white working canvas, and restrained sage, amber, and coral cues. Payments are the central task on Inicio; supporting appointments, reminders, and dated contact follow-ups sit in an optional context panel. The pinned reference is a compact multi-panel workspace, not a conventional single sidebar or dark navigation dashboard.

This document records the implemented admin shell, Inicio, shared primitives, and login. It does not claim that all product routes have been redesigned, that the application has been deployed, or that every state has been visually verified. The existing OTLA logo asset remains unchanged.

**Key Characteristics:**

- A narrow icon rail, grouped text navigation, and white working surfaces.
- Compact lists with clear payment amounts, dates, and text statuses.
- Quiet semantic accents and restrained borders.
- Supporting information can be hidden to give the main task more room.

## Colors

### Primary

Deep green `primary` anchors the workspace's main action. Sage `secondary` supports selected tabs, initials, and contextual guidance. `ring` provides the green keyboard-focus cue.

### Secondary

Coral `status-overdue` and its pale background identify overdue payments. Amber `status-pending` and its pale background identify pending and due-today payments. Sage success tokens are defined but are not used as a completed-payment feed on Inicio.

### Neutral

White `background` and `card`, quiet `muted`, and low-contrast `border` separate areas without heavy panels. Navigation has its own pale surface, active background, foreground, and divider tokens. Login's illustration uses `login-art`.

**The Scoped Palette Rule.** The frontmatter records the `.otla-workspace` and `.otla-navigation` overrides plus relevant inherited primitives. Do not replace the global root palette with these values: public payment links retain the existing blue theme.

Login only overrides `primary` and `ring`; its foreground, muted text, input border, and input background still inherit root tokens. In particular, login inputs use the root background (`#F7F9FC`), not the workspace white. Shared cards inherit root card foreground, inputs inherit root input border, and destructive/error styling remains red. These are source facts, not a claim that every token is already harmonized.

**The Status Text Rule.** Pair semantic color with visible status text; color alone does not communicate payment state.

Small 6px category dots appear beside labeled navigation destinations: payments `#438266`, contacts `#8b6caf`, calendar `#5783b2`, communication `#a77936`. They are decorative wayfinding markers, not unread notifications. Payment status badges include a 6px dot inheriting their semantic text color; the written status remains authoritative. These dots are hidden from assistive technology.

## Typography

System sans is the shared heading and body family. This is an operational interface: hierarchy comes from weight, spacing, and modest size changes rather than display typography.

Inicio uses the headline role (20px); login uses the larger login-title role. Section titles use the title role. Grouped navigation links use 13px text; payment rows use body text; concepts, dates, and supporting labels use the label role. Monetary figures use tabular numerals. No display font is loaded for the redesigned surfaces.

## Layout

The admin shell fills the dynamic viewport and prevents outer horizontal overflow. Its main content scrolls vertically below the header.

- At `md` (768px) and above, the left navigation combines a 56px white icon rail with a 192px grouped text panel (248px combined, plus borders). Collapse removes the text panel and leaves the 56px icon rail. Below that, a labeled menu button opens dialog navigation.
- The top bar has a 56px minimum height. At `lg` (1024px), it arranges identity, search (220–360px track), and account controls on one row; below it, search spans a second row.
- Inicio adds the right context column only at `xl` (1280px), with flexible main content and a fixed 280px panel with 16px padding. Below that breakpoint, the open context panel stacks after the main content.
- The Inicio content container is capped at 72rem. Horizontal padding progresses from 16px to 24px at `sm`; vertical padding is 20px and major groups use 16px gaps.
- Payment rows wrap below `sm` (640px), then stay on one line where space permits. Client names and concepts truncate; amounts remain right-aligned. Each tab shows at most twelve rows, with a link to the complete payments area.
- Login is capped at 1600px. At `lg`, its white form occupies the left column and pale-mint illustration occupies the right. Below `lg`, the illustration is hidden and the form remains. The form itself is capped at 24rem.

The context panel currently exists on Inicio only. Its open/closed state is local React state: it is not persisted and is not resizable. Left navigation collapse is also local state, not a saved preference.

## Elevation & Depth

Depth comes primarily from surface tint and thin dividers. Inicio does not use large floating KPI cards or decorative shadows. The shared Card primitive has a one-pixel foreground-at-10%-opacity ring; keyboard-focused controls use a three-pixel ring at 50% ring-color opacity. Global links, buttons, and summaries additionally have a two-pixel focus outline with three-pixel offset.

## Shapes

Controls use gently rounded corners from the existing radius scale. The base radius is 10px: small corners are 6px, medium 8px, large 10px, and extra-large 14px. Cards and illustration containers use extra-large corners; badges use the elongated 26px radius. Thin borders define structure without creating a nested-card appearance.

## Components

### Buttons

Primary buttons have deep-green fill and white text in the workspace and login. Outline buttons use a surface fill and border; ghost buttons gain a muted background on hover or expansion. Primary hover uses 90% primary opacity. Shared buttons have a minimum height of 44px, medium weight, and small inline icons. Disabled controls reduce opacity and prevent interaction; invalid controls use destructive border and ring styling.

### Inputs / Fields

Shared inputs have a 44px minimum height, 12px horizontal padding, and border-plus-ring focus feedback. Text is 16px below `md` and 14px from `md`. Login supplies labels, appropriate email/password autocomplete, required fields, disabled loading state, and an alert for errors. It does not add an unimplemented password-reset or social-login action.

### Navigation

Active destinations use pale sage backgrounds and stronger green text with `aria-current`. The persistent icon rail has 40px square links with accessible names and titles. Grouped text links have 8px corners, 8px horizontal padding, and a 36px minimum height on desktop, increasing to 44px below `md`. The text panel includes main destinations, a “Cobranza” shortcut group (Nuevo cobro, Resumen, Datos de pago), and a settings disclosure. Collapsing removes that panel, including its account block, while retaining rail destinations, the toggle, and the account shortcut. Collapse currently has no width animation.

The rail uses the existing `/otla-app-icon-v2.png`; login retains `/otla-logo-v2.png`. Neither asset is redrawn. The text panel uses an “OTLA / Mi espacio” identity heading.

### Payment list and status chips

The default tab is “Por revisar”; the second is “Todos los activos.” Attention includes overdue, due-today, and due-soon payments. Each row links to the order and includes initials, client, concept, remaining balance, due date, and status. Semantic chips label overdue as “Vencido,” due-today as “Vence hoy,” and other listed timing states as “Pendiente.” Empty and failed-data states explain what happened and offer a useful next route.

### Context panel

“Resumen” contains upcoming appointments and configured reminders. “Actividad” contains dated contact follow-ups, not a full payment timeline or proof that messages were delivered. The panel makes this limitation explicit. Its show/hide button announces expanded state and controls the panel by ID; tab behavior uses Base UI.

### Cards / Containers

Use thin dividers for repeated payment and context rows. The compact payment summary uses a muted surface at 60% opacity, 10px corners, 16px horizontal padding, and 12px vertical padding rather than a bordered white card. A pale-sage guidance block is supporting content, not a competing hero.

### Login illustration

The illustration complements the form on a pale-mint panel and is hidden on smaller screens. It has descriptive alternative text. It does not replace or redraw the original logo.

## Do's and Don'ts

### Do:

- Do retain the original OTLA logo.
- Do keep payments prominent and supporting context secondary.
- Do use semantic status colors with explicit text labels.
- Do preserve keyboard focus, labeled controls, and responsive wrapping.
- Do keep the admin palette scoped so public payment links retain their theme.

### Don't:

- Don't restore the superseded dark navigation treatment.
- Don't present dated follow-ups as a complete payment or message-delivery history.
- Don't claim the context panel is persistent, resizable, or available on every route.
- Don't describe these documented surfaces as a complete product redesign or deployment.
