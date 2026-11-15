# TEZG themes

Status: specification, agreed 2026-11-14. Nothing is implemented yet.

This file is the source of truth for colour, surface and theme decisions in the frontend. It replaces the colour tokens and the flat-surface rule of `backend/_bmad-output/planning-artifacts/ux/DESIGN.md`. Section 6 lists what still applies from that file.

## 1. The three looks

| Look | `data-theme` | `data-mode` | For |
|---|---|---|---|
| Classic light | `classic` | `light` | The serious, professional view in daylight |
| Classic dark | `classic` | `dark` | The same view at night |
| CRT/VHS | `crt` | (always dark) | The brand view: a purple terminal played back from a VHS tape |

- **Default**: a first-time visitor sees CRT/VHS. The switch is in the header on every page.
- **Classic mode**: follows the device (`prefers-color-scheme`) until the person picks light or dark.
- **Persistence**: the choice is stored locally and applied by an inline script before first paint, so the wrong look never flashes. A `?theme=` parameter overrides it for shared links.
- **Effects**: `data-effects="full|reduced|off"` is a separate setting, defaulting from `prefers-reduced-motion`. It matters most in CRT/VHS.

## 2. Token contract

Components read only these semantic tokens. Every look must define all of them; a gate fails the build if one is missing.

| Group | Tokens |
|---|---|
| Surface | `--surface-base`, `--surface-raised`, `--surface-sunken`, `--surface-overlay` |
| Ink | `--ink-primary`, `--ink-secondary`, `--ink-disabled`, `--ink-on-accent` |
| Action | `--accent`, `--accent-pressed`, `--accent-soft` |
| Contrast | `--contrast`, `--contrast-fill`, `--contrast-soft` |
| Line | `--border-hairline`, `--border-strong`, `--focus-ring` |
| State | `--status-confirmed`, `--status-pending`, `--status-error`, `--status-inert` |
| Trend | `--trend-positive`, `--trend-negative` |
| Shape | `--radius-sm`, `--radius-md`, `--radius-lg`, `--elevation-1`, `--elevation-2`, `--frame-style` |
| Type | `--font-body`, `--font-display`, `--font-code`, plus the six type roles of DESIGN.md |

## 3. Classic: purple and mint, soft

Violet is the colour of action. Mint is the contrast colour. Surfaces are soft lavender neutrals, so the two stand out without shouting.

### Light

Ratios are against `--surface-base` / `--surface-raised` / `--surface-sunken`.

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--surface-base` | `#F7F5FB` | | Page |
| `--surface-raised` | `#FFFFFF` | | Cards, dialogs, tables |
| `--surface-sunken` | `#EFEBF7` | | Inputs, wells, alternate sections |
| `--ink-primary` | `#1E1633` | 15.9 / 17.2 / 14.7 | Text, prices |
| `--ink-secondary` | `#5A4E7C` | 6.9 / 7.5 / 6.4 | Metadata, labels |
| `--ink-disabled` | `#A49CBC` | 2.4 | Graphics only, never text |
| `--accent` | `#5B3FD6` | 6.2 / 6.7 / 5.7 | Primary buttons, links, selection |
| `--accent-pressed` | `#4429B0` | 8.9 | Pressed and hover |
| `--accent-soft` | `#ECE7FB` | | Selected rows, chips (ink on it 14.3, accent on it 5.6) |
| `--ink-on-accent` | `#FFFFFF` | 6.7 on accent | Button text |
| `--contrast` | `#0E6F68` | 5.6 / 6.0 / 5.1 | Mint as text and icons |
| `--contrast-fill` | `#4FD8C4` | | Mint as a fill; ink on it 9.8 |
| `--contrast-soft` | `#DDF5F0` | | Mint tint; `--contrast` on it 5.3 |
| `--border-hairline` | `#E3DEF0` | | Dividers |
| `--border-strong` | `#8A80A8` | 3.4 / 3.7 / 3.1 | Input and control outlines |
| `--focus-ring` | `#5B3FD6` | | 2 px ring, 2 px offset |
| `--status-confirmed` | `#37701B` | 5.6 / 6.0 / 5.1 | Leaf green |
| `--status-pending` | `#8A5F10` | 5.2 / 5.6 / 4.8 | Ochre |
| `--status-error` | `#B3384A` | 5.4 / 5.9 / 5.0 | Brick rose |
| `--status-inert` | `#A49CBC` | | Hollow ring, with a label |

### Dark

Ratios are against `--surface-base` / `--surface-raised` / `--surface-overlay`.

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--surface-base` | `#14101F` | | Page |
| `--surface-raised` | `#1D1730` | | Cards, tables |
| `--surface-sunken` | `#0F0C18` | | Inputs, wells |
| `--surface-overlay` | `#261E3D` | | Dialogs, menus |
| `--ink-primary` | `#EDE9F7` | 15.7 / 14.5 / 13.2 | Text, prices |
| `--ink-secondary` | `#B3A9CF` | 8.4 / 7.8 / 7.1 | Metadata, labels |
| `--ink-disabled` | `#6B6189` | 3.3 | Graphics only |
| `--accent` | `#A995FF` | 7.5 / 6.9 / 6.3 | Primary buttons, links |
| `--accent-pressed` | `#C4B5FF` | 10.1 | Pressed and hover |
| `--accent-soft` | `#2A2150` | | Selected rows (ink on it 12.3, accent on it 5.9) |
| `--ink-on-accent` | `#14101F` | 7.5 on accent | Button text is dark on the light violet |
| `--contrast` | `#4FD8C4` | 10.6 / 9.8 / 8.9 | Mint as text, icons and fill |
| `--contrast-soft` | `#12332F` | | Mint tint; `--contrast` on it 7.8 |
| `--border-hairline` | `#2E2647` | | Dividers |
| `--border-strong` | `#7A6FA0` | 4.1 / 3.8 / 3.5 | Input and control outlines |
| `--focus-ring` | `#A995FF` | | 2 px ring, 2 px offset |
| `--status-confirmed` | `#9BD86A` | 11.1 | Leaf green |
| `--status-pending` | `#E0B15A` | 9.4 | Ochre |
| `--status-error` | `#FF8A9B` | 8.3 | Rose |
| `--status-inert` | `#6B6189` | | Hollow ring, with a label |

### How mint is used

Mint was chosen as the contrast colour knowing it sits near green. Two rules keep it from being read as a state:

- **Mint never marks a state.** States use the four-class grammar below. The confirmed green is a leaf green (hue about 100°), 70° away from mint (about 172°), and a state is always a dot or glyph beside a text label.
- **Mint marks what is special, not what is true.** It is used for the verified-shop seal, the "abierta a intercambios" tag, the active tab indicator, key-figure highlights (the collection total's underline, a new unread dot), chart highlights and decorative accents on the landing page.

Violet stays the only colour for the primary action. There is still one primary button per screen region.

### Soft surfaces

This replaces DESIGN.md's flat rule for Classic.

| Token | Value |
|---|---|
| `--radius-sm` / `-md` / `-lg` | 8 px / 14 px / 20 px |
| `--elevation-1` (cards) | `0 1px 2px rgb(30 22 51 / 0.06), 0 4px 12px rgb(91 63 214 / 0.08)` |
| `--elevation-2` (dialogs, menus) | `0 2px 4px rgb(30 22 51 / 0.08), 0 12px 32px rgb(91 63 214 / 0.14)` |
| Page wash | A faint lavender radial behind the page header, at most 6 % |

- Two elevation levels only. A third would start to look like a different product.
- In dark mode elevation is carried by the lighter surface and a hairline; the shadow drops to near zero.
- Still no glow, no neon and no gradient on a control. Gradients are allowed only as the page wash and on the landing page.
- Skeletons may shimmer gently at `full` effects and are static otherwise.

### Type

Inter for body and headings, JetBrains Mono for the `code` role. Both are self-hosted under their open licences. The six type roles of DESIGN.md (heading, body, meta, price-figure, data-label, code) keep their sizes and weights.

## 4. CRT/VHS: purple phosphor tape

### The idea

A collector filmed their binder on a camcorder in 1996, and you are watching the tape on an old monitor. The interface is the on-screen display of that VCR drawn over a purple phosphor terminal. Everything is text, frames are drawn with characters, and the picture carries the small defects of magnetic tape.

It is the brand's voice, so it gets the landing page. It must still be a usable marketplace: every price, state and button is as legible as in Classic.

### Palette

Ratios are against the screen `#0D0714` / window `#150B22`.

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--surface-base` | `#0D0714` | | The screen |
| `--surface-raised` | `#150B22` | | Windows: cards, tables, dialogs |
| `--ink-primary` | `#C9A7FF` | 9.9 / 9.5 | Phosphor text |
| `--ink-secondary` | `#8E6FD1` | 5.1 / 4.8 | Dim text, labels |
| `--ink-bright` (maps to `--accent`) | `#F3E8FF` | 16.8 / 16.1 | Headings, key figures, button labels |
| `--ink-on-accent` | `#0D0714` | 9.9 on phosphor | Inverse-video buttons |
| `--contrast` | `#7CF0D8` | 14.5 | Mint highlight, same role as in Classic |
| `--border-strong` | `#6B4FB0` | 3.2 | Box-drawing frames |
| `--status-confirmed` | `#8CF5B5` | 15.0 | `[OK]` |
| `--status-pending` | `#FFC56B` | 12.7 | `[..]` |
| `--status-error` | `#FF7A90` | 8.0 | `[!!]` |
| `--status-inert` | `#8E6FD1` | 5.1 | `[--]` |
| Fringe magenta, cyan | `#FF4FD8`, `#4FE3FF` | | Effects only, never a UI colour |
| Blue screen | `#2A1FC7` with `#FFFFFF` | 9.9 | "SIN SEÑAL" pages |

A second phosphor, amber on the same purple-black, can be added later as a token set without touching components.

### Type

- **Body**: JetBrains Mono. A terminal face that stays readable in long text and tables.
- **Display and on-screen text**: VT323, the bitmap terminal face, for headings, the on-screen display and the wordmark. It is too coarse for body text below 18 px.
- Labels are uppercase. Numbers are tabular by nature.

### Frames and controls

| Element | Rendering |
|---|---|
| Card, table, dialog, banner | A window with a box-drawing frame (`┌─┐│└┘`), drawn in CSS so the DOM is unchanged |
| Primary button | Inverse video: `[ COMPRAR ]` in dark on phosphor |
| Secondary button | `[ CONTACTAR ]` in phosphor on the screen |
| Destructive button | `[ ELIMINAR ]` in the error colour, framed |
| Checkbox, radio | `[x]` `[ ]` and `(•)` `( )` |
| Input | A `>` prompt and a block cursor |
| Focus | The normal ring plus an inverse-video block, so it is unmistakable |
| State | `[OK]`, `[..]`, `[!!]`, `[--]`, always followed by the same text label as Classic |
| Explainability banner | A framed window titled with the outcome; the "¿Por qué?" disclosure lists inputs as `clave: valor` lines |
| Breadcrumb | A status line: `tezg@co:~/catalogo$` |

### The VHS layer

These sit above the terminal as decoration. All are `aria-hidden`, ignore the pointer, and scale with the effects setting.

| Artefact | What it looks like | Where |
|---|---|---|
| Scanlines | Fine horizontal lines, darkening at most 8 % | Whole screen |
| Colour fringe | Magenta on the left edge and cyan on the right of glyphs, 1 px | Headings and on-screen display only, never body text |
| Tracking band | A band of horizontally displaced lines drifting up the screen about every 9 s | Whole screen; a short burst on route change |
| Head-switching noise | A thin jittering strip along the bottom edge | Bottom 6 px of the viewport |
| Tape grain | Soft moving luma noise, at most 6 % opacity | Whole screen |
| Colour bleed | Saturated blocks smear 1–2 px to the right | Images and filled buttons |
| Dropouts | Rare white specks on one line | Landing page only |
| Curvature and vignette | A slight barrel curve and darker corners | Landing hero only, through CRTWarp |
| Pause jitter | The frozen-frame wobble line | On anything paused |

### On-screen display vocabulary

The VCR's words become part of the interface. They are decoration beside the Spanish label, never the only label, because the product is in es-CO and screen readers must hear the real name.

| Display | Means | Appears |
|---|---|---|
| `PLAY ▶` | The page is live | Top-left corner of the landing and collection pages |
| `REC ●` | Something is being written | Uploading a comprobante or proof, publishing a listing, sending an offer |
| `PAUSE ❙❙` | Waiting, not broken | A paused listing, a muted conversation |
| `STOP ■` | Ended | Cancelled or expired orders and trades |
| `◀◀ REW` `FF ▶▶` | Previous and next | Pagination and binder pages |
| `EJECT ⏏` | Leave | Sign out |
| `TRACKING ▮▮▮▮▯▯▯` | Adjusting the picture | Loading, in place of a spinner |
| `CH 01` … `CH 05` | Which channel you are on | The five roots: Catálogo, Cerca de ti, Mi colección, Actividad, Cuenta |
| `SP` `LP` `EP` | Tape speed, meaning picture quality | The effects setting: SP is clean (`off`), LP is `reduced`, EP is `full` |
| Date stamp | A camcorder date in the corner: `NOV 14 2026  6:19 PM` | Landing and collection pages, in Bogotá time |
| `SIN SEÑAL` | Nothing to show | Not available, 404 and lost connection, on the blue screen |

There is no tape counter and no countdown. Deadlines stay absolute times, as in Classic.

### Signature moments

- **Power-on**: once per session on the landing page, the tube warms up and the picture snaps in, in at most 1.2 s. It can be skipped and never plays under reduced motion.
- **Blue screen**: "No disponible" and lost-connection pages are the VCR's blue screen with white text and one action.
- **Tapes on a shelf**: collections are drawn as VHS spines with a handwritten label showing the name and card count. Opening one "plays" it into the binder.
- **Card art**: images render as ASCII in phosphor purple from the real picture. Every card has a "ver imagen original" control, which shows the real image with a light tape filter at `full` and untouched at `off`.
- **Charts**: the valuation line is drawn in block and braille characters, with the same "Ver como tabla" toggle.

### Effects levels

| Level | Shown as | Includes |
|---|---|---|
| `full` | `EP` | Everything above, animated |
| `reduced` | `LP` | Static scanlines and grain, fringe on headings, no tracking band, no jitter, no power-on. The default when the device asks for reduced motion |
| `off` | `SP` | A sharp, still terminal: palette, type and frames only |

### Safety limits

- Nothing flashes more than three times a second, and no large area changes brightness abruptly.
- Fringe and glow never touch body text, and no overlay lowers text contrast below 4.5:1, measured with the overlay applied.
- One WebGL context at a time, paused off-screen and when the tab is hidden.
- No sound.

## 5. States in every look

The four-class mapping of DESIGN.md is unchanged; only the colours and glyphs differ.

| Class | Classic | CRT/VHS | Examples |
|---|---|---|---|
| confirmed | Filled leaf-green dot | `[OK]` | Approved, paid, closed, accepted |
| pending | Filled ochre dot | `[..]` | Awaiting payment, open offer, stale price, unread |
| error | Filled rose dot | `[!!]` | Rejected, refused, negative balance |
| inert | Hollow grey ring | `[--]` | Paused, withdrawn, hidden, expired, cancelled |

The dot or glyph is always followed by a text label. Trends keep `▲` and `▼` with a signed percentage. Ledger amounts keep `+` and `−`, never colour.

## 6. What still applies from DESIGN.md

**Replaced by this file**: the eleven colour tokens and their rationale, the "one accent colour" rule (Classic has violet for action and mint for contrast), the flat no-shadow rule, the radii, and the assumption of a single theme.

**Still in force, in every look**:

- The component inventory and what each component must contain.
- The four-class state mapping and "colour never carries meaning alone".
- The type roles, and `code` only on admin and developer surfaces.
- The explainability banner's parts and its place directly above the control it explains.
- Signs on ledger amounts, USD on its own line with its TRM date, dashed stale chart segments, a table beside every chart.
- No codes or internal names on buyer and seller surfaces.
- Everything in EXPERIENCE.md: states, forms, navigation, voice, formats and the accessibility floor.

## 7. Backgrounds per look

One animated background at a time, and none behind dense data such as tables, forms and the binder.

| Surface | Classic | CRT/VHS |
|---|---|---|
| Landing hero | ShapeGrid in lavender and mint | CRTWarp with the power-on |
| Inner pages | None; the page wash | GradientASCII, dimmed |
| Sign-in and sign-up | ShapeGrid, subtle | GradientASCII |
| "Cerca de ti" header | Topography in lavender | Topography as phosphor contour lines |
| Empty states | Waves, very faint | None; a framed message |
| Not available, 404 | None | Blue screen |

## 8. Gates

- **Completeness**: every token in section 2 is defined for all three looks.
- **Contrast**: every text token reaches 4.5:1 on every surface it may sit on, and every control outline 3:1. The ratios in this file were computed, not estimated, and the gate recomputes them.
- **Parity**: the DOM and accessibility tree are identical across looks, checked by running the same tests and axe scans on all three.
- **Motion**: with effects `off`, no element animates.
