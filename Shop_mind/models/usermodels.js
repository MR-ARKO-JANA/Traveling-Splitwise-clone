const mongoose = require('mongoose');


const userschema = new mongoose.Schema({
       name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
        trim: true
       },
       email: String,
       password: String,
       cart: {
        type: Array,
        default: []
       },
       orders:{
        type: Array,
        default: []
       },
       contact:Number,
       picture : String
});

module.exports = mongoose.model("userdata", userschema);