# TEZG frontend implementation plan

Status: plan agreed 2026-11-14. The repository split is done; no frontend code exists yet.

This plan covers four things:

1. The repository layout: `backend/` and `frontend/`, each able to become its own repository.
2. A React frontend that reaches every backend capability: the 109 tRPC procedures, the 4 job routes, the 2 health probes and the Better Auth routes.
3. A design system with three looks, specified in [`THEMES.md`](THEMES.md): **Classic** light and dark (purple and mint, soft), and **CRT/VHS** (a purple terminal played from tape).
4. A component library holding all 57 React Bits components listed in [`PLAN.md`](PLAN.md), used or not.

## 1. Decisions taken

Agreed with the product owner on 2026-11-14.

| # | Decision | Choice |
|---|---|---|
| 1 | Repository layout | Split now. The service and `_bmad-output/` live in `backend/`, so the backend is self-contained |
| 2 | Framework | Vite + React SPA, with the landing page prerendered |
| 3 | Serious theme | "Classic": soft lavender surfaces, violet for action, **mint** as the contrast colour, soft elevation, in light and dark |
| 4 | CRT theme | "CRT/VHS": purple phosphor terminal with VHS artefacts and on-screen display |
| 5 | Default look | CRT/VHS for a first visit; the switch is in the header and the choice is remembered |
| 6 | Where colours are specified | `frontend/docs/THEMES.md`. `DESIGN.md` keeps its component and behaviour rules and carries a note that its colours are superseded |
| 7 | Backend additions | All four enablers of section 4 are in scope |
| 8 | Components without a backend feature | PulseHeart, BellToggle and Shredder use the nearest existing feature |
| 9 | Delivery | Branch `frontend-plan`, then a pull request into `main` |

## 2. What the backend gives the frontend

Facts read from the code, not from the README.

- **Wire.** One HTTP request per procedure, no batching. A query is `GET /api/trpc/<procedure>?input=<json>`, a mutation is `POST` with a JSON body. Success is `{ result: { data } }`.
- **Refusals.** Every refusal is `{ error: ErrorBody }` with `code`, `httpStatus`, a `decision` (`outcome`, `reasonCode`, an es-CO `humanMessage`, `citations`) and, for `RequestValidationFailed`, one `issues[]` entry per field. The server already writes the human text, so the frontend renders it and never maps codes to copy.
- **Types.** `AppRouter` is built from a dynamic tree and resolvers return `unknown`, so `@trpc/client` would infer nothing. The typed source is the generated `openapi.yaml` (16,091 lines, with component schemas for every request, response and `ErrorBody`).
- **Sessions.** Better Auth cookie sessions at `/api/auth/*`. Four access levels: `public`, `authed`, `canBuy` (needs a verified email) and `admin`.
- **UX specification.** 43 page specs in 12 modules (35 product pages and 8 developer consoles), plus `DESIGN.md` (components and state grammar), `EXPERIENCE.md` (behaviour, states, accessibility floor) and `microcopy-es-CO.md`, all under `backend/_bmad-output/planning-artifacts/ux/`.
- **Existing pages.** `backend/app/` has a thin slice (`/ingresar`, `/mensajes`, `/coleccion`, `/perfil/<userId>`) that the 6 Playwright journeys and their committed traces depend on.

### Gaps that affect the frontend

| Gap | Evidence | Effect |
|---|---|---|
| No "who am I" procedure | `getCapabilities` is an internal port; only the admin-only `access.traceCapabilities` is exposed. `isAdmin` and `sellerTrack` are not Better Auth session fields | The UI cannot know the caller's role to build navigation |
| Object storage and scanner are unwired at run time | `UNWIRED_STORAGE`, `UNWIRED_SCANNER` in `src/server/composition.ts` | Comprobante upload, top-up proof and business documents answer 500 |
| No upload ticket for business documents or the payment QR | `deferred-work.md`, Story 3.1 | The application form cannot attach documents |
| Mail is unwired | `UNWIRED_EMAIL`; sign-up is refused before any write | Nobody can register; `canBuy` actions need a verified email |
| Catalog feed and TRM sources are unwired | `UNWIRED_FEED`, `UNWIRED_FX` | The feed console and the TRM retry answer 500; a fresh database has no catalog |
| Seeds carry no card images | `imageUrl` is `NULL` in `test-support/seed.ts`; the only demo seed is the E2E one (3 accounts) | Card-art components have nothing to show |
| Listing reads are thin | `ListingDetailDTO` has title, price, availability and state, but no condition, description, image or seller name; `SearchRow` has ids only | Listing rows need extra reads to show a card name and image |
| Three `PLAN.md` ideas have no backend | No procedure removes one entry from a collection, saves a seller, or sends notifications | Shredder, PulseHeart and BellToggle use the nearest real feature (section 7) |

## 3. Repository layout

```
/
├── README.md                 general: what TEZG is, the two apps, how to run them
├── .github/workflows/        the backend gates, run from backend/
├── .agents/ .claude/ .cline/ _bmad/      AI tooling
├── backend/                  everything the service owns
│   ├── README.md
│   ├── app/ src/ prisma/ scripts/ test-support/ tools/
│   ├── _bmad-output/ docs/ assets/
│   └── package.json, Dockerfile, docker-compose.yml, configs
└── frontend/
    ├── README.md
    └── docs/                 this plan, PLAN.md, THEMES.md
```

When the frontend is scaffolded (Phase 1) it adds `contract/`, `src/`, `e2e/`, `public/` and its own `package.json`. A root `docker-compose.yml` that starts Postgres, the backend and the frontend together also arrives in Phase 1, when there is a frontend to start.

### What the split changed

The backend's 712 tracked files moved with `git mv` in one rename-only commit. Scripts resolve paths from their own location and the docs link to each other relatively, so nothing inside the folder needed an edit. A second commit fixed what points in from outside:

- `.github/workflows/`: the jobs run with `working-directory: backend`, and cache and artifact paths carry the prefix.
- `_bmad/**/config.*`: BMAD now writes to `backend/_bmad-output`.
- `backend/README.md`: commands run from `backend/`.

### Rules that keep a later repository split possible

- Neither folder imports from the other. The frontend's only knowledge of the backend will be `frontend/contract/openapi.yaml`.
- Each folder has its own `package.json`, lockfile, `.nvmrc`, `.gitignore`, `.gitattributes`, `.env.example`, Dockerfile, lint and test setup. There is no root `package.json` and no workspace.
- While both live here, a CI step fails when `frontend/contract/openapi.yaml` differs from the backend's generated file.
- To split: `git subtree split --prefix=frontend` (or `backend`) yields a standalone history. The frontend then pulls the contract from a backend release, and the UX spines it cites are copied once into `frontend/docs/`.

### The existing demo pages

They stay in `backend/app/` until the frontend's own journeys replace them (Phase 10). Removing them earlier would break 6 green journeys and their evidence checksums.

## 4. Backend enablers

Each follows the backend's own process: a decision-log entry, the contract change in `operations.json`, ATDD first.

| ID | Change | Needed by | Without it |
|---|---|---|---|
| BE-1 | `access.me`, an `authed` query over the existing `getCapabilities` port: display name, `emailVerified`, `isAdmin`, seller kind, capabilities and verification status | Phase 1, navigation and route guards | Role is inferred by probing (`verification.myStatus`, `commission.myAccount`, one admin query), which is slow and cannot detect an individual seller profile |
| BE-2 | Development adapters behind an environment switch, refused in production: local object storage with a pass-through scanner, a console mail sender, the fixture catalog feed and a fixture TRM source. The tests already have all four. Add the missing upload ticket for business documents | Phases 5, 7, 8 | Those screens ship but can only be exercised against mocks |
| BE-3 | `npm run seed:demo`: a catalog with image URLs and prices, both seller kinds, listings, orders and trades in every state, conversations, reviews, a business with a commission account and an admin | Phase 3 onward | Development and demos run on 3 accounts and no images |
| BE-4 | Document the deployment topology (no code): the frontend origin proxies `/api/*` to the backend and `BETTER_AUTH_URL` is set to that public origin, exactly as `npm run demo` already does for port 4000 | Phase 1 | "Invalid origin" on sign-in |

BE-4 means no CORS and first-party cookies. A cross-origin deployment is possible later but needs code: `trustedOrigins`, CORS headers and `SameSite=None; Secure` cookies.

## 5. Frontend stack

Versions are npm latest on 2026-11-14. Every dependency is pinned exactly and listed in an approved-list gate, as the backend does.

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 8, React 19.3, TypeScript 7.0.2 strict | Same React and TypeScript as the backend |
| Routing | React Router 8, lazy route modules per area | Deep links, nested layouts, code splitting |
| Server state | TanStack Query 5 | The spec's freshness rules map directly: 30 s polling while visible, pause when hidden, refetch on focus |
| API client | A thin typed client of our own over `fetch`, with types generated from `openapi.yaml` by `openapi-typescript` | The wire is trivial and the router is untyped; this keeps one source of truth |
| Forms | React Hook Form + zod 4 | "Validate on submit, then live per field" is its `onSubmit` / `onChange` mode; server `issues[]` map onto fields |
| Styling | CSS Modules + CSS custom properties, cascade layers, no Tailwind | `PLAN.md` picks the CSS variants; three looks are a token swap, with no runtime cost |
| Motion | `motion`, `gsap`, `ogl`, `matter-js`, `@hugeicons/*` | Exactly what the 57 React Bits components import, nothing else |
| Charts | Hand-written SVG line plus an ASCII renderer | The spec asks for one ink line with dashed stale segments and a table; a chart library is not justified |
| Tests | Vitest 5, Testing Library, MSW 3, Playwright + axe-core | Same runners as the backend |
| Text | One typed es-CO dictionary, `Intl` formatters for COP, percent, distance and Bogotá dates | One locale; no i18n library needed |

Three notes for whoever installs this:

- React Router 8, Vite 8 and MSW 3 are recent majors. Read their current docs before scaffolding rather than relying on older habits.
- The React Bits registry declares `motion@^12.23.12` while npm latest is 14. Pin the newest 12.x until the components are checked on 14.
- `PLAN.md` mixes `-JS-CSS` and `-TS-CSS` variants. Every one of the 57 exists as `-TS-CSS`, so install that variant throughout.

### Source layout

```
src/
├── app/            router, providers, layouts (public, app, shop desk, admin, dev), guards
├── api/            client, error model, query keys, generated types, MSW handlers
├── theme/          theme.config.ts, ThemeProvider, tokens/*.css, effect settings
├── ui/             the component library (section 7)
├── features/       one folder per module: catalog, discovery, listings, orders, commission,
│                   trading, messaging, collections, valuation, reviews, verification, admin
├── pages/          landing, auth, status, not-available
├── lib/            formatters, clipboard, polling, file checks
└── i18n/           es-CO.ts
```

A feature owns its queries, mutations, forms and screens, and imports only from `api/`, `ui/`, `theme/` and `lib/`. Features never import each other; a lint rule enforces it.

## 6. Themes

[`THEMES.md`](THEMES.md) is the full specification: every token with its contrast ratio, the VHS layer, the on-screen display vocabulary and the safety limits. This section is the summary the rest of the plan relies on.

### Three looks

| Look | Character |
|---|---|
| **Classic light** | Soft lavender surfaces (`#F7F5FB`), deep aubergine ink, violet `#5B3FD6` for action, mint `#0E6F68` / `#4FD8C4` as the contrast colour, rounded corners and two soft elevation levels |
| **Classic dark** | The same roles on `#14101F`: light violet `#A995FF` for action with dark button text, mint `#4FD8C4`, elevation carried by lighter surfaces |
| **CRT/VHS** | Lavender phosphor `#C9A7FF` on purple-black `#0D0714`, monospace type, box-drawing frames, and a VHS layer: colour fringe on headings, a tracking band, tape grain, and VCR on-screen text (`PLAY ▶`, `REC ●`, `SIN SEÑAL`) |

Classic follows the device's light or dark setting until the person chooses. CRT/VHS is the default for a first visit.

### Model

Tokens come in three tiers. Components read only the middle one.

1. **Primitive**: raw values per look.
2. **Semantic**: the shared contract (`--surface-base`, `--ink-primary`, `--accent`, `--contrast`, `--status-pending`, `--border-strong`, `--elevation-1`, `--frame-style`).
3. **Component**: optional overrides.

`<html data-theme="classic|crt" data-mode="light|dark" data-effects="full|reduced|off">` selects the values. An inline script sets the attributes before first paint.

### `theme.config.ts`

One typed file is the whole configuration:

```ts
export const themes = {
  classic: { label: 'Clásico', modes: ['light', 'dark'], tokens: 'tokens/classic.css',
             fonts: { body: 'Inter', display: 'Inter', code: 'JetBrains Mono' },
             background: { landing: 'ShapeGrid', app: null }, variants: {} },
  crt:     { label: 'CRT / VHS', modes: ['dark'], tokens: 'tokens/crt.css',
             fonts: { body: 'JetBrains Mono', display: 'VT323', code: 'JetBrains Mono' },
             background: { landing: 'CRTWarp', app: 'GradientASCII' },
             variants: { CardArt: 'AsciiArt', ValuationChart: 'AsciiChart', Loader: 'TrackingBar',
                         Frame: 'BoxFrame', CollectionTile: 'TapeSpine', NotAvailable: 'BlueScreen' } },
} as const;
export const defaultTheme = 'crt';
```

Adding another look is one token file and one entry.

### Rules every look obeys

- **Same DOM, same accessibility tree.** A look changes presentation only: roles, names, focus order, copy and flows are identical. One test suite and one axe scan run on all three.
- **Behaviour is look-independent.** Everything in `EXPERIENCE.md` holds everywhere: the explainability banner sits above the control it explains, refusals never appear in a toast, the four state classes, the formats and the voice.
- **Mint never marks a state.** States use a dot or glyph plus a text label; the confirmed green is a leaf green well away from mint.
- **Contrast is gated.** A script recomputes every text token against every surface and fails under 4.5:1.
- **Effects are a setting.** `full`, `reduced` or `off`, defaulting from `prefers-reduced-motion`. Nothing flashes more than three times a second, and fringe or glow never touch body text.
- **Graphics are budgeted.** One WebGL context at a time, paused off-screen and when the tab is hidden, with a static fallback.
- **VCR words are decoration.** `PLAY`, `REC` and the rest sit beside the Spanish label and are hidden from screen readers.

### Amendments to the UX spines

`DESIGN.md` fixed one flat, teal-accented theme, and `EXPERIENCE.md` says "UI system: none". This plan changes that deliberately:

- `THEMES.md` replaces the colours, the single-accent rule and the flat-surface rule. `DESIGN.md` carries a note saying so.
- The component inventory, the state grammar and every behavioural rule stay in force in all three looks.
- Motion components are enhancements over a native control. SlideCommit wraps a real button and has a keyboard path; Shredder plays after a `<dialog>` confirmation; SwipeToast carries only non-decision feedback such as "Copiado".
- The landing page is a marketing surface, outside the product-page rules, and may be expressive in every look.

## 7. Component library

Everything lives in `frontend/src/ui/`, in layers that may only import downward:

| Layer | Contents |
|---|---|
| `ui/patterns/` | The `DESIGN.md` components: ExplainabilityBanner, StateIndicator, PriceBlock, PriceProvenanceBlock, ListingCard, OrderStatusRow, UploadDropzone, DocumentViewer, DataTable, LedgerTable, TradeTimeline, MessageThread, ContactComposer, BinderGrid, PromptCard, ValuationSummary, ValuationChart, RatingSummary, ReviewCard, ModerationPanel, LocationPicker, CapabilityTrace, ApiExplorerPanel, StateMachineViewer, EmptyState, Skeleton, FieldError, ErrorSummary |
| `ui/fx/` | Adapters around React Bits: theme tokens in, reduced-motion guard, lazy loading, accessible name, native fallback |
| `ui/ascii/` | AsciiArt, AsciiChart, BoxFrame, TrackingBar, TapeSpine, BlueScreen, the VHS overlay, the glyph map |
| `ui/primitives/` | Button, Input, Textarea, Select, Checkbox, Radio, Switch, Dialog (native), Tabs, Tooltip, Table, Pagination, Tag, LiveRegion, VisuallyHidden |
| `ui/reactbits/` | All 57 components, vendored unmodified by `npx shadcn@latest add @react-bits/<Name>-TS-CSS` |

- **`ui/registry.ts`** lists every component with its layer, source, supported looks, the routes that use it and a status (`in-use` or `library-only`).
- **`/lab`** is an in-app gallery generated from the registry: every component, every state, the three looks side by side, with its props. It replaces Storybook and needs no extra dependency.
- **Gate**: CI fails if a `PLAN.md` component is missing from the registry, lacks a lab entry in any look, or fails its axe scan.
- **Vendored code stays untouched.** Product code imports from `ui/fx/`, never from `ui/reactbits/` directly. Any unavoidable patch goes in a `PATCHES.md` list so updates stay possible.

### Where each `PLAN.md` component is used

The tables follow `PLAN.md` in its own order, with the note written there. Routes are those of section 8. Every component also has an entry in `/lab`.

**Componentes**

| # | Component | Note in `PLAN.md` | Where it is used |
|---|---|---|---|
| 1 | HoloCard | holo card | The hero art on card detail `/c/:id`; the tilting card in the landing hero. In CRT/VHS the foil becomes a purple phosphor sheen |
| 2 | GridMotion | Grid | Landing section 5: a moving wall of real catalog cards |
| 3 | ElectricLogo | | The brand mark in the header of every layout; the CRT/VHS power-on |
| 4 | ScrollExpand | | Landing section 4, "how it works": each demo expands as it scrolls into view |
| 5 | RippleDistortion | | Landing hero: the card image reacts to the pointer |
| 6 | DitherVeil | | CRT/VHS: the veil over images before "ver imagen original", and between landing sections |
| 7 | HalftoneReveal | | Card images appearing on load in `/catalogo` and `/cerca` |
| 8 | PixelSwap | | Thumbnail hover in `/catalogo`: the art swaps to the card's details |
| 9 | FadeContent | | The default enter transition of every page section |
| 10 | Topography | | The header of `/cerca`, standing in for the map tiles the product does not have |
| 11 | PixelTransition | mosaic | Revealing a wishlist card in `/coleccion/deseos`; section changes in CRT/VHS |
| 12 | GlareHover | | Listing cards and catalog thumbnails on hover, in Classic |
| 13 | CircularCarousel | panorama | Landing section 5: featured sets; the overview at the top of `/coleccion` |
| 14 | AccordionGallery | | Landing section 3: the four pillars |
| 15 | LineSidebar | | The left rail of `/admin` and the navigation of `/dev` |
| 16 | FlowingMenu | | The landing footer navigation |
| 17 | TiltedCard | album | Collection covers in `/coleccion`, each an album. In CRT/VHS it is a tape spine |
| 18 | DecayCard | Carta no obtenida | Cards not owned: wishlist items, and the missing cards of a set in the binder's set filter |
| 19 | Folder | preview binder | The collection tile in `/coleccion`, opening to preview three cards |
| 20 | StaggeredMenu | menu | The main menu on mobile |
| 21 | Carousel | Preset stories | Landing section 7: the seller stories; the post-purchase prompts in `/actividad/sugerencias` |

**Texto**

| # | Component | Note in `PLAN.md` | Where it is used |
|---|---|---|---|
| 22 | TechText | tech text (serif and variants) | Section headings on the landing page and page titles in CRT/VHS |
| 23 | CircularText | | The seal on the landing page; the verified-shop badge on `/perfil/:userId`, in mint |
| 24 | CountUp | | The collection total on `/coleccion/:id/valor`, the balance on `/tienda/saldo`, the catalog count on the landing page. The final value is in the DOM from the first frame |
| 25 | GlitchText | | "No disponible" and 404 headings in CRT/VHS; the landing "problem" section |
| 26 | ASCIIText | | The TEZG wordmark in the CRT/VHS landing hero; the 404 page |

**Fondos**

| # | Component | Note in `PLAN.md` | Where it is used |
|---|---|---|---|
| 27 | LiquidChrome | | Landing section 6, behind the trust statement, in Classic |
| 28 | ShapeGrid | Favorito | The signature background of Classic: the landing hero, `/ingresar` and `/registrarse`, in lavender and mint |
| 29 | Waves | | Empty states and the dividers between landing sections, in Classic |
| 30 | PrismaticBurst | | The landing closing section, behind the final action |
| 31 | GridScan | | The "searching nearby" state of `/cerca`; the header of the developer consoles |
| 32 | PixelBlast | | The landing closing section in CRT/VHS; the 404 page |
| 33 | Antigravity | | Landing section 4: cards floating around the binder demo |
| 34 | WebThreads | | Landing section 3, behind the community pillar |
| 35 | CRTWarp | Favorito. Estilo principal, que la página sea estilo crt | The signature background of CRT/VHS: the landing hero and the power-on. It gives the look its curved-tube feel |
| 36 | MicroSlats | | Library only, shown in `/lab`; a candidate for the admin sign-in |
| 37 | GradientASCII | | The background of inner pages, `/ingresar` and `/registrarse` in CRT/VHS, dimmed behind content |

**Micro**

| # | Component | Note in `PLAN.md` | Where it is used | Backed by |
|---|---|---|---|---|
| 38 | PeekRating | Para rating | The rating input on `/resenas/:targetId` | `reputation.write`, `.edit` |
| 39 | SpringCheck | Para listas de cartas | Card checklists: set completion in the binder, bundle components on `/vender/nueva`, bulk select in `/vender/publicaciones` | `collections.binder`, `inventory.createBundle` |
| 40 | PulseHeart | Para guardar un vendedor | The wishlist toggle on every card. The backend cannot save a seller, so it saves a card | `collections.wishlist.add`, `.remove` |
| 41 | RubberSegment | Para filtrar | Segmented filters: card kind in `/catalogo`, seller kind in `/cerca`, the 7, 30, 90-day period on card detail and valuation | `catalog.browse`, `valuation.trend` |
| 42 | SlideCommit | Para confirmar ofertas y cosas | Committing actions: accept an offer and confirm completion on `/intercambios/:offerId`, "Ya pagué" on `/pedidos/:orderId` | `trading.accept`, `orders.confirmPaid` |
| 43 | WarmTooltip | Para el chat | Message time and the "tienda no verificada" notice in `/mensajes/:conversationId` | — |
| 44 | LatticeLoader | Loader | The route-level loader in Classic. CRT/VHS shows the tracking bar instead | — |
| 45 | DodgeField | para algún easter egg | The 404 page: the "volver" button dodges once before giving in | — |
| 46 | CodeSlots | Códigos de confirmación y cosas | The NIT and its check digit on `/tienda/solicitud`; read-only order references | `verification.submit` |
| 47 | WakeSlider | Slider, rango de precios | The price ceiling and the search radius on `/cerca`, beside the canonical number input | `discovery.search` |
| 48 | JellyRadio | Otro para filtros | The condition filter on `/cerca`; the binder layout chooser | `discovery.search`, `collections.setLayout` |
| 49 | SwipeRow | Para lista de mensajes | Inbox rows in `/mensajes` (swipe to mute or mark read) and prompts, with visible button equivalents | `messaging.markRead`, `.setMuted` |
| 50 | GlideSelect | Select | Selects on product pages: city, collection, sort. Admin tables keep the native select | — |
| 51 | StatusMark | Loading | Inline saving and saved: binder reorder and layout | `collections.reorder` |
| 52 | CallChip | Loading con estados | Multi-state progress: comprobante and proof uploads, a feed run, a job run | `orders.uploadComprobante`, `catalog.feed.*` |
| 53 | BellToggle | Activar notificaciones de algo | Mute or unmute a conversation. The backend has no notifications, so this is the nearest real switch | `messaging.setMuted` |
| 54 | SwipeToast | Toast | Non-decision feedback only: "Copiado", "Tema cambiado". Never a refusal | — |
| 55 | FolderFloat | Preview de un binder con cartas saliendo | The collection preview on hover in `/coleccion`; the binder demo on the landing page | `collections.list` |
| 56 | FlipCard | | Card front and back on `/c/:id` and in a binder pocket; the landing pillars | — |
| 57 | Shredder | Para eliminar cartas | Deleting a collection and removing a wishlist card, after the confirmation dialog. The backend cannot remove one card from a collection | `collections.delete`, `collections.wishlist.remove` |

If saving a seller, notifications and removing a single card are wanted as written in `PLAN.md`, they are backend features first. PulseHeart, BellToggle and Shredder then move to them with no change to the library.

## 8. Routes and backend coverage

Slugs are Spanish and keep the deep links `EXPERIENCE.md` fixed. Numbers such as 2.1 are page-spec ids. A CI script reads the vendored contract and fails if any procedure is not referenced by a route module.

### Public

| Route | Page | Procedures |
|---|---|---|
| `/` | Landing | `catalog.browse` (live sample), `/api/health/ready` |
| `/catalogo` | 2.1 Catalog | `catalog.browse` |
| `/c/:catalogEntryId` | 2.2 Card detail | `discovery.cardDetail`, `catalog.provenance` (7, 30, 90-day switch) |
| `/cerca` | 3.1 Nearby | `discovery.search` |
| `/publicacion/:listingId` | Listing detail | `inventory.get` |
| `/perfil/:userId` | 11.2 Seller profile | `reputation.profile` |
| `/ingresar`, `/registrarse`, `/verificar-correo` | Auth | `/api/auth/sign-in/email`, `sign-up/email`, `get-session`, `sign-out`, `verify-email` |
| `/ayuda` | Support | `orders.supportContact.get` |
| `/estado` | Service status | `/api/health/live`, `/api/health/ready` |

### Signed in

| Route | Page | Procedures |
|---|---|---|
| `/coleccion` | 9.1 Collections | `collections.list`, `.create`, `.rename`, `.delete` |
| `/coleccion/:id` | 9.1 Binder | `collections.binder`, `.setLayout`, `.reorder`, `.moveEntry`, `.copyEntry` |
| `/coleccion/:id/agregar` | 9.2 Add entry | `collections.addEntry`, `.addExternal`, `catalog.browse` |
| `/coleccion/deseos` | 9.3 Wishlist | `collections.wishlist.list`, `.add`, `.remove` |
| `/coleccion/:id/valor` | 10.1 Value | `valuation.current`, `valuation.trend` |
| `/coleccion/:id/valor/historial` | 10.2 History | `valuation.history` |
| `/actividad/sugerencias` | 9.4 Prompts | `collections.prompts.list`, `.accept`, `.dismiss` |
| `/comprar/:listingId` | 6.1 Purchase | `inventory.get`, `orders.create` |
| `/actividad/pedidos` | Orders list | `orders.mine` |
| `/pedidos/:orderId` | 6.2 Order detail | `orders.get`, `.createComprobanteUpload`, `.uploadComprobante`, `.comprobanteUrl`, `.confirmPaid`, `.confirmItemReceived`, `.cancel` |
| `/resenas/:targetId` | 11.1 Review | `reputation.eligibility`, `.write`, `.edit` |
| `/contactar/:listingId` | 12.1 Contact | `inventory.contact` |
| `/mensajes`, `/mensajes/:conversationId` | 12.2 Inbox | `messaging.inbox`, `.thread`, `.send`, `.markRead`, `.setMuted` |
| `/ofertar/:listingId` | 8.1 Offer | `trading.offer`, `trading.mine` |
| `/actividad/intercambios` | 8.3 My trades | `trading.mine` |
| `/intercambios/:offerId` | 8.2 Timeline | `trading.get`, `.handoff`, `.counter`, `.accept`, `.reject`, `.withdraw`, `.confirmCompletion`, `.cancel` |
| `/cuenta` | Account, look, effects | `access.me` (BE-1) |
| `/vender/perfil` | 1.2 Seller profile step | `access.completeIndividualProfile` |
| `/vender/nueva` | 4.1 Create listing | `inventory.create`, `.createBundle` |
| `/vender/publicaciones` | 4.2 My listings | `inventory.mine`, `.update`, `.restock`, `.deactivate`, `.reactivate` |

### Shop desk (business accounts)

| Route | Page | Procedures |
|---|---|---|
| `/tienda/solicitud` | 5.1 Application | `verification.submit` |
| `/tienda/estado` | 5.2 Status | `verification.myStatus` |
| `/tienda/pagos` | Payment instructions | `verification.updatePaymentInstructions` |
| `/tienda/pedidos` | 6.3 Order desk | `orders.sales`, `.get`, `.comprobanteUrl`, `.confirmPaymentReceived` |
| `/tienda/saldo` | 7.1 Balance | `commission.myAccount`, `.createTopUpProofUpload`, `.requestTopUp`, `.myTopUps`, `.topUpProofUrl` |
| `/tienda/movimientos` | 7.2 Ledger | `commission.myAccount` |

### Admin

A non-admin sees the same "No disponible" page as any missing resource, with no "access denied" copy.

| Route | Page | Procedures |
|---|---|---|
| `/admin/solicitudes`, `/:applicationId` | 5.3 Review queue | `verification.queue`, `.getApplicationForReview`, `.approve`, `.reject`, `.reasons.list` |
| `/admin/recargas` | 7.3 Top-ups | `commission.admin.topUpQueue`, `.confirmTopUp`, `.rejectTopUp`, `commission.topUpProofUrl` |
| `/admin/moderacion` | 11.3 Moderation | `reputation.admin.search`, `.hide`, `.unhide`, `inventory.admin.hide`, `.unhide` |
| `/admin/catalogo` | 2.3 Feed console | `catalog.feed.start`, `.continue`, `.runs`, `.quarantine`, `catalog.fx.retry`, `.breaker`, `admin.jobs.tickHealth` |
| `/admin/catalogo/entregas` | Failed deliveries | `admin.events.deliveryHealth`, `.deliveries`, `.replay` |
| `/admin/comisiones` | 7.2, 7.4 | `commission.admin.ledger`, `.rates`, `.setRate`, `.lastReconciliation`, `commission.reconcile` |
| `/admin/cuentas` | 1.3 Account inspector | `access.traceCapabilities`, `orders.adminLookup` |
| `/admin/auditoria` | 11.4, 5.4 | `reputation.admin.log`, `inventory.admin.log`, `verification.legalIdentityAudit` |
| `/admin/politicas` | 5.5 Policies | `verification.reasons.list`, `.upsert`, `.setActive`, `orders.supportContact.set` |

### Developer consoles (non-production builds only)

| Route | Page | Notes |
|---|---|---|
| `/dev` | Index | Pinned banner "Consola de desarrollo · datos de prueba" |
| `/dev/api` | API explorer | Generated from the contract: any of the 109 procedures, with the Decision rendered above the raw JSON |
| `/dev/<module>` | 1.1, 3.2, 4.3, 6.4, 7.5, 8.4, 10.3, 12.3 | The explorer with scenario templates. The race simulator fires N parallel `orders.create` calls |
| `/dev/jobs` | Job runner | `jobs/trm-fetch`, `expiry-materialize`, `commission-reconcile`, `outbox-sweep`. The bearer is pasted per session and held in memory only |
| `/lab` | Component library | Section 7 |

Two limits apply to the consoles. The specs assume an actor switcher and a virtual clock, which exist only in the backend's test harness, so the consoles work as the signed-in user on real time. And `JOBS_SECRET` is never bundled or stored.

Five procedures had no page spec: `catalog.provenance`, `verification.updatePaymentInstructions`, `orders.adminLookup`, `orders.supportContact.set` and `jobs/outbox-sweep`. Each has a home in the tables above.

## 9. Landing page

Its job is to make a first-time visitor understand TEZG in one scroll and reach the catalog or a sign-up.

| # | Section | Content | Components |
|---|---|---|---|
| 1 | Hero | Wordmark, "Tu colección Pokémon TCG, en pesos y en un solo lugar", two actions (Explorar el catálogo, Crear mi colección), a tilting card, the look switch | ASCIIText or ElectricLogo, HoloCard, RippleDistortion, CRTWarp or ShapeGrid |
| 2 | The problem | eBay, PriceCharting, Collectr and WhatsApp groups, collapsing into one screen | GlitchText, TechText |
| 3 | Four pillars | Colección, Mercado, Intercambios, Comunidad | AccordionGallery, FlipCard, WebThreads |
| 4 | How it works | Three short demos with real components: a binder, the three-dot order row, a trade timeline | ScrollExpand, Folder, FolderFloat, TiltedCard, Antigravity |
| 5 | Live catalog | Real cards from `catalog.browse` and the real total, never invented figures | GridMotion, CircularCarousel, CountUp |
| 6 | Trust | "Cada decisión te dice por qué": a working explainability banner; no payment gateway; verified shops; prices in COP | ExplainabilityBanner, CircularText, LiquidChrome |
| 7 | For sellers | The individual and business tracks, verification and commission in plain words | Carousel |
| 8 | Close | Frequently asked questions in native `<details>`, the final action, footer, service status | PrismaticBurst or PixelBlast, FlowingMenu |

Requirements:

- The headline, copy and actions are real HTML text. Canvas text has a hidden heading behind it.
- The hero is prerendered and shows before any WebGL loads. Sections below the fold load on approach.
- The page works with effects off, at 320 px, at 200 % zoom and by keyboard alone.
- Targets: largest contentful paint under 2.5 s on a mid-range phone, no layout shift from late backgrounds.
- Classic is a soft editorial page in lavender and mint. CRT/VHS is the full show: the tube powers on, the wordmark is ASCII, and the camcorder date stamp sits in the corner. The content is identical.

## 10. UX and accessibility requirements

These apply to every screen and form the definition of done.

**States**

- Every surface implements Loading, Empty, Zero results, Transport error, Refusal, Success and Not available, as `EXPERIENCE.md` defines them.
- Skeletons appear only after 300 ms and match the final layout, so nothing shifts.
- A transport error names what failed and offers "Reintentar". A refusal is not an error state: the page stays usable under an explainability banner.
- A lost race re-fetches and explains who did what, instead of showing an error page.

**Navigation**

- Filters, sort and page live in the URL, so lists are shareable and Back restores them.
- Signed-out deep links go to sign-in and return to the same URL, through an allow-list that refuses external targets.
- Focus moves to the `<h1>` after a route change, and to the banner after a refusal of the person's own action.

**Forms**

- A visible label on every input, constraints stated before typing, errors tied with `aria-describedby`.
- Server field issues appear all at once in a summary of in-page links, plus under each field.
- Typed values survive every refusal. Consent boxes are never pre-checked.
- The primary button is disabled only while its own request is in flight: spinner at 300 ms, "Sigue en proceso…" at 10 s.

**Feedback**

- One polite live region for confirmations and poll updates, one assertive region for refusals of the person's own action.
- No countdown timers; deadlines are absolute times.
- Destructive actions are confirmed once, in a native `<dialog>` that restates the consequence.
- Optimistic updates only for reversible toggles: mute, wishlist, mark read.

**Accessibility (WCAG 2.2 AA, every look)**

- Status is never colour alone: a glyph or dot always has a text label.
- Visible focus on every focusable element, never hidden by sticky headers.
- Touch targets of at least 44 px on product pages; reflow at 320 px and 200 % zoom.
- Every chart has a table view; every drag has a keyboard and button equivalent with narration.
- Motion respects `prefers-reduced-motion` and the effects setting.

**Performance and resilience**

- Route-level code splitting; WebGL and physics load only where used.
- An error boundary per route, an offline banner, and no automatic retry of commands.
- Polling at 30 s only on screens that show another party's actions, paused when hidden.

**Security**

- Session cookies only; nothing sensitive in `localStorage`.
- Signed document URLs are never cached and regenerate on demand. Viewers have no download control.
- External images load with no referrer; external links use `rel="noopener noreferrer"`.
- No raw HTML rendering of user content. Codes and rule ids appear only on admin and developer surfaces.

## 11. Testing and gates

| Level | Scope |
|---|---|
| Unit | Formatters, the error model, the API client, the theme resolver, the ASCII renderers |
| Component | Every pattern and adapter with Testing Library, in every look |
| Contract | MSW handlers typed from the contract, so a contract change breaks the mocks at compile time |
| E2E | The five journeys of `EXPERIENCE.md` (UJ-1 to UJ-5) through Page Objects, against the real backend with the demo seed, in Classic light and CRT/VHS |
| Accessibility | An axe scan on every route and every lab entry, in all three looks |
| Visual | Screenshots of the lab per look, with effects off for determinism |

`npm run gate` in `frontend/` runs: typecheck, lint (with `jsx-a11y` and the feature-boundary rule), the dependency gate, contract freshness, procedure coverage, component registry completeness, token completeness and contrast, unit and component tests, and the bundle budget. A `frontend-quality-gate` workflow runs it with the E2E suite on changes under `frontend/`.

## 12. Phases

Each phase ends in a mergeable state with its gate green. Sizes are relative.

| Phase | Scope | Exit | Size |
|---|---|---|---|
| 0 Split | **Done on `frontend-plan`.** The backend moved into `backend/`; CI and BMAD paths fixed; the root and frontend READMEs written. Still open: the root `docker-compose.yml`, which waits for a frontend to start | From `backend/`: `npm run test:ci` green, `npx playwright test` 6 passed, CI green on the pull request | S |
| 1 Foundation | Scaffold, gates, contract sync and typed client, error model, session and guards, layouts, formatters, MSW, the dev proxy, the root compose file. BE-1 and BE-4 | Sign in as Julián through the proxy and reach an empty authenticated shell | M |
| 2 Design system | Tokens for the three looks, `theme.config.ts`, primitives, patterns, the ASCII and VHS kit, the 57 React Bits components with adapters, `/lab` | Every registry entry renders in the three looks and passes axe; the token gates are green | L |
| 3 Public | Landing, catalog, card detail, nearby, listing, seller profile, auth pages, status. BE-3 | A visitor goes from the landing to a card and to sign-in, in every look | L |
| 4 Collector | Collections, binder with reorder, add entry, wishlist, value, history, prompts | UJ-5 passes | L |
| 5 Buyer | Purchase, orders, comprobante, reviews, contact, inbox. BE-2 | UJ-1 passes on the buyer side | L |
| 6 Trading | Offer, timeline, my trades, handoff | UJ-2 passes | M |
| 7 Seller and shop | Seller profile step, listings, application, payment instructions, order desk, balance, ledger | UJ-3 passes on the business side | L |
| 8 Admin | All nine admin areas | UJ-4 passes | L |
| 9 Developer | API explorer, the eight consoles, job runner | Every procedure callable from `/dev/api`; coverage gate at 109 of 109 plus 4 jobs | M |
| 10 Hardening | E2E and visual runs per look, performance budgets, the READMEs, removal of the old demo pages, a rehearsal of `git subtree split` for both folders | Both folders build and pass their gates from a split checkout | M |

The enablers BE-1 to BE-4 are a parallel backend track; each is listed in the phase that first needs it.

## 13. Documentation

| File | Contents |
|---|---|
| `README.md` | What TEZG is, the repository map, how to run each app, links to the two READMEs |
| `backend/README.md` | The service: running, the API, tests and gates, architecture |
| `frontend/README.md` | Today: status and where the plan is. From Phase 1: prerequisites, environment, running against the backend or against mocks, scripts, the folder map, theming, adding a component, the gates |
| `frontend/docs/FRONTEND_PLAN.md` | This plan |
| `frontend/docs/THEMES.md` | The three looks: tokens, contrast, the VHS layer |
| `frontend/docs/PLAN.md` | The product owner's component list |

## 14. Risks

| Risk | Mitigation |
|---|---|
| The move broke a gate that hard-codes a path | The move is one rename-only commit; the full backend suite and the journeys were run from `backend/` afterwards, and CI runs them again on the pull request |
| 57 animated components hurt performance or accessibility | Adapters, lazy loading, one WebGL context, the effects setting, axe on every lab entry |
| Vendored React Bits code does not pass strict TypeScript or the project lint | Exclude `ui/reactbits/` from strict lint, keep patches listed, never import it directly |
| CRT/VHS as the default hurts legibility on money and admin screens | Same DOM in every look, the contrast gate measured with overlays applied, effects `off`, Classic one click away |
| Mint is read as "confirmed" | Mint never marks a state; the confirmed green is 70° of hue away; states always carry a text label |
| Enablers slip | Screens are built against MSW first; the real-backend journey for each is the last step of its phase |
| Recent major versions behave differently from documentation written for older ones | Read current docs at scaffold time; pin exact versions |
