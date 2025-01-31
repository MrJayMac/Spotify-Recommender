const express = require('express')
const cors = require('cors')
const pool = require('./db')
const dotenv = require('dotenv');
dotenv.config()

const app = express()
const port = process.env.PORT || 3000;
app.use(cors())


app.get('/', function(req,res) {
    res.send('Hello World')
})

app.listen(port)





{/* CHECK TO SEE DATABASE CONNECTION

console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "Loaded" : "Not Loaded");

pool.connect()
  .then(client => {
    console.log("✅ Successfully connected to the database!");
    client.release(); // Release the connection back to the pool
  })
  .catch(err => console.error("❌ Database connection error:", err));
*/}