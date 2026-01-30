const express = require('express');
const path = require('path');
const cookieparser = require('cookie-parser');
const app = express();
const db = require('./config/db');
const ownerRouter = require('./routes/ownerRouter');
const userRouter = require('./routes/userRouter');
const productRouter = require('./routes/productRouter');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
console.log(__dirname);
app.use(cookieparser());

app.use("/owner",ownerRouter);
app.use("/users",userRouter);
app.use("/products",productRouter);





app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});