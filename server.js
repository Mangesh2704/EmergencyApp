const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require('twilio')
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const sendVerificationEmail = async (email) => {
    const token = crypto.randomBytes(32).toString("hex");
    const verificationLink = `${process.env.BASE_URL}/verify-email?token=${token}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Email Verification",
        html: `<p>Click the link below to verify your email:</p>
               <a href="${verificationLink}">Verify Email</a>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Verification Email Sent");
        return token;
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB
mongoose.connect("mongodb+srv://emergencyApp:abc123de@cluster0.4zrwp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Schema for User
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        default: "user",
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    phone: { type: Number, required: true },
    email: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
});
const User = mongoose.model("User", userSchema);

// Schema for Messages
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, required: false },
    image: { type: String, required: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// Store online users
let onlineUsers = {};

// Register endpoint
app.post("/register", async (req, res) => {
    const { username, password, latitude, longitude, phone, email } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = await sendVerificationEmail(email);
        console.log(verificationToken);
        const newUser = new User({ username, password: hashedPassword, latitude, longitude, phone, email, verificationToken });
        await newUser.save();
        res.json({ message: "Registration successful || Click on verify the mail", user: newUser });
    } catch (error) {
        res.status(400).json({ message: "Username already taken" });
    }
});

// Upload image endpoint
app.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

        cloudinary.uploader.upload_stream({ folder: "chat_images" }, async (error, result) => {
            if (error) return res.status(500).json({ success: false, message: "Upload failed" });
            res.json({ success: true, imageUrl: result.secure_url });
        }).end(file.buffer);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            if (!user.isVerified) {
                const verificationToken = await sendVerificationEmail(user.email);
                user.verificationToken = verificationToken;
                await user.save();
                return res.status(400).json({ message: "Please verify your email before logging in. || we have sent you an email" });
            }
            res.json({ message: "Login successful", user: user });
        } else {
            res.status(400).json({ message: "Invalid username or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Email verification route
app.get("/verify-email", async (req, res) => {
    const { token } = req.query;
    console.log("token", token);
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();
    res.send("Email verified successfully!");
});

// Fetch all users
app.get("/get-users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Fetch chat history
app.post("/get-messages", async (req, res) => {
    const { user1, user2 } = req.body;
    try {
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching messages" });
    }
});

// Socket.IO handling
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("user-online", (username) => {
        onlineUsers[username] = socket.id;
        io.emit("update-online-users", Object.keys(onlineUsers));
    });

    socket.on("send-message", async ({ sender, receiver, message, image }) => {
        console.log("Received send-message event");
        try {
            let newMessage;
            if (image) {
                newMessage = new Message({ sender, receiver, image });
                await newMessage.save();
                io.emit("receive-message", { sender, receiver, image });
            } else {
                newMessage = new Message({ sender, receiver, message });
                await newMessage.save();
                io.emit("receive-message", { sender, receiver, message });
            }
        } catch (error) {
            console.error("Error in send-message event:", error);
        }
    });
    
    socket.on("disconnect", () => {
        for (let user in onlineUsers) {
            if (onlineUsers[user] === socket.id) {
                delete onlineUsers[user];
                break;
            }
        }
        io.emit("update-online-users", Object.keys(onlineUsers));
    });
});

// Start the server

const accountSid = 'AC5344aa1a3385fcd9e3de5a9ad4fbae17';
const authToken = '8df1e5dfe70e35e16c27aaf2d32ad38c';
const client = twilio(accountSid, authToken);

// Store OTP temporarily
let otpStore = {};



// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generate OTP function
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  const { mobileNumber } = req.body;
  console.log(mobileNumber)
  const otp = generateOTP();
  otpStore[mobileNumber] = otp; // Store OTP for verification

  try {
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: '+16076955582',
      to: mobileNumber
    });
    res.json({ message: 'OTP sent successfully!' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/verify-otp', (req, res) => {
  const { mobileNumber, otp } = req.body;
  const storedOTP = otpStore[mobileNumber];

  if (storedOTP && storedOTP === otp) {
    delete otpStore[mobileNumber]; // Remove OTP after successful verification
    res.json({ message: 'OTP verified successfully!' });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
