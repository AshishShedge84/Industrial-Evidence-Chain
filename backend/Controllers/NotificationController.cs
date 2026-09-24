using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.DTOs.Common;
using backend.DTOs.Notifications;
using backend.Services;
using System.Diagnostics;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    [Produces("application/json")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private Guid GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
            if (Guid.TryParse(idClaim, out var id)) return id;
            throw new UnauthorizedAccessException("Invalid user identity.");
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            try
            {
                var userId = GetUserId();
                var notifications = await _notificationService.GetUserNotificationsAsync(userId);
                return Ok(ApiResponse<List<NotificationDto>>.SuccessResult(notifications, reqId));
            }
            catch (Exception ex)
            {
                return Unauthorized(ApiResponse<List<NotificationDto>>.ErrorResult(new ErrorResponseDto { Code = "UNAUTHORIZED", Message = ex.Message }, reqId));
            }
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            try
            {
                var userId = GetUserId();
                var count = await _notificationService.GetUnreadCountAsync(userId);
                return Ok(ApiResponse<int>.SuccessResult(count, reqId));
            }
            catch (Exception ex)
            {
                return Unauthorized(ApiResponse<int>.ErrorResult(new ErrorResponseDto { Code = "UNAUTHORIZED", Message = ex.Message }, reqId));
            }
        }

        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            try
            {
                var userId = GetUserId();
                await _notificationService.MarkAsReadAsync(id, userId);
                return Ok(ApiResponse<bool>.SuccessResult(true, reqId));
            }
            catch (Exception ex)
            {
                return Unauthorized(ApiResponse<bool>.ErrorResult(new ErrorResponseDto { Code = "UNAUTHORIZED", Message = ex.Message }, reqId));
            }
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var reqId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            try
            {
                var userId = GetUserId();
                await _notificationService.MarkAllAsReadAsync(userId);
                return Ok(ApiResponse<bool>.SuccessResult(true, reqId));
            }
            catch (Exception ex)
            {
                return Unauthorized(ApiResponse<bool>.ErrorResult(new ErrorResponseDto { Code = "UNAUTHORIZED", Message = ex.Message }, reqId));
            }
        }
    }
}
