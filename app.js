const express = require('express');
const path = require('path');
const { initDatabase, dropDatabase } = require('./database');
const { insertUser, insertBand, insertReview, insertMessage, insertPublicEvent, insertPrivateEvent } = require('./databaseInsert');
const { users, bands, public_events, private_events, reviews, messages } = require('./resources');
const { getAllUsers, getUserByCredentials, updateUser, deleteUser } = require('./databaseQueriesUsers');
const { getAllBands, getBandByCredentials, updateBand, deleteBand } = require('./databaseQueriesBands');
const node_fetch = require('node-fetch');
const fetch_function = node_fetch.default || node_fetch;

const session = require('express-session');
const cookieParser = require('cookie-parser');
const validator = require('validator'); // library for xss protection

// GEMINI AI setup
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// weather setup
const WEATHER_API_KEY = '';
const WEATHER_CITY = 'Heraklion, GR';
const units = 'metric';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/RegistrationAndLogin', express.static('public'));

// session configuration
app.use(session({
    secret: 'bandfinder2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));
app.use(cookieParser());


function sanitizeInput(data) { // to prevent xss attacks
    const sanitized = {};
    for (const key in data) {
        if (typeof data[key] === 'string') {
            // escape dangerous html characters: < > ' " &
            sanitized[key] = validator.escape(data[key]);
        } else {
            sanitized[key] = data[key];
        }
    }
    return sanitized;
}

// endpoint to initialize database
app.get('/initdb', async (req, res) => { // iniial app.js from hy359_A3_project_2025-26_start_code
    try {
        const result = await initDatabase();
        res.send(result);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// endpoint to drop database
app.get('/dropdb', async (req, res) => { // iniial app.js from hy359_A3_project_2025-26_start_code
    try {
        const message = await dropDatabase();
        res.send(message);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ajax endpoint - check if username is available
app.get('/RegistrationAndLogin/checkUsername', async (req, res) => {
    const { username } = req.query; // read username from query string

    if (!username) { // if missing, respond with bad request
        return res.status(400).json({ error: 'username is required' });
    }

    try {
        const users = await getAllUsers();
        const bands = await getAllBands();
        const userExists = users.some(user => user.username === username); // check if username exists in users table
        const bandExists = bands.some(band => band.username === username); // check if username exists in bands table
        const isAvailable = !userExists && !bandExists; // available only if not found in either table
        res.json({ available: isAvailable }); // return JSON with availability   
    } catch (error) {
        res.status(500).json({ error: 'server error' }); // on error return 500
    }
});

// ajax endpoint - check if email is available
app.get('/RegistrationAndLogin/checkEmail', async (req, res) => {
    const { email } = req.query; // read email from query

    // if missing, respond 400
    if (!email) { return res.status(400).json({ error: 'email is required' }); }
    try {
        const users = await getAllUsers(); // fetch users
        const bands = await getAllBands(); // fetch bands
        const userExists = users.some(user => user.email === email); // check existence in both tables
        const bandExists = bands.some(band => band.email === email);
        const isAvailable = !userExists && !bandExists; // available only if neither has it

        res.json({ available: isAvailable }); // return JSON

    } catch (error) {
        res.status(500).json({ error: 'server error' }); // server error
    }
});

// endpoint - register user and insert into database
app.post('/RegistrationAndLogin/Register', express.json(), async (req, res) => {
    const userData = sanitizeInput(req.body); // get JSON body sent by client
    // const userData = req.body; 
    // fields required for user registration in database
    const requiredFields = ['username', 'email', 'password', 'firstname', 'lastname', 'birthdate', 'gender', 'country', 'address', 'telephone'];

    for (const field of requiredFields) { // check each required field is present
        if (!userData[field]) {
            return res.status(400).json({ error: `missing required field: ${field}` }); // tell client which field is missing
        }
    }

    try {
        const users = await getAllUsers();// get existing users
        const bands = await getAllBands(); // get existing bands
        // check duplicates for username in both tables
        if (users.some(user => user.username === userData.username) || bands.some(band => band.username === userData.username)) {
            return res.status(403).json({ error: 'username already exists' });
        }

        // check duplicates for email in both tables
        if (users.some(user => user.email === userData.email) ||
            bands.some(band => band.email === userData.email)) {
            return res.status(403).json({ error: 'email already exists' });
        }
        // convert lat/lon strings to floats or set null if not provided
        userData.lat = userData.lat ? parseFloat(userData.lat) : null;
        userData.lon = userData.lon ? parseFloat(userData.lon) : null;

        if (!userData.city) { // if city missing, set null
            userData.city = null;
        }

        await insertUser(userData); // insert user into DB

        res.status(200).json({ // respond with success and the created user data
            message: 'Registration Success',
            user: userData
        });

    } catch (error) {
        res.status(500).json({ error: 'server error during registration' });
    }
});

// endpoint - register band and insert into database
app.post('/RegistrationAndLogin/RegisterBand', express.json(), async (req, res) => {
    const bandData = sanitizeInput(req.body);
    //const bandData = req.body;

    const requiredFields = ['username', 'email', 'password', 'band_name', 'music_genres', 'band_description', 'members_number', 'foundedYear', 'band_city', 'telephone'];

    for (const field of requiredFields) { // check required fields
        if (!bandData[field]) {
            return res.status(400).json({ error: `missing required field: ${field}` }); // say which is missing
        }
    }

    try {
        const users = await getAllUsers();// existing users
        const bands = await getAllBands();// existing bands
        // check username duplicate across both tables
        if (users.some(user => user.username === bandData.username) || bands.some(band => band.username === bandData.username)) {
            return res.status(403).json({ error: 'username already exists' });
        }
        // check email duplicate across both tables
        if (users.some(user => user.email === bandData.email) || bands.some(band => band.email === bandData.email)) {
            return res.status(403).json({ error: 'email already exists' });
        }
        // convert some numeric fields to integers
        bandData.members_number = parseInt(bandData.members_number);
        bandData.foundedYear = parseInt(bandData.foundedYear);
        // optional fields set to null if not provided
        if (!bandData.webpage) bandData.webpage = null; // optional webpage
        if (!bandData.photo) bandData.photo = null; // optional photo
        // insert band into DB
        await insertBand(bandData);

        res.status(200).json({ // respond with success and the created band data
            message: 'Registration Success',
            band: bandData
        });

    } catch (error) {
        res.status(500).json({ error: 'server error during registration' });
    }
});

// endpoint - user/band login
app.post('/RegistrationAndLogin/login', async (req, res) => {
    const { username, password, login_type } = req.body;

    try {
        // user login
        if (login_type === 'user') {
            const user = await getUserByCredentials(username, password);
            if (user.length > 0) {
                req.session.user = {
                    user_id: user[0].user_id,
                    username: user[0].username,
                    type: 'user'
                };
                return res.status(200).json({ success: true, redirect: 'logged_user.html' });
            }
            // if no user found, check if this user credentials can be used in band login form
            const bandCheck = await getBandByCredentials(username, password);
            if (bandCheck.length > 0) {
                return res.status(401).json({ success: false, error: 'This is a band account. Please use Band Login.' });
            }
        }

        // band login
        else if (login_type === 'band') {
            const band = await getBandByCredentials(username, password);
            if (band.length > 0) {
                req.session.user = {
                    band_id: band[0].band_id,
                    username: band[0].username,
                    band_name: band[0].band_name,
                    type: 'band'
                };
                return res.status(200).json({ success: true, redirect: 'logged_band.html' });
            }
            // if no band found, check if this user credentials can be used in user login form
            const userCheck = await getUserByCredentials(username, password);
            if (userCheck.length > 0) {
                return res.status(401).json({ success: false, error: 'This is a user account. Please use User Login.' });
            }
        }
        return res.status(401).json({ success: false, error: 'Invalid username or password' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// endpoint - check if user or band is currently logged in
app.get('/RegistrationAndLogin/checkSession', (req, res) => {
    if (req.session && req.session.user) {
        res.status(200).json({
            loggedIn: true,
            user: req.session.user,
            type: req.session.user.type // 'user' or 'band'
        });
    } else {
        res.status(200).json({ loggedIn: false });
    }
});

// endpoint - get current user's full information
app.get('/RegistrationAndLogin/getUserInfo', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(403).json({ error: 'not logged in' }); // no session -> cannot access
    }
    try {
        const users = await getAllUsers(); // get all users from db
        const currentUser = users.find(u => u.user_id === req.session.user.user_id); // find matching user in db

        if (!currentUser) {
            return res.status(404).json({ error: 'user not found' }); // session exists but user missing
        }
        res.status(200).json(currentUser); // return full user info
    } catch (error) {
        res.status(500).json({ error: 'server error' }); // something broke on server
    }
});

// endpoint - get current bands's full information
app.get('/RegistrationAndLogin/getBandInfo', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(403).json({ error: 'not logged in' }); // no session -> cannot access
    }
    try {
        const bands = await getAllBands(); // get all bands from db
        const currentBand = bands.find(b => b.band_id === req.session.user.band_id); // find matching band in db

        if (!currentBand) {
            return res.status(404).json({ error: 'band not found' }); // session exists but band missing
        }
        res.status(200).json(currentBand); // return full band info
    } catch (error) {
        res.status(500).json({ error: 'server error' }); // something broke on server
    }
});

app.put('/RegistrationAndLogin/updateInfo', async (req, res) => {
    // 1. Sprawdź czy ktokolwiek jest zalogowany
    if (!req.session || !req.session.user) {
        return res.status(403).json({ success: false, error: 'Not logged in' });
    }

    const updates = req.body;
    const username = req.session.user.username;
    const userType = req.session.user.type; // Pobieramy typ z sesji ('user' lub 'band')

    try {
        let result;

        // 2. Wybierz odpowiednią funkcję bazy danych na podstawie typu
        if (userType === 'user') {
            result = await updateUser(username, updates);
        } else if (userType === 'band') {
            result = await updateBand(username, updates); // Musisz mieć tę funkcję w databaseQueriesBands.js
        } else {
            return res.status(400).json({ success: false, error: 'Invalid user type' });
        }

        // 3. Sprawdź wynik
        if (result.includes('No user found') || result.includes('No band found')) {
            return res.status(404).json({ success: false });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false });
    }
});

// endpoint - user logout
app.post('/RegistrationAndLogin/logout', (req, res) => {
    if (req.session && req.session.user) { // user logged in
        req.session.destroy(err => { // destroy session
            if (err) {
                return res.status(500).json({ success: false }); // couldn't delete session
            }
            res.status(200).json({ success: true }); // logout ok
        });

    } else {
        res.status(403).json({ success: false }); // can't logout if no session
    }
});

// ============================= endpoint - get public events for main_guest.html =============================
app.get('/getPublicEvents', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const { genre, city, date } = req.query; // downloading filters from URL
        let query = `
            SELECT pe.*, b.band_name, b.music_genres
            FROM public_events pe
            JOIN bands b ON pe.band_id = b.band_id
            WHERE 1=1
        `; // 1=1 allows for adding AND queries/rules

        const params = []

        if (genre) {
            query += ' AND b.music_genres LIKE ?';
            params.push(`%${genre}%`); // we are looking for particular word in a description field, so we neet the %
        }

        if (city) {
            query += ` AND pe.event_city LIKE ?`;
            params.push(city);
        }

        if (date) {
            query += ` AND pe.event_datetime >= ?`;
            params.push(date);
        }

        query += ' ORDER BY pe.event_datetime ASC';
        const [rows] = await connection.execute(query, params);

        res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: 'Server error fetching events' });
    }
});


// ============================= endpoint - get bands for main_guest.html =============================
app.get('/getAlltheBands', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const { genre, city, year } = req.query; // downloading filters from URL
        let query = `
            SELECT b.*
            FROM bands b
            WHERE 1=1
        `; // 1=1 allows for adding AND queries/rules

        const params = []

        if (genre) {
            query += ' AND b.music_genres LIKE ?';
            params.push(`%${genre}%`); // we are looking for particular word in a description field, so we need the %
        }

        if (city) {
            query += ` AND b.band_city LIKE ?`;
            params.push(city);
        }

        if (year) {
            query += ` AND b.foundedYear >= ?`;
            params.push(year);
        }

        query += ' ORDER BY b.foundedYear ASC';
        const [rows] = await connection.execute(query, params);

        res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: 'Server error fetching events' });
    }
});

// ============================= GEMINI CHATBOT API =============================
app.post('/api/gemini-chat', async (req, res) => {
    const { message } = req.body

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are an AI asistent, which specializes in questions about music: bands, genres, events, history of music and else. Answer shortly, on topic in english, without text formatting like bold text or italic text."
        });

        const result = await model.generateContent(message);
        const responseText = result.response.text(); // Wyciągnięcie tekstu

        res.status(200).json({ answer: responseText });
    } catch (error) {
        res.status(500).send();
    }
});


// ============================= FILTERING BASED ON PROMPT, PROMPT -> SQL =============================
app.post('/api/ai-execute-filter', async (req, res) => {
    const { prompt: userPrompt, type } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    let systemInstructionText;

    if (type === "events") {
        const SQL_SCHEMA = `
Table: public_events (pe)
Columns: event_id, band_id, event_type, event_datetime, event_city, event_address, event_description, participants_price, event_lat, event_lon
Table: bands (b)
Columns: band_id, band_name, music_genres
Rules:
- ALWAYS include JOIN bands b ON pe.band_id = b.band_id
- SELECT: ALWAYS RETURN pe.*, b.band_name, b.music_genres
- Filter for free events: pe.participants_price = 0
- Ordering: ORDER BY pe.event_datetime ASC
`;
        systemInstructionText = `You are an expert SQL writer for MySQL. Your task is to convert the user's query into a SINGLE SELECT statement using the provided schema. The query must return ALL columns from public_events (aliased as pe) and the name and genres from bands (aliased as b). When filtering by city or genre, ALWAYS use the LIKE operator with trailing wildcards (e.g., 'pe.event_city LIKE "Heraklion%"'). ONLY return the raw SQL code, do NOT wrap it in any Markdown code blocks (like \`\`\`sql\`). SQL Schema: ${SQL_SCHEMA}. User Query: ${userPrompt}`;

    } else if (type === "bands") {
        const SQL_SCHEMA = `
Table: bands (b)
Columns: band_id, username, email, band_name, music_genres, band_description, members_number, foundedYear, band_city, telephone, webpage, photo
Rules:
- SELECT: ALWAYS RETURN ALL columns (b.*).
- Filter for establishment year: foundedYear >= [year]
- Use LIKE for genres, band names, and descriptions.
- Ordering: ORDER BY b.foundedYear ASC
`;
        systemInstructionText = `You are an expert SQL writer for MySQL. Your task is to convert the user's query into a SINGLE SELECT statement using the provided schema. The query must return ALL columns (b.*). When filtering by city or genre, ALWAYS use the LIKE operator with trailing wildcards (e.g., 'b.band_city LIKE "Heraklion%"'). ONLY return the raw SQL code, do NOT wrap it in any Markdown code blocks (like \`\`\`sql\`). SQL Schema: ${SQL_SCHEMA}. User Query: ${userPrompt}`;
    } else {
        return res.status(400).json({ success: false, error: 'Invalid filter type specified.' });
    }

    let sqlQuery;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: systemInstructionText }] }],
            config: {}
        });

        sqlQuery = response.text.trim();
        if (sqlQuery.startsWith("```")) { // AI models were adding many characters to the responses, so we need to get rid of them "just in case"
            sqlQuery = sqlQuery.replace(/```(sql|SQL)?\n?/i, '').trim();
        }
        if (sqlQuery.endsWith("```")) {
            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 3).trim();
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }

    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [rows] = await connection.execute(sqlQuery);
        res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================= WEATHER API PROXY =============================
app.get('/api/getWeatherForecast', async (req, res) => {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${WEATHER_CITY}&units=${units}&appid=${WEATHER_API_KEY}`;

    try {
        const weatherResponse = await fetch_function(url);

        if (!weatherResponse.ok) {
            throw new Error(`API request failed. HTTP status: ${weatherResponse.status}`);
        }

        const data = await weatherResponse.json();

        if (data.cod !== '200' && data.cod !== 200) {
            throw new Error(`OpenWeatherMap Error: ${data.message || 'Unknown API issue'}`);
        }

        const dailyForecasts = {};
        const today = new Date().toISOString().split('T')[0];

        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toISOString().split('T')[0];

            if (dayKey === today) { // we want weather forecast for 5 following days, except today
                return;
            }
            if (!dailyForecasts[dayKey]) {
                dailyForecasts[dayKey] = {
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    min: item.main.temp_min,
                    max: item.main.temp_max,
                    temp_sum: item.main.temp,
                    count: 1,
                    icon: item.weather[0].icon,
                    description: item.weather[0].description
                };
            } else {
                dailyForecasts[dayKey].min = Math.min(dailyForecasts[dayKey].min, item.main.temp_min);
                dailyForecasts[dayKey].max = Math.max(dailyForecasts[dayKey].max, item.main.temp_max);
                dailyForecasts[dayKey].temp_sum += item.main.temp;
                dailyForecasts[dayKey].count++;
            }
        });

        const forecast = Object.values(dailyForecasts).slice(0, 5).map(dayData => ({
            day: dayData.day,
            temp: Math.round(dayData.temp_sum / dayData.count),
            icon: dayData.icon,
            description: dayData.description
        }));
        res.status(200).json({ success: true, city: data.city.name, forecast: forecast });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch weather data on server' });
    }
});

// ==================== BAND PUBLIC EVENTS MANAGEMENT ====================
// 1. DOWNLOADING EVENTS OF A PARTICULAR BAND
app.get('/api/getMyPublicEvents', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });
        const [rows] = await conn.execute(
            'SELECT * FROM public_events WHERE band_id = ? ORDER BY event_datetime DESC',
            [req.session.user.band_id]
        );
        res.json({ data: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. ADDING AN EVENT
app.post('/api/addPublicEvent', async (req, res) => {
    const { event_type, event_datetime, event_description, participants_price, event_city, event_address, event_lat, event_lon } = req.body;

    try {
        await insertPublicEvent({
            band_id: req.session.user.band_id,
            event_type,
            event_datetime,
            event_description,
            participants_price: parseFloat(participants_price),
            event_city,
            event_address,
            event_lat: parseFloat(event_lat),
            event_lon: parseFloat(event_lon)
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. UPDATING THE EVENT
app.put('/api/updatePublicEvent', async (req, res) => {
    const { public_event_id, event_type, event_datetime, event_description, participants_price, event_city, event_address, event_lat, event_lon } = req.body;

    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });

        await conn.execute(`
            UPDATE public_events SET 
            event_type=?, event_datetime=?, event_description=?, participants_price=?, event_city=?, event_address=?, event_lat=?, event_lon=?
            WHERE public_event_id=? AND band_id=?
        `, [event_type, event_datetime, event_description, participants_price, event_city, event_address, event_lat, event_lon, public_event_id, req.session.user.band_id]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. DELETE EVENT
app.delete('/api/deletePublicEvent/:id', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({ host: "localhost", user: "root", password: "", database: "cs359_project" });

        const [rows] = await conn.execute('SELECT * FROM public_events WHERE public_event_id = ? AND band_id = ?', [req.params.id, req.session.user.band_id]);

        if (rows.length === 0) return res.status(404).json({ error: "Event not found" });

        await conn.execute('DELETE FROM public_events WHERE public_event_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== MANAGING PRIVATE EVENTS BY BANDS ====================
app.get('/api/getMyPrivateEvents', async (req, res) => { // downloading private events for the band
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [rows] = await conn.execute(
            'SELECT * FROM private_events WHERE band_id = ? ORDER BY event_datetime ASC',
            [req.session.user.band_id]
        );
        res.json({ data: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/updatePrivateEventStatus', async (req, res) => { // acceptance or rejection
    const { private_event_id, status, band_decision } = req.body;

    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });

        await conn.execute(
            'UPDATE private_events SET status = ?, band_decision = ? WHERE private_event_id = ? AND band_id = ?',
            [status, band_decision, private_event_id, req.session.user.band_id]
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/deletePrivateEvent/:id', async (req, res) => { // deleting rejected event
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [rows] = await conn.execute(
            'SELECT status FROM private_events WHERE private_event_id = ? AND band_id = ?',
            [req.params.id, req.session.user.band_id]
        );

        if (rows.length > 0 && rows[0].status === 'rejected') {
            await conn.execute('DELETE FROM private_events WHERE private_event_id = ?', [req.params.id]);
            res.json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ============================= MESSAGES BAND/USER =============================
// Downloading messeges
app.get('/api/chat/getMessages', async (req, res) => {
    const { private_event_id } = req.query;

    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [rows] = await conn.execute(
            'SELECT * FROM messages WHERE private_event_id = ? ORDER BY date_time ASC',
            [private_event_id]
        );

        await conn.end();
        res.json({ success: true, messages: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Sending new messages
app.post('/api/chat/sendMessage', async (req, res) => {
    const { private_event_id, message } = req.body;

    if (message.length > 0) {
        try {
            const mysql = require('mysql2/promise');
            const conn = await mysql.createConnection({
                host: "localhost",
                user: "root",
                password: "",
                database: "cs359_project"
            });

            const now = new Date();
            const formattedDateTime = now.toISOString().slice(0, 19).replace('T', ' ');

            await conn.execute(
                'INSERT INTO messages (private_event_id, message, sender, recipient, date_time) VALUES (?, ?, ?, ?, ?)',
                [private_event_id, message, 'band', 'user', formattedDateTime]
            );

            await conn.end();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(400).json({ error: 'Message is required' });
    }
});


// ============================= GET FULL BAND DETAILS FOR POP-UP =============================
app.get('/api/getBandDetails/:id', async (req, res) => {
    const bandId = req.params.id;
    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cs359_project"
        });
        
        const [bandRows] = await connection.execute('SELECT * FROM bands WHERE band_id = ?', [bandId]);
        const band = bandRows[0];

        const [publicEvents] = await connection.execute( // im adding one extra column, which is is_private, so then its easy to pick private and public events separately
            `SELECT event_type, event_datetime, event_city, event_address, 
                    event_description, participants_price, 0 as is_private 
             FROM public_events WHERE band_id = ?`, 
            [bandId]
        );

        const [privateEvents] = await connection.execute(
            'SELECT "Private Event" as event_type, event_datetime, 1 as is_private FROM private_events WHERE band_id = ? AND status IN ("done", "to be done")', 
            [bandId]
        );

        const [reviews] = await connection.execute(
            'SELECT sender as author, review as txt, rating FROM reviews WHERE band_name = ? AND status = "published"', 
            [band.band_name]
        );

        await connection.end();

        res.status(200).json({
            success: true,
            data: {
                ...band,
                events: [...publicEvents, ...privateEvents],
                reviews: reviews
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});


// ============================= REST API FOR REST_TEST.HTML =============================
// add new review (post)
app.post('/review', async (req, res) => { // creates a post endpoint for adding a review
    console.log('rest api post request was successfully created!!'); // prints info to console

    const { band_name, sender, review, rating } = req.body; // gets values sent from client
    if (!band_name || !sender || !review || !rating) { return res.status(406).json({ error: 'missing required fields' }); }
    if (rating < 1 || rating > 5) { return res.status(406).json({ error: 'rating must be between 1 and 5' }); }

    try { // try block for safe db operations
        const bands = await getAllBands(); // gets all bands from database
        const bandExists = bands.some(band => band.band_name === band_name); // checks if band exists

        if (!bandExists) { return res.status(403).json({ error: 'band does not exist' }); }

        const now = new Date(); // gets current date and time
        now.setHours(now.getHours() + 2); // adds 2 hours to fix timezone
        const formattedDateTime = now.toISOString().slice(0, 19).replace('T', ' '); // formats date for db

        const newReview = { // creates review object to save
            band_name: band_name,
            sender: sender,
            review: review,
            rating: parseInt(rating), // review rating as integer
            date_time: formattedDateTime, // formatted date
            status: 'pending' // default review status
        };

        await insertReview(newReview);
        res.status(200).json({
            message: 'review added successfully',
            review: newReview
        });

    } catch (error) {
        res.status(500).json({ error: 'server error' });
    }
});

// get reviews of a given band (get)
app.get('/reviews/:band_name', async (req, res) => {
    const { band_name } = req.params; // gets band name from url
    const { ratingFrom, ratingTo } = req.query; // gets rating filters from url

    try {
        const mysql = require('mysql2/promise'); // loads mysql library
        const connection = await mysql.createConnection({ // creates db connection
            host: "localhost", // db host
            port: 3306, // db port
            user: "root",
            password: "",
            database: "cs359_project"
        });

        let query = 'SELECT * FROM reviews WHERE status = ?';
        let params = ['published'];

        if (band_name !== 'all') {
            query += ' AND band_name = ?'; // adds band filter
            params.push(band_name); // adds band name to parameters
        }

        if (ratingFrom && ratingTo) {
            const from = parseInt(ratingFrom);
            const to = parseInt(ratingTo);

            if (from < 1 || from > 5 || to < 1 || to > 5 || from > to) {
                return res.status(406).json({ error: 'invalid rating range' });
            }

            query += ' AND rating >= ? AND rating <= ?'; // adds rating range filter
            params.push(from, to); // adds values to parameter list
        }

        const [rows] = await connection.execute(query, params); // executes query in db

        res.status(200).json({  // sends results to client
            data: rows, // all returned rows
            count: rows.length // number of results
        });

    } catch (error) {
        res.status(500).json({ error: 'server error' });
    }
});

// update status of review (put)
app.put('/reviewStatus/:review_id/:status', async (req, res) => {
    const { review_id, status } = req.params; // gets review id and new status from url

    try {
        const mysql = require('mysql2/promise'); // loads mysql library
        const connection = await mysql.createConnection({ // creates db connection
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [reviews] = await connection.execute( // checks if review exists
            'SELECT * FROM reviews WHERE review_id = ?',
            [review_id]
        );

        if (reviews.length === 0) { // if no review found
            return res.status(403).json({ error: 'review does not exist' }); // sends error
        }

        if (reviews[0].status !== 'pending') { // only pending reviews can be updated
            return res.status(406).json({ error: 'can only update pending reviews' }); // sends error
        }

        await connection.execute( // updates review status in db
            'UPDATE reviews SET status = ? WHERE review_id = ?',
            [status, review_id]
        );

        res.status(200).json({ message: `review status updated to ${status}` }); // sends success message

    } catch (error) { // handles errors
        res.status(500).json({ error: 'server error' }); // sends error
    }
});

// 4. delete review (delete)
app.delete('/reviewDeletion/:review_id', async (req, res) => { // creates a delete endpoint
    const { review_id } = req.params; // gets review id from url

    try {
        const mysql = require('mysql2/promise'); // loads mysql library
        const connection = await mysql.createConnection({ // creates db connection
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            database: "cs359_project"
        });

        const [reviews] = await connection.execute( // checks if review exists
            'SELECT * FROM reviews WHERE review_id = ?',
            [review_id]
        );

        if (reviews.length === 0) { // if no review found
            return res.status(403).json({ error: 'review does not exist' }); // sends error
        }

        await connection.execute( // deletes the review from db
            'DELETE FROM reviews WHERE review_id = ?',
            [review_id]
        );

        res.status(200).json({ message: 'review deleted successfully' }); // sends success response

    } catch (error) { // error handling
        res.status(500).json({ error: 'server error' }); // sends error
    }
});




// 404 handler for all other routes - return a simple message
app.use((req, res) => {
    res.status(404).send('<h1>404 - page not found</h1>');
});

// start the server and listen on configured PORT
app.listen(PORT, () => {  // iniial app.js from hy359_A3_project_2025-26_start_code
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`open http://localhost:3000/html/guest.html`);
});