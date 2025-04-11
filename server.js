const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();


const apiRoutes = require('./api');

DB_USERNAME = process.env.DB_USERNAME;
DB_PASSWORD = process.env.DB_PASSWORD;


const app = express();
const PORT = 9000;


app.use(express.urlencoded({ extended: true }));
app.use('/', apiRoutes);


// Set EJS
app.set('view engine', 'ejs');


// Set Layouts
app.set('layout', 'partials/layout')


// DB Connection
const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@cluster0.z1vit.mongodb.net/users?retryWrites=true&w=majority&appName=Cluster0`
mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err.message));


app.listen(PORT, () => console.log("Listening on " + PORT));




