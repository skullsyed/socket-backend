import Message from "../models/Message.js";

export const saveMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;

    const newMessage = await Message.create({ senderId, receiverId, message });

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    console.log("Fetching messages...", { senderId, receiverId });

    let messages;

    // If both senderId and receiverId are provided, get conversation between them
    if (senderId && receiverId) {
      messages = await Message.find({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      })
        .sort({ timestamp: 1 })
        .maxTimeMS(5000); // 5 second timeout
    } else {
      // If no parameters provided, get all messages
      messages = await Message.find({}).sort({ timestamp: 1 }).maxTimeMS(5000);
    }

    console.log(`Found ${messages.length} messages`);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    console.log("Fetching unread count for userId:", userId);

    // Get unread messages where the user is the receiver
    const unreadMessages = await Message.find({
      receiverId: userId,
      isRead: false,
    }).maxTimeMS(5000);

    // Group by sender to get unread count per conversation
    const unreadBySender = {};
    let totalUnread = 0;

    unreadMessages.forEach((msg) => {
      if (!unreadBySender[msg.senderId]) {
        unreadBySender[msg.senderId] = 0;
      }
      unreadBySender[msg.senderId]++;
      totalUnread++;
    });

    console.log(`Found ${totalUnread} unread messages`);

    res.json({
      totalUnread,
      unreadBySender,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Optional: Add function to mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { userId, senderId } = req.body;

    if (!userId || !senderId) {
      return res
        .status(400)
        .json({ error: "userId and senderId are required" });
    }

    console.log("Marking messages as read:", { userId, senderId });

    // Mark all messages from senderId to userId as read
    const result = await Message.updateMany(
      {
        receiverId: userId,
        senderId: senderId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    console.log(`Marked ${result.modifiedCount} messages as read`);

    res.json({
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
