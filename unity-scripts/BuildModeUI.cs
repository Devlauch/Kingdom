using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Simple build-mode panel. Click a building button → click a grid tile to place it.
/// Attach to a Canvas GameObject.
/// </summary>
public class BuildModeUI : MonoBehaviour
{
    [Header("Buttons (assign in Inspector)")]
    public Button btnHouse;
    public Button btnSchool;
    public Button btnHospital;
    public Button btnPasture;
    public Button btnClearForest;
    public Button btnBuyCow;
    public Button btnBuySheep;
    public Button btnPause;
    public Button btnResume;

    [Header("Info Panel")]
    public TextMeshProUGUI infoText;
    public TextMeshProUGUI eventLogText;

    private string _selectedAction = null; // "house", "school", etc.
    private Camera _cam;
    private GridManager _grid;

    void Start()
    {
        _cam  = Camera.main;
        _grid = FindFirstObjectByType<GridManager>();

        btnHouse?.onClick.AddListener(() => Select("house"));
        btnSchool?.onClick.AddListener(() => Select("school"));
        btnHospital?.onClick.AddListener(() => Select("hospital"));
        btnPasture?.onClick.AddListener(() => Select("pasture"));
        btnClearForest?.onClick.AddListener(() => Select("clearForest"));
        btnBuyCow?.onClick.AddListener(() => { KingdomClient.Instance?.BuyAnimal("cow"); });
        btnBuySheep?.onClick.AddListener(() => { KingdomClient.Instance?.BuyAnimal("sheep"); });
        btnPause?.onClick.AddListener(() => KingdomClient.Instance?.Pause());
        btnResume?.onClick.AddListener(() => KingdomClient.Instance?.Resume());

        KingdomClient.Instance.OnStateUpdated += UpdateHUD;
    }

    void Select(string action)
    {
        _selectedAction = action;
        if (infoText != null) infoText.text = $"Mode: {action} — click a tile";
    }

    void Update()
    {
        if (_selectedAction == null) return;
        if (!Input.GetMouseButtonDown(0)) return;

        // Raycast onto the ground plane
        var ray = _cam.ScreenPointToRay(Input.mousePosition);
        if (!Physics.Raycast(ray, out var hit, 500f)) return;

        var (col, row) = _grid.WorldToGrid(hit.point);
        var client = KingdomClient.Instance;
        if (client == null) return;

        if (_selectedAction == "clearForest")
            client.ClearForest(col, row);
        else
            client.Build(col, row, _selectedAction);

        _selectedAction = null;
        if (infoText != null) infoText.text = "Mode: none";
    }

    void UpdateHUD(KingdomState state)
    {
        if (infoText == null) return;
        infoText.text = $"{state.nation?.name}  |  Day {state.calendar?.day}  " +
                        $"{state.calendar?.season} Year {state.calendar?.year}\n" +
                        $"Treasury: {state.nation?.treasury:F0}  Wood: {state.nation?.wood}  " +
                        $"Food: {state.foodStock:F0}  Corruption: {state.nation?.corruptionLevel:F0}%";

        if (eventLogText != null && state.eventLog?.Length > 0)
            eventLogText.text = string.Join("\n", state.eventLog);
    }
}
