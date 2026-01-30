const express = require('express');
const router = express.Router();
const ownermodel = require("../models/ownermodel");

router.post("/create",async (req,res) =>{
   let owners = await ownermodel.find()
   if(owners.length > 0) return res.status(400).send("Owner already exists");

     let {name,email,password} = req.body;
   let createdwoner = await ownermodel.create({
    name,
    email,
    password,
   })
   res.status(201).send(createdwoner);
})

router.get("/", (req, res) => {
    res.send("hey it's owner here");
}) 

module.exports = router;