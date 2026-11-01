# Kingdom — Game Design Document v1.2

> A nation-building simulation inspired by *That Time I Got Reincarnated as a Slime: ISEKAI Memories*.  
> Walk through your kingdom as the MC, build it from a forested wilderness, manage your people, resources, and royal court.

---

## Overview

Kingdom is a 3D nation-builder where **you walk around your kingdom in real time** as the ruler.  
You explore a dense anime-style forest, clear land, place buildings, hire workers, and govern your people.  
Every in-game day the simulation ticks: people eat, crops grow, animals breed, corruption festers, and NPCs live and die.  
Your job is to build the right structures, hire the right people, and keep the kingdom alive season after season.

**Tech stack:** Unity 6 (URP) ↔ WebSocket ↔ Node.js / TypeScript simulation engine

---

## World & Time

| Setting | Value |
|---|---|
| Grid | 20 × 20 tiles, 4 units each (80 × 80 world units) |
| Day length | 1 real second (at 1× speed) |
| Season length | 30 in-game days |
| Year | 4 seasons (120 days) |
| Speeds | 1×, 2×, 3×, 4×, 5× |
| Weather | Clear · Rain · Drought · Flood |

All tiles start as **dense 3D forest**. You must clear tiles (costs 15 gold) before you can build.  
When a tile is cleared its 3D tree disappears and dirt shows — the forest shrinks as your kingdom grows.

---

## Controls

| Key | Action |
|---|---|
| `W A S D` / Arrow keys | Move the MC (ruler character) |
| Camera | Follows MC automatically in isometric view |
| Left-click tile | Select / build (via BuildMode UI) |

---

## Resources

| Resource | How gained | How spent |
|---|---|---|
| **Gold (treasury)** | Tax collection each day | Building, hiring, animals, upgrades |
| **Wood** | Woodcutters harvest from forest stock | House upgrades (40 wood), buildings |
| **Food** | Crops (rice/wheat), livestock milk/meat | Feeding all NPCs every day |
| **Forest stock** | Regrows 0.05%/day | Depleted by woodcutters (0.15%/cutter/day) |

---

## Buildings

Clear a tile first, then build:

| Building | Cost | Purpose |
|---|---|---|
| **House** | 80 gold | Shelters NPCs; upgradeable (50g + 40 wood) |
| **School** | 120 gold | Requires 1 teacher; reduces crime |
| **Hospital** | 150 gold | Requires 1 doctor; slows health decay |
| **Pasture** | 100 gold | Required for livestock; requires 1 herder |
| **Dam** | 200 gold | Reduces flood damage from 70 → 10 HP per event |

---

## Crops & Livestock

### Crops
Plant rice or wheat on any cleared tile.

| Crop | Growth time | Notes |
|---|---|---|
| Rice | 100 days | Damaged by drought |
| Wheat | 80 days | Damaged heavily by rain at sprout stage |

Crop stages: **empty → seedbed → sprout → growing → ripe**  
Harvest happens automatically when ripe. Unharvested crops decay.

### Livestock
Buy from treasury. Requires a **Pasture** building.

| Animal | Cost | Gestation |
|---|---|---|
| Cow | 25 gold | 280 days |
| Sheep | 15 gold | 150 days |

Animals breed automatically when mature (180 days). Breeding cooldown: 60 days.

---

## NPCs & Jobs

The kingdom starts with **50 villagers**. NPCs are born, age, marry, and die.  
Each NPC has:
- **Needs:** Hunger (0 = full, 100 = starving), Health (100 = healthy), Shelter
- **Emotions:** Happiness, Fear, Anger, Grief
- **Job:** Assigned by the player or auto-assigned

### Job types

| Job | Assigned via | Effect |
|---|---|---|
| Farmer | Auto (near fields) | Harvests crops |
| Herder | Hire to Pasture | Tends livestock |
| Woodcutter | Hire via court | Produces 3 wood/day |
| Teacher | Hire to School | Enables school effect |
| Doctor | Hire to Hospital | Enables hospital effect |
| Soldier | Hire via court | Reduces crime (crime rises 1.5/day without soldiers) |
| Minister | Hire via court | Reduces corruption accrual |
| Blacksmith | Hire via court | Supports building |
| King | Succession system | Rules the kingdom |

### NPC lifecycle
- Unemployed NPCs lose 2 happiness/day
- High taxes drain happiness (0.6 per tax %)
- NPCs with happiness < 20 may emigrate (checked every 10 days)
- Starvation: hunger > 80 → health declines 3/day → death at 0 health
- Lifespan: 70 ± 15 in-game years

---

## Royal Court & Corruption

The **King** rules until death, then succession picks the next most-fit royal.  
Court roles (minister, soldier, woodcutter, blacksmith) are hired manually by the player.

### Corruption
- Accrues passively if the king goes unchecked for 20+ days
- **Review Court** action resets the unchecked streak
- High corruption drains treasury and morale

### Crime
- Rises 1.5/day with no soldiers
- Schools help reduce it
- Unchecked crime reduces happiness kingdom-wide

---

## Player Actions

All actions sent via WebSocket from Unity to the Node.js server:

| Action | What it does |
|---|---|
| **Build** col, row, type | Places a building on a cleared tile |
| **Clear Forest** col, row | Clears a forest tile — 3D tree removed, dirt appears (costs 15 gold) |
| **Plant** fieldId, cropType | Plants rice or wheat on a cleared tile |
| **Buy Animal** species | Adds cow or sheep to the pasture |
| **Hire Court Role** npcId, job, salary | Assigns a court job to an NPC |
| **Hire Staff** buildingId, npcId | Staffs a building (teacher, doctor, herder) |
| **Set Tax Rate** rate | Sets tax % (affects happiness) |
| **Upgrade House** buildingId | Levels up a house (costs gold + wood) |
| **Review Court** | Resets corruption unchecked counter |
| **Pause / Resume** | Pauses or resumes the simulation |
| **Set Speed** 1-5 | Changes simulation speed |

---

## Win / Lose Conditions

*(To be designed — current simulation runs indefinitely)*

Possible future goals:
- Survive 10 years with population > 100
- Reach treasury > 1,000 gold
- Avoid kingdom collapse (population → 0 or treasury → bankrupt)

---

## Architecture

```
Unity 6 URP (C#)               Node.js Server              TypeScript Sim
──────────────────             ──────────────────           ──────────────────
KingdomClient.cs  ←──WS──→   server/index.ts   ←calls→   src/sim/world.ts
GridManager.cs                 (port 8765)                  systems/
NPCSpawner.cs                                               types.ts
PlayerController.cs                                         config.ts
CameraFollow.cs
BuildModeUI.cs
KingdomSceneSetup.cs  (Editor)
KingdomAssetSetup.cs  (Editor — texture auto-importer)
```

State is broadcast every second. Player actions are sent as JSON and applied immediately.

---

## Graphics Pipeline

| System | Implementation |
|---|---|
| Renderer | Unity 6 Universal Render Pipeline (URP) |
| Ground | Anime forest texture tiled 5× across 80×80 grid |
| Forest | 400 procedural 3D trees (trunk + 3 canopy spheres) — removed on clear |
| Post-processing | Bloom · Color grading · Vignette · Depth of field · Fog |
| Sunlight | Warm golden directional light (#FFF0C8), soft shadows |
| Custom textures | Drop PNG into `Assets/Kingdom/Textures/` → auto-imported via `Tools > KINGDOM` |

---

## Current Status (v0.2)

- [x] TypeScript simulation engine (NPCs, crops, livestock, court, weather)
- [x] WebSocket server streaming live state
- [x] Anime forest texture ground (overhead tiled forest map)
- [x] 400-tile 3D forest — trees disappear when tiles are cleared
- [x] Walkable MC (ruler) with WASD controls
- [x] Isometric follow camera
- [x] URP post-processing (bloom, color grade, vignette, DOF, fog)
- [x] Warm golden sunlight + soft shadows
- [x] Auto texture importer (`Tools > KINGDOM > Process Textures`)
- [x] Building placement (House, School, Hospital, Pasture, Dam)
- [x] NPC villager spawning
- [ ] HUD canvas (treasury, food, population, day/season counter)
- [ ] NavMesh baking so NPCs can pathfind
- [ ] Real 3D asset packs (trees, buildings, characters)
- [ ] Win / lose conditions
- [ ] Sound & music
- [ ] Mobile build
