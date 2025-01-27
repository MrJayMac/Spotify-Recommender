const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');

dotenv.config();
const app = express()
const port = process.env.PORT || 3000;

app.use(cors())

app.get('/', function(req,res) {
    res.send('Hello World')
})

app.listen(port)