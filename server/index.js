const cors = require("cors");
const mongoose = require("mongoose");
const express = require("express");

const chatRoute = require("./Routes/chatRoute");
const messageRoute = require("./Routes/messageRoute");
const userRoute = require("./Routes/userRoute");
const {Server}=require('socket.io');

require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/users", userRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);

app.get("/", (req, res) => {
  res.send("Welcome to our chat API...");
});

const uri = process.env.ATLAS_URI;
const port = process.env.PORT || 5000;

const expressServer = app.listen(port, () => {
  console.log(`Server running on port: ${port}...`);
});

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connection established..."))
  .catch((error) => console.error("MongoDB connection failed:", error.message));


const io = new Server(expressServer,{
    cors: {
      origin: process.env.CLIENT_URL,
    },
});
let onlineUsers = [];

io.on("connection", (socket) => {
  // add user

  socket.on("addNewUser", (userId) => {
    !onlineUsers.some((user) => user.userId === userId) &&
      onlineUsers.push({
        userId,
        socketId: socket.id,
      });

    console.log("Connected Users:", onlineUsers);

    // send active users
    io.emit("getUsers", onlineUsers);
  });

  // add message
  socket.on("sendMessage", (message) => {
    const user = onlineUsers.find(
      (user) => user.userId === message.recipientId
    );

    if (user) {
      console.log("sending message and notification");
      io.to(user.socketId).emit("getMessage", message);
      io.to(user.socketId).emit("getNotification", {
        senderId: message.senderId,
        isRead: false,
        date: new Date(),
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    console.log("User Disconnected:", onlineUsers);

    // send active users
    io.emit("getUsers", onlineUsers);
  });
});

