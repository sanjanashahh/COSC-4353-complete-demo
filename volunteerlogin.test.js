const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const router = require('../login_and_register.cjs'); // Adjust the path accordingly

const app = express();
app.use(express.json());
app.use(router); // Use your router

const JWT_SECRET = 'your_secret_key'; // Use the same secret as in your application
let mongoServer;

// Set up MongoMemoryServer before tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

// Clean up after tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Test for user registration
describe('Authentication Routes', () => {
    describe('POST /register', () => {
        it('should register a user successfully', async () => {
            const response = await request(app).post('/register').send({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                password: 'password123',
                phoneNumber: '1234567890',
                role: 'user'
            });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
        });

        it('should return validation errors when fields are missing', async () => {
            const response = await request(app).post('/register').send({
                firstName: '',
                lastName: 'Doe',
                username: 'johndoe',
                password: '123', // Short password
                role: 'user'
            });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveLength(2); // Expecting errors for firstName and password length
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ msg: 'First name is required' }),
                    expect.objectContaining({ msg: 'Password must be at least 8 characters long' }),
                ])
            );
        });

        it('should return an error if the user already exists', async () => {
            await request(app).post('/register').send({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                password: 'password123',
                phoneNumber: '1234567890',
                role: 'user'
            });

            const response = await request(app).post('/register').send({
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'johndoe', // Same username
                password: 'password456',
                phoneNumber: '0987654321',
                role: 'admin'
            });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User already exists');
        });
    });

    // Test for user login
    describe('POST /login', () => {
        beforeEach(async () => {
            // Create a user to test login
            const hashedPassword = await bcrypt.hash('password123', 10);
            await request(app).post('/register').send({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                password: hashedPassword,
                phoneNumber: '1234567890',
                role: 'user'
            });
        });

        it('should login a user successfully', async () => {
            const response = await request(app).post('/login').send({
                username: 'johndoe',
                password: 'password123',
                role: 'user'
            });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.token).toBeDefined();

            // Verify the JWT token structure
            const decodedToken = jwt.verify(response.body.token, JWT_SECRET);
            expect(decodedToken.username).toBe('johndoe');
            expect(decodedToken.role).toBe('user');
        });

        it('should return an error if username is missing', async () => {
            const response = await request(app).post('/login').send({
                password: 'password123',
                role: 'user'
            });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveLength(1); // Expecting error for missing username
            expect(response.body.errors[0].msg).toBe('Username is required');
        });

        it('should return an error if role is missing', async () => {
            const response = await request(app).post('/login').send({
                username: 'johndoe',
                password: 'password123'
            });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveLength(1); // Expecting error for missing role
            expect(response.body.errors[0].msg).toBe('Role is required');
        });

        it('should return an error for incorrect password', async () => {
            const response = await request(app).post('/login').send({
                username: 'johndoe',
                password: 'wrongpassword',
                role: 'user'
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should return an error if the user does not exist', async () => {
            const response = await request(app).post('/login').send({
                username: 'nonexistentuser',
                password: 'password123',
                role: 'user'
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not found or role mismatch for username');
        });

        it('should return an error for role mismatch', async () => {
            const response = await request(app).post('/login').send({
                username: 'johndoe',
                password: 'password123',
                role: 'admin' // Wrong role
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not found or role mismatch for username');
        });

        // Additional tests for specific conditions that trigger uncovered lines
        describe('Additional tests for login_and_register.cjs', () => {
            it('should handle login attempts with missing role', async () => {
                const response = await request(app).post('/login').send({
                    username: 'johndoe',
                    password: 'password123',
                    // role is missing
                });

                expect(response.status).toBe(400);
                expect(response.body.errors).toEqual(expect.arrayContaining([
                    expect.objectContaining({ msg: 'Role is required' }),
                ]));
            });

            it('should return validation errors if both username and password are missing', async () => {
                const response = await request(app).post('/login').send({
                    // username and password are missing
                    role: 'user'
                });

                expect(response.status).toBe(400);
                expect(response.body.errors).toHaveLength(2); // Expecting errors for both fields
                expect(response.body.errors).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ msg: 'Username is required' }),
                        expect.objectContaining({ msg: 'Password is required' }),
                    ])
                );
            });
        });
    });
});
