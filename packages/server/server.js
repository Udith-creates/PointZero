const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Database Connection
// Using local JSON DB (utils/jsonDb.js) - No connection needed
console.log('Using Local JSON Database');

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/age', require('./routes/ageVerification'));
app.use('/api/actions', require('./routes/actions')); // Actions Protocol (Blinks)

// Function to start server (exported for testing or used directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
