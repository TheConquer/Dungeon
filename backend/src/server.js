require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Dashboard Inventory iPhone backend jalan di port ${PORT}`);
});
