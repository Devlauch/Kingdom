using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;

/// <summary>
/// Connects to the Kingdom Node.js WebSocket server and dispatches state updates.
/// Attach to a persistent GameObject named "KingdomClient".
/// Requires the NativeWebSocket package (com.endel.nativewebsocket).
/// </summary>
public class KingdomClient : MonoBehaviour
{
    public static KingdomClient Instance { get; private set; }

    [Header("Server")]
    public string serverUrl = "ws://localhost:8765";

    public event Action<KingdomState> OnStateUpdated;

    private WebSocket _ws;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    async void Start() => await Connect();

    async System.Threading.Tasks.Task Connect()
    {
        _ws = new WebSocket(serverUrl);
        _ws.OnMessage += (bytes) =>
        {
            var json = System.Text.Encoding.UTF8.GetString(bytes);
            var msg = JsonUtility.FromJson<WsMessage>(json);
            if (msg.type == "state" && msg.data != null)
                OnStateUpdated?.Invoke(msg.data);
        };
        _ws.OnError += (e) => Debug.LogWarning("WS Error: " + e);
        _ws.OnClose += (_) => Debug.Log("WS Closed — reconnecting in 3s...");
        await _ws.Connect();
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        _ws?.DispatchMessageQueue();
#endif
    }

    public void SendAction(string json)
    {
        if (_ws != null && _ws.State == WebSocketState.Open)
            _ws.SendText(json);
    }

    // Convenience helpers
    public void Build(int col, int row, string buildingType) =>
        SendAction($"{{\"type\":\"build\",\"col\":{col},\"row\":{row},\"buildingType\":\"{buildingType}\"}}");

    public void ClearForest(int col, int row) =>
        SendAction($"{{\"type\":\"clearForest\",\"col\":{col},\"row\":{row}}}");

    public void Demolish(string buildingId) =>
        SendAction($"{{\"type\":\"demolish\",\"buildingId\":\"{buildingId}\"}}");

    public void Plant(string fieldId, string cropType) =>
        SendAction($"{{\"type\":\"plant\",\"fieldId\":\"{fieldId}\",\"cropType\":\"{cropType}\"}}");

    public void BuyAnimal(string species) =>
        SendAction($"{{\"type\":\"buyAnimal\",\"species\":\"{species}\"}}");

    public void HireCourtRole(string npcId, string job, int salary) =>
        SendAction($"{{\"type\":\"hireCourtRole\",\"npcId\":\"{npcId}\",\"job\":\"{job}\",\"salary\":{salary}}}");

    public void SetTaxRate(int rate) =>
        SendAction($"{{\"type\":\"setTaxRate\",\"rate\":{rate}}}");

    public void UpgradeHouse(string buildingId) =>
        SendAction($"{{\"type\":\"upgradeHouse\",\"buildingId\":\"{buildingId}\"}}");

    public void Pause() => SendAction("{\"type\":\"pause\"}");
    public void Resume() => SendAction("{\"type\":\"resume\"}");
    public void SetSpeed(int speed) => SendAction($"{{\"type\":\"setSpeed\",\"speed\":{speed}}}");

    async void OnDestroy() { if (_ws != null) await _ws.Close(); }
}

// ---- Data classes Unity deserialises from JSON ----
[Serializable] public class WsMessage { public string type; public KingdomState data; }

[Serializable]
public class KingdomState
{
    public KCalendar calendar;
    public string weather;
    public KNation nation;
    public float foodStock;
    public string currentKingId;
    public string[] clearedCells;
    public string[] eventLog;
    public KBuilding[] buildings;
    public KField[] fields;
    public KNPC[] npcs;
    public KAnimal[] animals;
}

[Serializable] public class KCalendar { public int day; public string season; public int year; }
[Serializable] public class KNation
{
    public string name; public float treasury; public int taxRate;
    public bool hasDam; public float corruptionLevel; public float crimeLevel;
    public int wood; public float forestStock;
}
[Serializable] public class KBuilding { public string id; public int col; public int row; public string type; public int level; }
[Serializable] public class KField  { public string id; public int tileIndex; public string cropType; public string stage; public float health; }
[Serializable] public class KNPC    { public string id; public string name; public string sex; public string job; public int ageDays; public bool isKing; }
[Serializable] public class KAnimal { public string id; public string species; public string sex; public float health; }
