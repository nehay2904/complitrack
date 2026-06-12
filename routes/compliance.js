const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Compliance = require('../models/Compliance');
const { protect, adminOnly } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET all compliances (admin sees all, user sees their dept)
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') filter.dept = req.user.dept;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.dept) filter.dept = req.query.dept;
    if (req.query.recurrence) filter.recurrence = req.query.recurrence;
    const compliances = await Compliance.find(filter).populate('Signing_Authority', 'name email dept');
    res.json(compliances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/////////
// GET single compliance
router.get('/:id', protect, async (req, res) => {
  try {
    const compliance = await Compliance.findById(req.params.id).populate('Signing_Authority', 'name email dept');
    if (!compliance) return res.status(404).json({ message: 'Not found' });
    res.json(compliance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'Completed') update.completedDate = new Date();
    const compliance = await Compliance.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(compliance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH assign to user (admin only)
router.patch('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const compliance = await Compliance.findByIdAndUpdate(
      req.params.id, { Signing_Authority: userId }, { new: true }
    ).populate('Signing_Authority', 'name email dept');
    res.json(compliance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST upload completion proof
router.post('/:id/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const compliance = await Compliance.findByIdAndUpdate(
      req.params.id,
      { completionFile: req.file.filename, status: 'Completed', completedDate: new Date() },
      { new: true }
    );
    res.json(compliance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// POST create new compliance (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const compliance = await Compliance.create(req.body);
    res.status(201).json(compliance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;