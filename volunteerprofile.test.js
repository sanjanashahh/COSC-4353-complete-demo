const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const volunteerProfileRouter = require('../vpm_backend.js'); // Ensure this path is correct

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(volunteerProfileRouter);

let mongoServer;

// Utility function to submit a volunteer profile
const submitProfile = async (profileData) => {
    return await request(app).post('/profileData').send(profileData);
};

// Utility function to check response
const checkResponse = (response, expectedStatus, expectedMessage, expectedProfileName) => {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
        expect(response.body.message).toBe(expectedMessage);
    }
    if (expectedProfileName) {
        expect(response.body.profile.fullName).toBe(expectedProfileName);
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

describe('Volunteer Profile Submission API', () => {
    afterEach(async () => {
        await mongoose.connection.collection('volunteerprofiles').deleteMany({}); // Clear profiles after each test
    });

    it('should successfully submit a valid volunteer profile', async () => {
        const response = await submitProfile({
            fullName: 'John Doe',
            address1: '123 Main St',
            address2: 'Apt 4B',
            city: 'Anytown',
            state: 'TX',
            zipcode: '12345',
            skills: ['First Aid', 'Organizing'],
            preferences: ['Weekends'],
            availability: ['Weekdays'],
            summary: 'Looking to help out in my community.',
        });

        checkResponse(response, 201, 'Profile created successfully!', 'John Doe');
    });

    it('should return validation errors for missing fields', async () => {
        const response = await submitProfile({
            fullName: '',
            address1: '',
            city: '',
            state: '',
            zipcode: '',
            availability: []
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(5); // Update if your validation logic returns the expected number of errors
    });

    it('should return an error for duplicate profile submissions', async () => {
        await submitProfile({
            fullName: 'John Doe',
            address1: '123 Main St',
            city: 'Anytown',
            state: 'TX',
            zipcode: '12345',
            availability: ['Weekdays'],
        });

        const response = await submitProfile({
            fullName: 'John Doe', // Duplicate name
            address1: '456 Other St',
            city: 'Othertown',
            state: 'TX',
            zipcode: '67890',
            availability: ['Weekends'],
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0].msg).toBe('Duplicate profile submissions are not allowed for the same full name.');
    });

    it('should return validation error for invalid zipcode format', async () => {
        const response = await submitProfile({
            fullName: 'Jane Smith',
            address1: '789 Park Ave',
            city: 'Sometown',
            state: 'NY',
            zipcode: 'invalid-zipcode', // Invalid zipcode
            availability: ['Weekdays'],
        });

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0].msg).toBe('Zipcode should be a valid format');
    });
});
