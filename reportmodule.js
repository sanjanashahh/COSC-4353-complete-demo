const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const csv = require('csv-writer').createObjectCsvWriter;
const pdf = require('pdfkit');
const fs = require('fs');
const path = require('path');
const router = express.Router();
require('dotenv').config();

// Middleware setup
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname)));

const volunteerHistorySchema = new mongoose.Schema({
    username: String,
    eventName: String,
    eventDate: String,
    location: String,
    skill: String,
    status: String
});

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

const eventSchema = new mongoose.Schema({
    eventName: String,
    eventDescription: String,
    eventLocation: String,
    skills: String,
    urgency: String,
    eventDate: Date,
});

// Import your existing models
const VolunteerHistory = mongoose.model('volunteerhistories', volunteerHistorySchema); // Should already exist in your app
const Events = mongoose.model('Events', eventSchema); // Events model
const VolunteerProfile = mongoose.model('volunteerprofiles', VolunteerProfileSchema); // Volunteer Profiles model

// Route to generate a report
router.get('/generateCsvReport', async (req, res) => {
    try {
        // Query data from the collections
        const volunteerHistories = await VolunteerHistory.find({}).lean(); // Fetch all volunteer histories
        const events = await Events.find({}).lean(); // Fetch all events
        const volunteerProfiles = await VolunteerProfile.find({}).lean(); // Fetch all volunteer profiles

        // Check if there is data available
        if (!volunteerHistories.length) {
            return res.status(404).json({ message: 'No volunteer history records found.' });
        }

        // Combine and process the data
        const reportData = volunteerHistories.map(history => {
            const event = events.find(e => e.eventName === history.eventName);
            const volunteer = volunteerProfiles.find(v => v.username === history.username);
            return {
                username: volunteer?.username || 'Unknown',
                fullName: volunteer?.fullName || 'Unknown',
                eventName: event?.eventName || 'Unknown',
                eventDate: event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Unknown',
                location: event?.eventLocation || 'Unknown',
                skill: volunteer?.skills?.join(', ') || 'Unknown',
                status: history.status || 'Unknown',
            };
        });

        // Generate CSV
        const csvPath = path.join(__dirname, 'volunteer_report.csv');
        const csvWriterInstance = csv({
            path: csvPath,
            header: [
                { id: 'username', title: 'Username' },
                { id: 'fullName', title: 'Full Name' },
                { id: 'eventName', title: 'Event Name' },
                { id: 'eventDate', title: 'Event Date' },
                { id: 'location', title: 'Location' },
                { id: 'skill', title: 'Skill' },
                { id: 'status', title: 'Status' },
            ]
        });

        await csvWriterInstance.writeRecords(reportData);


        // Respond with file download links
        res.json({
            message: 'Report generated successfully.',
            downloadLinks: {
                csv: `/volunteer_report.csv`
            }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Error generating report', error });
    }
});

router.get('/generatePdfReport', async (req, res) => {
    try{
        // Query data from the collections
        const volunteerHistories = await VolunteerHistory.find({}).lean(); // Fetch all volunteer histories
        const events = await Events.find({}).lean(); // Fetch all events
        const volunteerProfiles = await VolunteerProfile.find({}).lean(); // Fetch all volunteer profiles

        // Check if there is data available
        if (!volunteerHistories.length) {
            return res.status(404).json({ message: 'No volunteer history records found.' });
        }

        // Combine and process the data
        const reportData = volunteerHistories.map(history => {
            const event = events.find(e => e.eventName === history.eventName);
            const volunteer = volunteerProfiles.find(v => v.username === history.username);
            return {
                username: volunteer?.username || 'Unknown',
                fullName: volunteer?.fullName || 'Unknown',
                eventName: event?.eventName || 'Unknown',
                eventDate: event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Unknown',
                location: event?.eventLocation || 'Unknown',
                skill: volunteer?.skills?.join(', ') || 'Unknown',
                status: history.status || 'Unknown',
            };
        });

        // Generate PDF
        const pdfPath = path.join(__dirname, 'volunteer_report.pdf');
        const doc = new pdf();
        doc.pipe(fs.createWriteStream(pdfPath));

        doc.fontSize(16).text('Volunteer Report', { align: 'center' });
        doc.moveDown();
        reportData.forEach(entry => {
            doc
                .fontSize(12)
                .text(`Username: ${entry.username}`)
                .text(`Full Name: ${entry.fullName}`)
                .text(`Event: ${entry.eventName}`)
                .text(`Date: ${entry.eventDate}`)
                .text(`Location: ${entry.location}`)
                .text(`Skill: ${entry.skill}`)
                .text(`Status: ${entry.status}`)
                .moveDown();
        });
        doc.end();

        // Respond with file download links
        res.json({
            message: 'Report generated successfully.',
            downloadLinks: {
                pdf: `/volunteer_report.pdf`
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Error generating report', error });
    }


});

module.exports = router;