const express = require('express');
const app = require('./app');
const connectDB = require('./src/config/db');

connectDB();
app.listen(5000, () => {
    console.log('Server is running on port 5000');
});