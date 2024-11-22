// volunteer_history.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
require('dotenv').config();



// Define a Mongoose schema for volunteer history
const volunteerHistorySchema = new mongoose.Schema({
    username: String,
    eventName: String,
    eventDate: String,
    location: String,
    skill: String,
    status: String
});

// Model for volunteer history
const VolunteerHistory = mongoose.model('VolunteerHistory', volunteerHistorySchema);

// Get volunteer history
router.get('/volunteer-history/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const history = await VolunteerHistory.find({ username: username });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching volunteer history', error });
    }
});


router.post('/updateVolunteerHistory', async (req, res) => {
    const { username, eventName, eventDate, location, department, skill, status } = req.body;

    try {
        // Check if the event history entry already exists
        const history = await VolunteerHistory.findOne({ username, eventName });

        if (history) {
            // Update the status if entry exists
            history.status = status; // Set status to 'Pending' initially
            await history.save();
        } else {
            // Create new entry for the volunteer
            const newHistory = new VolunteerHistory({
                username,
                eventName,
                eventDate,
                location,
                skill,
                status,
            });
            await newHistory.save();
        }
        
        res.json({ message: 'Volunteer history updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating volunteer history', error });
    }
});



module.exports = router;
