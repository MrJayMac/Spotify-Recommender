const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});


dotenv.config();
const app = express()
const port = process.env.PORT || 3000;

app.use(cors())

app.get('/', function(req,res) {
    res.send('Hello World')
})

app.listen(port)