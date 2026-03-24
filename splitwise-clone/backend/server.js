const express = require("express");
const connectDB = require("./config/db"); 
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, credentials: true }
});
app.set("io", io);

io.on("connection", (socket) => {
    console.log("New real-time client connected:", socket.id);
    socket.on("disconnect", () => console.log("Real-time client disconnected:", socket.id));
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
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

const errorHandler = require("./middleware/errorHandler");

// Global error handling middleware
app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});