const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const router = require('../volunteermatch.js'); // path to your router file

const app = express();
app.use(express.json()); // Ensure JSON parsing middleware is applied
app.use(router);

jest.mock('axios');

describe('API Routes', () => {
  beforeAll(() => {
    mongoose.connect = jest.fn().mockResolvedValue();
  });

  afterAll(() => {
    mongoose.disconnect = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /events', () => {
    it('should return a list of events', async () => {
      const eventsMock = [
        {
          eventName: 'Food Drive',
          eventDescription: 'Helping those in need',
          eventLocation: 'Downtown',
          skills: 'Cooking, Organizing',
          urgency: 'High',
          eventDate: new Date('2024-12-01'),
        },
      ];

      const eventsModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue(eventsMock);

      const res = await request(app).get('/events');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0]).toHaveProperty('eventName', 'Food Drive');
      expect(res.body[0].skills).toEqual(['Cooking', 'Organizing']);

      eventsModelMock.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const eventsModelMock = jest.spyOn(mongoose.Model, 'find').mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/events');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('message', 'Failed to retrieve events');

      eventsModelMock.mockRestore();
    });

    it('should return an empty array when no events are found', async () => {
      const eventsModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue([]);

      const res = await request(app).get('/events');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);

      eventsModelMock.mockRestore();
    });

    it('should handle events with no skills gracefully', async () => {
      const eventsMock = [
        {
          eventName: 'No Skill Event',
          eventDescription: 'An event without skills specified',
          eventLocation: 'Online',
          skills: '',
          urgency: 'Medium',
          eventDate: new Date('2024-12-15'),
        },
      ];
    
      const eventsModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue(eventsMock);
    
      const res = await request(app).get('/events');
    
      expect(res.status).toBe(200);
      expect(res.body[0].skills).toEqual([]);
    
      eventsModelMock.mockRestore();
    });
  });

  describe('GET /volunteers', () => {
    it('should return matching volunteers based on skills and availability', async () => {
      const eventMock = {
        eventName: 'Food Drive',
        skills: 'Cooking, Organizing',
        eventDate: new Date('2024-12-01'),
      };

      const volunteersMock = [
        {
          username: 'volunteer1',
          skills: ['Cooking'],
          availability: ['2024-12-01'],
        },
        {
          username: 'volunteer2',
          skills: ['Organizing'],
          availability: ['2024-12-01'],
        },
      ];

      const eventModelMock = jest.spyOn(mongoose.Model, 'findOne').mockResolvedValue(eventMock);
      const volunteerModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue(volunteersMock);

      const res = await request(app).get('/volunteers?event=Food Drive');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('username', 'volunteer1');
      expect(res.body[1]).toHaveProperty('username', 'volunteer2');

      eventModelMock.mockRestore();
      volunteerModelMock.mockRestore();
    });

    it('should return 404 if event is not found', async () => {
      const eventModelMock = jest.spyOn(mongoose.Model, 'findOne').mockResolvedValue(null);

      const res = await request(app).get('/volunteers?event=Nonexistent Event');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Event not found');

      eventModelMock.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const eventModelMock = jest.spyOn(mongoose.Model, 'findOne').mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/volunteers?event=Food Drive');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('message', 'Failed to retrieve volunteers');

      eventModelMock.mockRestore();
    });

    it('should return an empty array when no matching volunteers are found', async () => {
      const eventMock = {
        eventName: 'Food Drive',
        skills: 'Cooking, Organizing',
        eventDate: new Date('2024-12-01'),
      };

      const eventModelMock = jest.spyOn(mongoose.Model, 'findOne').mockResolvedValue(eventMock);
      const volunteerModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue([]);

      const res = await request(app).get('/volunteers?event=Food Drive');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);

      eventModelMock.mockRestore();
      volunteerModelMock.mockRestore();
    });

    it('should return an empty array if no volunteers have matching skills', async () => {
      const eventMock = {
        eventName: 'Food Drive',
        skills: 'Organizing',
        eventDate: new Date('2024-12-01'),
      };
    
      const volunteersMock = [
        {
          username: 'volunteer1',
          skills: ['Cooking'],
          availability: ['2024-12-01'],
        },
      ];
    
      const eventModelMock = jest.spyOn(mongoose.Model, 'findOne').mockResolvedValue(eventMock);
      const volunteerModelMock = jest.spyOn(mongoose.Model, 'find').mockResolvedValue([]);
    
      const res = await request(app).get('/volunteers?event=Food Drive');
    
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    
      eventModelMock.mockRestore();
      volunteerModelMock.mockRestore();
    });
    
  });

  describe('POST /confirmSelection', () => {
    it('should confirm volunteer selection and send notifications', async () => {
      const notificationMock = {
        username: 'volunteer1',
        type: 'Assignment',
        time: expect.any(Number),
        content: 'New event assigned to you!',
      };

      axios.post.mockResolvedValue({ status: 200 });

      const res = await request(app)
        .post('/confirmSelection')
        .send({ event: 'Food Drive', volunteers: ['volunteer1'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Volunteers volunteer1 successfully matched to Food Drive');
      
     // Ensure axios was called with correct URL and payload
     expect(axios.post).toHaveBeenCalledWith(
       `http://localhost:3000/api/triggerEventAssignment/volunteer1`,
       notificationMock
     );
   }, 10000);

   // Other tests for POST /confirmSelection...
 });

  it('should return 400 if no volunteers are provided', async () => {
    const res = await request(app)
      .post('/confirmSelection')
      .send({ event: 'Food Drive', volunteers: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Event and at least one volunteer must be selected');
  });

  it('should handle notification errors gracefully', async () => {
    axios.post.mockRejectedValue(new Error('Notification service down'));

    const res = await request(app)
      .post('/confirmSelection')
      .send({ event: 'Food Drive', volunteers: ['volunteer1'] });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Failed to send notifications');
  });

});