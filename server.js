require('dotenv').config();
const app = require('./src/app');
const { initSchema } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Pet Tracker API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
