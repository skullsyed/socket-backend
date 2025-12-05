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

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
