const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const eventRouter = require('../serverV.cjs'); // Ensure this path is correctnn

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(eventRouter);

let mongoServer;

// Utility function to submit an event 
const submitEvent = async (eventData) => {
    return await request(app).post('/submit-form').send(eventData);
};

// Utility function to check response
const checkResponse = (response, expectedStatus, expectedMessage, expectedEventName) => {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
        expect(response.body.message).toBe(expectedMessage);
    }
    if (expectedEventName) {
        expect(response.body.event.eventName).toBe(expectedEventName);
    }
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Event Submission API', () => {
    afterEach(() => {
        const { submittedEvents } = require('../serverV.cjs'); // Update this path accordingly
        if (submittedEvents) {
            submittedEvents.length = 0; // Resetting the array for isolation
        }
    });

    it('should successfully submit a valid event', async () => {
        const response = await submitEvent({
            eventName: 'Community Cleanup',
            eventDescription: 'A day to clean up the local park.',
            eventLocation: 'Central Park',
            skills: 'Cleaning, Organizing',
            urgency: 'High',
            eventDate: '2024-11-10T00:00:00Z'
        });

        checkResponse(response, 201, 'Event submitted successfully!', 'Community Cleanup');
    });

    it('should return validation errors for missing fields', async () => {
        const response = await submitEvent({
            eventName: '',
            eventDescription: '',
            eventLocation: '',
            skills: '',
            urgency: '',
            eventDate: ''
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(7); // Update if your validation logic returns 7 errors
    });

    it('should return an error for duplicate event submissions', async () => {
        await submitEvent({
            eventName: 'Community Cleanup',
            eventDescription: 'A day to clean up the local park.',
            eventLocation: 'Central Park',
            skills: 'Cleaning, Organizing',
            urgency: 'High',
            eventDate: '2024-11-10T00:00:00Z'
        });

        const response = await submitEvent({
            eventName: 'Community Cleanup', // Duplicate name
            eventDescription: 'Another description.',
            eventLocation: 'Central Park',
            skills: 'Cleaning',
            urgency: 'Medium',
            eventDate: '2024-11-10T00:00:00Z'
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0].msg).toBe('Duplicate event submissions are not allowed');
    });

    it('should return validation error for invalid date format', async () => {
        const response = await submitEvent({
            eventName: 'Invalid Date Event',
            eventDescription: 'This event has an invalid date.',
            eventLocation: 'Unknown',
            skills: 'Unknown',
            urgency: 'High',
            eventDate: 'invalid-date' // Invalid date
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0].msg).toBe('Event date must be a valid date');
    });
});
