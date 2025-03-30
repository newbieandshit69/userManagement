const express = require('express');
const mongoose = require('mongoose');
var expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcrypt');
require('dotenv').config();


DB_USERNAME =  process.env.DB_USERNAME;
DB_PASSWORD = process.env.DB_PASSWORD;


const app = express();
const PORT = 9000;
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.urlencoded({extended : true}));




// !!!!
const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@cluster0.z1vit.mongodb.net/users?retryWrites=true&w=majority&appName=Cluster0`
mongoose.connect(uri)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.log(err.message));



const UserSchema = new mongoose.Schema({
    name : String,
    cred: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Cred' // Reference to Cred model
    }
})


const UserCredSchema = new mongoose.Schema({
    username: {
        type: String,
        min: 3, 
        max: 10,
        unique: true,
        required: true
    },
    password: {
        type: String,
        min: 3,
        max: 10,
        required: true
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' // Reference to User model
    }
})


const User = new mongoose.model("User", UserSchema);
const Cred = new mongoose.model("Cred", UserCredSchema);



app.get('/', (req, res) => {
    let title = "Index";
    res.render('pages/index', {title, layout: "partials/layout"});
})


app.post('/signin', async (req, res) => {
    try{
        let title = "User page";
        const { username, password } = req.body;
        if (await isUsernameExist(username)){
            const cred = await Cred.findOne({username}).populate("user");
            if (await bcrypt.compare(password, cred.password)){
                res.render('pages/user', {title, username, name: cred.user.name, layout: "partials/layout"});
            }
            else{
                res.send("Wrong password");
            }
        }else{
            res.send("Username not found");
        }
    }catch(error){
        console.log(error);
        res.redirect('/');
    }
})

app.post('/signup', async (req,res) => {
    try{
        const { name, username, password } = req.body;

        // Check username exist
        if (await isUsernameExist(username)){
            return res.status(409).send("Username existed!");
        }

        const saltRounds = 10;
        const hasedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({name: name});
        const newCred = new Cred({username: username, password: hasedPassword, user: newUser._id});

        // Link User to Cred
        newUser.cred = newCred._id;

        await newUser.save();
        await newCred.save();

        res.send(`${newUser} is successfully created.`);


    } catch (error){
        console.error(error);

        if (error.name === 'ValidationError') {
            res.status(400).send(error.name);
            res.redirect('/');
        }

        res.status(500).redirect('/');
    }
})


app.listen(PORT, () => console.log("Listening on " + PORT));


async function isUsernameExist(username){
    const user = await Cred.findOne({ username });
    return user !== null; // Returns true if user exists, false otherwise
}

