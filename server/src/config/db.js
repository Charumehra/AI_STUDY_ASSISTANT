require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

async function connectDB() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.warn('Mongo connection string not configured; starting without database connection.');
        return;
    }

    const connectOptions = {
        family: 4,
        serverSelectionTimeoutMS: 10000,
    };

    const usePublicDns = uri.startsWith('mongodb+srv://');
    if (usePublicDns) {
        console.log('Using SRV connection string; setting public DNS servers for resolution', usePublicDns);
        dns.setServers(['8.8.8.8', '8.8.4.4']);
    }

    try {
        await mongoose.connect(uri, connectOptions);
        console.log('connected to database');
    } catch (error) {
        if (error.code === 'ECONNREFUSED' && usePublicDns) {
            console.warn('SRV DNS lookup failed; retrying with public DNS servers...');
            dns.setServers(['8.8.8.8', '8.8.4.4']);
            try {
                await mongoose.connect(uri, connectOptions);
                console.log('connected to database');
                return;
            } catch (retryError) {
                console.error('Retry after setting public DNS failed:', retryError);
            }
        }

        console.error('Database connection error:', error);
        process.exit(1);
    }
}


module.exports = connectDB;