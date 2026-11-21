# AI handoff — Museum of Days (Claude ⇄ Codex)

This file lets Codex (or any developer) continue the art-direction work without access to the
Claude conversation. It lives on the design branch until that branch is merged.

## 1. Project overview

Museum of Days turns a day's diary entry, photographs and a song into an exhibit ("Living
Memory") in one of four emotional galleries — GLOW, HUSH, ECHO, PULSE — reached from a central
hall. Stack: React 19, TypeScript, Vite, Three.js 0.180, React Three Fiber 9, GSAP, Supabase
(Auth/Postgres/Storage), IndexedDB, Vercel.

Claude's brief: art direction of the 3D museum only — the hall, four monumental portals,
architecture, materials, light, shadow, sculpture, frames, mobile 3D presentation and visual
performance. Functionality (auth, OTP, storage, editor, archive, privacy, backend) belongs to Codex.

## 2. Git branch structure

| Branch | Owner | Purpose |
|---|---|---|
| `main` | owner | production — **not touched by Claude** |
| `develop` | Codex | integration branch — **not touched by Claude** |
| `design/claude-art-direction` | Claude | all art-direction commits, created from `develop` |

Canonical repository: `akniyetdutbay-ux/genesis-akniet`. Claude's environment could only write to the
collaborator copy `amangereevdaukesh-afk/genesis-akniet`, so the design branch is published there:
`https://github.com/amangereevdaukesh-afk/genesis-akniet/tree/design/claude-art-direction`.
It is based on the canonical `develop`, so it merges into it cleanly (see §12).

## 3. Roles and responsibilities

- **Codex**: auth, registration, email OTP, Supabase, saving memories, photos/audio, editor logic,
  archive and day folders, privacy, backend, functional tests, release preparation.
- **Claude**: 3D hall, portals, galleries' architecture, lighting, shadows, materials, textures,
  sculpture, frames' visual quality, mobile 3D framing, render performance.
- Claude made no change to data contracts, Supabase schema, RLS, RPC, storage layout, email/SMTP
  configuration, secrets, or the memory format.

## 4. Develop baseline SHA

`1ac993055a2bee634b34115f947347e733da9666` — "Clarify email confirmation and refine the museum code letter"
(`origin/develop` of the canonical repository on 2026-11-21).

## 5. Visual architecture

```
MuseumScene (Codex: camera rig, demand renderer)  ── <LightRig place quality/>   src/Lighting.tsx
 ├─ Exterior / Hall / Gallery                      src/Architecture.tsx
 │   ├─ Hall ── <PortalWall/>                      src/Portal.tsx  (static: wall, archivolts, friezes, rooms behind arches, portal lights)
 │   └─ Gallery ── <RoomArchitecture room/>        src/GalleryRooms.tsx (per-room architecture + sculpture)
 ├─ Doorways (hall only) ── <PortalThresholds/>    src/Portal.tsx  (hover / click / "Step inside")
 └─ materials (all of the above)                   src/materials.ts
```

Key ideas:

- **Procedural PBR surfaces** (`materials.ts`): seeded, tileable limestone, ashlar (0.6 m courses),
  plaster, travertine and honed floor with diamond inlays — each with colour, normal and roughness
  maps generated on a canvas at start-up (~0.3 s total). No downloaded textures.
- **Metre UVs everywhere**: `meterBox`, `meterUV`, and ExtrudeGeometry's world UVs mean a block of
  stone has the same grain size on a bench and on a 22 m wall. Texture `repeat` = 1 / tile size.
- **Shared, cached materials and geometries** (`stone()`, `finishMaterial()`, `brass()`,
  `cachedGeometry()`): never mutate a returned material; clone it if a tween needs to.
- **Portals**: the whole 22 × 11.2 m portal wall is one ExtrudeGeometry draw call, 1.5 m deep, so
  each arch has real reveals and soffits. Behind every arch is a small lit room with its own point
  light, so the colour atmosphere of the gallery is seen *through* the arch in 3D.
- **Hover/open**: a module-level registry links each `Threshold` (interactive, mounted only in the
  hall) to its portal light and floor light-pool; hover raises the light, opening ramps it further
  while the existing `DoorJourney` camera move plays.
- **Lighting**: one shadow-casting key light per space, hemisphere fill, a PMREM `RoomEnvironment`
  for stone/metal response (`scene.environmentIntensity` per room), 1–3 local accents, per-room fog
  and exposure. Ceilings do not cast shadows (they would black out the hall).
- **Baked contact shadows**: soft occlusion strips where walls meet floors, drop shadows behind
  frames and under benches/partitions — they work on phones where shadow maps are off.
- **Photographs stay readable**: the visitor's photographs use unlit `meshBasicMaterial`
  (unchanged, in `MemorySurface`), so no lighting choice can darken or tint them.

## 6. Existing functionality that must be preserved (verified on this branch)

- Entrance → hall camera journey; hall → gallery `DoorJourney`; deep links `/#hall`, `/#glow`…
- `doorX` coordinates (−7.5, −2.5, 2.5, 7.5) — used by touch snapping and camera paths.
- `Doorways` props `{target, onDoor, reduced}`; hover cursor; click → `onDoor(id)`.
- Mobile hall swipe (one system, in `MuseumScene` `CameraRig`; untouched) and tap-to-enter.
- Frame placement (`exhibitionPosition`), lazy far-exhibit culling, `onSelect(i)`, `MemorySurface`
  (cover photo, blob loading, labels), Living Memory, theatre, editor, collection, audio.
- `quality` low/high (shadows off on phones), demand frame loop, lazy MuseumScene chunk, `?lite`.

## 7. Files modified by Claude

| File | Change |
|---|---|
| `src/materials.ts` | **new** — procedural PBR surfaces, cached materials/geometry, soft masks, engraved lettering |
| `src/Portal.tsx` | **new** — portal wall, archivolts, entablature/friezes, rooms behind arches, thresholds, `doorX` (moved here) |
| `src/Lighting.tsx` | **new** — per-space light rigs, fog, exposure, environment map |
| `src/GalleryRooms.tsx` | **new** — GLOW/HUSH/ECHO/PULSE architecture, sculpture, room palette `roomStyle` |
| `src/Architecture.tsx` | `Box` uses shared PBR materials + metre UVs (props unchanged, optional `kind`); floor is one mesh; fluted columns are one mesh; new Hall; `FrameArt` drop shadow, picture light; `Gallery` uses `roomStyle` + `RoomArchitecture` (frame logic unchanged); old `Sculpture` removed |
| `src/Exhibits.tsx` | door code (≈20 lines) replaced by a re-export: `doorX` from Portal, `Doorways` → `PortalThresholds`. `DoorJourney` and `MemorySurface` untouched |
| `src/MuseumScene.tsx` | lights/fog block replaced by `<LightRig/>`; hall camera height 3.05→3.4 and aim 3.2→4.25 (frames the friezes below the UI header); `?stats` exposes the renderer as `window.__museumGl` for tests |
| `tests/portal-hall.cjs` | **new** — desktop hover/click on all portals, phone swipe+tap at 360/390/430 widths, render stats |
| `docs/AI_HANDOFF.md`, `docs/ART_DIRECTION.md`, `docs/art-direction/*.jpg` | **new** — this handoff, hackathon art notes, screenshots |

Not modified: `App.tsx`, `MemoryUI.tsx`, `MemoryTheatre.tsx`, `memories.ts`, `cloud.ts`, `data.ts`,
styles, Supabase, tests by Codex. `public/models/threshold-surround.glb` is no longer referenced
(the old door surround); it was left in place — delete it in a cleanup commit if desired.

## 8. Components and public interfaces

```ts
// Portal.tsx
export const doorX: Record<RoomId, number>;            // unchanged values, re-exported by Exhibits.tsx
export const PORTAL: { halfWidth: 1.5; spring: 4.2; wallZ: -12; depth: 1.5; wallTop: 11.2; hallHalf: 11 };
export const PortalWall: React.FC;                     // static, rendered by Hall
export function PortalThresholds(p: { target: RoomId|null; onDoor(id: RoomId): void; reduced: boolean });
// Exhibits.tsx (unchanged signature)
export function Doorways(p: { target: RoomId|null; onDoor(id: RoomId): void; reduced: boolean });
// Lighting.tsx
export function LightRig(p: { place: Place; quality: 'high'|'low' });
export const rigs: Record<'hall'|RoomId, Rig>;        // tune fog/exposure/key per space here
// GalleryRooms.tsx
export const roomStyle: Record<RoomId, RoomStyle>;    // wall/floor/partition/frame palette per gallery
export const RoomArchitecture: React.FC<{ room: RoomId; length: number }>;
// materials.ts
stone(kind, color, {rough?, normal?, env?}); finishMaterial(color, rough, metal, emissive?, intensity?);
brass(color?); meterBox(w,h,d); meterUV(geo, su, sv); cachedGeometry(key, make);
softSpot(); softStrip(); softRect(); engravedTexture(text, size?, color?, spacing?);
// Architecture.tsx — Box gains optional `kind?: StoneKind`; all previous props behave as before.
```

## 9. Known integration risks

- **`MuseumScene.tsx` / `Exhibits.tsx` overlap**: if Codex edits the lights block, the hall camera
  numbers or the door code in `develop`, expect textual conflicts. Resolve by keeping Codex's logic
  and re-applying: `<LightRig place={place} quality={quality}/>` in place of the old lights; the
  hall `pos` y 3.4 / target y 4.25; and the two-line `Doorways` re-export.
- **Shared materials**: `Box` now returns cached materials. Code that grabs a Box's material and
  mutates it (none today) would affect every box of that colour — clone first.
- **Camera aim** for the hall changed slightly; any screenshot/pixel test hard-coded to the old
  framing will need new coordinates. The portal centres still project to x ≈ 190/540/900/1260 px
  at 1440×900, so the existing `door-finishes` hover/click coordinates still land on the arches.
- **Bundle**: MuseumScene chunk +~33 kB (gzip +~10 kB). Texture generation adds ~0.3 s of main-thread
  work on first hall render (cached afterwards).
- **WebKit**: tested in Chromium (desktop + mobile emulation) only; iOS Safari not available here.

## 10. Test results (design branch, Chromium/SwiftShader in a headless container)

- `npm run build` — passes (tsc + vite).
- `tests/portal-hall.cjs` — PASS: hover + click for GLOW/HUSH/ECHO/PULSE at 1440×900; swipe + tap
  into all four galleries at 360×800, 390×844, 430×932; no page errors.
- `tests/touch-hall.cjs` (Codex) — PASS for all four rooms (touch door, picture, return).
- `tests/memory-theatre.cjs` (Codex, under xvfb) — PASS desktop and mobile (one earlier failure
  was a timing flake while two browser suites ran in parallel; passes when run alone).
- Same result as untouched `develop` (pre-existing/environmental, not caused by this branch):
  `door-finishes`, `mobile-frame`, `frame-photo`, `gallery-profiles` wait for a hall/gallery that is
  behind the first-visit "Explore Demo" admission screen; `admission-playback` waits for a Google
  button that needs Supabase env; `memories`/`gallery-scale`/`browser-check` need MS Edge;
  `art-direction`/`music-search` need the Vite dev server; cloud tests need private credentials.
- Draw calls per frame, max over a settled view (includes the shadow pass), 1440×900:
  hall 723 → 573, GLOW 586 → 196, HUSH 348 → 122, ECHO 402 → 177, PULSE 193 → 124.
  390×844 (quality "low", shadows off): hall 173 → 101, GLOW 180 → 109, HUSH 146 → 58,
  ECHO 158 → 75, PULSE 102 → 65.
- No FPS figures are claimed: the container renders with SwiftShader (CPU), which says nothing
  about phone GPUs. Measure on real devices before quoting frame rates.

## 11. Pending work

- Real-device check on iPhone Safari and an Android phone (frame rate, texture generation time).
- Optional: bake the procedural textures to compressed KTX2 at build time to remove start-up work.
- Optional: per-portal hover sound and a subtle "breathing" of portal light when idle.
- Possible follow-ups for Codex: update `door-finishes`/`mobile-frame`/`gallery-profiles` to pass
  the "Explore Demo" admission screen as `touch-hall` does.

## 12. Integration instructions

1. `git fetch https://github.com/amangereevdaukesh-afk/genesis-akniet design/claude-art-direction`
   (or the PR) into the canonical repo, then on a fresh branch from the latest `develop`:
   `git checkout -b integrate/art-direction origin/develop && git merge --no-ff FETCH_HEAD`.
2. Resolve conflicts by meaning (see §9). Never take a whole file from either side.
3. `npm ci && npm run build`, then `BASE_URL=… node tests/portal-hall.cjs` and Codex's suite.
4. Open/merge the PR into `develop` only after review; release to `main` remains the owner's call.

## 13. Last synchronization with develop

- Branch created from `develop` @ `1ac9930` on 2026-11-21.
- Last checked against canonical `develop`: see the PR description / final report (re-checked
  before publishing; merge with `--no-ff` if develop has moved).
