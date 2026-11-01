using UnityEngine;
using UnityEngine.Rendering;
using UnityEditor;
using System.IO;

/// <summary>
/// Drop PNG files into Assets/Textures/ then run Kingdom → Apply My Textures.
/// Names: Ground_, Tree_, Trunk_, House_, School_, Hospital_, Pasture_, Dam_, Villager_, Player_, Sky_
/// </summary>
public static class KingdomTextureImporter
{
    [MenuItem("Kingdom/Apply My Textures")]
    public static void ApplyTextures()
    {
        // Make sure the Textures folder exists
        if (!AssetDatabase.IsValidFolder("Assets/Textures"))
            AssetDatabase.CreateFolder("Assets", "Textures");

        AssetDatabase.Refresh();

        string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/Textures" });
        int count = 0;

        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            string name = Path.GetFileNameWithoutExtension(path).ToLower();

            string matPath = null;
            int    maxSize = 1024;
            bool   tile    = false;
            Vector2 tiling = Vector2.one;
            bool   isSky   = false;

            if      (name.StartsWith("ground"))   { matPath = "Assets/Materials/Ground.mat";   maxSize = 2048; tile = true; tiling = new Vector2(5, 5); }
            else if (name.StartsWith("tree"))      { matPath = "Assets/Materials/TreeCanopy.mat"; maxSize = 1024; tile = false; }
            else if (name.StartsWith("trunk"))     { matPath = "Assets/Materials/TreeTrunk.mat";  maxSize = 1024; tile = true; tiling = new Vector2(1, 2); }
            else if (name.StartsWith("house"))     { matPath = "Assets/Materials/House.mat";     maxSize = 1024; tile = false; }
            else if (name.StartsWith("school"))    { matPath = "Assets/Materials/School.mat";    maxSize = 1024; tile = false; }
            else if (name.StartsWith("hospital"))  { matPath = "Assets/Materials/Hospital.mat";  maxSize = 1024; tile = false; }
            else if (name.StartsWith("pasture"))   { matPath = "Assets/Materials/Pasture.mat";   maxSize = 1024; tile = false; }
            else if (name.StartsWith("dam"))       { matPath = "Assets/Materials/Dam.mat";       maxSize = 1024; tile = false; }
            else if (name.StartsWith("villager"))  { matPath = "Assets/Materials/Villager.mat";  maxSize = 512;  tile = false; }
            else if (name.StartsWith("player"))    { matPath = "Assets/Materials/Player.mat";    maxSize = 512;  tile = false; }
            else if (name.StartsWith("sky"))       { isSky = true; maxSize = 4096; }
            else
            {
                Debug.LogWarning($"Kingdom Textures: '{name}' doesn't match any prefix — skipped.");
                continue;
            }

            // ── Set import settings ───────────────────────────────────
            var importer = AssetImporter.GetAtPath(path) as UnityEditor.TextureImporter;
            if (importer == null) continue;

            bool changed = false;

            if (importer.maxTextureSize != maxSize)           { importer.maxTextureSize = maxSize; changed = true; }
            if (importer.mipmapEnabled  != true)              { importer.mipmapEnabled  = true;    changed = true; }
            if (importer.filterMode     != FilterMode.Bilinear){ importer.filterMode    = FilterMode.Bilinear; changed = true; }
            if (importer.anisoLevel     != 4)                  { importer.anisoLevel    = 4;       changed = true; }

            var wrapNeeded = (tile || isSky) ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            if (importer.wrapMode != wrapNeeded) { importer.wrapMode = wrapNeeded; changed = true; }

            // Best quality compression (BC7 = highest quality on PC)
            var platformSettings = importer.GetDefaultPlatformTextureSettings();
            if (platformSettings.format != TextureImporterFormat.BC7)
            {
                platformSettings.format = TextureImporterFormat.BC7;
                platformSettings.overridden = true;
                importer.SetPlatformTextureSettings(platformSettings);
                changed = true;
            }

            if (changed) importer.SaveAndReimport();

            // ── Apply to material ─────────────────────────────────────
            if (isSky)
            {
                ApplySkybox(path);
            }
            else if (matPath != null)
            {
                ApplyToMaterial(matPath, path, tiling);
            }

            count++;
            Debug.Log($"Kingdom Textures: Applied {Path.GetFileName(path)} → {(isSky ? "Skybox" : matPath)}");
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        if (count == 0)
            Debug.LogWarning("Kingdom Textures: No textures found in Assets/Textures/. Drop your PNG files there first.");
        else
            Debug.Log($"Kingdom Textures: Done! Applied {count} texture(s). Press Ctrl+S to save.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    static void ApplyToMaterial(string matPath, string texPath, Vector2 tiling)
    {
        var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
        if (mat == null)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            mat = new Material(shader);
            AssetDatabase.CreateAsset(mat, matPath);
        }

        var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(texPath);
        if (tex == null) return;

        mat.mainTexture      = tex;
        mat.mainTextureScale = tiling;
        EditorUtility.SetDirty(mat);
    }

    static void ApplySkybox(string texPath)
    {
        string skyMatPath = "Assets/Materials/Skybox.mat";
        var skyMat = AssetDatabase.LoadAssetAtPath<Material>(skyMatPath);

        if (skyMat == null)
        {
            var shader = Shader.Find("Skybox/Panoramic");
            if (shader == null) { Debug.LogWarning("Skybox/Panoramic shader not found."); return; }
            skyMat = new Material(shader);
            AssetDatabase.CreateAsset(skyMat, skyMatPath);
        }

        var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(texPath);
        if (tex == null) return;

        skyMat.SetTexture("_MainTex", tex);
        skyMat.SetFloat("_Rotation", 0f);
        skyMat.SetFloat("_Exposure", 1.2f);
        EditorUtility.SetDirty(skyMat);

        RenderSettings.skybox = skyMat;
        DynamicGI.UpdateEnvironment();

        Debug.Log("Kingdom Textures: Skybox applied!");
    }
}
