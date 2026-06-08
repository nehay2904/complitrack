const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth');
const complianceRoutes = require('./routes/compliance');
const userRoutes = require('./routes/user');
const alertLogRoutes = require('./routes/alertLog');

app.use('/api/auth', authRoutes);
app.use('/api/compliances', complianceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alertlogs', alertLogRoutes);

app.get('/', (req, res) => {
  res.send('CompliTrack API running');
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    require('./utils/scheduler');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error('MongoDB error:', err));