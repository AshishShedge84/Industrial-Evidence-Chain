using System;

namespace backend.DTOs.Notifications
{
    public class NotificationDto
    {
        public Guid NotificationId { get; set; }
        public Guid UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // e.g., "VerificationRequest", "AssetAssigned"
        public bool IsRead { get; set; }
        public Guid? RelatedEntityId { get; set; } // Can be EvidenceId or AssetId
        public DateTime CreatedAt { get; set; }
    }
}
