using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    public float moveSpeed = 6f;
    public float mouseSens = 1.5f;

    private CharacterController _cc;
    private Transform _camPivot;   // child camera transform
    private float _pitch;

    void Awake()
    {
        _cc = GetComponent<CharacterController>();
        var cam = GetComponentInChildren<Camera>();
        if (cam != null) _camPivot = cam.transform;

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible   = false;
    }

    void Update()
    {
        var kb = Keyboard.current;

        // Escape unlocks cursor; click re-locks
        if (kb != null && kb.escapeKey.wasPressedThisFrame)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible   = true;
        }
        if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame
            && Cursor.lockState == CursorLockMode.None)
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible   = false;
        }

        // Mouse look
        if (Mouse.current != null && Cursor.lockState == CursorLockMode.Locked)
        {
            float yaw   = Mouse.current.delta.x.ReadValue() * mouseSens;
            float pitch = Mouse.current.delta.y.ReadValue() * mouseSens;
            transform.Rotate(Vector3.up, yaw);
            _pitch = Mathf.Clamp(_pitch - pitch, -80f, 80f);
            if (_camPivot != null)
                _camPivot.localRotation = Quaternion.Euler(_pitch, 0f, 0f);
        }

        // WASD movement relative to where the player is facing
        if (kb == null) return;
        float h = (kb.dKey.isPressed || kb.rightArrowKey.isPressed ? 1f : 0f)
                - (kb.aKey.isPressed || kb.leftArrowKey.isPressed  ? 1f : 0f);
        float v = (kb.wKey.isPressed || kb.upArrowKey.isPressed    ? 1f : 0f)
                - (kb.sKey.isPressed || kb.downArrowKey.isPressed   ? 1f : 0f);

        var move = transform.right * h + transform.forward * v;
        if (move.sqrMagnitude > 1f) move.Normalize();
        move.y = -9.81f;
        _cc.Move(move * moveSpeed * Time.deltaTime);
    }
}
