const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already in use' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    try {
        const register = await pool.query(
            `INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id`,
            [username, hashedPassword, email]
        );

        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1hr' });

        res.status(201).json({ message: 'User successfully registered', username, token });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

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

app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
