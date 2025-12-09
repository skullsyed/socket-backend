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
