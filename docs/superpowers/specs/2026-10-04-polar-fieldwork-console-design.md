# Polar fieldwork console redesign

## Goal

Replace Polaris's generic dashboard appearance with an industrial-Arctic fieldwork console while preserving its existing map-first workflow, offline presentation pack, sourced evidence, route controls and explicit assessment limits.

## Direction

The interface will feel like a composed field sheet rather than a stack of SaaS cards: a compact dark command bar, a warm ice-paper control dossier, and a map that remains the visual centre of gravity. The supplied blue-and-white Polaris mark stays in the header. This is an operational research tool for judges and researchers, not live navigation guidance.

## Boundaries

- Do not restore durability scores, illustrative charts or score-based ranking.
- Do not make new scientific claims or change map data, API contracts or the offline tile pack.
- Do not add web-font or animation dependencies; the presentation must continue to work offline.
- Keep all existing controls keyboard accessible and preserve visible focus treatment.
- Retain reduced-motion support. Motion is confirmation, not decoration.

## Visual system

- Introduce a compact, named CSS token layer for polar-night ink, ice-paper surfaces, glacial blue accents, muted technical text and a single warm signal color. New colors use OKLCH values.
- Rework the header into a command bar with a stronger wordmark lockup, deliberate status treatment and a small data-band below it.
- Give the control panel a dossier hierarchy: clear section labels, grouped controls and varied spacing rather than repeated rounded cards.
- Make the map toolbar, ruler and legend read as integrated field instruments through consistent surface treatment, optical alignment and restrained shadows.
- Keep color semantic: map state and source/evidence actions use blue; warnings retain their existing warning semantics; no state depends on color alone.

## Typography

- Use the installed system font stack to remain offline, but create a disciplined UI scale for command labels, controls, panel headings, body copy and technical metadata.
- Reserve uppercase, tracked labels for short navigation and source labels. Keep reading content natural case and at a readable size.
- Preserve tabular figures for dates, distances and coordinates.
- Set mobile inputs to at least 16px and avoid UI copy below 12px where it is user-facing.

## Interaction and motion

- Active controls receive a quick press response and a precise state color/shadow change.
- The mobile dossier continues to enter with opacity and transform only. Panel and utility-card transitions use the existing ease-out-quart curve and are removed for `prefers-reduced-motion`.
- No startup animation, bouncing effects, ambient loops or motion that delays access to the map.
- Add one quiet moment of personality: a subtle topographic/coordinate treatment in static chrome, not a decorative animation.

## Performance

- Prefer CSS token and layout work over additional JavaScript or dependencies.
- Do not lazy-load above-fold map controls or manipulate the offline satellite bundle.
- Avoid `transition: all`, layout-property animation and broad `will-change` use.
- Keep the logo's current small raster asset; only crop/export it later if measurements show it contributes materially to startup cost.

## Verification

1. Inspect the running dashboard at desktop and narrow widths, including open controls, route panel, legend, ruler and date control.
2. Confirm keyboard focus and reduced-motion behavior remain apparent.
3. Run `pnpm run build` from `frontend` and `node --test frontend/tests/*.test.cjs` from the repository root.
4. After the service worker has prepared its cache, load the dashboard without network access and exercise saved imagery plus map controls.
5. Review the diff for no changes to source data, offline pack or score behavior.
