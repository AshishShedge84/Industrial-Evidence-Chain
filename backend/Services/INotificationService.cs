using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using backend.DTOs.Notifications;

namespace backend.Services
{
    public interface INotificationService
    {
        Task<List<NotificationDto>> GetUserNotificationsAsync(Guid userId, CancellationToken cancellationToken = default);
        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
        Task MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default);
        Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);
        Task CreateNotificationAsync(Guid userId, string title, string message, string type, Guid? relatedEntityId = null, CancellationToken cancellationToken = default);
    }
}
