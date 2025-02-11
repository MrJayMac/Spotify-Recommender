const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const querystring = require('querystring');

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//REGISTRATION & LOGGIN IN
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

// SPOTIFY CREDENTIALS

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

/* 🔹 Step 1: Redirect user to Spotify OAuth */
app.get('/spotify/login', (req, res) => {
    console.log("✅ Spotify login route was called!");

    const scope = encodeURIComponent('user-read-recently-played user-top-read'); // ✅ URL Encode the scope

    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
        });

    console.log("🔗 Redirecting user to:", authUrl);
    res.redirect(authUrl);
});


/* 🔹 Step 2: Spotify OAuth Callback */
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    try {
        // 🔍 Step 1: Exchange Authorization Code for Access Token
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
                },
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        // 🔍 Step 2: Fetch Spotify User Profile
        const userProfileResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const spotifyUser = userProfileResponse.data;
        const spotifyId = spotifyUser.id;
        const username = spotifyUser.display_name || `spotify_user_${spotifyId}`;

        // 🔍 Step 3: Check if User Exists in Database
        let userQuery = await pool.query('SELECT id FROM users WHERE username = $1', [spotifyId]);

        let userId;
        if (userQuery.rows.length === 0) {
            // ✅ If user does not exist, insert into `users` table
            const insertUser = await pool.query(
                `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`,
                [spotifyId, 'spotify_oauth_user'] // No password needed for OAuth users
            );

            userId = insertUser.rows[0].id;
        } else {
            userId = userQuery.rows[0].id;
        }

        console.log(`✅ User ${username} (ID: ${userId}) stored in database.`);

        // 🔍 Step 4: Fetch User’s Recently Played Tracks
        const tracksResponse = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=10', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const tracks = tracksResponse.data.items;

        if (tracks.length > 0) {
            console.log(`✅ Retrieved ${tracks.length} recently played tracks.`);

            for (const track of tracks) {
                const trackData = track.track;
                const playedAt = new Date(track.played_at);

                console.log(`🎵 Storing track: ${trackData.name} by ${trackData.artists[0].name}`);

                await pool.query(
                    `INSERT INTO user_tracks (user_id, track_id, track_name, artist_name, played_at, album_name, duration_ms, spotify_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT DO NOTHING`,
                    [
                        userId,
                        trackData.id,
                        trackData.name,
                        trackData.artists[0].name,
                        playedAt,
                        trackData.album.name,
                        trackData.duration_ms,
                        trackData.external_urls.spotify
                    ]
                );
            }

            console.log("✅ Successfully stored all recently played tracks.");
        } else {
            console.log("⚠️ No recently played tracks found.");
        }

        // 🔍 Step 5: Store access token in cookie
        res.cookie('spotifyAccessToken', access_token, { httpOnly: true, secure: false });

        // 🔍 Step 6: Redirect User to Dashboard with user ID
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?user_id=${userId}`);

    } catch (err) {
        console.error('❌ Error during Spotify OAuth callback:', err.response?.data || err.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});



/* 🔹 Step 3: Get Recently Played Tracks */
app.get('/spotify/recently-played', async (req, res) => {
    const accessToken = req.cookies.spotifyAccessToken;

    if (!accessToken) {
        console.log("❌ No access token found.");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 🔍 Fetch Recently Played Tracks
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=10', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const tracks = response.data.items;

        if (!tracks.length) {
            console.log("⚠️ No recently played tracks found.");
            return res.status(404).json({ error: "No recently played tracks found." });
        }

        // 🔍 Fetch User ID from Database using Spotify ID
        const userProfileResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const spotifyUserId = userProfileResponse.data.id;
        const userQuery = await pool.query('SELECT id FROM users WHERE username = $1', [spotifyUserId]);

        if (userQuery.rows.length === 0) {
            console.log(`❌ No user found in DB for Spotify ID: ${spotifyUserId}`);
            return res.status(404).json({ error: "User not found in database." });
        }

        const userId = userQuery.rows[0].id; // ✅ Correct user ID from DB
        console.log(`✅ Found user ID ${userId} for Spotify user ${spotifyUserId}`);

        // 🔍 Insert Tracks into Database
        for (const track of tracks) {
            const trackData = track.track;
            const playedAt = new Date(track.played_at);

            console.log(`🎵 Storing track: ${trackData.name} by ${trackData.artists[0].name} at ${playedAt}`);

            await pool.query(
                `INSERT INTO user_tracks (user_id, track_id, track_name, artist_name, played_at, album_name, duration_ms, spotify_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT DO NOTHING`,
                [
                    userId,
                    trackData.id,
                    trackData.name,
                    trackData.artists[0].name,
                    playedAt,
                    trackData.album.name,
                    trackData.duration_ms,
                    trackData.external_urls.spotify
                ]
            );
        }

        console.log("✅ Successfully stored tracks in DB.");
        res.json({ message: 'Recently played tracks stored successfully' });

    } catch (err) {
        console.error('❌ Error fetching or storing recently played tracks:', err.message);
        res.status(500).json({ error: 'Failed to fetch or store user tracks' });
    }
});


app.get('/user-tracks/:user_id', async (req, res) => {
    const { user_id } = req.params;
    console.log(`🔍 Fetching listening history for user ID: ${user_id}`);

    try {
        // Check if user exists (debugging)
        const userExists = await pool.query(`SELECT id FROM users WHERE id = $1`, [user_id]);
        if (userExists.rows.length === 0) {
            console.log(`❌ No user found with ID: ${user_id}`);
            return res.status(404).json({ error: "User not found." });
        }

        // Fetch listening history
        const tracks = await pool.query(
            `SELECT track_id, track_name, artist_name, played_at, album_name, duration_ms, spotify_url
             FROM user_tracks
             WHERE user_id = $1
             ORDER BY played_at DESC
             LIMIT 20`,
            [user_id]
        );

        if (tracks.rows.length === 0) {
            console.log(`⚠️ No listening history found for user ID: ${user_id}`);
            return res.status(404).json({ error: "No listening history found." });
        }

        console.log(`✅ Retrieved ${tracks.rows.length} tracks for user ID: ${user_id}`);
        res.json(tracks.rows);
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user tracks' });
    }
});



app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

