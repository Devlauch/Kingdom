import { useEffect, useRef, useState } from 'react';
import { CONFIG } from './sim/config';
import {
  initWorld,
  tick,
  plantField,
  buildStructure,
  demolishBuilding,
  upgradeHouse,
  buyAnimal,
  clearForest,
  hireStaff,
  hireCourtRole,
  setTaxRate,
  reviewCourt,
} from './sim/world';
import type { WorldState, BuildingType } from './sim/types';
import IsometricVillage, { type CellSelection } from './components/IsometricVillage';
import './App.css';

export default function App() {
  const worldRef = useRef<WorldState>(initWorld());
  const [, setRenderTick] = useState(0);
  const [selection, setSelection] = useState<CellSelection | null>(null);

  const forceRender = () => setRenderTick((n) => n + 1);

  useEffect(() => {
    if (!worldRef.current.running) return;
    const ms = CONFIG.msPerDayAtSpeed1 / worldRef.current.speed;
    const id = setInterval(() => {
      tick(worldRef.current);
      forceRender();
    }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldRef.current.running, worldRef.current.speed]);

  const world = worldRef.current;
  const king = world.currentKingId ? world.npcs[world.currentKingId] : null;
  const living = Object.values(world.npcs).filter((n) => n.alive);
  const unemployed = living.filter((n) => n.job === 'unemployed');
  const avgHappiness = living.length
    ? Math.round(living.reduce((s, n) => s + n.emotions.happiness, 0) / living.length)
    : 0;

  const togglePlay = () => {
    world.running = !world.running;
    forceRender();
  };

  const setSpeed = (s: number) => {
    world.speed = s;
    forceRender();
  };

  const onBuild = (type: BuildingType) => {
    if (!selection || selection.kind !== 'empty-plot') return;
    buildStructure(world, selection.col, selection.row, type);
    forceRender();
  };

  const onClearForest = () => {
    if (!selection || selection.kind !== 'forest') return;
    clearForest(world, selection.col, selection.row);
    forceRender();
  };

  const onPlant = (crop: 'rice' | 'wheat') => {
    if (!selection || selection.kind !== 'field') return;
    const field = world.fields[selection.fieldIndex];
    if (field) plantField(world, field.id, crop);
    forceRender();
  };

  const selectedField = selection?.kind === 'field' ? world.fields[selection.fieldIndex] : null;
  const selectedBuilding = selection?.kind === 'building' ? world.buildings.find((b) => b.id === selection.buildingId) : null;

  return (
    <div className="app">
      <header className="topbar">
        <h1>{world.nation.name}</h1>
        <div className="calendar">
          Year {world.calendar.year}, {world.calendar.season}, Day {world.calendar.day} — {world.weather}
        </div>
        <div className="controls">
          <button onClick={togglePlay}>{world.running ? 'Pause' : 'Play'}</button>
          {[1, 2, 4].map((s) => (
            <button key={s} className={world.speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
      </header>

      <div className="main">
        <aside className="stats">
          <h2>Kingdom</h2>
          <div>King: {king ? `${king.name} (age ${Math.floor(king.ageDays / 360)})` : 'NO HEIR — THRONE EMPTY'}</div>
          <div>Population: {living.length}</div>
          <div>Unemployed: {unemployed.length}</div>
          <div>Treasury: {world.nation.treasury.toFixed(1)}</div>
          <div>Food stock: {world.foodStock.toFixed(0)}</div>
          <div>Avg happiness: {avgHappiness}</div>
          <div>Corruption: {world.nation.corruptionLevel.toFixed(0)}</div>
          <div>Crime: {world.nation.crimeLevel.toFixed(0)}</div>
          <div>Has dam: {world.nation.hasDam ? 'yes' : 'no'}</div>
          <div>Wood: {world.nation.wood.toFixed(0)}</div>
          <div>Forest health: {world.nation.forestStock.toFixed(0)}%</div>

          <h3>Tax rate: {world.nation.taxRate}%</h3>
          <input
            type="range"
            min={0}
            max={60}
            value={world.nation.taxRate}
            onChange={(e) => {
              setTaxRate(world, Number(e.target.value));
              forceRender();
            }}
          />

          <button
            onClick={() => {
              reviewCourt(world);
              forceRender();
            }}
          >
            Review court (reduce corruption)
          </button>
        </aside>

        <main className="map">
          <h2>Your village (live)</h2>
          <IsometricVillage worldRef={worldRef} onSelectCell={setSelection} />
          <p className="hint">
            Click the forest to clear a patch and build there. Click an empty plot to build on it, or an existing
            building to upgrade or demolish it. Click a field to plant a crop.
          </p>

          <div className="selection-panel">
            {!selection && <p className="hint">Nothing selected — click the village to get started.</p>}

            {selection?.kind === 'forest' && (
              <div className="actions">
                <span>Forest tile ({selection.col}, {selection.row})</span>
                <button onClick={onClearForest}>Clear forest to build here ({CONFIG.clearForestCost} treasury)</button>
              </div>
            )}

            {selection?.kind === 'reserved' && <p className="hint">That's the king's court — it can't be rebuilt or moved.</p>}

            {selection?.kind === 'empty-plot' && (
              <div className="actions">
                <span>Cleared plot ({selection.col}, {selection.row})</span>
                <button onClick={() => onBuild('house')}>Build hut (30 treasury)</button>
                <button onClick={() => onBuild('school')}>Build school (60)</button>
                <button onClick={() => onBuild('hospital')}>Build hospital (80)</button>
                <button onClick={() => onBuild('pasture')}>Build pasture (40)</button>
                <button onClick={() => onBuild('dam')}>Build dam (120)</button>
              </div>
            )}

            {selectedBuilding && (
              <div className="actions">
                <span>
                  {selectedBuilding.type} {selectedBuilding.level > 1 ? 'Lv2' : ''} — staff {selectedBuilding.staffIds.length}/
                  {selectedBuilding.requiredStaff}
                </span>
                {selectedBuilding.type === 'house' && selectedBuilding.level < 2 && (
                  <button
                    onClick={() => {
                      upgradeHouse(world, selectedBuilding.id);
                      forceRender();
                    }}
                  >
                    Upgrade hut to house (50 treasury + 40 wood)
                  </button>
                )}
                <button
                  onClick={() => {
                    demolishBuilding(world, selectedBuilding.id);
                    setSelection(null);
                    forceRender();
                  }}
                >
                  Demolish (frees the tile to build elsewhere)
                </button>
              </div>
            )}

            {selectedField && (
              <div className="actions">
                <span>
                  Field — stage: {selectedField.stage}, health: {selectedField.health.toFixed(0)}
                </span>
                {!selectedField.cropType && (
                  <>
                    <button onClick={() => onPlant('rice')}>Plant rice</button>
                    <button onClick={() => onPlant('wheat')}>Plant wheat</button>
                  </>
                )}
              </div>
            )}
          </div>

          {world.buildings.some((b) => b.type === 'pasture') && (
            <>
              <h2>Pasture</h2>
              <div className="actions">
                <button
                  onClick={() => {
                    buyAnimal(world, 'cow');
                    forceRender();
                  }}
                >
                  Buy cow (25 treasury)
                </button>
                <button
                  onClick={() => {
                    buyAnimal(world, 'sheep');
                    forceRender();
                  }}
                >
                  Buy sheep (15 treasury)
                </button>
              </div>
            </>
          )}

          <h2>Hire from your unemployed villagers</h2>
          <p className="hint">
            These are existing villagers with no job right now — hiring them pays a salary from the treasury and
            gives them work, which is why their happiness improves afterward.
          </p>
          <div className="hire-panel">
            {world.buildings
              .filter((b) => b.requiredStaff > b.staffIds.length)
              .map((b) => (
                <div key={b.id}>
                  {b.type} needs staff:
                  {unemployed.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        hireStaff(world, b.id, n.id, CONFIG.salaries.teacher);
                        forceRender();
                      }}
                    >
                      Hire {n.name} (age {Math.floor(n.ageDays / 360)}, happiness {Math.round(n.emotions.happiness)})
                    </button>
                  ))}
                </div>
              ))}

            <div>
              Court roles:
              {unemployed.slice(0, 3).map((n) => (
                <span key={n.id}>
                  <button
                    onClick={() => {
                      hireCourtRole(world, n.id, 'minister', CONFIG.salaries.minister);
                      forceRender();
                    }}
                  >
                    {n.name} (age {Math.floor(n.ageDays / 360)}) as minister
                  </button>
                  <button
                    onClick={() => {
                      hireCourtRole(world, n.id, 'soldier', CONFIG.salaries.soldier);
                      forceRender();
                    }}
                  >
                    {n.name} (age {Math.floor(n.ageDays / 360)}) as soldier
                  </button>
                  <button
                    onClick={() => {
                      hireCourtRole(world, n.id, 'woodcutter', CONFIG.salaries.woodcutter);
                      forceRender();
                    }}
                  >
                    {n.name} (age {Math.floor(n.ageDays / 360)}) as woodcutter
                  </button>
                  <button
                    onClick={() => {
                      hireCourtRole(world, n.id, 'blacksmith', CONFIG.salaries.blacksmith);
                      forceRender();
                    }}
                  >
                    {n.name} (age {Math.floor(n.ageDays / 360)}) as blacksmith
                  </button>
                </span>
              ))}
            </div>
          </div>
        </main>

        <aside className="log">
          <h2>Events</h2>
          <ul>
            {world.eventLog.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
