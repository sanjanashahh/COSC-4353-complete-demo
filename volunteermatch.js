const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const router = express.Router();
require('dotenv').config();
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection setup
const mongoURI = process.env.MONGO_URI; // Ensure your .env file has this variable set
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error("MongoDB connection error:", err));

    // Define a Mongoose schema for event
const eventSchema = new mongoose.Schema({
    eventName: String,
    eventDescription: String,
    eventLocation: String,
    skills: String,
    urgency: String,
    eventDate: Date,
});


const volunteerprofileSchema = new mongoose.Schema({
    username: String,
    fullName: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zipcode: String,
    skills: [String],
    preferences: [String],
    availability: [String],
    summary: String,
})


// Define models if they aren't already defined
const events = mongoose.model('events', eventSchema);
const volunteerprofile = mongoose.model('volunteerprofile', volunteerprofileSchema);

// Endpoint to get events from MongoDB
router.get('/events', async (req, res) => {
    try {
        const event = await events.find({});
        
        // Transform each event's `skills` field into an array
        const formattedEvents = event.map(events => ({
            ...events.toObject(), // Convert Mongoose document to plain JS object
            skills: events.skills ? events.skills.split(',') : [] // Split the skills string
        }));
        
        
        res.json(formattedEvents);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Failed to retrieve events" });
    }
});

// Endpoint to get volunteers based on selected event's required skills and date
router.get('/volunteers', async (req, res) => {
    const eventName = req.query.event;
    try {
        const event = await events.findOne({ eventName });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Convert event.skills (comma-separated string) to an array of skills
        const eventSkills = event.skills ? event.skills.split(',').map(skill => skill.trim()) : [];
    
        // Convert event date to string format (YYYY-MM-DD)
        const eventDateStr = event.eventDate.toISOString().split('T')[0];
        

        // Find volunteers whose `skills` match any required skill and who are available on the event date
        const matchingVolunteers = await volunteerprofile.find({
            skills: { $in: eventSkills },
            availability: eventDateStr // Check if the formatted event date exists in the availability array
        });

        res.json(matchingVolunteers);
    } catch (error) {
        console.error("Error fetching volunteers:", error);
        res.status(500).json({ message: "Failed to retrieve volunteers" });
    }
});

// Endpoint to confirm volunteer selection
router.post('/confirmSelection', async (req, res) => {
    const { event, volunteers } = req.body;
    
    if (!event || !volunteers || !volunteers.length) {
        return res.status(400).json({ message: "Event and at least one volunteer must be selected" });
    }

    try {
        // Loop through each selected volunteer to send notifications
        for (const username of volunteers) {
            // Create notification for each selected volunteer
            const notificationPayload = {
                username,
                type: 'Assignment',
                time: Date.now(),
                content: `New event assigned to you!` // You can customize the content if needed
            };

            // Send notification using the notification backend API
            await axios.post('http://localhost:3000/api/triggerEventAssignment/${username}', notificationPayload);
        }

        res.json({ message: `Volunteers ${volunteers.join(', ')} successfully matched to ${event}` });

    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ message: "Failed to send notifications" });
    }

});

module.exports = router;
