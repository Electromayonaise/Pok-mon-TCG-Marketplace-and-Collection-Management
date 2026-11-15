# TEZG frontend

**Status: planned, not built.** This folder holds the plan and the design specification. There is no application code yet.

| Document | What it is |
|---|---|
| [`docs/FRONTEND_PLAN.md`](docs/FRONTEND_PLAN.md) | The implementation plan: stack, routes mapped to every backend procedure, the component library, the landing page, phases |
| [`docs/THEMES.md`](docs/THEMES.md) | The three looks: Classic light and dark (purple and mint) and CRT/VHS (purple phosphor tape), with every token and its contrast ratio |
| [`docs/PLAN.md`](docs/PLAN.md) | The list of React Bits components the library must contain |

## What it will be

A React single-page app (Vite, TypeScript) that talks to the [backend](../backend/README.md) over its HTTP API only. It never imports backend code: its one link to the backend is a vendored copy of the generated `openapi.yaml`, so this folder can become its own repository.

Until Phase 1 of the plan lands, the way to see TEZG running is the backend's demo server: see [`backend/README.md`](../backend/README.md), "Demo data and the demo server".
