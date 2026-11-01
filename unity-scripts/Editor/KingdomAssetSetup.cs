// KINGDOM Auto Asset Setup
// Unity 6 - place this file at:
// Assets/Kingdom/Editor/KingdomAssetSetup.cs
//
// Put textures in Assets/Kingdom/Textures/.
// Name files like:
// Ground_Forest_Albedo.png, Ground_Forest_Normal.png
// Tree_Oak_Albedo.png, Tree_Oak_Normal.png
// Trunk_Oak_Albedo.png, House_Wood_Albedo.png
// Sky_Forest_360.png
//
// Then use: Tools > KINGDOM > Process Textures & Assign Materials
//
// This is an Editor tool. It creates materials and assigns them to
// matching Renderer objects in the currently open scene.
// It does NOT create 3D models or UV maps.

#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

public static class KingdomAssetSetup
{
    private const string Root = "Assets/Kingdom";
    private const string TextureFolder = Root + "/Textures";
    private const string MaterialFolder = Root + "/Materials/Generated";

    private static readonly string[] Categories =
    {
        "Ground", "Tree", "Trunk", "House", "School", "Hospital",
        "Pasture", "Dam", "Villager", "Player", "Animal", "Road",
        "Rock", "Water", "Castle", "Fence", "Bridge", "Prop"
    };

    [MenuItem("Tools/KINGDOM/1 - Create Project Folders")]
    public static void CreateFolders()
    {
        EnsureFolder("Assets", "Kingdom");
        EnsureFolder(Root, "Textures");
        EnsureFolder(Root, "Materials");
        EnsureFolder(Root + "/Materials", "Generated");
        EnsureFolder(Root, "Models");
        EnsureFolder(Root + "/Models", "Environment");
        EnsureFolder(Root + "/Models", "Buildings");
        EnsureFolder(Root + "/Models", "Characters");
        EnsureFolder(Root + "/Models", "Animals");
        EnsureFolder(Root, "Prefabs");
        EnsureFolder(Root, "Scenes");
        EnsureFolder(Root, "Scripts");
        EnsureFolder(Root, "Audio");
        EnsureFolder(Root, "Animations");
        EnsureFolder(Root, "Editor");
        AssetDatabase.Refresh();
        Debug.Log("KINGDOM folders created.");
        EditorUtility.DisplayDialog("KINGDOM", "Project folders created.", "OK");
    }

    [MenuItem("Tools/KINGDOM/2 - Process Textures & Assign Materials")]
    public static void ProcessTexturesAndAssign()
    {
        CreateFolders();

        string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { TextureFolder });
        if (guids.Length == 0)
        {
            EditorUtility.DisplayDialog(
                "KINGDOM",
                "No textures found.\n\nPut PNG/JPG textures in:\n" + TextureFolder,
                "OK");
            return;
        }

        // First apply import settings and reimport when required.
        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            ConfigureTexture(path);
        }

        AssetDatabase.Refresh();

        // Group texture maps by their shared base name.
        Dictionary<string, TextureSet> sets = new Dictionary<string, TextureSet>(
            StringComparer.OrdinalIgnoreCase);

        guids = AssetDatabase.FindAssets("t:Texture2D", new[] { TextureFolder });
        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            string file = Path.GetFileNameWithoutExtension(path);
            string key = GetMaterialKey(file, out TextureRole role);

            if (!sets.TryGetValue(key, out TextureSet set))
            {
                set = new TextureSet();
                sets.Add(key, set);
            }

            Texture2D tex = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (tex == null) continue;

            switch (role)
            {
                case TextureRole.Albedo:    set.albedo    = tex; break;
                case TextureRole.Normal:    set.normal    = tex; break;
                case TextureRole.Metallic:  set.metallic  = tex; break;
                case TextureRole.Occlusion: set.occlusion = tex; break;
                case TextureRole.Roughness: set.roughness = tex; break;
                case TextureRole.Unknown:
                    if (set.albedo == null) set.albedo = tex;
                    break;
            }
        }

        List<Material> createdMaterials = new List<Material>();
        foreach (var pair in sets)
        {
            TextureSet set = pair.Value;
            if (set.albedo == null && set.normal == null &&
                set.metallic == null && set.occlusion == null)
                continue;

            Material mat = CreateOrUpdateMaterial(pair.Key, set);
            if (mat != null) createdMaterials.Add(mat);
        }

        AssetDatabase.SaveAssets();
        AssignMaterialsToOpenScene(createdMaterials);
        ApplySkybox(createdMaterials);

        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());

        EditorUtility.DisplayDialog(
            "KINGDOM Setup Complete",
            "Processed " + guids.Length + " texture files.\nCreated/updated " +
            createdMaterials.Count + " materials.\n\nMatching objects in the open scene were assigned materials where possible.",
            "Great!");
    }

    private static void ConfigureTexture(string path)
    {
        TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
        if (importer == null) return;

        string file  = Path.GetFileNameWithoutExtension(path);
        string upper = file.ToUpperInvariant();
        bool isSky      = upper.StartsWith("SKY_");
        bool isNormal   = HasSuffix(upper, "_NORMAL") || HasSuffix(upper, "_N");
        bool isDataMap  = isNormal || HasSuffix(upper, "_METALLIC") ||
                          HasSuffix(upper, "_ROUGHNESS") || HasSuffix(upper, "_AO") ||
                          HasSuffix(upper, "_OCCLUSION");

        importer.textureType    = isNormal ? TextureImporterType.NormalMap : TextureImporterType.Default;
        importer.sRGBTexture    = !isDataMap;
        importer.mipmapEnabled  = !isSky;
        importer.wrapMode       = isSky ? TextureWrapMode.Clamp : TextureWrapMode.Repeat;
        importer.filterMode     = FilterMode.Trilinear;
        importer.anisoLevel     = 8;
        importer.textureCompression = TextureImporterCompression.CompressedHQ;
        importer.maxTextureSize = isSky ? 4096 : (upper.StartsWith("GROUND_") ? 2048 : 1024);

        // High-quality desktop compression.
        SetPlatform(importer, "Standalone", TextureImporterFormat.BC7,
            isSky ? 4096 : importer.maxTextureSize);

        // ASTC for Android.
        SetPlatform(importer, "Android", TextureImporterFormat.ASTC_6x6,
            isSky ? 2048 : importer.maxTextureSize);

        EditorUtility.SetDirty(importer);
        importer.SaveAndReimport();
    }

    private static void SetPlatform(
        TextureImporter importer,
        string platform,
        TextureImporterFormat format,
        int maxSize)
    {
        TextureImporterPlatformSettings settings = importer.GetPlatformTextureSettings(platform);
        settings.name        = platform;
        settings.overridden  = true;
        settings.maxTextureSize      = maxSize;
        settings.format              = format;
        settings.textureCompression  = TextureImporterCompression.CompressedHQ;
        importer.SetPlatformTextureSettings(settings);
    }

    private static Material CreateOrUpdateMaterial(string key, TextureSet set)
    {
        Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        if (shader == null)
        {
            Debug.LogError("Could not find URP/Lit or Standard shader.");
            return null;
        }

        string safeName    = MakeSafeFileName(key);
        string materialPath = MaterialFolder + "/" + safeName + "_MAT.mat";
        Material mat = AssetDatabase.LoadAssetAtPath<Material>(materialPath);

        if (mat == null)
        {
            mat = new Material(shader);
            AssetDatabase.CreateAsset(mat, materialPath);
        }
        else if (mat.shader != shader)
        {
            mat.shader = shader;
        }

        if (set.albedo != null)
        {
            if (mat.HasProperty("_BaseMap"))  mat.SetTexture("_BaseMap",  set.albedo);
            if (mat.HasProperty("_MainTex"))  mat.SetTexture("_MainTex",  set.albedo);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", Color.white);
            if (mat.HasProperty("_Color"))     mat.SetColor("_Color",     Color.white);
        }

        if (set.normal != null && mat.HasProperty("_BumpMap"))
        {
            mat.SetTexture("_BumpMap", set.normal);
            mat.EnableKeyword("_NORMALMAP");
        }

        if (set.metallic != null && mat.HasProperty("_MetallicGlossMap"))
        {
            mat.SetTexture("_MetallicGlossMap", set.metallic);
            mat.SetFloat("_Metallic", 1f);
            mat.EnableKeyword("_METALLICSPECGLOSSMAP");
        }

        if (set.occlusion != null && mat.HasProperty("_OcclusionMap"))
        {
            mat.SetTexture("_OcclusionMap", set.occlusion);
            mat.SetFloat("_OcclusionStrength", 1f);
        }

        if (set.roughness != null)
        {
            Debug.LogWarning(
                key + ": roughness map detected. Unity Lit expects smoothness — " +
                "convert roughness to inverse smoothness or pack into the mask map.");
        }

        mat.name = safeName + "_MAT";
        EditorUtility.SetDirty(mat);
        return mat;
    }

    private static void AssignMaterialsToOpenScene(List<Material> materials)
    {
        if (materials.Count == 0) return;

        Renderer[] renderers = UnityEngine.Object.FindObjectsByType<Renderer>(
            FindObjectsSortMode.None);

        foreach (Renderer renderer in renderers)
        {
            string objectName = Normalize(renderer.gameObject.name);
            Material best     = null;
            int      bestScore = 0;

            foreach (Material mat in materials)
            {
                string key           = mat.name.Replace("_MAT", "");
                string normalizedKey = Normalize(key);
                int    score         = 0;

                if (objectName.Contains(normalizedKey))
                    score = normalizedKey.Length;

                if (score == 0)
                {
                    foreach (string category in Categories)
                    {
                        if (normalizedKey.StartsWith(Normalize(category)) &&
                            objectName.Contains(Normalize(category)))
                        {
                            score = Normalize(category).Length;
                            break;
                        }
                    }
                }

                if (score > bestScore) { bestScore = score; best = mat; }
            }

            if (best != null)
            {
                Material[] slots = renderer.sharedMaterials;
                if (slots.Length == 0) slots = new Material[1];
                slots[0] = best;
                renderer.sharedMaterials = slots;
                EditorUtility.SetDirty(renderer);
            }
        }
    }

    private static void ApplySkybox(List<Material> materials)
    {
        foreach (Material mat in materials)
        {
            if (!mat.name.StartsWith("Sky_", StringComparison.OrdinalIgnoreCase) &&
                !mat.name.StartsWith("Sky",  StringComparison.OrdinalIgnoreCase))
                continue;

            Texture skyTexture = null;
            if (mat.HasProperty("_MainTex")) skyTexture = mat.GetTexture("_MainTex");
            if (skyTexture == null && mat.HasProperty("_BaseMap"))
                skyTexture = mat.GetTexture("_BaseMap");

            Shader skyShader = Shader.Find("Skybox/Panoramic");
            if (skyShader == null || skyTexture == null)
            {
                Debug.LogWarning("Skybox/Panoramic shader or texture not available.");
                return;
            }

            Material skyMat  = new Material(skyShader);
            skyMat.name      = "KINGDOM_Panoramic_Skybox";
            skyMat.SetTexture("_MainTex", skyTexture);

            const string skyPath = MaterialFolder + "/KINGDOM_Panoramic_Skybox.mat";
            Material existing    = AssetDatabase.LoadAssetAtPath<Material>(skyPath);
            if (existing != null)
            {
                EditorUtility.CopySerialized(skyMat, existing);
                UnityEngine.Object.DestroyImmediate(skyMat);
                skyMat = existing;
            }
            else
            {
                AssetDatabase.CreateAsset(skyMat, skyPath);
            }

            RenderSettings.skybox = skyMat;
            DynamicGI.UpdateEnvironment();
            EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
            break;
        }
    }

    private static string GetMaterialKey(string fileName, out TextureRole role)
    {
        string upper = fileName.ToUpperInvariant();
        role = TextureRole.Unknown;

        string[] suffixes =
        {
            "_ALBEDO", "_BASECOLOR", "_BASE_COLOR", "_DIFFUSE",
            "_NORMAL", "_METALLIC", "_ROUGHNESS", "_OCCLUSION",
            "_AO", "_N"
        };

        foreach (string suffix in suffixes)
        {
            if (!upper.EndsWith(suffix)) continue;

            role = suffix switch
            {
                "_ALBEDO" or "_BASECOLOR" or "_BASE_COLOR" or "_DIFFUSE" => TextureRole.Albedo,
                "_NORMAL" or "_N"                                          => TextureRole.Normal,
                "_METALLIC"                                                => TextureRole.Metallic,
                "_ROUGHNESS"                                               => TextureRole.Roughness,
                "_OCCLUSION" or "_AO"                                      => TextureRole.Occlusion,
                _                                                          => TextureRole.Unknown
            };

            return fileName.Substring(0, fileName.Length - suffix.Length);
        }

        return fileName;
    }

    private static bool HasSuffix(string value, string suffix) =>
        value.EndsWith(suffix, StringComparison.OrdinalIgnoreCase);

    private static string Normalize(string value) =>
        new string(value.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());

    private static string MakeSafeFileName(string value)
    {
        foreach (char c in Path.GetInvalidFileNameChars())
            value = value.Replace(c, '_');
        return value.Replace("/", "_").Replace("\\", "_");
    }

    private static void EnsureFolder(string parent, string child)
    {
        string path = parent + "/" + child;
        if (!AssetDatabase.IsValidFolder(path))
            AssetDatabase.CreateFolder(parent, child);
    }

    private enum TextureRole { Unknown, Albedo, Normal, Metallic, Roughness, Occlusion }

    private class TextureSet
    {
        public Texture2D albedo;
        public Texture2D normal;
        public Texture2D metallic;
        public Texture2D roughness;
        public Texture2D occlusion;
    }
}
#endif
