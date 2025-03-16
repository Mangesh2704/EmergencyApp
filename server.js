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
        html: `<div style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px; text-align: center;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <h1 style="color: #4CAF50;">Verify Your Email Address</h1>
                    <p style="font-size: 16px;">Hi there,</p>
                    <p style="font-size: 16px;">Thank you for signing up with us! Please verify your email address by clicking the button below:</p>
                    <a href="${verificationLink}" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block; margin-top: 20px;">Verify Email</a>
                    <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email.</p>
                    <p style="font-size: 14px; color: #777;">This link will expire in 24 hours.</p>
                </div>
                <footer style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>Powered by Centralized Emergency App</p>
                    <p><a href="${process.env.BASE_URL}" style="color: #4CAF50;">Visit our website</a></p>
                </footer>
            </div>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Verification Email Sent");
        return token;
    } catch (error) {
        console.error("Error sending email:", error);
    }
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

    // Log token for debugging (can be removed later)
    console.log("Received token:", token);

    try {
        // Check if a user with the provided token exists
        const user = await User.findOne({ verificationToken: token });

        // Check if the user is not found or the token is invalid
        if (!user) {
            console.error("No user found for the provided token:", token);
            return res.status(400).send(`
                <html>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
                        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <h2 style="color: #ff6f61;">Invalid or Expired Token</h2>
                            <p style="font-size: 16px; color: #333;">The link you clicked is invalid or has expired. Please try requesting a new verification email.</p>
                            <a href="/resend-verification" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block; margin-top: 20px;">Resend Verification Email</a>
                        </div>
                    </body>
                </html>
            `);
        }

        // Update the user to show that they have verified their email
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        // Success response
        res.send(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #4CAF50;">Email Verified Successfully!</h2>
                        <p style="font-size: 16px; color: #333;">Thank you for verifying your email. You can now sign in to your account.</p>
                        <a href="https://emergencyapp.onrender.com/" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block; margin-top: 20px;">Go to Login</a>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        // Log the error for debugging
        console.error("Error during email verification:", error);
        
        // Send a generic error message to the user
        res.status(500).send(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #ff6f61;">An error occurred</h2>
                        <p style="font-size: 16px; color: #333;">There was an error while verifying your email. Please try again later or contact support.</p>
                    </div>
                </body>
            </html>
        `);
    }
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
