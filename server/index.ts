import { WebSocketServer, WebSocket } from 'ws';
import {
  initWorld, tick,
  buildStructure, demolishBuilding, clearForest,
  plantField, buyAnimal, hireStaff, hireCourtRole,
  setTaxRate, upgradeHouse, reviewCourt,
} from '../src/sim/world.js';
import type { WorldState, BuildingType, CropType } from '../src/sim/types.js';

const PORT = 8765;
const TICK_MS = 1000; // 1 game day per second

const world: WorldState = initWorld();
world.running = true;

const wss = new WebSocketServer({ port: PORT });
console.log(`Kingdom WebSocket server running on ws://localhost:${PORT}`);

// Convert WorldState to JSON-safe object (Set → Array)
function serialise(w: WorldState) {
  return {
    calendar: w.calendar,
    weather: w.weather,
    nation: w.nation,
    foodStock: w.foodStock,
    tileCount: w.tileCount,
    currentKingId: w.currentKingId,
    eventLog: w.eventLog.slice(0, 10),
    clearedCells: Array.from(w.clearedCells),
    buildings: w.buildings,
    fields: w.fields,
    npcs: Object.values(w.npcs).filter(n => n.alive).map(n => ({
      id: n.id, name: n.name, sex: n.sex, job: n.job,
      ageDays: n.ageDays, needs: n.needs, emotions: n.emotions,
      isKing: n.isKing,
    })),
    animals: Object.values(w.animals).filter(a => a.alive).map(a => ({
      id: a.id, species: a.species, sex: a.sex, health: a.health,
    })),
  };
}

function broadcast(data: object) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// Game loop
setInterval(() => {
  if (!world.running) return;
  tick(world);
  broadcast({ type: 'state', data: serialise(world) });
}, TICK_MS * (1 / (world.speed || 1)));

// Handle incoming actions from Unity
wss.on('connection', (ws) => {
  console.log('Unity client connected');
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'state', data: serialise(world) }));

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    let ok = false;
    switch (msg.type) {
      case 'build':
        ok = buildStructure(world, msg.col as number, msg.row as number, msg.buildingType as BuildingType);
        break;
      case 'demolish':
        ok = demolishBuilding(world, msg.buildingId as string);
        break;
      case 'clearForest':
        ok = clearForest(world, msg.col as number, msg.row as number);
        break;
      case 'plant':
        plantField(world, msg.fieldId as string, msg.cropType as CropType);
        ok = true;
        break;
      case 'buyAnimal':
        ok = buyAnimal(world, msg.species as 'cow' | 'sheep');
        break;
      case 'hireStaff':
        ok = hireStaff(world, msg.buildingId as string, msg.npcId as string, msg.salary as number);
        break;
      case 'hireCourtRole':
        ok = hireCourtRole(world, msg.npcId as string, msg.job as 'minister' | 'soldier' | 'woodcutter' | 'blacksmith', msg.salary as number);
        break;
      case 'setTaxRate':
        setTaxRate(world, msg.rate as number);
        ok = true;
        break;
      case 'upgradeHouse':
        ok = upgradeHouse(world, msg.buildingId as string);
        break;
      case 'reviewCourt':
        reviewCourt(world);
        ok = true;
        break;
      case 'pause':
        world.running = false;
        ok = true;
        break;
      case 'resume':
        world.running = true;
        ok = true;
        break;
      case 'setSpeed':
        world.speed = Math.max(1, Math.min(5, msg.speed as number));
        ok = true;
        break;
    }

    // Send updated state after any action
    ws.send(JSON.stringify({ type: 'ack', action: msg.type, ok }));
    broadcast({ type: 'state', data: serialise(world) });
  });

  ws.on('close', () => console.log('Unity client disconnected'));
});
