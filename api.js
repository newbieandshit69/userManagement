const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const expressLayouts = require('express-ejs-layouts');

const rt = express.Router();

const { User, Cred, Session } = require('./models');
const e = require('express');

// Use layouts
rt.use(expressLayouts);


rt.get('/', (req, res) => {
    let title = "Get Started !";
    res.render('pages/index', { title });
})

// CREATING ACCOUNTS

rt.get('/login', (req, res) => {
    res.redirect('/');
});

rt.post('/login', async (req, res) => {
    try{
        const trimmedBody = bodyTrim(req.body);
        const { username, password } = trimmedBody;
        
        const user = await isUsernameExist(username);
        if (user) {
            const cred = await Cred.findOne({ userId: user._id});
            if (await bcrypt.compare(password, cred.password)){
                await Session.deleteMany({ userId: user._id }); // Allow only one session per user active
                const session = initSession(user);
                session.save();

                // Set cookie with token
                res.cookie('token', session.token, { httpOnly: true });

                if (user.role === 'admin') return res.redirect('/admin');
                return res.redirect('/user');

            }else{
                return res.status(401).send("Incorrect password.");
            }
        }else{
            return res.status(404).send("Username not found.");
        }
    }catch (error){
        console.log(error);
        res.redirect('/');
    }
});


rt.post('/register',  async (req, res) => {
    try{
        const trimmedBody = bodyTrim(req.body);
        const { name, email, username, password } = trimmedBody;

        // Check for existed username
        if (await isUsernameExist(username)){
            return res.status(409).send("Username existed! Please try another one.");
        }

        const hashedPwd = await generatePwdHash(password, 10);
        const newUser = new User({ name: name, username: username, email: email });
        const newCred = new Cred({  password: hashedPwd, userId: newUser._id })

        await newUser.save();
        await newCred.save();

        res.status(201).send("User is successfully registered.");
    }
    catch (error){
        console.log(error);
        res.status(500).redirect('/');
    }
});


rt.post('/logout', async (req, res) => {
    try {
        // Destroy session in DB (if you saved session manually)
        const token = getCookie(req, 'token');
        await Session.deleteOne({ token: token });

        // Clear cookie
        res.clearCookie('token');

        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});



// USER INTERFACE: normal user

rt.get('/user', isAuthenticated, async (req, res) => {
    try{
        const user = req.user;
        let title = `Hi, ${user.username}`;
        res.render('pages/user', { name: user.name, username: user.username, role: user.role, title });
    }catch (error){
        console.log(error);
        res.redirect('/');
    }
});


// USER INTERFACE: admin - session & user management panel

rt.get('/admin', isAuthenticated, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.clearCookie('token');
            return res.redirect('/');
        }
        const sessions = await Session.find({})
        .populate('userId', 'username role')
        .select('loggedInAt expiresAt userId');
    
        let title = 'User Management';
        res.render('pages/admin', { title, sessions });
    } catch (error) {
      console.log(error);
      res.redirect('/');
    }
  });
  


// Terminate a session
rt.post('/admin/terminate', async (req, res) => {
    try {
        const { sessionId } = req.body;
        await Session.findByIdAndDelete(sessionId);
        res.redirect('/admin'); // Go back to admin panel after termination
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

// Toggle user's role between 'user' and 'admin'
rt.post('/admin/toggle-role', async (req, res) => {
    try {
        const { userId, currentRole } = req.body;
        const newRole = (currentRole === 'admin') ? 'user' : 'admin';
        await User.findByIdAndUpdate(userId, { role: newRole });
        res.redirect('/admin'); // Go back to admin panel after change
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});
  


async function isUsernameExist(username) {
    return await User.findOne({ username });
};

async function generatePwdHash(password, saltRounds) {
    return bcrypt.hash(password, saltRounds);
};

function initSession(user){
    let token = crypto.randomBytes(16).toString('hex');
    const session = new Session({ token: token, userId: user._id })
    return session
};

function getCookie(req, name) {
    const cookies = req.headers.cookie;
    if (cookies){
        const cookieArr = cookies.split(';');
        for (let cookie of cookieArr) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
                return decodeURIComponent(value);
            }
        }
    }
    return null;
}


// A middlware to check for timeout sessions and force redirect
async function isAuthenticated(req, res, next) {
    const token = getCookie(req, 'token');

    if (!token) {
        return res.redirect('/login');
    }

    const session = await Session.findOne({ token }).populate('userId');
    if (!session || session.expiresAt < Date.now()) {
        res.clearCookie('token');
        return res.redirect('/login');
    }

    const user = session.userId;
    if (!user) {
        res.clearCookie('token');
        return res.redirect('/login');
    }

    req.user = user; // Send the latest user
    next();
}

function bodyTrim(body){
    const trimmedBody = {};
    Object.keys(body).forEach(key => {
        trimmedBody[key] = body[key].trim();
    });
    return trimmedBody;
};

module.exports = rt;
