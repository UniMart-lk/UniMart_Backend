import dotenv from 'dotenv';
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` UniMart Server is running on port ${PORT}`);
  console.log(`===============================================`);
});
