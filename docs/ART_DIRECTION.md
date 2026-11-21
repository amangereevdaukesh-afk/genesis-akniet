# Museum of Days — Four Ways to Remember

Art-direction notes for GENESIS Hackathon 2026 ArtTech (visual part of the submission).

Museum of Days is a museum of personal memory. It does not hang famous paintings; instead each
gallery borrows the *principles* of an art movement and turns them into architecture and light,
so that a visitor's own diary, photographs and song are exhibited inside a coherent artistic world.
No artwork is copied — the references below informed light, palette and composition only.

## The central hall

A single monumental arcade replaces the former room doors: four 3 m wide arches rising to 5.7 m,
cut through a 1.5 m deep coursed-limestone wall. Each arch has a stepped archivolt, keystone,
imposts and plinths; pilasters with alabaster sconces separate them; a dentilled entablature carries
the gallery names in incised gilded capitals — GLOW · Impressionism, HUSH · Tonalism,
ECHO · Romanticism, PULSE · Abstraction. Behind every arch the visitor sees an actual lit room in
that gallery's light and colour, with light spilling over the threshold onto the hall floor.
A coffered, skylit ceiling, a brass floor compass and travertine benches complete the hall.

Screenshots: `art-direction/hall.jpg`, `art-direction/mobile-hall.jpg`, `art-direction/entrance.jpg`.

## GLOW — Impressionism (joy, warmth)

Reference: Claude Monet; the Impressionist study of sunlight and reflections.
Warm cream limestone, a loggia of arches, tall clerestory windows on the left wall throwing long
shafts and pools of afternoon light across the floor, and a round lily basin whose dark water
reflects the room. Light is warm but varied — amber key, pale gold fills, cool sky in the
reflections — never a single flat yellow. Screenshot: `art-direction/glow.jpg`.

## HUSH — Tonalism (stillness, solitude)

Reference: James McNeill Whistler's nocturnes and harmonies; Tonalist restraint.
A muted grey-green palette, matte lime plaster, low contrast and overcast light from one long
diffuse skylight. Arches are replaced by flat lintels on square piers — architectural pauses. A low
bench and a balanced cairn of smooth stones are the only sculpture. Screenshot: `art-direction/hush.jpg`.

## ECHO — Romanticism (memory, nostalgia)

Reference: Caspar David Friedrich; the Romantic sense of depth, distance and contemplation.
A tall blue-grey ashlar arcade every 6 m recedes into cool haze; a moonlit key light falls from
deep within the room, with a warm lamp near the entrance so photographs stay legible. An archival
stele stands on the axis like a figure facing distance. Screenshot: `art-direction/echo.jpg`.

## PULSE — Abstraction & Expressionism (energy, courage)

Reference: Wassily Kandinsky's principles of composition — circle, diagonal, arc, tension.
Dark burgundy plaster and dark honed floor; copper hoops replace classical arches so the room is
read as circles in sequence; diagonal blades set a tempo on the walls; the central composition
balances a red disc, a copper ring, a black sphere, a brass diagonal, an ochre arc and a blue
triangle around one centre of gravity, under two contrasting spotlights. Screenshot: `art-direction/pulse.jpg`.

## Visual technology

- React Three Fiber 9 + Three.js 0.180, demand rendering (frames only when something changes).
- Procedural physically based materials generated in code at start-up: tileable value-noise
  limestone, ashlar with staggered 0.6 m courses and recessed joints, lime plaster, travertine and a
  honed floor with veining and diamond inlays — each with colour, normal and roughness maps.
  Every surface uses UVs in metres so stone grain stays at architectural scale.
- Image-based lighting from a PMREM-filtered `RoomEnvironment`; per-gallery key, fill and accent
  lights, fog and exposure; ACES filmic tone mapping.
- Real-time PCF shadows on desktop; baked contact-shadow masks (wall bases, frames, benches,
  partitions) that also work on phones with shadows off.
- Geometry built for few draw calls: the whole portal wall is one extruded mesh; fluted columns are
  one mesh each; floor inlays are texture, not meshes. Draw calls per frame fell by 20–65% per space.
- GSAP camera journeys (unchanged) through the arches into each gallery.
- Visitor photographs are rendered unlit, so lighting never alters a memory's colours.

## Sources, models, textures and licences

- All architecture, sculpture and surface textures in this art direction are original procedural
  code written for this project — no third-party textures or 3D models were added.
- Existing project assets (unchanged): GLB architectural details in `public/models/` (frame rebates,
  lanterns, cornice, entrance portal, loggia) made for the project; demo photographs in
  `public/lucerne/` with credits in `public/lucerne/CREDITS.md`.
- Fonts: Cormorant Garamond and DM Sans via Fontsource (SIL Open Font License).
- Libraries: three, @react-three/fiber, gsap, @gsap/react, react, react-dom, lucide-react, Vite, TypeScript.
- AI tools: Claude (art direction and 3D implementation on the design branch), Codex (application,
  backend and functionality on develop).
