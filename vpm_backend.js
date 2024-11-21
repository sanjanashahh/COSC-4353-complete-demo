// volunteerProfileRoutes.js
const express = require('express');
const path = require('path');
const { check, validationResult } = require('express-validator');
const cors = require('cors');
const mongoose = require('mongoose');

const router = express.Router();

// Define Volunteer Profile Schema
const VolunteerProfileSchema = new mongoose.Schema({
    username : String, //{ type: String, required: true },
    fullName: String, //{ type: String, required: true, maxlength: 50 },
    address1: String, //{ type: String, required: true, maxlength: 100 },
    address2: String,
    city: String, //{ type: String, required: true, maxlength: 100 },
    state: String, //{ type: String, required: true, minlength: 2, maxlength: 2 },
    zipcode: String, //{ type: String, required: true, match: /^[0-9]{5}(-[0-9]{4})?$/ },
    skills: [String],
    preferences: [String],
    availability: { type: [String], required: true },
    summary: String, //{ type: String, maxlength: 300 },
});

const VolunteerProfile = mongoose.model('VolunteerProfile', VolunteerProfileSchema); 

// Middleware setup
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname)));

// Serve the main page
//router.get('/', (req, res) => {
  //  res.sendFile(path.join(__dirname, 'VPM.html'));
//});

// Validation middleware
const validateVolunteerForm = [
    check('fullName').notEmpty().withMessage('Full name is required')
        .isLength({ max: 50 }).withMessage('Full name should be less than 50 characters'),
    check('address1').notEmpty().withMessage('Address 1 is required')
        .isLength({ max: 100 }).withMessage('Address 1 should be less than 100 characters'),
    check('city').notEmpty().withMessage('City is required')
        .isLength({ max: 100 }).withMessage('City should be less than 100 characters'),
    check('state').notEmpty().withMessage('State is required')
        .isLength({ min: 2, max: 2 }).isAlpha().withMessage('State should be a 2-character alphabetical abbreviation'),
    check('zipcode').notEmpty().withMessage('Zipcode is required')
        .matches(/^[0-9]{5}(-[0-9]{4})?$/).withMessage('Zipcode should be a valid format'),
    check('summary').optional().isLength({ max: 300 }).withMessage('Summary should be less than 300 characters'),
    check('availability').isArray({ min: 1 }).withMessage('At least one availability date should be selected'),
];

// Handle form submission with MongoDB
router.post('/profileData', validateVolunteerForm, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, fullName, address1, address2, city, state, zipcode, skills, preferences, availability, summary } = req.body;

    try {
        // Check for duplicate profile submissions by full name
        const existingProfile = await VolunteerProfile.findOne({ fullName });
        if (existingProfile) {
            return res.status(400).json({
                errors: [{ msg: 'Duplicate profile submissions are not allowed for the same username.' }],
            });
        }

        // Create and save new profile
        const newProfile = new VolunteerProfile({
            username,
            fullName,
            address1,
            address2: address2 || '',
            city,
            state,
            zipcode,
            skills: Array.isArray(skills) ? skills : skills ? [skills] : [],
            preferences: Array.isArray(preferences) ? preferences : preferences ? [preferences] : [],
            availability,
            summary: summary || ''
        });

        await newProfile.save();

        // Respond with the created profile
        res.status(200).json({
            message: 'Profile created successfully!',
            profile: newProfile,
        });
    } catch (error) {
        console.error('Error saving profile data:', error);
        res.status(500).json({ message: 'Error saving profile data', error });
    }
});

// Export the router instance for use in the main server file
module.exports = router;
