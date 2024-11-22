const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reportRouter = require('../reportmodule.js'); // Adjust the path to your router file

// Initialize the Express app and router
const app = express();
app.use(express.json());
app.use('/', reportRouter);

// Mock Mongoose models
jest.mock('mongoose', () => {
    const originalModule = jest.requireActual('mongoose');
    return {
        ...originalModule,
        model: jest.fn().mockImplementation((name) => {
            const mockFind = jest.fn();
            if (name === 'volunteerhistories') {
                mockFind.mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        {
                            username: 'testuser1',
                            eventName: 'Health Camp',
                            eventDate: '2024-11-01',
                            location: 'NYC',
                            skill: 'First Aid',
                            status: 'Completed',
                        },
                    ]),
                });
            } else if (name === 'Events') {
                mockFind.mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        {
                            eventName: 'Health Camp',
                            eventDescription: 'A health checkup event',
                            eventLocation: 'NYC',
                            skills: 'First Aid',
                            urgency: 'High',
                            eventDate: '2024-11-01',
                        },
                    ]),
                });
            } else if (name === 'volunteerprofiles') {
                mockFind.mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        {
                            username: 'testuser1',
                            fullName: 'John Doe',
                            skills: ['First Aid', 'CPR'],
                            availability: ['Monday', 'Friday'],
                        },
                    ]),
                });
            }
            return { find: mockFind };
        }),
    };
});

describe('Volunteer Report API Tests', () => {
    afterAll(async () => {
        await mongoose.disconnect(); // Clean up after tests
    });

    test('Generate CSV Report - Success', async () => {
        const response = await request(app).get('/generateCsvReport');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Report generated successfully.');
        expect(response.body).toHaveProperty('downloadLinks.csv');
    });

    test('Generate CSV Report - No Data', async () => {
        mongoose.model.mockImplementationOnce(() => ({
            find: jest.fn().mockResolvedValue([]), // Return no data
        }));

        const response = await request(app).get('/generateCsvReport');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'No volunteer history records found.');
    });

    test('Generate PDF Report - Success', async () => {
        const response = await request(app).get('/generatePdfReport');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Report generated successfully.');
        expect(response.body).toHaveProperty('downloadLinks.pdf');
    });

    test('Generate PDF Report - No Data', async () => {
        mongoose.model.mockImplementationOnce(() => ({
            find: jest.fn().mockResolvedValue([]), // Return no data
        }));

        const response = await request(app).get('/generatePdfReport');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'No volunteer history records found.');
    });

    test('Generate CSV Report - Internal Error', async () => {
        mongoose.model.mockImplementationOnce(() => ({
            find: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        const response = await request(app).get('/generateCsvReport');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message', 'Error generating report');
    });

    test('Generate PDF Report - Internal Error', async () => {
        mongoose.model.mockImplementationOnce(() => ({
            find: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        const response = await request(app).get('/generatePdfReport');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message', 'Error generating report');
    });

    


});
