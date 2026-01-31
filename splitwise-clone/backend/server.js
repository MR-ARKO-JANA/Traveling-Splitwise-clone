const express = require("express");
const connectDB = require("./config/db"); 
const cors = require("cors");
const path = require("path");

const app = express();

// Let's get this party started
connectDB();

// The usual suspects - middleware that makes everything work
app.use(cors());
app.use(express.json());

// Make uploaded files accessible (profile pics and stuff)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// All our API routes - the meat and potatoes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/balance", require("./routes/balanceRoutes"));
app.use("/api/profile", require("./routes/userRoutes"));

// Serve up the frontend - our beautiful UI
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Home sweet home
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Fire up the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is alive and kicking on http://localhost:${PORT}`);
});