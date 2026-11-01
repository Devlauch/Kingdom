using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Renders the kingdom grid. Spawns building prefabs when state updates arrive.
/// Attach to a GameObject named "GridManager".
/// </summary>
public class GridManager : MonoBehaviour
{
    [Header("Prefabs — drag from Project window")]
    public GameObject housePrefab;
    public GameObject schoolPrefab;
    public GameObject hospitalPrefab;
    public GameObject pasturePrefab;
    public GameObject damPrefab;
    public GameObject forestTreePrefab;    // fallback single tree
    public GameObject[] forestTreePrefabs; // variety pool — picked randomly
    public GameObject clearedTilePrefab;   // flat dirt tile

    [Header("Grid Settings")]
    public float tileSize = 4f;
    public int gridCols = 20;
    public int gridRows = 20;

    private Dictionary<string, GameObject> _spawnedBuildings = new();
    private Dictionary<string, GameObject> _groundTiles      = new(); // cleared dirt overlays
    private Dictionary<string, GameObject> _forestTrees      = new(); // 3D trees on forest tiles

    private KingdomState _lastState;

    void Start()
    {
        if (KingdomClient.Instance != null)
            KingdomClient.Instance.OnStateUpdated += HandleState;
    }

    void OnDisable()
    {
        if (KingdomClient.Instance != null)
            KingdomClient.Instance.OnStateUpdated -= HandleState;
    }

    void HandleState(KingdomState state)
    {
        _lastState = state;
        UpdateGround(state);
        UpdateBuildings(state);
    }

    void UpdateGround(KingdomState state)
    {
        var cleared = new HashSet<string>(state.clearedCells ?? System.Array.Empty<string>());

        for (int col = 0; col < gridCols; col++)
        for (int row = 0; row < gridRows; row++)
        {
            string key       = $"{col},{row}";
            bool   isCleared = cleared.Contains(key);

            _groundTiles.TryGetValue(key, out var dirtTile);
            _forestTrees.TryGetValue(key, out var tree);

            if (isCleared)
            {
                // Cleared tile: show dirt overlay, remove tree
                if (dirtTile == null && clearedTilePrefab != null)
                {
                    var pos = GridToWorld(col, row);
                    pos.y = 0.01f;
                    var go = Instantiate(clearedTilePrefab, pos, Quaternion.identity, transform);
                    go.name = $"Cleared_{key}";
                    _groundTiles[key] = go;
                }
                if (tree != null) { Destroy(tree); _forestTrees.Remove(key); }
            }
            else
            {
                // Forest tile: remove dirt overlay, spawn 3D tree
                if (dirtTile != null) { Destroy(dirtTile); _groundTiles.Remove(key); }

                if (tree == null)
                {
                    var pool   = (forestTreePrefabs != null && forestTreePrefabs.Length > 0)
                                 ? forestTreePrefabs : null;
                    var prefab = pool != null
                                 ? pool[Random.Range(0, pool.Length)]
                                 : forestTreePrefab;
                    if (prefab != null)
                    {
                        var pos = GridToWorld(col, row);
                        pos.x += Random.Range(-0.7f, 0.7f);
                        pos.z += Random.Range(-0.7f, 0.7f);
                        var rot = Quaternion.Euler(0f, Random.Range(0f, 360f), 0f);
                        var go  = Instantiate(prefab, pos, rot, transform);
                        go.name = $"Tree_{key}";
                        _forestTrees[key] = go;
                    }
                }
            }
        }
    }

    void UpdateBuildings(KingdomState state)
    {
        // Remove demolished buildings
        var activeIds = new HashSet<string>();
        foreach (var b in state.buildings ?? System.Array.Empty<KBuilding>())
            activeIds.Add(b.id);

        var toRemove = new List<string>();
        foreach (var kv in _spawnedBuildings)
            if (!activeIds.Contains(kv.Key)) toRemove.Add(kv.Key);
        foreach (var id in toRemove)
        {
            Destroy(_spawnedBuildings[id]);
            _spawnedBuildings.Remove(id);
        }

        // Spawn new buildings
        foreach (var b in state.buildings ?? System.Array.Empty<KBuilding>())
        {
            if (_spawnedBuildings.ContainsKey(b.id)) continue;
            var prefab = GetBuildingPrefab(b.type);
            if (prefab == null) { Debug.LogWarning($"No prefab for {b.type}"); continue; }
            var pos = GridToWorld(b.col, b.row);
            var go = Instantiate(prefab, pos, Quaternion.identity, transform);
            go.name = $"{b.type}_{b.id}";
            // Store building id on the object so clicks can reference it
            var info = go.AddComponent<BuildingInfo>();
            info.buildingId = b.id;
            info.buildingType = b.type;
            _spawnedBuildings[b.id] = go;
        }
    }

    public Vector3 GridToWorld(int col, int row) =>
        new Vector3(col * tileSize, 0f, row * tileSize);

    public (int col, int row) WorldToGrid(Vector3 pos) =>
        (Mathf.RoundToInt(pos.x / tileSize), Mathf.RoundToInt(pos.z / tileSize));

    GameObject GetBuildingPrefab(string type) => type switch
    {
        "house"    => housePrefab,
        "school"   => schoolPrefab,
        "hospital" => hospitalPrefab,
        "pasture"  => pasturePrefab,
        "dam"      => damPrefab,
        _          => null,
    };
}

// Attached to each spawned building so raycasts can identify it
public class BuildingInfo : MonoBehaviour
{
    public string buildingId;
    public string buildingType;
}
