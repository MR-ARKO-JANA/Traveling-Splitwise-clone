const mongoose = require('mongoose');


const ownerschema = new mongoose.Schema({
       name: {
         type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
        trim: true},
       email: String,
       password: String,
       products:{
        type: Array,
        default: []
       },
       picture : String,
       gstin : String
});

module.exports = mongoose.model("ownerdata", ownerschema);