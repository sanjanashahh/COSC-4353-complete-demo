// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
require('dotenv').config(); // Load environment variables from .env

// Importing routes
const authRoutes = require('./login_and_register.cjs');
const volunteerHistoryRoutes = require('./volunteer_history_backend.js');
const volunteerMatchRoutes = require('./volunteermatch.js');
const notificationRoutes = require('./notify_backend.js');
const eventManagementRoutes = require('./serverV.cjs');
const VolEditProfRoutes = require('./vpm_backend.js');
const volunteerReport = require('./reportmodule.js')

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mount routes
app.use('/api', authRoutes);
app.use('/api', volunteerHistoryRoutes);
app.use('/api', volunteerMatchRoutes);
app.use('/api', notificationRoutes);
app.use('/api', VolEditProfRoutes);
app.use('/api', eventManagementRoutes);
app.use('/api', volunteerReport);

// Connect to database
connectDB();

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

