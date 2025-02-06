const express = require('express')
const cors = require('cors')
const pool = require('./db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
dotenv.config()

const app = express()
const port = process.env.PORT || 3000;
app.use(cors())

app.post('/register', async (req, res) => {
    const {username, password} = req.body

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already in use' });
    }

    const salt = bcrypt.genSaltSync(10)
    const hashed_password = bcrypt.hashSync(password,salt)

    try{
        const register = await pool.query(`INSERT INTO users (username, password) VALUES($1, $2)`, [username, hashed_password])
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1hr' });
        res.status(201).json({ message: 'User successfully registered', username, token } );
    }  
    catch (err) {
        console.error('Error during registration', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
    
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
        const users = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  
        if (users.rows.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }
  
        const valid = await bcrypt.compare(password, users.rows[0].password);
  
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });  
        }
  
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1hr' }); 
  
        res.json({ username: users.rows[0].username, token });  
  
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });  
    }
  });


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