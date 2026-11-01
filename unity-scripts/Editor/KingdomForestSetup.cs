#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

public static class KingdomForestSetup
{
    // ── Output paths ──────────────────────────────────────────────────────────
    private const string NatureMats  = "Assets/Kingdom/Materials/Nature";
    private const string TreePrefabs = "Assets/Prefabs/Trees";

    // ── Known asset pack roots ────────────────────────────────────────────────
    private const string Quaternius  = "Assets/Kingdom/Models/Nature";
    private const string KlenRoot    = "Assets/klen/Model";
    private const string PalmRoot    = "Assets/Yughues Free Palm Trees";
    private const string FVRoot      = "Assets/ForestVision";
    private const string SwapTrees   = "Assets/Kingdom/Swap/Trees";
    private const string SwapSky     = "Assets/Kingdom/Swap/Sky";

    // ── Ground textures (ForestVision has the best grass) ─────────────────────
    private const string GrassAlbedo = "Assets/ForestVision/Materials/Grounds/Textures/gnd_GrassyFloor_Albedo.png";
    private const string GrassNormal = "Assets/ForestVision/Materials/Grounds/Textures/gnd_GrassyFloor_Normal.png";

    // ── Klen maple textures ───────────────────────────────────────────────────
    private const string MapleBark   = "Assets/klen/Model/Materials/bark2.png";
    private const string MapleBarkN  = "Assets/klen/Model/Materials/bark2_NRM.png";
    private const string MapleLeaf   = "Assets/klen/Model/Materials/Klen_AT.tga";

    // ── Palm textures ─────────────────────────────────────────────────────────
    private const string PalmDiffuse = "Assets/Yughues Free Palm Trees/Textures/Palm trees diffuse.tga";
    private const string PalmNormal  = "Assets/Yughues Free Palm Trees/Textures/Palm trees normal.tga";

    // ── ForestVision bark/foliage textures ────────────────────────────────────
    private const string FVBark      = "Assets/ForestVision/Materials/Barks/Textures/Barks_6.png";
    private const string FVBarkN     = "Assets/ForestVision/Materials/Barks/Textures/Barks_6_Normal.png";
    private const string FVFoliage   = "Assets/ForestVision/Materials/Foliage/Textures/Foliage_1.png";

    [MenuItem("Tools/KINGDOM/3 - Setup Forest, Mountains & Sky")]
    public static void SetupForest()
    {
        EnsureFolder("Assets/Kingdom/Materials", "Nature");
        EnsureFolder("Assets/Prefabs", "Trees");

        // ── 1. Materials ──────────────────────────────────────────────────────
        // Quaternius
        var qBarkMat  = GetOrCreateMat("Q_Bark",       Quaternius + "/Bark_NormalTree.png", null, new Color(0.40f, 0.24f, 0.08f));
        var qLeafMat  = GetOrCreateMat("Q_Leaves",     Quaternius + "/Leaves_NormalTree.png", null, new Color(0.18f, 0.60f, 0.12f));
        var qPineBark = GetOrCreateMat("Q_BarkPine",   Quaternius + "/Bark_NormalTree.png", null, new Color(0.28f, 0.16f, 0.05f));
        var qPineMat  = GetOrCreateMat("Q_LeavesPine", Quaternius + "/Leaf_Pine.png", null, new Color(0.08f, 0.38f, 0.08f));
        // Maple (klen)
        var mBarkMat  = GetOrCreateMat("Maple_Bark",   MapleBark,   MapleBarkN, new Color(0.45f, 0.26f, 0.10f));
        var mLeafMat  = GetOrCreateMat("Maple_Leaf",   MapleLeaf,   null,       new Color(0.72f, 0.28f, 0.08f));
        // Palm (Yughues)
        var pMat      = GetOrCreateMat("Palm",         PalmDiffuse, PalmNormal, new Color(0.55f, 0.42f, 0.20f));
        // ForestVision
        var fvBarkMat = GetOrCreateMat("FV_Bark",      FVBark,      FVBarkN,    new Color(0.35f, 0.22f, 0.08f));
        var fvLeafMat = GetOrCreateMat("FV_Leaf",      FVFoliage,   null,       new Color(0.15f, 0.52f, 0.12f));
        // Rock / ground
        var rockMat   = GetOrCreateMat("Rock",         "Assets/TheTalesFactory/Photoscanned MoutainsRocks PBR/Textures/MountainsRocks01_MountainsRocks01_Albedo.tga",
                                                        null, new Color(0.52f, 0.48f, 0.42f));
        AssetDatabase.SaveAssets();

        // ── 2. Build tree prefabs from every pack ────────────────────────────
        var pool = new List<GameObject>();

        // Quaternius CommonTree + Pine (the ones we know work)
        AddPrefab(pool, "Q_CommonTree_1", $"{Quaternius}/CommonTree_1.fbx", qBarkMat, qLeafMat);
        AddPrefab(pool, "Q_CommonTree_3", $"{Quaternius}/CommonTree_3.fbx", qBarkMat, qLeafMat);
        AddPrefab(pool, "Q_CommonTree_5", $"{Quaternius}/CommonTree_5.fbx", qBarkMat, qLeafMat);
        AddPrefab(pool, "Q_Pine_1",       $"{Quaternius}/Pine_1.fbx",       qPineBark, qPineMat);
        AddPrefab(pool, "Q_Pine_3",       $"{Quaternius}/Pine_3.fbx",       qPineBark, qPineMat);
        AddPrefab(pool, "Q_TwistedTree_1",$"{Quaternius}/TwistedTree_1.fbx",qBarkMat, qLeafMat);
        AddPrefab(pool, "Q_TwistedTree_3",$"{Quaternius}/TwistedTree_3.fbx",qBarkMat, qLeafMat);
        AddPrefab(pool, "Q_DeadTree_1",   $"{Quaternius}/DeadTree_1.fbx",   qBarkMat, null);

        // Maple trees (klen) — use medium-poly variants for good performance
        AddPrefab(pool, "Maple_Med",  $"{KlenRoot}/Maple_1952Poly.FBX",  mBarkMat, mLeafMat);
        AddPrefab(pool, "Maple_Hi",   $"{KlenRoot}/Maple_5423poly.fbx",  mBarkMat, mLeafMat);
        AddPrefab(pool, "Maple_Old",  $"{KlenRoot}/Klen old.fbx",        mBarkMat, mLeafMat);

        // Palm trees (Yughues)
        AddPrefab(pool, "Palm_Single", $"{PalmRoot}/Meshes/PalmTreeSingleStraight.FBX", pMat, pMat);
        AddPrefab(pool, "Palm_Bended", $"{PalmRoot}/Meshes/PalmTreeSingleBended.FBX",   pMat, pMat);
        AddPrefab(pool, "Palm_Duo",    $"{PalmRoot}/Meshes/PalmTreeDualBended.FBX",     pMat, pMat);

        // ForestVision trees
        AddPrefab(pool, "FV_Forest",   $"{FVRoot}/Resources/ForestTrees.fbx",   fvBarkMat, fvLeafMat);

        // Swap folder (user custom drops) — appended last so they appear in pool
        foreach (var path in FbxPathsIn(SwapTrees))
        {
            string fname = Path.GetFileNameWithoutExtension(path);
            AddPrefab(pool, "Swap_" + fname, path, fvBarkMat, fvLeafMat);
        }

        // ── 3. Rock scatter prefabs ───────────────────────────────────────────
        MakeSimplePrefab("Q_Rock_1", $"{Quaternius}/Rock_Medium_1.fbx", rockMat);
        MakeSimplePrefab("Q_Rock_2", $"{Quaternius}/Rock_Medium_2.fbx", rockMat);

        // ── 4. Wire up GridManager ────────────────────────────────────────────
        var grid = Object.FindFirstObjectByType<GridManager>();
        if (grid != null && pool.Count > 0)
        {
            grid.forestTreePrefab  = pool[0];
            grid.forestTreePrefabs = pool.ToArray();
            EditorUtility.SetDirty(grid);
            Debug.Log($"KINGDOM: {pool.Count} tree types assigned to GridManager.");
        }
        else if (grid == null)
            Debug.LogWarning("KINGDOM: GridManager not found — open your Kingdom scene first.");

        // ── 5. Mountains (photoscanned rocks) ────────────────────────────────
        CreateMountains(rockMat);

        // ── 6. Sky ────────────────────────────────────────────────────────────
        SetupSky();

        // ── 7. Fog ────────────────────────────────────────────────────────────
        RenderSettings.fog              = true;
        RenderSettings.fogMode          = FogMode.Linear;
        RenderSettings.fogColor         = new Color(0.70f, 0.86f, 0.76f, 1f);
        RenderSettings.fogStartDistance = 60f;
        RenderSettings.fogEndDistance   = 180f;

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());

        EditorUtility.DisplayDialog("KINGDOM Forest",
            $"{pool.Count} tree types ready!\n" +
            "  Quaternius: CommonTree + Pine + Twisted + Dead\n" +
            "  Maple trees (klen)\n" +
            "  Palm trees (Yughues)\n" +
            "  ForestVision trees\n\n" +
            "Mountains + Sky applied.\n" +
            "Press Ctrl+S then Play!", "Let's go!");
    }

    // ── Grass & First-Person ──────────────────────────────────────────────────

    [MenuItem("Tools/KINGDOM/4 - Setup Grass & First-Person Camera")]
    public static void SetupGrassAndFPS()
    {
        SetupGrass();
        SetupFPSCamera();
        EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());
        EditorUtility.DisplayDialog("KINGDOM",
            "Grass ground applied (ForestVision texture).\n" +
            "Main Camera moved to Player eye level.\n\n" +
            "Press Play → move mouse to look around.\n" +
            "Escape = unlock cursor   Click = re-lock", "Let's go!");
    }

    static void SetupGrass()
    {
        Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        string matPath = "Assets/Materials/Grass.mat";
        var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
        if (mat == null) { mat = new Material(shader); AssetDatabase.CreateAsset(mat, matPath); }
        else if (mat.shader != shader) mat.shader = shader;

        // Use ForestVision grass (best looking ground texture we have)
        var albedo = AssetDatabase.LoadAssetAtPath<Texture2D>(GrassAlbedo);
        var normal = AssetDatabase.LoadAssetAtPath<Texture2D>(GrassNormal);

        if (albedo != null)
        {
            if (mat.HasProperty("_BaseMap")) { mat.SetTexture("_BaseMap", albedo); mat.SetTextureScale("_BaseMap", new Vector2(20f, 20f)); }
            if (mat.HasProperty("_MainTex")) { mat.SetTexture("_MainTex", albedo); mat.SetTextureScale("_MainTex", new Vector2(20f, 20f)); }
        }
        if (normal != null && mat.HasProperty("_BumpMap"))
        {
            mat.SetTexture("_BumpMap", normal);
            mat.SetTextureScale("_BumpMap", new Vector2(20f, 20f));
            mat.EnableKeyword("_NORMALMAP");
        }

        Color grassGreen = new Color(0.28f, 0.52f, 0.20f);
        if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", grassGreen);
        else if (mat.HasProperty("_Color")) mat.SetColor("_Color", grassGreen);
        if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", 0.05f);
        if (mat.HasProperty("_Metallic"))   mat.SetFloat("_Metallic",   0f);
        EditorUtility.SetDirty(mat);
        AssetDatabase.SaveAssets();

        var ground = GameObject.Find("Ground") ?? GameObject.Find("GroundPlane");
        if (ground != null)
        {
            var mr = ground.GetComponent<MeshRenderer>() ?? ground.GetComponentInChildren<MeshRenderer>();
            if (mr != null) { mr.sharedMaterial = mat; EditorUtility.SetDirty(mr.gameObject); }
        }
    }

    static void SetupFPSCamera()
    {
        var cam    = Camera.main;
        var player = GameObject.Find("Player");
        if (cam == null || player == null) return;
        cam.transform.SetParent(player.transform);
        cam.transform.localPosition = new Vector3(0f, 1.7f, 0f);
        cam.transform.localRotation = Quaternion.identity;
        var follow = cam.GetComponent<CameraFollow>();
        if (follow != null) follow.enabled = false;
        EditorUtility.SetDirty(cam.gameObject);
    }

    // ── 1km World Expansion ───────────────────────────────────────────────────

    [MenuItem("Tools/KINGDOM/5 - Expand to 1km World + River")]
    public static void ExpandWorld()
    {
        var grid = Object.FindFirstObjectByType<GridManager>();
        if (grid != null) { grid.tileSize = 10f; EditorUtility.SetDirty(grid); }

        var groundGO = GameObject.Find("Ground") ?? GameObject.Find("GroundPlane");
        if (groundGO != null)
        {
            var mr     = groundGO.GetComponent<MeshRenderer>() ?? groundGO.GetComponentInChildren<MeshRenderer>();
            var target = mr != null ? mr.gameObject : groundGO;
            target.transform.localScale = new Vector3(200f, 1f, 200f);
            target.transform.position   = new Vector3(100f, 0f, 100f);
            if (mr?.sharedMaterial != null)
            {
                if (mr.sharedMaterial.HasProperty("_BaseMap")) mr.sharedMaterial.SetTextureScale("_BaseMap", new Vector2(100f, 100f));
                if (mr.sharedMaterial.HasProperty("_MainTex")) mr.sharedMaterial.SetTextureScale("_MainTex", new Vector2(100f, 100f));
            }
            EditorUtility.SetDirty(target);
        }

        Shader mShader  = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        string mMatPath = "Assets/Materials/Mountain.mat";
        var mMat = AssetDatabase.LoadAssetAtPath<Material>(mMatPath);
        if (mMat == null) { mMat = new Material(mShader) { color = new Color(0.30f, 0.42f, 0.26f) }; AssetDatabase.CreateAsset(mMat, mMatPath); AssetDatabase.SaveAssets(); }

        var mountains = GameObject.Find("Mountains");
        if (mountains == null) mountains = new GameObject("Mountains");
        while (mountains.transform.childCount > 0)
            Object.DestroyImmediate(mountains.transform.GetChild(0).gameObject);

        var rng = new System.Random(9999);
        for (int i = 0; i < 8; i++) SpawnBigMountain(mountains, mMat, rng, -100f + i * 60f,  620f);
        for (int i = 0; i < 8; i++) SpawnBigMountain(mountains, mMat, rng, -100f + i * 60f, -420f);
        for (int i = 0; i < 7; i++) SpawnBigMountain(mountains, mMat, rng,  620f, -60f + i * 60f);
        for (int i = 0; i < 7; i++) SpawnBigMountain(mountains, mMat, rng, -420f, -60f + i * 60f);

        CreateRiver();

        RenderSettings.fog              = true;
        RenderSettings.fogMode          = FogMode.Linear;
        RenderSettings.fogColor         = new Color(0.68f, 0.84f, 0.74f, 1f);
        RenderSettings.fogStartDistance = 150f;
        RenderSettings.fogEndDistance   = 700f;

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());
        EditorUtility.DisplayDialog("KINGDOM 1km World", "Map expanded to 1km!\nMountains at horizon.\nRiver added.\n\nCtrl+S then Play!", "Let's go!");
    }

    // ── Prefab helpers ────────────────────────────────────────────────────────

    static void AddPrefab(List<GameObject> pool, string name, string fbxPath, Material mat0, Material mat1)
    {
        var p = MakeTreePrefab(name, fbxPath, mat0, mat1);
        if (p != null) pool.Add(p);
    }

    static GameObject MakeTreePrefab(string prefabName, string fbxPath, Material mat0, Material mat1)
    {
        string prefabPath = $"{TreePrefabs}/{prefabName}.prefab";
        var source = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);
        if (source == null) { Debug.LogWarning($"KINGDOM: FBX not found — {fbxPath}"); return null; }

        var go = Object.Instantiate(source);
        go.name = prefabName;

        var renderers = go.GetComponentsInChildren<MeshRenderer>();
        foreach (var r in renderers)
        {
            var slots = new Material[r.sharedMaterials.Length];
            slots[0] = mat0;
            for (int i = 1; i < slots.Length; i++)
                slots[i] = mat1 != null ? mat1 : mat0;
            r.sharedMaterials = slots;
        }

        foreach (var col in go.GetComponentsInChildren<Collider>())
            Object.DestroyImmediate(col);

        var prefab = PrefabUtility.SaveAsPrefabAsset(go, prefabPath);
        Object.DestroyImmediate(go);
        return prefab;
    }

    static void MakeSimplePrefab(string name, string fbxPath, Material mat)
    {
        var source = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);
        if (source == null) return;
        var go = Object.Instantiate(source);
        go.name = name;
        foreach (var r in go.GetComponentsInChildren<MeshRenderer>())
        {
            var slots = new Material[r.sharedMaterials.Length];
            for (int i = 0; i < slots.Length; i++) slots[i] = mat;
            r.sharedMaterials = slots;
        }
        PrefabUtility.SaveAsPrefabAsset(go, $"{TreePrefabs}/{name}.prefab");
        Object.DestroyImmediate(go);
    }

    static Material GetOrCreateMat(string name, string albedoPath, string normalPath, Color fallback)
    {
        string matPath = $"{NatureMats}/{name}.mat";
        Shader shader  = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");

        var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
        if (mat == null) { mat = new Material(shader); AssetDatabase.CreateAsset(mat, matPath); }
        else if (mat.shader != shader) mat.shader = shader;

        var albedo = AssetDatabase.LoadAssetAtPath<Texture2D>(albedoPath);
        if (albedo != null)
        {
            if (mat.HasProperty("_BaseMap")) mat.SetTexture("_BaseMap", albedo);
            if (mat.HasProperty("_MainTex")) mat.SetTexture("_MainTex", albedo);
        }

        if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", fallback);
        else if (mat.HasProperty("_Color")) mat.SetColor("_Color", fallback);
        else mat.color = fallback;

        if (normalPath != null)
        {
            var nrm = AssetDatabase.LoadAssetAtPath<Texture2D>(normalPath);
            if (nrm != null && mat.HasProperty("_BumpMap"))
            {
                mat.SetTexture("_BumpMap", nrm);
                mat.EnableKeyword("_NORMALMAP");
            }
        }

        if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", 0.15f);
        if (mat.HasProperty("_Metallic"))   mat.SetFloat("_Metallic",   0f);

        EditorUtility.SetDirty(mat);
        return mat;
    }

    // ── Mountains ─────────────────────────────────────────────────────────────

    static void CreateMountains(Material mat)
    {
        var parent = GameObject.Find("Mountains");
        if (parent == null) parent = new GameObject("Mountains");
        while (parent.transform.childCount > 0)
            Object.DestroyImmediate(parent.transform.GetChild(0).gameObject);

        var rng = new System.Random(12345);
        for (int i = 0; i < 6; i++) SpawnMountain(parent, mat, rng, -10f + i * 18f,  98f);
        for (int i = 0; i < 6; i++) SpawnMountain(parent, mat, rng, -10f + i * 18f, -18f);
        for (int i = 0; i < 5; i++) SpawnMountain(parent, mat, rng,  98f, 5f + i * 18f);
        for (int i = 0; i < 5; i++) SpawnMountain(parent, mat, rng, -18f, 5f + i * 18f);
    }

    static void SpawnMountain(GameObject parent, Material mat, System.Random rng, float x, float z)
    {
        float h = 16f + (float)rng.NextDouble() * 18f;
        float w = 20f + (float)rng.NextDouble() * 12f;
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = "Mountain";
        go.transform.SetParent(parent.transform);
        go.transform.position   = new Vector3(x, -h * 0.38f, z);
        go.transform.localScale = new Vector3(w, h, w * 0.7f);
        Object.DestroyImmediate(go.GetComponent<SphereCollider>());
        go.GetComponent<MeshRenderer>().sharedMaterial = mat;
    }

    static void SpawnBigMountain(GameObject parent, Material mat, System.Random rng, float x, float z)
    {
        float h = 80f  + (float)rng.NextDouble() * 120f;
        float w = 120f + (float)rng.NextDouble() * 80f;
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = "Mountain";
        go.transform.SetParent(parent.transform);
        go.transform.position   = new Vector3(x, -h * 0.35f, z);
        go.transform.localScale = new Vector3(w, h, w * 0.75f);
        Object.DestroyImmediate(go.GetComponent<SphereCollider>());
        go.GetComponent<MeshRenderer>().sharedMaterial = mat;
    }

    // ── Sky ───────────────────────────────────────────────────────────────────

    static void SetupSky()
    {
        if (AssetDatabase.IsValidFolder(SwapSky))
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Cubemap", new[] { SwapSky }))
            {
                var cube = AssetDatabase.LoadAssetAtPath<Cubemap>(AssetDatabase.GUIDToAssetPath(guid));
                if (cube != null)
                {
                    var m = new Material(Shader.Find("Skybox/Cubemap") ?? Shader.Find("Skybox/Procedural"));
                    m.SetTexture("_Tex", cube);
                    RenderSettings.skybox = m;
                    DynamicGI.UpdateEnvironment();
                    return;
                }
            }
        }

        Shader skyShader = Shader.Find("Skybox/Procedural");
        if (skyShader == null) return;
        string skyMatPath = "Assets/Materials/KingdomSky.mat";
        var skyMat = AssetDatabase.LoadAssetAtPath<Material>(skyMatPath);
        if (skyMat == null) { skyMat = new Material(skyShader); AssetDatabase.CreateAsset(skyMat, skyMatPath); }
        else if (skyMat.shader != skyShader) skyMat.shader = skyShader;

        skyMat.SetFloat("_SunSize",             0.04f);
        skyMat.SetFloat("_SunSizeConvergence",  10f);
        skyMat.SetFloat("_AtmosphereThickness", 0.9f);
        skyMat.SetFloat("_Exposure",            1.3f);
        skyMat.SetColor("_SkyTint",    new Color(0.50f, 0.78f, 0.98f));
        skyMat.SetColor("_GroundColor", new Color(0.42f, 0.50f, 0.32f));
        RenderSettings.skybox = skyMat;
        DynamicGI.UpdateEnvironment();
        EditorUtility.SetDirty(skyMat);
    }

    // ── River ─────────────────────────────────────────────────────────────────

    static void CreateRiver()
    {
        var old = GameObject.Find("River");
        if (old != null) Object.DestroyImmediate(old);

        Shader shader  = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        string rMatPath = "Assets/Materials/River.mat";
        var rMat = AssetDatabase.LoadAssetAtPath<Material>(rMatPath);
        if (rMat == null) { rMat = new Material(shader); AssetDatabase.CreateAsset(rMat, rMatPath); }

        Color waterCol = new Color(0.10f, 0.35f, 0.65f, 1f);
        if (rMat.HasProperty("_BaseColor")) rMat.SetColor("_BaseColor", waterCol);
        else rMat.color = waterCol;
        if (rMat.HasProperty("_Smoothness")) rMat.SetFloat("_Smoothness", 0.95f);
        if (rMat.HasProperty("_Metallic"))   rMat.SetFloat("_Metallic",   0f);
        EditorUtility.SetDirty(rMat);
        AssetDatabase.SaveAssets();

        var riverGO = new GameObject("River");
        AddRiverSegment(riverGO, rMat, new Vector3(230f, 0.05f,  100f), new Vector3(3f, 0.1f, 130f));
        AddRiverSegment(riverGO, rMat, new Vector3(215f, 0.05f,  210f), new Vector3(2f, 0.1f,  40f), -15f);
        AddRiverSegment(riverGO, rMat, new Vector3(242f, 0.05f,  -30f), new Vector3(2f, 0.1f,  40f),  15f);
        EditorUtility.SetDirty(riverGO);
    }

    static void AddRiverSegment(GameObject parent, Material mat, Vector3 pos, Vector3 scale, float yRot = 0f)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Plane);
        go.name = "RiverSegment";
        go.transform.SetParent(parent.transform);
        go.transform.position   = pos;
        go.transform.localScale = scale;
        go.transform.rotation   = Quaternion.Euler(0f, yRot, 0f);
        Object.DestroyImmediate(go.GetComponent<MeshCollider>());
        go.GetComponent<MeshRenderer>().sharedMaterial = mat;
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    static List<string> FbxPathsIn(string folder)
    {
        var result = new List<string>();
        if (!AssetDatabase.IsValidFolder(folder)) return result;
        foreach (var guid in AssetDatabase.FindAssets("t:Model", new[] { folder }))
            result.Add(AssetDatabase.GUIDToAssetPath(guid));
        return result;
    }

    static void EnsureFolder(string parent, string child)
    {
        string path = parent + "/" + child;
        if (!AssetDatabase.IsValidFolder(path))
            AssetDatabase.CreateFolder(parent, child);
    }
}
#endif
