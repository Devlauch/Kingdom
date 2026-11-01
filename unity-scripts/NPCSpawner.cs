using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Spawns human NPCs and moves them around the village using NavMesh.
/// Attach to a GameObject named "NPCSpawner".
/// Requires NavMesh baked on the scene terrain.
/// </summary>
public class NPCSpawner : MonoBehaviour
{
    [Header("Prefabs")]
    public GameObject villagerMalePrefab;
    public GameObject villagerFemalePrefab;
    public GameObject kingPrefab;          // optional special model for the king

    [Header("Wander Settings")]
    public float wanderRadius = 30f;
    public float wanderInterval = 4f;      // seconds between new random destinations

    private Dictionary<string, GameObject> _spawnedNPCs = new();
    private float _wanderTimer;

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
        if (state == null) return;
        var liveIds = new HashSet<string>();
        foreach (var npc in state.npcs ?? System.Array.Empty<KNPC>())
            liveIds.Add(npc.id);

        // Remove dead/gone NPCs
        var toRemove = new List<string>();
        foreach (var kv in _spawnedNPCs)
            if (!liveIds.Contains(kv.Key)) toRemove.Add(kv.Key);
        foreach (var id in toRemove)
        {
            Destroy(_spawnedNPCs[id]);
            _spawnedNPCs.Remove(id);
        }

        // Spawn new NPCs
        foreach (var npc in state.npcs ?? System.Array.Empty<KNPC>())
        {
            if (_spawnedNPCs.ContainsKey(npc.id)) continue;
            var prefab = npc.isKing && kingPrefab != null ? kingPrefab
                       : npc.sex == "F" ? villagerFemalePrefab
                       : villagerMalePrefab;
            if (prefab == null) continue;

            // Spawn at random position in village centre
            var spawnPos = new Vector3(Random.Range(10f, 50f), 0f, Random.Range(10f, 50f));
            var go = Instantiate(prefab, spawnPos, Quaternion.identity, transform);
            go.name = $"NPC_{npc.name}_{npc.id}";

            // Add name tag
            var info = go.AddComponent<NPCInfo>();
            info.npcId = npc.id;
            info.npcName = npc.name;
            info.job = npc.job;

            // NavMesh agent for wandering
            if (go.GetComponent<NavMeshAgent>() == null)
                go.AddComponent<NavMeshAgent>();

            _spawnedNPCs[npc.id] = go;
        }
    }

    void Update()
    {
        _wanderTimer -= Time.deltaTime;
        if (_wanderTimer > 0f) return;
        _wanderTimer = wanderInterval;

        // Give each NPC a new random wander destination
        foreach (var kv in _spawnedNPCs)
        {
            var agent = kv.Value.GetComponent<NavMeshAgent>();
            if (agent == null || !agent.isOnNavMesh) continue;

            var origin = kv.Value.transform.position;
            if (NavMesh.SamplePosition(
                    origin + Random.insideUnitSphere * wanderRadius,
                    out var hit, wanderRadius, NavMesh.AllAreas))
            {
                agent.SetDestination(hit.position);
            }
        }
    }
}

public class NPCInfo : MonoBehaviour
{
    public string npcId;
    public string npcName;
    public string job;
}
