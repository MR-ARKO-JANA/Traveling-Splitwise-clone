const express = require("express");
const connectDB = require("./config/db"); 
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/balance", require("./routes/balanceRoutes"));
app.use("/api/profile", require("./routes/userRoutes"));
app.use("/api/activity", require("./routes/activityRoutes"));
app.use("/api/export", require("./routes/exportRoutes"));

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong on the server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});