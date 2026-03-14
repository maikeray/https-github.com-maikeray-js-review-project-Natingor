//server js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const corst = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret'; // USE environmental variables in production...

// ENABLE CORS FOR FRONT END (eg. live server on port 5500)
app.use(corse({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'] // Adjust based on your frontend URL
}));

// MIDDLEWARE to parse json.
app.use(express.json());

// IN MEMORY "DATABASE" (replace with MongoDB later on...)
let users = [
    {id: 1, username: 'admin', password: '123', role: 'admin'}, // not hashed.
    {id: 2, username: 'alice', password: '123', role: 'user'}, // not hashed.
];

// Helper : 
// console.log(bcrypt.hashSync('admin123', 10)); to generate real hash.

//
if(!users[0].password.includes('$2a$')) {
    user[0].password = bcrypt.hashSync('admin123', 10);
    user[1].password = bcrypt.hashSync('user123', 10);
}

//

//
app.post('api/register', async (req, res) => {
    const {username, password, role = 'user' } =req.body;

    if (!username || !password) {
        return res.status(400).json({error: 'Username and Password are required'});
    }

    //
    const existing = user.find(u => u.username === username);
    if(existing) {
        return res.status(409).json({error: 'User already exist'});
    }

    //
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        username,
        password: hashedPassword,
        role //
    };

    user.push(newUser);
    res.status(201).json({message : 'User registered', username, role});
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({error: 'Invalid credentials'});
    }

    //
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role},
        SECRET_KEY,
        { expiresIn: '1h'}
    );

    res.json({ token, user: { username: user.username, role: user.role }});
});

//
