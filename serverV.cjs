// serverV.cjs
const express = require('express');
const path = require('path');
const { check, validationResult } = require('express-validator');
const cors = require('cors');
const mongoose = require('mongoose');

const router = express.Router();

// Define the Event schema
const EventSchema = new mongoose.Schema({
    eventName: { type: String, required: true, maxlength: 100 },
    eventDescription: { type: String, required: true },
    eventLocation: { type: String, required: true },
    skills: { type: String, required: true },
    urgency: { type: String, required: true },
    eventDate: { type: Date, required: true },
}, { timestamps: true });

const Event = mongoose.model('Event', EventSchema);

// Middleware setup
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname)));

// Serve the main page (if needed)
//router.get('/', (req, res) => {
//    res.sendFile(path.join(__dirname, 'EMF.html'));
//});

// Validation middleware
const validateEventForm = [
    check('eventName')
        .notEmpty().withMessage('Event name is required')
        .isLength({ max: 100 }).withMessage('Event name must be 100 characters or fewer'),
    check('eventDescription')
        .notEmpty().withMessage('Event description is required'),
    check('eventLocation')
        .notEmpty().withMessage('Event location is required'),
    check('skills')
        .notEmpty().withMessage('At least one skill is required'),
    check('urgency')
        .notEmpty().withMessage('Urgency level is required'),
    check('eventDate')
        .notEmpty().withMessage('Event date is required')
        .isISO8601().withMessage('Event date must be a valid date'),
];

// Handle form submission
router.post('/submit-form', validateEventForm, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { eventName, eventDescription, eventLocation, skills, urgency, eventDate } = req.body;

    try {
        // Check for duplicate event submissions by event name
        const existingEvent = await Event.findOne({ eventName });
        if (existingEvent) {
            return res.status(400).json({
                errors: [{ msg: 'Duplicate event submissions are not allowed' }],
            });
        }

        // Create and save new event
        const newEvent = new Event({
            eventName,
            eventDescription,
            eventLocation,
            skills,
            urgency,
            eventDate
        });

        await newEvent.save(); 

        // Respond with the created event
        res.status(201).json({ message: 'Event submitted successfully!', event: newEvent });
    } catch (error) {
        console.error('Error submitting event:', error);
        res.status(500).json({ message: 'Server error, please try again later.' });
    }
}); 

// Export the router instance for use in the main server file
module.exports = router;
