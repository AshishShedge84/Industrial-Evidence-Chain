namespace backend.DTOs.Evidence;

/// <summary>
/// Operational action request payload for managers (e.g. Escalate, Request Re-capture, Acknowledge).
/// </summary>
public class OperationalActionRequestDto
{
    /// <summary>
    /// Action type: ESCALATE, REQUEST_RECAPTURE, ACKNOWLEDGE_MISMATCH, FLAG_STORAGE_ISSUE
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// Optional context or reason for the operational action.
    /// </summary>
    public string? Reason { get; set; }
}
