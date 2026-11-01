# What To Do Tomorrow (Work Laptop)

## Where Is The Code?
- **Server + web code (GitHub):** https://github.com/Devlauch/Kingdom.git
- **Unity project (HOME PC only):** `C:\Users\My Home\KingdomUnity\` — NOT on GitHub (too large)
- **Unity scripts copy (GitHub):** `unity-scripts/` folder in this repo

---

## Step 1 — Clone & Start Server (no Unity needed)
```bash
git clone https://github.com/Devlauch/Kingdom.git
cd Kingdom
npm install
npm run server
```
Server runs on `ws://localhost:3000`

## Step 2 — What To Work On Without Unity

### Option A: Work on game logic (server)
File: `server/index.ts`
- Add building costs (house costs 50 gold)
- Add win condition (population reaches 100)
- Add events (drought, festival, attack)

### Option B: Work on web browser UI
File: `src/` folder (React + Three.js)
```bash
npm run dev
```
Open http://localhost:5173 in browser — this is a browser version of the game

### Option C: Write Unity C# scripts
Folder: `unity-scripts/` — all .cs files are here
Edit them in VS Code, copy back to Unity PC when home

---

## Unity Setup (when back on HOME PC)
Unity project: `C:\Users\My Home\KingdomUnity\`

Run these tools in order (Unity menu bar → Tools → KINGDOM):
1. `0 - Create Swap Folders`
2. `1 - Setup Scene`
3. `3 - Setup Forest, Mountains & Sky`
4. `4 - Setup Grass & First-Person Camera`
5. `5 - Expand to 1km World + River` (optional)

Then press ▶ Play and test walking in first person.

---

## Current Status
| Feature | Status |
|---------|--------|
| WebSocket server | ✅ Done |
| Game simulation (economy, weather, crops) | ✅ Done |
| Unity grid system (20×20 tiles) | ✅ Done |
| Unity first-person camera | ✅ Done |
| Forest with 15 tree varieties | ✅ Code done, run tool in Unity |
| Grass ground | ✅ Code done, run tool in Unity |
| Buildings (house, school, hospital, pasture, dam) | 🔧 Logic done, prefabs are cubes |
| NPC villagers | 🔧 Spawner done, no walking yet |
| Build mode UI | 🔧 Basic done, no resource HUD |
| Mountains + river | 🔧 Code done, run tool in Unity |
| HUD (gold, food, population) | ❌ Not done |
| Win/lose condition | ❌ Not done |
| Sound & music | ❌ Not done |
| NavMesh (NPC walking) | ❌ Not done |
