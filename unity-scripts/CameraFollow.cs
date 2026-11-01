using UnityEngine;

// In FPS mode the camera is parented to Player — this script does nothing at runtime.
// The 'target' field is kept so KingdomSceneSetup can assign it without compile errors.
public class CameraFollow : MonoBehaviour
{
    [HideInInspector] public Transform target;
}
