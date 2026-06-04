const Message = require('../models/Message');

exports.submitMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject, and message are required.' });
    }

    const newMessage = new Message({
      name,
      email,
      phone: phone || '',
      subject,
      message,
    });

    await newMessage.save();

    return res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving message', error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    return res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Message not found' });
    }

    return res.status(200).json({
      message: 'Message marked as read',
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating message', error: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    return res.status(200).json({
      message: 'Message deleted successfully',
      data: deleted,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting message', error: err.message });
  }
};
