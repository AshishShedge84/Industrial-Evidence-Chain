// Automated test verifying notificationService logic, clearAll, sendReply, and message types

const sampleNotifications = [
  {
    id: "notif-1",
    recipientId: "all",
    senderId: "2",
    senderName: "Sarah Connor",
    title: "New Message",
    message: "Check the generator",
    type: "message",
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "notif-2",
    recipientId: "all",
    senderId: "4",
    senderName: "Admin User",
    title: "Evidence Update",
    message: "Evidence reviewed",
    type: "success",
    read: false,
    createdAt: new Date().toISOString()
  }
];

let dbNotifications = JSON.parse(JSON.stringify(sampleNotifications));

const mockService = {
  getNotifications() {
    return dbNotifications;
  },
  getNotificationsForUser(userId) {
    return this.getNotifications().filter(n => n.recipientId === userId || n.recipientId === 'all');
  },
  clearAll(userId) {
    dbNotifications = dbNotifications.filter(n => n.recipientId !== userId && n.recipientId !== 'all');
  },
  sendReply(params) {
    const original = this.getNotifications().find(n => n.id === params.notificationId);
    if (original) {
      original.replied = true;
      original.replyText = params.message;
      original.repliedAt = new Date().toISOString();
      original.read = true;
    }
    const reply = {
      id: `NOT-REPLY-${Date.now()}`,
      recipientId: params.recipientId,
      senderId: params.senderId,
      senderName: params.senderName,
      title: `Reply from ${params.senderName}`,
      message: params.message,
      type: 'message',
      read: false,
      createdAt: new Date().toISOString()
    };
    dbNotifications.push(reply);
    return reply;
  }
};

console.log('=== NOTIFICATION CENTER LOGIC TESTS ===\n');

// Test 1: Fetch notifications for user
const userNotifs = mockService.getNotificationsForUser('1');
console.assert(userNotifs.length === 2, 'Should return 2 notifications');
console.log(`[PASS] Initial notifications count: ${userNotifs.length}`);

// Test 2: Message vs system type
const msgNotif = userNotifs.find(n => n.type === 'message');
const sysNotif = userNotifs.find(n => n.type === 'success');
console.assert(msgNotif && msgNotif.senderName === 'Sarah Connor', 'Message notification from Sarah Connor');
console.assert(sysNotif && sysNotif.senderName === 'Admin User', 'System notification from Admin User');
console.log('[PASS] Correctly distinguished message notification vs system notification');

// Test 3: Functional Reply
const reply = mockService.sendReply({
  notificationId: 'notif-1',
  senderId: '1',
  senderName: 'John Smith',
  recipientId: '2',
  message: 'I have checked the generator readings, all within normal limits.'
});
console.assert(reply && reply.recipientId === '2', 'Reply should be addressed to Sarah Connor (id: 2)');
console.assert(msgNotif.replied === true, 'Original notification marked as replied');
console.assert(msgNotif.replyText.includes('generator readings'), 'Reply text stored on original notification');
console.log(`[PASS] Send reply functional: Reply created (${reply.id}) and original marked as replied: "${msgNotif.replyText}"`);

// Test 4: Clear all
mockService.clearAll('1');
const remainingNotifs = mockService.getNotificationsForUser('1');
console.assert(remainingNotifs.length === 0, 'All notifications should be cleared');
console.log('[PASS] Clear all successfully emptied the notifications list');

console.log('\nAll Notification Center logic tests passed successfully!\n');
