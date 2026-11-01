using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEditor;
using UnityEngine.AI;

public static class KingdomSceneSetup
{
    [MenuItem("Kingdom/Setup Scene")]
    public static void SetupScene()
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit")
                  ?? Shader.Find("Standard");

        // ── 1. KingdomClient ──────────────────────────────────────────
        var clientGO = GetOrCreate("KingdomClient");
        if (clientGO.GetComponent<KingdomClient>() == null)
            clientGO.AddComponent<KingdomClient>();

        // ── 2. GridManager ────────────────────────────────────────────
        var gridGO = GetOrCreate("GridManager");
        var grid = gridGO.GetComponent<GridManager>() ?? gridGO.AddComponent<GridManager>();

        // ── 3. NPCSpawner ─────────────────────────────────────────────
        var npcGO = GetOrCreate("NPCSpawner");
        if (npcGO.GetComponent<NPCSpawner>() == null)
            npcGO.AddComponent<NPCSpawner>();

        // ── 4. Ground plane ───────────────────────────────────────────
        var ground = GetOrCreate("Ground");

        // Find all GroundPlane children and keep just one
        var existingPlanes = new System.Collections.Generic.List<GameObject>();
        foreach (Transform child in ground.transform)
            if (child.name == "GroundPlane") existingPlanes.Add(child.gameObject);
        for (int i = existingPlanes.Count - 1; i > 0; i--)
            Object.DestroyImmediate(existingPlanes[i]);

        GameObject groundPlane;
        if (existingPlanes.Count == 0)
        {
            groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
            groundPlane.name = "GroundPlane";
            groundPlane.transform.SetParent(ground.transform);
        }
        else groundPlane = existingPlanes[0];

        groundPlane.transform.localPosition = Vector3.zero;
        groundPlane.transform.localScale = new Vector3(20, 1, 20); // 80x80 units

        // Apply forest texture if available, otherwise solid green
        string groundMatPath = "Assets/Materials/Ground.mat";
        var groundMat = AssetDatabase.LoadAssetAtPath<Material>(groundMatPath);
        if (groundMat == null)
        {
            groundMat = new Material(shader);
            AssetDatabase.CreateAsset(groundMat, groundMatPath);
        }

        // Try to load the forest texture from Scripts folder (where user put it)
        var forestTex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Scripts/Tensura-Style Lush Forest Game Map.png")
                     ?? AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Scripts/Lush Overhead Anime Forest Canopy.png")
                     ?? AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Scripts/Anime Forest Meadow Game Background.png");

        if (forestTex != null)
        {
            groundMat.mainTexture = forestTex;
            groundMat.mainTextureScale = new Vector2(4, 4); // tile the texture 4x across the ground
        }
        else
            groundMat.color = new Color(0.15f, 0.45f, 0.1f);

        EditorUtility.SetDirty(groundMat);
        groundPlane.GetComponent<MeshRenderer>().sharedMaterial = groundMat;

        // ── 5. Build prefabs + materials folders ──────────────────────
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs"))
            AssetDatabase.CreateFolder("Assets", "Prefabs");
        if (!AssetDatabase.IsValidFolder("Assets/Materials"))
            AssetDatabase.CreateFolder("Assets", "Materials");

        // Colors for each building type (Forest removed — ground texture handles it)
        var buildingDefs = new (string name, Color color)[]
        {
            ("House",    new Color(0.8f, 0.6f, 0.3f)),   // tan
            ("School",   new Color(0.3f, 0.5f, 0.9f)),   // blue
            ("Hospital", new Color(0.9f, 0.3f, 0.3f)),   // red
            ("Pasture",  new Color(0.5f, 0.8f, 0.4f)),   // light green
            ("Dam",      new Color(0.4f, 0.4f, 0.6f)),   // grey-blue
            ("Cleared",  new Color(0.7f, 0.55f, 0.35f)), // dirt brown
        };

        var prefabRefs = new System.Collections.Generic.Dictionary<string, GameObject>();

        foreach (var (bname, color) in buildingDefs)
        {
            // Always recreate prefab so material is fresh
            string prefabPath = $"Assets/Prefabs/{bname}.prefab";
            string matPath    = $"Assets/Materials/{bname}.mat";

            // Load or create material asset
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (mat == null)
            {
                mat = new Material(shader) { color = color };
                AssetDatabase.CreateAsset(mat, matPath);
            }
            else
            {
                mat.color = color;
                EditorUtility.SetDirty(mat);
            }

            // Delete old prefab so it rebuilds with correct material
            if (AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath) != null)
                AssetDatabase.DeleteAsset(prefabPath);

            var cube = GameObject.CreatePrimitive(
                bname == "Forest"  ? PrimitiveType.Capsule :
                bname == "Cleared" ? PrimitiveType.Quad    : PrimitiveType.Cube);
            cube.name = bname;

            cube.transform.localScale = bname switch
            {
                "House"    => new Vector3(2, 2, 2),
                "School"   => new Vector3(3, 2.5f, 3),
                "Hospital" => new Vector3(3, 3, 3),
                "Pasture"  => new Vector3(3.5f, 0.3f, 3.5f),
                "Dam"      => new Vector3(4, 1.5f, 1.5f),
                "Forest"   => new Vector3(1, 2.5f, 1),
                "Cleared"  => new Vector3(4, 0.01f, 4),
                _          => Vector3.one,
            };

            cube.GetComponent<MeshRenderer>().sharedMaterial = mat;

            var prefab = PrefabUtility.SaveAsPrefabAsset(cube, prefabPath);
            prefabRefs[bname] = prefab;
            Object.DestroyImmediate(cube);
        }

        // ── 6. Assign building prefabs to GridManager ─────────────────
        grid.housePrefab       = Get(prefabRefs, "House");
        grid.schoolPrefab      = Get(prefabRefs, "School");
        grid.hospitalPrefab    = Get(prefabRefs, "Hospital");
        grid.pasturePrefab     = Get(prefabRefs, "Pasture");
        grid.damPrefab         = Get(prefabRefs, "Dam");
        grid.clearedTilePrefab = Get(prefabRefs, "Cleared");

        // ── 6b. 3D Forest Tree prefab ─────────────────────────────────
        string treePrefabPath = "Assets/Prefabs/ForestTree.prefab";
        string trunkMatPath   = "Assets/Materials/TreeTrunk.mat";
        string canopyMatPath  = "Assets/Materials/TreeCanopy.mat";

        if (AssetDatabase.LoadAssetAtPath<GameObject>(treePrefabPath) != null)
            AssetDatabase.DeleteAsset(treePrefabPath);

        var trunkMat = AssetDatabase.LoadAssetAtPath<Material>(trunkMatPath);
        if (trunkMat == null)
        {
            trunkMat = new Material(shader) { color = new Color(0.32f, 0.18f, 0.05f) };
            AssetDatabase.CreateAsset(trunkMat, trunkMatPath);
        }
        else { trunkMat.color = new Color(0.32f, 0.18f, 0.05f); EditorUtility.SetDirty(trunkMat); }

        var canopyMat = AssetDatabase.LoadAssetAtPath<Material>(canopyMatPath);
        if (canopyMat == null)
        {
            canopyMat = new Material(shader) { color = new Color(0.12f, 0.52f, 0.08f) };
            AssetDatabase.CreateAsset(canopyMat, canopyMatPath);
        }
        else { canopyMat.color = new Color(0.12f, 0.52f, 0.08f); EditorUtility.SetDirty(canopyMat); }

        var treeRoot = new GameObject("ForestTree");

        var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        trunk.name = "Trunk";
        trunk.transform.SetParent(treeRoot.transform);
        trunk.transform.localPosition = new Vector3(0f, 0.55f, 0f);
        trunk.transform.localScale    = new Vector3(0.22f, 0.55f, 0.22f);
        trunk.GetComponent<MeshRenderer>().sharedMaterial = trunkMat;

        var canopy1 = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        canopy1.name = "Canopy";
        canopy1.transform.SetParent(treeRoot.transform);
        canopy1.transform.localPosition = new Vector3(0f, 1.75f, 0f);
        canopy1.transform.localScale    = new Vector3(1.5f, 1.25f, 1.5f);
        canopy1.GetComponent<MeshRenderer>().sharedMaterial = canopyMat;

        var canopy2 = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        canopy2.name = "Canopy2";
        canopy2.transform.SetParent(treeRoot.transform);
        canopy2.transform.localPosition = new Vector3(0.55f, 1.4f, 0.3f);
        canopy2.transform.localScale    = new Vector3(0.95f, 0.9f, 0.95f);
        canopy2.GetComponent<MeshRenderer>().sharedMaterial = canopyMat;

        var canopy3 = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        canopy3.name = "Canopy3";
        canopy3.transform.SetParent(treeRoot.transform);
        canopy3.transform.localPosition = new Vector3(-0.45f, 1.35f, -0.4f);
        canopy3.transform.localScale    = new Vector3(0.85f, 0.85f, 0.85f);
        canopy3.GetComponent<MeshRenderer>().sharedMaterial = canopyMat;

        grid.forestTreePrefab = PrefabUtility.SaveAsPrefabAsset(treeRoot, treePrefabPath);
        Object.DestroyImmediate(treeRoot);

        // ── 7. Villager placeholder prefab ────────────────────────────
        string vilPath    = "Assets/Prefabs/Villager.prefab";
        string vilMatPath = "Assets/Materials/Villager.mat";
        if (AssetDatabase.LoadAssetAtPath<GameObject>(vilPath) != null)
            AssetDatabase.DeleteAsset(vilPath);

        var vilMat = AssetDatabase.LoadAssetAtPath<Material>(vilMatPath);
        if (vilMat == null)
        {
            vilMat = new Material(shader) { color = new Color(0.9f, 0.75f, 0.6f) };
            AssetDatabase.CreateAsset(vilMat, vilMatPath);
        }

        var vil = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        vil.name = "Villager";
        vil.transform.localScale = new Vector3(0.5f, 0.9f, 0.5f);
        vil.GetComponent<MeshRenderer>().sharedMaterial = vilMat;
        vil.AddComponent<NavMeshAgent>();
        GameObject vilPrefab = PrefabUtility.SaveAsPrefabAsset(vil, vilPath);
        Object.DestroyImmediate(vil);

        var spawner = npcGO.GetComponent<NPCSpawner>();
        spawner.villagerMalePrefab   = vilPrefab;
        spawner.villagerFemalePrefab = vilPrefab;

        // ── 8. Player MC ──────────────────────────────────────────────
        var playerGO = GetOrCreate("Player");
        if (playerGO.GetComponent<CharacterController>() == null)
            playerGO.AddComponent<CharacterController>();
        if (playerGO.GetComponent<PlayerController>() == null)
            playerGO.AddComponent<PlayerController>();

        // Visual capsule child
        var visualT = playerGO.transform.Find("Visual");
        GameObject visual;
        if (visualT == null)
        {
            visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            visual.transform.SetParent(playerGO.transform);
            Object.DestroyImmediate(visual.GetComponent<CapsuleCollider>());
        }
        else visual = visualT.gameObject;
        visual.transform.localPosition = Vector3.zero;
        visual.transform.localScale    = new Vector3(0.6f, 0.9f, 0.6f);

        string playerMatPath = "Assets/Materials/Player.mat";
        var playerMat = AssetDatabase.LoadAssetAtPath<Material>(playerMatPath);
        if (playerMat == null)
        {
            playerMat = new Material(shader) { color = new Color(0.25f, 0.45f, 0.95f) }; // Rimuru blue
            AssetDatabase.CreateAsset(playerMat, playerMatPath);
        }
        visual.GetComponent<MeshRenderer>().sharedMaterial = playerMat;
        playerGO.transform.position = new Vector3(40f, 1f, 40f); // centre of 20x20 grid

        // ── 9. Camera follows player ──────────────────────────────────
        var cam = Camera.main;
        if (cam != null)
        {
            var follow = cam.GetComponent<CameraFollow>();
            if (follow == null) follow = cam.gameObject.AddComponent<CameraFollow>();
            follow.target = playerGO.transform;
        }

        // ── 10. Post-processing — Tensura anime look ──────────────────
        if (!AssetDatabase.IsValidFolder("Assets/Settings"))
            AssetDatabase.CreateFolder("Assets", "Settings");

        var volGO = GetOrCreate("PostProcessing");
        var vol   = volGO.GetComponent<Volume>() ?? volGO.AddComponent<Volume>();
        vol.isGlobal = true;
        vol.priority = 1f;

        string ppPath    = "Assets/Settings/KingdomPostProcess.asset";
        var    ppProfile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(ppPath);
        if (ppProfile == null)
        {
            ppProfile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(ppProfile, ppPath);
        }
        vol.sharedProfile = ppProfile;

        // Bloom — soft magical glow
        if (!ppProfile.TryGet<Bloom>(out var bloom))
            bloom = ppProfile.Add<Bloom>(false);
        bloom.active = true;
        bloom.intensity.Override(0.45f);
        bloom.threshold.Override(0.85f);
        bloom.scatter.Override(0.65f);

        // Color Adjustments — warm anime saturation
        if (!ppProfile.TryGet<ColorAdjustments>(out var colorAdj))
            colorAdj = ppProfile.Add<ColorAdjustments>(false);
        colorAdj.active = true;
        colorAdj.postExposure.Override(0.3f);
        colorAdj.saturation.Override(18f);
        ColorUtility.TryParseHtmlString("#EEF6C2", out var filterCol);
        colorAdj.colorFilter.Override(filterCol);

        // Vignette — soft edge darkening
        if (!ppProfile.TryGet<Vignette>(out var vignette))
            vignette = ppProfile.Add<Vignette>(false);
        vignette.active = true;
        vignette.intensity.Override(0.28f);
        vignette.smoothness.Override(0.5f);

        // Depth Of Field — slight focus blur on far trees
        if (!ppProfile.TryGet<DepthOfField>(out var dof))
            dof = ppProfile.Add<DepthOfField>(false);
        dof.active = true;
        dof.mode.Override(DepthOfFieldMode.Bokeh);
        dof.focusDistance.Override(25f);
        dof.focalLength.Override(35f);
        dof.aperture.Override(5.6f);

        EditorUtility.SetDirty(ppProfile);

        // ── 11. Directional light — warm golden sunlight ───────────────
        var allLights = Object.FindObjectsByType<Light>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
        foreach (var l in allLights)
        {
            if (l.type != LightType.Directional) continue;
            ColorUtility.TryParseHtmlString("#FFF0C8", out var sunCol);
            l.color     = sunCol;
            l.intensity = 1.35f;
            l.shadows   = LightShadows.Soft;
            l.shadowStrength   = 0.7f;
            l.shadowBias       = 0.03f;
            l.transform.rotation = Quaternion.Euler(55f, -30f, 0f);
            EditorUtility.SetDirty(l.gameObject);
            break;
        }

        // ── 12. Fog — soft atmospheric depth ──────────────────────────
        RenderSettings.fog              = true;
        RenderSettings.fogMode          = FogMode.Linear;
        RenderSettings.fogColor         = new Color(0.72f, 0.88f, 0.78f, 1f);
        RenderSettings.fogStartDistance = 45f;
        RenderSettings.fogEndDistance   = 140f;

        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
            UnityEngine.SceneManagement.SceneManager.GetActiveScene());

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("Kingdom scene setup complete! Press Ctrl+S to save.");
    }

    static GameObject GetOrCreate(string name)
    {
        var go = GameObject.Find(name);
        if (go == null) go = new GameObject(name);
        return go;
    }

    static GameObject Get(System.Collections.Generic.Dictionary<string, GameObject> dict, string key)
    {
        dict.TryGetValue(key, out var val);
        return val;
    }
}
