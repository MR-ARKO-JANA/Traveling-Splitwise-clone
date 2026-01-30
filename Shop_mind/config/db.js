const mongoose = require('mongoose');
const dbgr = require("debug")("app:db");

mongoose.connect("mongodb://127.0.0.1:27017/miniproject")
.then(() => {
    dbgr("Connected to MongoDB successfully");
})
.catch((err) =>{
    or("Error connecting to MongoDB:", err);
})

module.exports = mongoose.connection;