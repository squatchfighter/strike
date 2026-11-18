# Strike (working title) — HTML build, started 2026-11-16

Single-player open-world homage to Desert / Jungle / Urban Strike, built as one
self-contained web page (`strike.html`). Open it in any browser, desktop or phone.
This supersedes the Godot prototypes in `strike/` and `strike2/` (both kept, frozen).
The sprite sheets and their generators now live here, in `assets/` and `tools/art/`.

## Locked decisions
- **Platform:** plain HTML5 canvas + JavaScript, no engine, no dependencies, one file.
- **Look:** renders 540 px tall, scaled up by whole numbers with hard pixels. Isometric 2:1,
  64x32 tiles. All art is PNG sprite sheets in `assets/`, embedded into the page by `build.py`.
- **Art pipeline = baked 3D.** Buildings, trees, vehicles and the helicopter are small 3D models
  (`tools/art/gen_props3d.py`, `gen_heli.py`) ray-marched by `tools/art/render3d.py` in the game's
  fixed view with one low sun, sky ambient, ambient occlusion and self-shadowing; each also gets
  a true cast-shadow sprite. Ground tiles are layered noise through per-material colour ramps
  (`gen_tiles.py`). To add an object: write a model function, append it to SMALL or LARGE
  (never reorder; the index is the game's id), run `build_all.py`, then `build.py`.
- **Style: grungy.** Dusty, desaturated palette, no outlines, long low-sun shadows drawn in one
  layer, stained and cracked man-made ground, wrecks/rubble/craters, drifting cloud shadows,
  smoke from wrecks, warm haze + vignette. Mood reference: Ebbtide (Steam). Style only, no
  copied art.
- **World:** one fixed 256x256 island per seed (`src/world.js`): snow north, jungle west,
  desert east, grassland between; 3 cities, 1 home base, 5 enemy bases. Same seed = same world.
- **Controls:** touch-first. Floating stick (left half), A/B/C buttons (bottom right), ZOOM / MAP / MENU top right.
  Keyboard: WASD/arrows, J/K/L = A/B/C, E = land / get in or out, Tab = map, Z = zoom, Esc = menu, N = maps, M = control mode.
  DIRECT = stick points where you go; CLASSIC = rotate + thrust like the originals.
- **Flight** is simulated on the unsquashed ground plane, then squashed 2:1 to screen.
  Feel knobs are the `CONFIG` block at the top of `src/game.js`.
- Two-player co-op over a direct link (see below). Simple state-machine enemies.

## Files
```
strike.html       the game (built output; this is what you open or share)
src/world.js      world generation, incl. enemy garrisons, targets, supplies, traffic start points
src/combat.js     weapons, enemies, damage, pickups, respawn, particles, traffic, rotor wash, combat HUD
src/net.js        two-player link: WebRTC data channel, invite/reply codes, state sync, connect screen
src/game.js       input, flight, camera, rendering, HUD frame
src/template.html
assets/           sprite sheets (tiles, props, vehicles, units, ui)
tools/art/        3D sprite baker + models: python3 build_all.py
tools/test/       e2e_two_player.js: drives two Chrome instances through host/join and checks sync
build.py          python3 build.py  -> rebuilds strike.html from src/ + assets/
```

## Vehicles and on-foot play (Milestone 3)
One action key (E / Enter, or the on-screen prompt) does everything: in a helicopter it lands and
puts you on foot beside it; in a ground vehicle it gets you out; on foot next to an empty vehicle
it gets you in (helicopters take off straight away). Each vehicle keeps its own armor, fuel and
ammo while you are out of it. Table `VEH` in `src/combat.js`:

| | Speed | Armor | Fuel | A / B / C | Notes |
|---|---|---|---|---|---|
| Apache | 350 | 600 | 260 s | gun / Hydra / Hellfire | flies over everything; AA shoots it |
| Scout | 450 | 260 | 190 s | gun / rockets / - | fastest, fragile, no missiles |
| Tank | 95 | 900 | none | MG / cannon / - | AA cannot hit it; shrugs off rifle fire; crushes trees, fences, cars and flattens ruins into rubble; stopped by water, standing buildings, boulders |
| Jeep | 230 (faster on roads) | 220 | none | MG / - / - | quick ground transport; stopped by trees, rocks and cars; knocks over fences, flags, crates and tents |
| On foot | 72 | 60 | none | rifle / grenades / - | can board anything; AA ignores you; walks between trees |

Parked vehicles: a tank, jeep and scout at home; an enemy tank and a jeep in every enemy base,
a scout in some. Empty vehicles can be destroyed. Being destroyed in anything, or killed on foot,
respawns you at home in a fresh Apache. In two-player the host decides who boards what.

## Two players (co-op, two devices)
- **Where it runs:** from `strike.html` opened as a file on a computer, or from any web address
  you host it at (one static file). It cannot run from the Claude-hosted page, which blocks
  network connections.
- **Linking up:** 2 PLAYERS -> HOST A GAME -> **SHARE** sends the invite as a link (phone share sheet, or copied).
  Tapping the link opens the game straight on the join screen and makes the reply; the guest taps SHARE to send
  it back, and the host taps **PASTE**, which connects. A pasted whole message or link works too. Links only work
  from a web address (not from the file). No matchmaking or game server. Tested: `tools/test/link_join.js`.
- **Hosting:** GitHub Pages, repository `squatchfighter/strike` (public; holds only the built `index.html`),
  address https://squatchfighter.github.io/strike/. To update: copy `strike.html` to the repo as `index.html` and push.
- **SAME WI-FI** uses nothing outside the two devices. **OVER THE INTERNET** also asks a public
  STUN server (Google, Cloudflare; list in `src/net.js`) for each device's public address. No
  game data goes to it. Some networks (strict corporate, some mobile carriers) still block
  direct links; that would need a relay (TURN) server, which is not set up.
- **Model:** host-authoritative. The host runs enemies, damage, pickups and traffic. The guest
  flies its own helicopter locally (so controls feel instant) and sends position + triggers 20x/s;
  the host sends events (shots, explosions, destroyed things) and 12 snapshots/s. Both generate
  the island from the same seed. Each player has their own armor, fuel, ammo and score.
- **Rules:** enemies shoot whichever helicopter is closer; no friendly fire; each player respawns
  at home on their own; only the host can start a new world; a player can join mid-game and gets
  the current state. If the link drops, both carry on solo in the world as it stood.

## Finding things
- **Minimap** (HUD, top left) and **full map** (Tab, or the MAP button; pauses the game). Both
  start fogged and fill in within about 21 tiles of the helicopter. Home and the enemy bases are
  always marked; patrols and supplies appear once their area is explored.
- A red arrow at the screen edge points to the nearest enemy base still standing.
- **Where the enemy is:** AA at every enemy base; tanks and infantry patrol the cleared perimeter of
  bases that are not on the coast; 12 field patrols (a tank and four infantry) circle tracks in
  open country.

## Combat rules (Milestone 2)
- **Weapons:** A/J chain gun (1178 rounds), B/K Hydra rockets (38), C/L Hellfire (8, homing).
  Shots go to the locked target (red brackets: nearest target in a cone ahead), else straight ahead.
- **Enemies:** AA guns, patrolling tanks and infantry at each enemy base. They fire at where the
  helicopter is heading, so moving dodges. Tuning tables `WEAPONS` and `ENEMY` are at the top of
  `src/combat.js`.
- **Targets:** every structure in an enemy base can be destroyed; fuel depots and drums chain.
  Clearing all structures in a base scores a bonus.
- **Everything is destructible.** City buildings, houses, trees, rocks, fences, towers, parked and
  moving cars, and the home base all take damage (`SMALL_DEF`, `LARGE_HP` in `src/combat.js`)
  and leave something behind: ruins, rubble, charred trunks, wrecks, craters. With no military
  lock in range, shots go to the first thing in the line of fire (pale brackets).
- **Survival:** armor 600, fuel lasts 260 s. Fly over supplies to collect (fuel +50%, ammo full,
  armor +300). Hovering over the home helipad resupplies everything. Shot down or out of fuel =
  respawn at home; destroyed targets stay destroyed.

## Real places (built 2026-11-16)
REAL PLACE button -> type a place name or `lat, lon` -> pick a hit -> the world is rebuilt on that spot.
- **Data:** OpenStreetMap. Place lookup = Nominatim; features = Overpass API (`src/osm.js`). Needs internet, so it
  works from the file or a self-hosted copy, not from the Claude-hosted page. Attribution shown on the screen.
- **Scale:** the chosen area (2 / 3.5 / 5 / 8 km square) is squeezed onto the 256x256 grid (8-31 m per tile).
  Grid x = east, grid y = south, so north is the upper right of the screen.
- **What is real:** coastline and sea, lakes and rivers, street layout (service roads dropped above 2.5 km),
  building footprints (houses smaller than a tile still count; height from `building:levels` picks low/mid/tower),
  forests, parks, beaches, runways and aprons. **What is invented:** the home base, enemy bases (the first one
  goes on a real airfield or military area when there is one), patrols, pickups, vehicles, traffic, ground theme
  (auto by latitude, or chosen).
- **Two players:** the host picks the place; the guest downloads the same map and then syncs. Not yet tested.
- **Tested against:** a real Overpass reply for Key West, Florida at 5 km (17 MB, 31 s to download), replayed through
  `tools/test/real_place.js`, and a synthetic town (`tools/test/synthetic_place.js`). The saved reply was deleted in
  housekeeping; to rerun the test, save a fresh one (the query is `placeQuery()` in `src/osm.js`) and pass its path.
  The in-game download itself has not been run in a browser.

## Streets and zoom (graphics pass 3, 2026-11-16)
- Roads are autotiled from their neighbours (terrain rows 13-15): sidewalk and kerb on closed sides, dashed white
  centre line on streets, double yellow on main roads, zebra crossings next to junctions.
- **Z** or the ZOOM button switches between the far view (540 px tall) and a close view (360 px tall).

## Terrain height, houses, lighting (graphics pass 4, 2026-11-16)
- **Hills:** `world.height` (0-6 levels per cell) is averaged and smoothed into a height for every tile corner
  (`world.vh`, px). Tiles with raised corners are drawn as real slopes: `slopedTile()` in `src/game.js` builds each one
  once (pixel columns shifted and stretched, then shaded by how the slope faces the sun) and caches it. Hills are in
  open country only; water, beaches, roads, cities, bases and patrol tracks stay level. Tanks, jeeps and troops drive and
  walk over hills (slower uphill) and are stopped only by slopes steeper than `MAX_CLIMB` in `src/combat.js`
  (px of rise per tile: foot 34, tank 28, jeep 22). Everything on the ground is drawn lifted to the slope it stands on
  (`groundAt()`), and helicopters follow the terrain. Real-place maps are flat (no elevation data is downloaded).
- **Houses:** rebuilt models with clapboard walls, overhanging tile roofs, front porches, and garages or dormers
  on some. In real places houses sit on grass yards instead of pavement.
- **Lighting:** lower sun (shadows about 37% longer), darker shadow layer (0.52), warmer sunlight, and a less
  grey palette for grass, sand, desert and foliage. All sprites were re-baked.

## Smoother ground and more buildings (graphics pass 5, 2026-11-16)
- **Ground tiles:** speckle softened; every natural tile fades to its material's average colour at the edges, so the
  diamond grid no longer shows (`smooth()` in `gen_tiles.py`).
- **Edges:** biome and coast fringes are wider, fill the inside corners of staircases, and get rounded tips where only
  a diagonal neighbour is higher ground (`fringe_corner.png`, `world.fringeD`). Street bends are drawn as curves.
- **Buildings:** 10 new city buildings (props_large 19-28: stepped tower, L-shaped apartments, warehouse, church, gas
  station, shop row, twin towers, parking garage, civic hall, penthouse mid-rise) and 6 more houses (props_small 85-90,
  mirrored, new colours).

## Ground movement fix (2026-11-16, after Michael's first playtest)
- Problem: ground vehicles got caught. Root causes: every hill blocked them; sliding only tried the screen axes, so
  diagonal walls (which run along the grid) stopped them dead; and a vehicle that ended up inside a blocked cell
  could never move again.
- Fix: hills are drivable up to a steepness limit; collisions slide along the grid directions first; anything already
  inside a blocked cell can always move out; jeeps knock over light props. `tools/test/drive.js` drives each ground
  vehicle for 40 s over hills, city and open country and reports how often and why it stopped.

## Campaign (built 2026-11-16)
- **30 designed maps** in `src/maps.js`, easiest first; each is a spec (shape, size, biomes, hills, ridges, rivers,
  lakes, forest, cities, zones, garrison 1-5, patrols, counter-attack waves) turned into a world by `generateWorld()`.
  Map 1 is a small island with 3 light bases and no counter-attacks; map 30 is a continent of every terrain with
  10 heavy bases and waves every 100 s. Maps unlock in order: win one to open the next. FREE PLAY (the old random
  island) and REAL PLACE are on the MAPS screen.
- **Bases:** an enemy base is gone as soon as all of its buildings are destroyed (its guards and patrols do not
  count). **Win** = every enemy base gone; any enemy units left then surrender and leave the map. HUD: ENEMY BASES n.
- **Forward bases:** fly or walk to the middle of a destroyed enemy base and the action button offers BUILD BASE HERE
  (not while enemy units are still on the site). Building clears the site (rubble, wrecks, craters, bodies, fires),
  lays fresh concrete, and puts up a base like home: helipad, hangars, barracks, fuel depot, towers and a complete
  fence line with gates, plus a tank and a jeep; enemy vehicles parked there become yours. You resupply on its pad,
  and respawn at whichever of your pads is nearest to where you went down.
- **Counter-attacks** (`src/campaign.js`): from the enemy bases still standing, waves of tanks and infantry march on
  your nearest forward base or your home base, finding their way with a flow field (they use bridges, go round lakes
  and steep hills). From map 10, some gunships come too; with no way by land the wave is all gunships. Arriving units
  shell the base, and its helipad stops resupplying while they are there.
- Parked enemy vehicles have half armour and can be locked onto, so they can be knocked out.
- **Saving:** automatic every 10 s, on every zone change and when the page closes, one save per map, in this
  browser (`localStorage`). **Cloud save:** MAPS -> CLOUD SAVE, a private GitHub repository (`squatchfighter/strike-saves`)
  and a fine-grained key with Contents read/write on that repository only, entered once per device. Saves merge:
  whatever either player destroyed stays destroyed. When the host has cloud save and the guest does not, linking up hands the host's
  settings to the guest over the direct link (`tools/test/cloud_handover.js`), so the key only has to be typed once. In two-player only the host writes the cloud save; on linking,
  the guest's own save of that map and its progress are merged into the host's game.
- Tests: `tools/test/campaign_maps.js` (all 30 maps + overview shots), `campaign_camp.js` (waves, zones, win,
  save/load, merge), `campaign_cloud.js` (two browsers sharing a save through a fake GitHub API),
  `campaign_ship.js` (gunships), `campaign_fob.js` (destroy a base, build on it, resupply, respawn, reload, win), `e2e_two_player.js` (now also map switching, merge on link, waves on the guest).

## Title screen, HUD and phones (2026-11-17)
- **Title screen** on every plain visit (not when opened from an invite link, or with `?map=` / `?spot=` / `?free`):
  logo (`assets/ui/logo.png`, from `gen_ui.py`), CONTINUE (last map), CAMPAIGN MAPS, PLAY TOGETHER, FREE PLAY,
  REAL PLACE, CLOUD SAVE. Behind it, the map you would continue drifts by with the game frozen.
- **In-game HUD** is only: armor/fuel, minimap (tap = map), enemy count and score, three icon buttons top right
  (ZOOM, MAP, MENU), the stick, A/B/C, and the context action button (LAND / GET OUT / BOARD ...) bottom centre.
  Everything else moved to the **MENU** (Esc): resume, campaign maps, play together, controls DIRECT/CLASSIC, free play,
  real place, cloud save, title screen. Single player pauses behind any menu.
- The HUD has its own canvas (`#hud`) with its own whole-number scale, so it is the same size at either zoom;
  it is sized for about 230 HUD px of screen height on phones (bigger buttons) and 280 on desktop.
- **Phones and tablets** (coarse pointer) start in the close zoom and show touch hints. Tests: `tools/test/ui_ui.js`
  (screenshots, desktop and emulated phone), `tools/test/ui_touch.js` (real taps on every control).

## Tank fights (2026-11-17, after playtest)
- Problem: enemy tanks barely hurt ground vehicles (26 damage every 3 s, 30% off for your tank's armour) and never moved
  toward you, so tank-on-tank fights did not happen. Fix: enemy tank shells do 2.6x damage to ground targets
  (`vsGround`), tanks drive in on anything on the ground within range (`hunts`), fire every 2.6 s, and have 220 hp
  (two cannon hits). One enemy tank loses to yours; three kill your tank in about 25 s (`tools/test/tank_duel.js`).
- Problem: ruins of destroyed buildings were passable but still drawn standing, so a tank vanished behind them and
  reappeared. Fix: a tank driving into a ruin flattens it into rubble; jeeps are now stopped by ruins
  (`tools/test/tank_ruin.js`).

## Fallen soldiers (2026-11-17)
- Infantry (enemy, and you on foot) no longer explode when killed: they drop where they stand (row 4 of
  `soldier.png` / `soldier_f.png`, baked by `gen_units.build_fallen()`) and a small dark-red pool spreads under them
  over about two seconds (`fallen()` in `src/combat.js`). They stay for the rest of the battle; your own side's are
  capped at 40 and passed to the other player with a `corpse` message.

## Zombie mode (2026-11-17)
Zombies are a third side that fights everyone: you, the enemy army, and each other's bases. Code: `src/zombies.js`
(loaded after `campaign.js`); art: `gen_units.build_zombies()` bakes `units/zombie.png` (same 8-heading, 5-row layout
as the soldier: 3 walk rows, a lunge, fallen) and `units/nest.png` / `nest_shadow.png`.
- **Modes, per battle:** ARMY (no zombies), ARMY + ZOMBIES, ZOMBIES. Picked on the title screen (ENEMY button) or the
  MAPS screen; the pick is stored in `strike.v1.mode`. Each map's save carries its own `mode` and a `run` id. A map
  under way in another mode asks: carry on as it is, or restart it in the new mode. Free play and real places stay
  army-only for now.
- **Nests** (900 HP, lockable, any weapon) breed zombies: every 16 s at first, down to every 3.5 s as the nest ages,
  2 to 6 at a time. Live zombies are capped at 150 (110 on phones); fallen zombies' slots are reused after 45 s.
  ARMY + ZOMBIES starts with 2 + bases/3 nests in towns and open country away from home; ZOMBIES starts with every
  enemy base already overrun (a nest on each) plus 2 more, and no army waves.
- **Behaviour:** zombies grab the nearest person or army ground unit within about 400 px (helicopters in the air are
  safe), otherwise shamble along the flow field to one of the three nearest standing bases (enemy, your forward bases,
  or home) and claw at the buildings. Tanks crush zombies they drive over; jeeps do at speed. Army units with nothing
  of yours in range shoot zombies (AA guns don't).
- **Infection:** an enemy base whose last building falls with 3 or more zombies on site becomes a nest (no score for
  you). A forward base whose four big buildings are all wrecked is lost; with zombies there it becomes a nest. Home
  can be wrecked but never infected. You can't build on a site while its nest stands ("CANNOT BUILD: INFESTED").
- **Winning:** every enemy base down (if the army is on) and every nest destroyed (if zombies are on).
- **Saving and two players:** saves hold `mode`, `run`, `nests`. Saves of different runs don't merge: the newer run
  wins, so a restart isn't undone by an older cloud copy, and the other player's device switches to the restart.
  Net messages: `nest`, `nestx`, `lost`, and `enew` with a slot index.
- **Tests:** `tools/test/zombies.js` (modes, breeding, horde of 230 at ~0.2 ms a step, infection, nests, restart, win)
  and `tools/test/zombies_two_player.js` (mode, nests and zombies match on both devices).

## Infantry kits (2026-11-17)
Five kinds of soldier, for you and the enemy: RIFLEMAN (rifle, hand grenades), GRENADIER (rifle, grenade launcher),
ROCKETS (rifle, rocket launcher: 150 damage, hits tanks and helicopters), FLAMER (flamethrower, 150 px, plus grenades),
SNIPER (sniper rifle, 720 px, no spread, plus grenades). Table `INF` and weapons 8-11 in `src/combat.js`; enemy types
`gren`, `rocket`, `flame`, `sniper` in `ENEMY` (all `foot: true`). You pick your kit on the BASE screen, only on one of
your pads; it takes effect at once on foot (full load) or next time you get out. Enemy squads mix the types by garrison
level (`SQUAD` / `infType()` in `src/world.js`): grenadiers from the start, rockets from garrison 2, snipers and
flamethrowers from 3; counter-attack waves too. Art: `gen_units.build_infantry()` bakes `units/soldier_<type>.png` and
`_f.png` (same layout as the rifleman). Test: `tools/test/infantry_kits.js`.

## Garrisons (2026-11-17)
Any building (city buildings, houses, base buildings) can be held: 4 soldiers in a big one, 2 in a house (`src/garrison.js`).
- Enemy soldiers (and your bought soldiers, except on FOLLOW) run for a building with room within 170 px when there is
  shooting, shoot from the windows (+20% range), and come out after 20 s with nothing to shoot.
- You go in on foot with the action button (ENTER BUILDING / LEAVE BUILDING). Inside you stay put, turn to aim and fire.
- Inside, a third of the damage gets through (40% for you). Knocking the building down throws everyone out, hurt.
- Sandbags go up around a held building over 6 s, then a coil of barbed wire outside them, with a gap for the door. They
  are drawn as continuous walls: short segments laid round a square ring (a diamond on screen) that meet end to end, two staggered courses of bags, and a continuous coil of wire with a post now and then; they stay until the building falls.
- Two players: the snapshot carries who is inside where. Tests: `tools/test/garrison.js`, `units_two_player.js`.

## Your own bases and units (2026-11-17)
`src/base.js`.
- **Bases:** player 2 has a home base beside player 1's (`world.homeBase2` / `world.home2`, built last in
  `generateWorld()` with its own random numbers so older saves still line up; on map 20 there is no room and you
  share). A forward base belongs to whoever built it (`campaign.owners`). You respawn at your nearest own pad and get the
  BASE button only on your own pads; you can resupply on any of your side's pads. Playing solo, every pad is yours.
  Counter-attacks and zombies also go for player 2's home while player 2 is linked.
- **Credits:** a fifth of all score you earn; each battle starts at 300 each. Saved with the battle (`cr`).
- **BASE screen** (BASE button or Q, on one of your pads): soldier kit, and the shop: rifle squad 120, grenadiers 150,
  rocket team 160, flamers 140, sniper 90, tank 400 (units); jeep 120, scout 350, Apache 600 (parked on the pad for
  you to drive). Up to 24 units each. With two players linked: give one unit of a kind, or all, to the other player.
- **Orders** for all your units at once, from the ORDERS button under the minimap (or R): FOLLOW (they keep up with
  you, running when far behind), HOLD (stay where they are), ATTACK (march on the nearest enemy base or nest along the
  flow field). They shoot anything hostile in range, buildings too when attacking, and the enemy and zombies shoot
  back at them. Your weapons never hurt your own units.
- Units are entries in `enemies` with `side` = owner (0 or 1) and `order`; saved with the battle and passed over the
  link like everything else (`packExtra` carries side and order). Ownership is by player slot: whoever hosts is player 1.
- Tests: `tools/test/units.js` (P2 homes on all 30 maps, buying, follow, attack, hold, give, save), `units_two_player.js`.

## Fixes after the units build (2026-11-17)
- **Seats** (`src/base.js`): ownership follows the person. Each device has a name (title screen: WHO'S PLAYING, stored as
  `strike.v1.who`); each battle stores which name sits in seat 0 (home base) and seat 1 (player 2's home), `seats` in the
  save. Credits, units (`side`) and forward bases (`campaign.owners`) belong to seats. Whoever hosts, each player gets
  their own seat back and starts at their own home. Unnamed devices fall back to host = seat 0. Test: `tools/test/seats.js`.
- **Following** (FOLLOW order): more than 140 px behind, units walk the flow field to your cell (round buildings, water,
  cliffs); close in, they keep formation. The passability grid behind every flow field is now rebuilt at most every 8 s.
- **Balance** (`tools/test/balance.js`, numbers are with you standing still): grenadiers no longer hit helicopters;
  rocket soldiers 26 damage every 4.6 s (4 of them take an Apache in ~30 s); snipers 9 damage every 4.2 s; your tanks
  have 450 hp; rifle squad costs 100. Zombies: nests breed every 24 s at first (down to 6 s), 1 to 4 at a time, at most
  100 zombies (70 on phones), and claw home buildings for 6 per hit. Left alone, they wreck your home's buildings in
  about 8 minutes on early maps.
- **Phones**: title buttons in pairs so everything fits a landscape phone; BASE / ORDERS checked at 667x375 and 844x390;
  about 190 units on screen runs at roughly 60 fps in a desktop browser (not measured on a real phone).
- **Sandbags count**: anyone standing inside a ring (sandbags at least half built) takes half damage; inside a held
  building the damage let through drops from 35% to 20% (you: 40% to 25%) as the sandbags go up. Saved with the battle
  (`fo`) and sent to the other player.
- **Zombies in free play and real places**: the ENEMY setting applies there too (`freeZ` in `src/zombies.js` stands in
  for the campaign). Test: `tools/test/fixes.js`.

## Campaigns by name (2026-11-17)
- Every group of names has its own campaign (`crew`, e.g. `MIKE`, `JAKE+MIKE`, `JAKE+SAM`; names sorted, upper case):
  its own unlocked maps, battles and progress, saved as `strike.v2.<crew>.progress` / `.map.<id>` and in the cloud as
  `<crew>/progress.json`, `<crew>/map-<id>.json`. The v1 saves from before are left aside (Michael chose a fresh start).
- Linking up: the host's hello carries its name and campaign; the guest answers with its name (`who`) and its copy of the
  pair's progress; the host switches both into the pair's campaign (at its last map) and the guest's saves only merge
  once both are in it (`NET.synced`, `merge` carries the crew).
- Playing alone: WHO'S PLAYING (title screen) sets the name and lists your campaigns (solo and every team you've played
  in on this device); pick one to carry on. The last one played is the default.
- Seats (whose base, units and credits) still work by name inside each campaign.
- Cloud key: handed to whoever links up without one (Michael chose to allow friends).
- Fix: a device opening a map it has never saved now takes the cloud's (or the other player's) battle instead of
  starting a new one that then ignored it (`campaign.fresh`). This had broken picking up a cloud battle on a new device
  since zombie mode. Tests: `tools/test/crews.js`, `campaign_cloud.js`.

## Base screen anytime, unstuck units, tower guards (2026-11-17)
- **BASE** is an icon button at the top right (and Q), always available. Buying works anywhere: units appear at your
  nearest own pad (on FOLLOW they then come to you), vehicles park there. The soldier kit can still only be changed
  on one of your pads (the kit buttons are greyed out elsewhere).
- **Unit movement** (`unitMove` in `src/base.js`): each step picks the best clear direction among straight-at-the-target,
  the four grid directions (building sides) and the four screen directions; a unit that ended up inside something walks
  straight out; one that hasn't got closer for 1.5 s follows the flow field round the obstacle for 5 s. Soldiers leaving
  a building pick the first clear spot on rings around it. Test: `tools/test/stuck.js` (the only units left short of the
  target were ones sent to a spot inside a building).
- **Tower guards** (`src/posts.js`): every base's four corner watchtowers have a soldier on top (inside the cabin: clipped at the wall, with the tower's roof (its green pixels) drawn back over him, so only a glimpse shows in the open sides and his muzzle flashes give him away). He
  shoots from up there with 25% more range and takes half damage; he dies when the tower comes down. Yours start with
  riflemen; on the BASE screen, TOWERS: upgrade your nearest rifleman tower to SNIPER (80) or ROCKETS (120), or RE-MAN a
  tower whose guard was killed (40). Enemy towers: riflemen, plus a sniper corner from garrison 3 and a rocket corner from
  garrison 4. Posts live in `posts` (not `enemies`), are saved with the battle (`po`) and synced (`post`, `upost`).
  Test: `tools/test/towers.js`.

## Sound and music (2026-11-17)
`src/audio.js`. Everything is synthesised with the Web Audio API at run time (no sound files), punchy and gritty.
- **Effects**, placed in the world (quieter, duller and panned with distance from the camera): chain gun, machine gun,
  rifle, sniper crack, Hydra / rocket whoosh, Hellfire, tank cannon, grenade launcher, flamethrower, flak; explosions
  scaled by size; nest squelch; armour hits (metal clank; a thud on foot); pickup chime; ding for built / bought /
  upgraded; buzz for not allowed; alarm for counter-attacks and zombies at a base; a lock-on blip; a low fuel / armour
  beep; zombie groans when one is within about 500 px; a short fanfare when a map is cleared.
- **Loops**: helicopter rotor (thump rate and turbine pitch rise with speed), tank / jeep engine.
- **Music** (original, in the style of mid-90s industrial RTS soundtracks): E minor, 126 bpm, E5 - E5 - C5 - D5. Drum
  machine (distorted kick, gated snare, hats), growling square bass, palm-muted distorted power-chord guitar riff with
  open accents, metal clangs and synth stabs. Title: slow heavy intro with ringing power chords. Battle: builds with the
  fighting near you (more riff, double kicks, clangs, stabs). Waveshaper curves have odd length and the music bus has a
  28 Hz high-pass so nothing leaves a DC offset. `tools/test/music_demo.js` renders it to a WAV.
- Hooks: `addShot`, `explosion`, `sayLocal` (by message text), `destroyNest`, and `soundTick` every frame. Sound starts
  on the first tap or key (browsers require it). MENU > SOUND: effects and music each have an ON/OFF switch and a 0-100 volume slider (defaults 80 and 60), remembered per device (strike.v1.sound / music / fxvol / musvol).
- On iPhones, Web Audio follows the silent switch: no sound with the ringer off.
- `tools/test/sound_demo.js` renders a 26 s demo reel of every sound offline to a WAV.

## Landing (2026-11-17)
Getting out of a helicopter now sets it down first: LAND starts a 1.2 s descent with the controls locked (the action
button shows LANDING...), and you climb out once it touches down (`players[].landing`, synced). Test: `tools/test/landing.js`.

## Sound pass 2 and storage fallback (2026-11-17)
- Effects warmer and less clicky: lower filter centres, brown-noise bodies with low-pass instead of band-passed white
  noise, softer attacks (5-12 ms), UI tones moved down an octave or more (hit 420/637 Hz, lock 660/880, pickup G-C-E),
  a quieter, lower rotor whine, and a -9 dB high shelf at 3 kHz on the effects bus.
- Music less repetitive: a 12-section song (`SONG`) built from five 4-bar sections (A main riff E-E-C-D, B half-time
  breakdown E-G-A-C, C gallop C-D-E-E, D drum-and-bass build with a riser, E darker turn A-G-F-E), crashes at section
  starts, snare fills into the next section, and a fuzzy lead that improvises a new pentatonic phrase on some sections
  when the fight is on. The title wanders between four chord pairs with random bell notes.
- Storage fallback: if the browser will not keep anything (private browsing, blocked or full storage), values are held
  in memory for the session (`LS_MEM`), so cloud save still works (the menu says ON) and the cloud screen says the key
  will not last past closing the page. The test no longer says "Working" when the key was not kept. Test:
  `tools/test/cloud_private.js`.

## Zombie hordes (2026-11-17)
New zombies gather round their nest (milling slowly within 2-5 cells; a zombie waiting at nest k has `base = 100 + k`,
so it survives saving and the link). When a nest has 25 waiting, they all move out together ("A ZOMBIE HORDE OF n IS ON
THE MOVE", with the alarm). Waiting zombies still go for anyone who comes within reach. If the nest is destroyed, its
gathered zombies go at once. The zombie cap rises to 28 per living nest so every nest can reach 25. On map 6 with
nobody playing, the first horde moved out after about 5.5 minutes. Test: `tools/test/horde.js`.

## Zombie types (2026-11-17)
Four kinds, all from map 1 (`ENEMY.zombie / runner / brute / spitter`, all `zombie: true`, test with `isZed()`):
- **Zombie**: 34 hp, 27 speed, claws for 11.
- **Runner**: 17 hp, 68 speed (about 2.5x), quicker, weaker swipes. Lean, ragged sprite.
- **Brute**: 400 hp, 19 speed, 40 a hit, six times the damage to buildings; too big for a tank to crush. Own 48x60 sheet,
  about 1.5x a soldier.
- **Spitter**: 26 hp; stands off at 250 px and lobs acid (a green blob). Acid hits buildings and props for 3x and enemy
  base buildings for 2x its damage, melts sandbags (a quarter of a ring each), burns anyone on the ground within 34 px,
  and leaves a puddle that burns for 6 s (`acid`, synced with `acid`). At a base it spits at the buildings from range.
- Each nest breeds in a fixed 25-long order (`BROOD`): 18 zombies, 4 runners, 2 spitters, 1 brute per horde.
- Art: `gen_units.build_zombie_types()` (zombie_runner.png, zombie_spitter.png, zombie_brute.png). Sounds: spit, and
  groans pitched by kind (brutes low, runners short and high). Test: `tools/test/zombie_types.js`.

## Cloud follow and full screen (2026-11-17)
- Opening a campaign on another device: once the cloud's progress arrives, if this device has done nothing on its
  current map yet and the cloud says the campaign was last on another map, it switches there (and the title's CONTINUE
  line updates). Each device still needs cloud save switched on (the key is per device) and the same name.
  Test: `tools/test/cloud_follow.js`.
- FULL SCREEN (menu, or F): the browser's full screen on computers, Android and iPad. iPhones don't allow it for web
  pages, so the button explains Share > Add to Home Screen; the page has the home-screen web-app tags (standalone,
  black-translucent status bar, viewport-fit=cover) and a generated 180 px icon. A home-screen app on iPhone keeps its
  own storage, so cloud save has to be switched on in it too.

## Roadmap
1. ☑ **World + flyable helicopter** — done 2026-11-16 (WASD confirmed; graphics pass 2 same day:
   bigger camo helicopter, animated surf, paved city blocks, cars, highways, fenced bases, more flora;
   graphics pass 3: grunge restyle; pass 4: double resolution, everything re-baked from 3D models).
2. ☐ **Weapons + Strike loop** — built 2026-11-16, awaiting playtest sign-off. Also in this pass:
   city traffic, swaying trees and flags, rotor wash, soft edges on dirt patches.
2a. ☐ **Two-player co-op** — built 2026-11-16; verified between two Chrome instances on one
   machine; needs a real two-device test.
2b. ☐ **Terrain height** — built 2026-11-16 as smooth shaded slopes; awaiting playtest sign-off.
3. ☐ **Vehicles + on foot** — built 2026-11-16, awaiting playtest sign-off.
3a. ☐ **Real places** — built 2026-11-16, awaiting a first live download by Michael.
4. ☐ **Living world** — patrols per biome, bases that spawn defenders, roads between cities.
5. ☐ **Missions** — campaign of 30 conquest maps built 2026-11-16 (awaiting playtest); search & rescue still to do.
6. ☐ **Iterate** — more vehicles, minimap, sound, save/load, campaign chaining.
7. ☐ **Zombie mode** — built 2026-11-17 (ARMY / ARMY + ZOMBIES / ZOMBIES); awaiting playtest. Day/night on hold.
8. ☐ **Infantry kits, garrisons, separate bases, buying units** — built 2026-11-17; awaiting playtest.

## Working conventions
Complete files, never fragments. List every file touched. Root cause in one sentence
before a fix. Test steps with every milestone. Don't build past the current milestone.

## Living cities (traffic, joined-up streets, civilians)
- **Streets:** a generated city is a set of whole 6x6 blocks, each ringed by street, keeping only the biggest
  joined-up cluster. Every street connects; the outer ring road is where highways come in. Highways never cut through
  a city (parks included); they meet the grid at the street cell nearest the centre (`r.hub`).
- **Traffic** (`combat.js`): cars drive in the right-hand lane, follow the car ahead (one car per lane cell), take turns at
  junctions (one car in a junction at a time), turn at junctions, U-turn only at dead ends, stop for people crossing, and
  speed off from explosions and gunfire. Anything stuck more than 4 s pushes on so nothing gridlocks.
- **Civilians** (`src/civilians.js`, sheets `civ0..2`): up to 110 (70 on phones) per map, on pavements in generated cities
  and real places. They stroll, cross roads straight over, run from zombies and fire, and hide in nearby buildings
  (coming out when it is quiet, or when the building is destroyed).
  - Zombies (not spitters) go for them; one killed by a zombie gets up as a zombie 1.2–2 s later.
  - The army ignores them. If you or your units kill one, that player's side loses **25 credits**.
  - Host-authoritative; guests get positions and states in the snapshot (`cv`). People are made from the map seed on both
    sides, so ids match. Not saved: a loaded battle gets a fresh crowd.
- **Saves:** `SAVE_V` is 2. Map battles saved before the city rebuild restart; unlocked maps and progress stay.
- **Browser zoom blocked** (ctrl+wheel, Safari pinch) so the HUD can't be pushed off the sides; the canvas size now rounds
  down so it never overhangs the window.
- Tests: `tools/test/city.js <map>` (street connectivity, traffic, panic, infection, penalty) and `city_two_player.js`.

## Gated base walls (2026-11-17)
- Every base (home, player 2's home, every enemy base) gets a two-cell **gate** wherever a road comes up to it (a
  short drive is laid if the road stops a few cells short), with a **watchtower each side** (manned like the corner
  towers; posts.js `towerCells` lists corners first, then gate towers). Sides with no road are fenced shut. A base no road
  reaches gets one gate, on the side facing the middle of the map. `baseWalls(r, sides)` in world.js lays the ring;
  `world.walls` = [{ id, r, sides }], `world.wallOwner[cell]` = -1 home, -3 player 2's home, else the base index.
- **Who gets through:** gates open only for their own side (players and their units at home and forward bases; the
  army at its own bases) and swing open (drawn with the open sprite, props 93/94) while one of that side is within
  about 130 px. Zombies and civilians never get through. Fences stop anyone on foot, and stop their own side's vehicles
  (go round to the gate); an enemy tank crushes fences, an enemy jeep knocks them over. Your own watchtowers block your
  own tanks. Rules in `cellBlocks(kind, cx, cy, who)` with who = 'p' / 'a' / null.
- **Breaking in:** anyone held up at someone else's wall breaks it (`breachWall`): zombies claw (6 zombies were through a
  fence in about 9 s), soldiers 12/s, tanks 60/s. Fences 40 hp, gates 160 hp; a broken gate stays open for everyone.
  Flow fields are per side (`flowTo(gx, gy, who)`): your own fences count as walls (route to the gate), anyone else's
  as a way through.
- Props 91-94 (gate x / y, closed and open) baked by `gen_props3d.gate()`. `SAVE_V` 3: battles saved before this restart.
- Test: `tools/test/gates.js` (gate sides per base, blocking rules, your squad walking out through the gate, zombies
  breaking a fence).

## Menu hot keys (2026-11-17)
Every button on every screen (title, pause menu, BASE, maps, two players, real place, cloud save, sound) gets a key,
picked from its label (first letters of words first, then any letter, then digits) and shown in the button's bottom-right
gutter at the right edge of the button (its own padding, so it never covers the label) on computers. Esc goes back / closes (BACK and close buttons show ESC). Disabled buttons keep their key so keys
don't move about. While a menu is up, game keys underneath are ignored. Code: `assignHotkeys()` in game.js.
Test: `tools/test/hotkeys.js`.

## Zombies go for people first (2026-11-17)
`zombieTarget()`: the nearest person within about 420 px (soldiers of either side, you on foot, civilians) wins over
any vehicle, even a closer one (tanks, jeeps, you in a ground vehicle); vehicles only when no person is in reach;
bases and walls only when neither is. Spitters still don't go for civilians. Civilians now rise 1.2–2 s after a zombie
kills them. Test: `tools/test/zombie_priority.js`.

## Faster nests, bigger cap (2026-11-17)
Nests now breed every 10 s at first (down to every 5 s by 5 minutes), 2 at a time (3 from 2.5 min, 4 from 5 min).
The first horde of 25 leaves after about 2 minutes (was 5½). Cap: 500 live zombies (250 on phones), or 28 per nest
if that is higher. With 500 on screen a step takes ~2.8 ms; drawing adds ~11 ms to a 40 ms software-rendered
headless frame (much less with a real GPU). The guest is sent zombies within 1300 px only. Test: `tools/test/zombie_perf.js`.

## Pause (2026-11-17)
P (or the Pause key), or the new pause button left of BASE at the top right, stops everything. Any key or a tap/click
resumes (the button shows a play triangle while paused). Linked games pause for both players: either one can pause or
resume, and the screen says who paused (`hold` message both ways; `setHold()` in game.js). Sound goes quiet while paused.
The pause menu (Esc) still only stops the game when playing alone. Tests: `tools/test/pause.js`, `pause2.js`.

## More armour and raiders (2026-11-17)
Five new ground vehicles, for both sides. Classes in combat.js: `TRACKED` (tank, ftank, rtank, arty: crush things, turret
aims itself, `moveKind` 'tank') and `WHEELS` (jeep, bike, buggy: 'jeep' rules). AI stats in `ENEMY`, driving stats in `VEH`;
`look` says how a type's shots are drawn (`LOOK()`).

| | You drive (A / B) | Armor (driven) | AI unit | Notes |
|---|---|---|---|---|
| Flame tank | MG / flame (240 px) | 950 | 260 hp (yours 416), burns at 220 px | no air targets |
| Rocket tank | MG / salvo (24 rockets, 700 px) | 800 | 200 hp (320), rocket every 1.1 s | hits helicopters |
| Artillery | MG / howitzer (950 px, 84 px blast) | 600 | 150 hp (240), shell every 6 s | can't fire inside 200 px; a red ring marks where each shell will land |
| Motorcycle | twin guns / rockets | 130 | 40 hp (64), fires a rocket every ~5 s | fastest thing on the ground (310) |
| Dune buggy | MG | 190 | 70 hp (112) | fast (270) |

- **Getting them:** BASE shop: flame tank 450, rocket tank 500, artillery 550, motorcycles (2) 160, dune buggy 140, as
  units under your orders. Walk up to any of your own tanks, bikes or buggies and BOARD it to drive it yourself; when you
  get out it goes back to being a unit on your current orders (`rideNear`, `unitMaxHp`; net `egone` / `vgone`).
- **Enemy:** base garrisons mix tanks (`armorType`: plain and flame tanks from garrison 1, rocket tanks from 2,
  artillery from 3), each base has a bike or buggy on an outer ring, field patrols add a raider, and every counter-attack
  wave's infantry is led by a raider. Raiders hunt anything on the ground.
- Art: `gen_units.build_armour()` (new turrets on the shared tank hull, both colours) and `build_raiders()` (bike with
  rider / empty, buggy, both colours, shadows). `SAVE_V` 4: battles saved before this restart.
- Tests: `tools/test/armour.js` (drive and fire each, buy each, board a unit and get out), `armshot.js` (screenshot).

## Missions, upgrades, survival, growing hordes (2026-11-17)
Code: `src/missions.js` (after civilians.js).
- **Growing hordes, per nest:** each nest's hordes move out at 25, then 50, 100, 200, 500, and 500 after that (`HORDES`,
  `n.wave`, saved in the nest). Breeding speeds up with each wave. Live-zombie cap = the sum of what the nests are
  gathering, at least 500, at most **1000** (phones: half-size waves, cap 250-400). If the cap stops a horde reaching its
  size, it goes with what it has. "WAVE n: A ZOMBIE HORDE OF ..." announces each one.
- **Rescues (bonus objectives):** up to three a map, made from the map seed on both devices: civilians trapped beside a
  building in the biggest city (4-6, +100 each), a downed pilot with his crash still burning (+300), and from map 3,
  four prisoners outside an enemy base with two guards (+150 each). They wave (a yellow marker over them, flashing dots
  on the minimap, a RESCUE arrow at the screen edge) and stay put even with zombies coming. Hover under 70 px/s within
  ~150 px and a rope ladder drops; they run under the helicopter and climb it one at a time (~1.1 s each). Speed up or
  drift off and the ladder comes up (anyone on it drops off). A jeep or buggy: they just run to it and jump in: Apache holds 6, Scout 4, jeep 3, buggy 2. Fly to any of
  your pads (the arrow turns into PAD): credits, the same into your war chest, and 500 score each. Get out and they wait
  in the vehicle; lose the vehicle and they're lost. Rescued people are saved with the battle (`rs`).
- **Briefings:** shown when a battle starts (and from the pause menu, and when you carry on a map): the map's story,
  objectives (bases, nests, counter-attacks), the **priority target** (one enemy base, a yellow star on the minimap:
  take it out before any other base for +400 credits each), the rescues, and your war chest.
- **War chest and upgrades:** clearing a map puts each player's leftover credits into their war chest; rescues and the
  priority bonus pay in as they happen. UPGRADES (briefing, pause menu, maps screen): ARMOUR (-15% damage per level),
  FIREPOWER (+10%, you and your units), AMMO LOAD (+25%), FUEL (helicopters burn 20% less), TOUGH UNITS (+20% hp on units
  you buy), TOWER GUARDS (+30% hp), FUNDING (+150 credits at the start of every battle). Three levels each, 300 / 700 /
  1200. Kept per player name in the campaign's progress (cloud too); chests merge by keeping the larger earned and
  spent totals. A guest's purchases go through the host (`upg`, `prog`).
- **Zombie Survival:** SURVIVAL on the title screen or maps screen, any unlocked map. No army (every enemy base is a
  nest, plus two more), the nests can't be destroyed, the hordes grow as above. HUD: SURVIVAL · WAVE n. It ends when your
  home base's four big buildings are wrecked (and player 2's, if linked); the best wave per map is kept. Survival runs
  aren't saved and don't touch your campaign battle on that map.
- `tools/test/missions.js` covers briefing, a rescue and delivery, an upgrade, the priority bonus, horde growth, the war
  chest on a win, and a survival run to the end.

## Winch and ladder (2026-11-17)
Like the old Strike games. In a helicopter, supply crates are winched up: hover slow (under 80 px/s) within ~40 px and a
cable with a hook drops (0.6 s), hooks the crate, then reels it up under the airframe (0.8 s) before it counts. Move off
before it's hooked and the cable comes back empty; once hooked it's yours. On the ground (foot, jeep, tanks...) you
still just drive over crates. The rope ladder for rescues is above. Drawn by `drawWinch()` in game.js (cable from 34 px
above the ground point down to the ground); host state `players[].winch {k, t, got}` and `players[].ladder`, sent to the
guest in the snapshot (16-18) plus a `hook` message; a climbing person is state 7 in the civilian snapshot.
Test: `tools/test/winch.js`.

## BASE screen feedback (2026-11-17)
- Top of the BASE screen: the last thing that happened (bought, upgraded, or why not), then YOUR ARMY: how many of
  each kind you have (e.g. "4 RIFLEMEN · 1 FLAME TANK"), out of 24, and your current orders.
- Each shop item says exactly what you get ("4 RIFLEMEN", "PARKED ON YOUR PAD"), how many of that kind you already have,
  and when you can't buy it, why ("NEED 60 MORE", "UNIT LIMIT"). Buying says "BOUGHT 4 RIFLEMEN AT HOME (FOLLOW). n
  CREDITS LEFT".
- New units get a pulsing cyan ring and NEW over their heads for 8 s (`e.fresh`; the guest marks units it is sent).
- YOUR TOWERS is a map of the base (an iso diagram drawn in SVG: concrete, buildings, the pad, gates in red), with a
  round button on every tower: R rifleman (green), S sniper (blue), K rockets (orange), ! empty (red, dashed, blinking).
  Tap one: its name ("HOME LEFT CORNER", "HOME TOP-LEFT GATE, UPPER"), who's on guard, and its buttons: MAKE SNIPER 80 /
  MAKE ROCKETS 120, or RE-MAN 40. Tabs switch between your bases (it opens on the nearest). `upgradePost(pi, type, idx)`;
  `upost` carries the index. Phones get the map at 72%. Test: `tools/test/shopfb.js`.
- The shop and the soldier kits are picture tiles: each shows the unit's own sprite in your colours (cut from the sprite
  sheets once, `unitThumb()` in base.js), its name and cost, ×n for squads, HAVE n for what you already own, and NEED n
  / NO ROOM in place of the cost when you can't buy it. The full description is in the tile's tooltip.

## Menu look (2026-11-17)
One style for every overlay (title, pause, briefing, BASE, campaign, survival, upgrades, cloud, who's playing, sound,
two players, real place), all in the CSS variables at the top of the menu styles in `src/template.html`:
- a header bar on every box (title left in yellow, a ✕ close right) that stays put when the box scrolls; the campaign
  box retitles itself per screen (`campTitle()`: CAMPAIGN, WHO'S PLAYING, ZOMBIE SURVIVAL, UPGRADES · NAME, CLOUD SAVE);
- one button style (dark olive, lighter on hover, yellow focus ring), the main action in orange (RESUME, GO, the title's
  CONTINUE); small menus as a two-column grid; section labels in small cyan caps (`.sec`); quieter hot-key tags;
- three box widths (440 small menus, 560 forms, 680 campaign and BASE), tighter padding on phones.
The BASE screen's message line now only shows the answer to the button you just pressed (`shopAt`).
`tools/test/screens.js <tag>` screenshots every screen on a desktop and a landscape phone into /tmp/gui.

## Fewer words (2026-11-17)
The briefing is a checklist: the box is titled with the map ("MAP 1 · BEACHHEAD"), the mode under it, then one row per
objective with an icon, a few words and the count or reward on the right (enemy bases, nests, ★ priority base +400, each
rescue with its pay, counter-attacks), one short rescue tip, GO and UPGRADES (`objectiveRows()` in missions.js).
Survival's briefing shows the nests, growing hordes, keep home standing, and your best wave. The help text on the
survival, upgrades, who's playing, cloud save, two players, real place and sound screens was cut to one short line each.

## Red army, green tech; more special zombies (2026-11-17)
- After the old C&C sides: the enemy is **red and black** (`PAINT.enemy`: dark red, near-black, maroon fatigues, black
  helmets) and painted grimy (`camo()` grimy branch: heavy grain, rust and soot patches, run-down streaks, caked mud low
  down). Our side is **clean modern green** (digital two-tone pattern, no dirt) with tech fittings: a sensor sight with a
  glowing cyan lens and a sensor dome on every friendly turret (`tech_parts()`), and a cyan visor on our soldiers.
  Every unit sheet was re-baked (tanks and turrets, AA, infantry of all kits, fallen rows, bikes, buggies).
- Nests now breed 11 zombies, 7 runners, 4 spitters and 3 brutes in every 25 (was 18 / 4 / 2 / 1), and some turned
  civilians come back as runners, spitters or brutes.

## Base buildings per force (2026-11-18)
- **Enemy** base buildings (props_large 8 hangar, 9 barracks, 15 HQ, 16 radar, 17 fuel depot) are re-baked in rusty red,
  soot and grime (`enemy_building()` → `_recolor(enemy_tone)` in gen_props3d.py).
- **Ours** are clean light grey and green with cyan light strips: 29 hangar (`L.F_HANGAR`, green ribbed roof),
  10 barracks (`L.F_BARRACKS`, solar panels), 30 fuel depot (`L.F_FUEL`, white tanks with glowing bands).
  The home base (world.js) and forward bases (campaign.js) use the F_ indices. `LARGE_HP` adds 29 = 260, 30 = 150.
- Test: tools/test/baseshot.js screenshots the home base and an enemy base.
