const request = require('supertest');
const app = require('../notify_backend.js');

describe('Notification API', () => {
    it('should return all notifications', async () => {
        const response = await request(app).get('/notifications');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    it('should trigger an event update notification', async () => {
        const response = await request(app).post('/triggerEventUpdate');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('type', 'Update');
    });

    it('should trigger an event assignment notification', async () => {
        const response = await request(app).post('/triggerEventAssignment');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('type', 'Assignment');
    });

    it('should trigger a reminder notification', async () => {
        const response = await request(app).post('/triggerReminder');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('type', 'Reminder');
    });
});
