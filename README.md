# Portfolio Car 3D

A driveable 3D portfolio (vanilla HTML/CSS/JS + Three.js 0.160.0). The car is a **procedural Three.js vehicle**; no GLB or image assets are used, so there is no `assets/` folder.

## Run
Needs internet (Three.js loads from jsDelivr; not offline-capable).
```
python -m http.server 5500
```
Open http://localhost:5500 (do not use file://, ES modules need a server).

## Configure
Edit the `CONFIG` object at the top of the `<script type="module">` in `index.html`: profile, skills, projects, experience, contact. Empty links display as "not configured". To add a project, append an object to `CONFIG.projects`.

## Quality
The Quality button cycles AUTO, LOW, HIGH. AUTO adjusts between LOW/MID/HIGH from measured FPS with hysteresis. Profiles are in the `Q` table in the script.

## Replace the car
Not wired for GLB. To use one, add GLTFLoader (`three@0.160.0/examples/jsm/loaders/GLTFLoader.js`) and swap the `body` group contents, keeping the `wheels` array.

## SpriteSheetGenerator
Not performed: no sprite images were created and nothing was exported. Optional workflow: render consistent transparent PNG frames (about 1024px), pack them at https://spritesheetgenerator.online/, export PNG + JSON into `assets/car/`, and use them only for thumbnails/menus.

## Known limitations
Not tested in a real browser or on devices; collisions are simple circles; sound is a basic honk via WebAudio; no contact form backend; minimal car detail compared with a modeled GLB.

## Update: residential world, drone camera, pedestrians
Changes were patched into the existing `index.html` (car, controls, modals, CONFIG, quality profiles kept).
- **Camera:** DRONE VIEW (default, about 54° down, FOV 62) and CHASE VIEW, switched with the `C` key or the Camera button, with smooth transitions. Mouse wheel/pinch zoom and limited drag-orbit still work. The camera is clamped inside the neighbourhood radius so it does not enter houses.
- **World:** ring road with centre dashes, inner/outer sidewalks with kerbs, 4 zebra crossings, radial roads to the five portfolio zones (zones moved closer to the centre), about 9-10 procedural houses (varied colours, hip roofs, doors, windows, porch, carport, driveway, lawn, fence, bushes), street trees, lamp posts, benches and bins. Posts, trees, rocks and lamps are instanced. Houses use simple circle colliders.
- **Pedestrians:** 12 procedural 3D humans (head, torso, swinging arms and legs, varied clothes, hair and skin) built from shared geometry and materials. They patrol sidewalk waypoints (8 arc patrols, 4 crossing the ring road at zebra crossings), pause at times, and stand idle while the car is close. No external GLB models are used.
- **Not done / untested:** not run in a browser and no FPS measured; NPCs have no physical collision with the car; no parked cars or traffic signs.

## Update: refinement
- **Hamburger menu:** all navigation and settings (Camera, Quality, Sound, Respawn, Controls) now live in a slide-in menu (top-left). Closing: close button, burger, backdrop or Esc. Driving input is paused while it is open.
- **3D headline removed:** the ground text "BUILDING DIGITAL EXPERIENCES" is gone from the scene (the headline remains only on the start screen). Sign text is now fitted to its canvas so it cannot be cut off.
- **Road markings:** markings are flat decals with polygon offset (no z-fighting); radial roads are flat planes. Zebra crossings are 7 white bars parallel to the traffic flow, side by side across the full ring-road width. The black active-zone ring is now a flat yellow ring.
- **Collisions:** benches, bins and lamp posts have circle colliders (cars are pushed out, speed drops).
- **Pedestrian hit:** an oriented-box test against the car triggers a pause, slight push-away, and the floating text "hati-hati kalau menyetir" above that NPC (pool of 3 reusable elements, 4 s cooldown per NPC).
- Not browser-tested.

## Update: mobile joystick and HUD
- **Joystick:** on touch devices the left/right buttons are replaced by an analog joystick (Pointer Events + pointer capture). Horizontal travel gives a smoothed steering value from -1 to 1 (10% dead zone) that feeds the existing steering logic; it resets on release, cancel, blur, menu or modal open. Right side keeps boost, interact, brake and gas buttons in a 2x2 grid with safe-area padding.
- **Controls help:** a small `?` button next to the hamburger opens a compact tips panel (desktop or touch text); it opens by default on desktop. The tips are no longer inside the menu.
- **Hamburger:** one toggle button that switches between ☰ and ×; the extra Close button was removed. Esc and a tap on the backdrop also close it.
- Not browser- or device-tested.

## Update: mobile jump and camera buttons
- The square button is now **Jump** (tap-triggered, ground-only, one jump per tap; keyboard Space unchanged) and the triangle button is now **Camera** (toggles Drone/Chase smoothly and shows a short "DRONE VIEW"/"CHASE VIEW" tag; the `C` key still works).
- Because the triangle was the gas button, **gas and reverse moved to the joystick's vertical axis** (push up = gas, pull down = reverse/brake). Left/right still steers.
- Not browser- or device-tested.
