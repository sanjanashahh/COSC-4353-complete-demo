const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const volunteerHistoryRouter = require('../volunteer_history_backend.js'); // Ensure this path is correct

const app = express();
app.use(express.json());
app.use(volunteerHistoryRouter);

let mongoServer;

// Utility function to add or update a volunteer history entry
const addOrUpdateVolunteerHistory = async (historyData) => {
    return await request(app).post('/updateVolunteerHistory').send(historyData);
};

// Utility function to fetch volunteer history for a specific user
const fetchVolunteerHistory = async (username) => {
    return await request(app).get(`/volunteer-history/${username}`);
};

beforeAll(async () => {
    // Initialize in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    // Disconnect from MongoDB and stop in-memory server
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('Volunteer History API', () => {
    it('should fetch an empty volunteer history initially for a new user', async () => {
        const response = await fetchVolunteerHistory('testuser');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]); // Expecting an empty array
    });

    it('should successfully add a new volunteer history entry', async () => {
        const newEntry = {
            username: 'testuser',
            eventName: 'Beach Cleanup',
            eventDate: '2024-11-01',
            location: 'Houston Beach',
            skill: 'Environmental Awareness',
            status: 'Completed',
        };

        const response = await addOrUpdateVolunteerHistory(newEntry);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Volunteer history updated successfully'); // Verify success message

        // Verify the entry was added by fetching the history
        const historyResponse = await fetchVolunteerHistory('testuser');
        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body).toHaveLength(1);
        expect(historyResponse.body[0]).toMatchObject(newEntry);
    });

    it('should update the status of an existing volunteer history entry', async () => {
        const newEntry = {
            username: 'testuser',
            eventName: 'Beach Cleanup',
            eventDate: '2024-11-01',
            location: 'Houston Beach',
            skill: 'Environmental Awareness',
            status: 'Pending',
        };

        // Add the initial entry
        await addOrUpdateVolunteerHistory(newEntry);

        // Update the status
        const updatedEntry = { ...newEntry, status: 'Completed' };
        const response = await addOrUpdateVolunteerHistory(updatedEntry);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Volunteer history updated successfully');

        // Verify the updated status
        const historyResponse = await fetchVolunteerHistory('testuser');
        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body[0].status).toBe('Completed');
    });

    it('should handle errors when adding an invalid volunteer history entry', async () => {
        const invalidEntry = {
            username: 'testuser',
            eventName: '', // Missing eventName
            eventDate: 'invalid-date', // Invalid date
            location: '', 
            skill: '',
            status: '', 
        };

        const response = await addOrUpdateVolunteerHistory(invalidEntry);
        expect(response.status).toBe(400); // Expecting a client error for invalid input
        expect(response.body.message).toBe('Validation error: Missing required fields or invalid data'); // Adjust this based on your backend validation message
    });
});
