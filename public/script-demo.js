// script.js

const socket = io();
let currentUser = "";
let selectedUser = "";

window.onload = function () {
    if (localStorage.getItem("isValidUser") === "true") {
        let username = localStorage.getItem("isValidUserName")

        socket.emit("user-online", username);
        
        (async () => {
                    
                  
            try {
                let role = await fetchUserRole(username);
              console.log("Role fetched:", role);
              if (role != 'user') {
                console.log("police ka set")
                loadUserListForService();
            } else {
                loadUserList();
            }
              // Now you can proceed with the rest of your code
              console.log("Proceeding with the role:", role);
              // Add your logic here that depends on the role
            } catch (error) {
              console.error("Failed to fetch role:", error);
            }
          })();
          
        document.getElementById("authSection").style.display = "none";
        document.getElementById("chatSection").style.display = "flex";
    }
    
};
function logout(){
    localStorage.removeItem("isValidUser");
    localStorage.removeItem("isValidUserName");
    document.getElementById("authSection").style.display = "flex";
    document.getElementById("chatSection").style.display = "none";
    
}
// Register user

function register() {
    let username = document.getElementById("regUsername").value;
    let password = document.getElementById("regPassword").value;
    let phone=document.getElementById('regPhone').value;
    let email=document.getElementById('regEmail').value;
    let latitude = ""
    let longitude = ""
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, latitude, longitude,phone,email })
            }).then(res => res.json())
                .then(data => {


                   
                        alert(data.message);
                        localStorage.setItem("isValidUser", "true");
                        localStorage.setItem("isValidUserName", username);
                    
                   
                    loadUserList();
                });
        })
    };

}
// Function to fetch user details by username
async function fetchUser(username) {
    try {
      // Fetch the list of users from the API
      const response = await fetch("/get-users");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      // Parse the response as JSON
      const users = await response.json();
    //   console.log("Fetched users:", users);
  
      // Find the user with the matching username
      const userDetails = users.find((user) => user.username === username);
      console.log(userDetails)
      if (userDetails) {
        return userDetails; // Return the user details
      } else {
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error; // Re-throw the error to handle it outside
    }
  }
async function fetchUserRole(username) {
    let role = "";

    try {
        const response = await fetch("/get-users");
        const users = await response.json();
        console.log(users);

        const userDetails = getUserByUsername(users, username); // Assuming `username` is defined
        role = userDetails.role;
        console.log(role); // Accessible here
    } catch (error) {
        console.error("Error fetching users:", error);
    }

    return role; // Return the role for use outside the function
}

// Usage
// (async () => {
//     const username = "rohit"; // Replace with the username you want to search for
//     const role = await fetchUserRole(username);
//     console.log("Role outside fetch:", role); // Accessible here
// })();

// Login user
function login() {
    let username = document.getElementById("loginUsername").value;
    let password = document.getElementById("loginPassword").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    }).then(res => res.json())
        .then(data => {
            if (data.message === "Login successful") {
                //step of verification can be added if email not verified
               console.log("here")
                currentUser = username;
                localStorage.setItem("isValidUser", "true");
                localStorage.setItem("isValidUserName", username);
                document.getElementById("authSection").style.display = "none";
                document.getElementById("chatSection").style.display = "flex";
                socket.emit("user-online", username);

                

                (async () => {
                    
                  
                    try {
                        let role = await fetchUserRole(username);
                      console.log("Role fetched:", role);
                      if (role != 'user') {
                        console.log("police ka set")
                        loadUserListForService();
                    } else {
                        loadUserList();
                    }
                      // Now you can proceed with the rest of your code
                      console.log("Proceeding with the role:", role);
                      // Add your logic here that depends on the role
                    } catch (error) {
                      console.error("Failed to fetch role:", error);
                    }
                  })();
                  

            
             

            } else {
                alert(data.message);
            }
        });
}
function loadUserListForService() {
    console.log("In loaduserLIst for serve")
    fetch("/get-users")
        .then(res => res.json())
        .then(users => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    currentLatitude = position.coords.latitude;
                    currentLongitude = position.coords.longitude;

                   
                    let userList = document.getElementById("userList");


                    userList.innerHTML = "";
                    
                    console.log('this is the main',users)

                    users.forEach(user => {
                        console.log("hello how are you")
                        console.log(user)
                        if (user.username !== currentUser && user.role == 'user') {


                            let li = document.createElement("li");
                            li.textContent = user.username;
                            li.onclick = () => {
                                selectedUser = user.username;
                                document.getElementById("chatHeader").innerText = `Chat with ${user.username}`;
                                document.getElementById("chatBox").innerHTML = "";
                                loadChatHistory(user.username);
                            };
                            userList.appendChild(li);
                        }
                    });
                })
            }

        });
}
// Function to fetch user details by username
function getUserByUsername(users, username) {
    return users.find((user) => user.username === username);
}


// Function to calculate the distance between two sets of coordinates using Haversine formula
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
};

// Function to find the closest user for each role
const getClosestUsers = (currentLatitude, currentLongitude, users) => {
    const roles = {};

    // Group users by role (excluding 'user' role)
    users.forEach(user => {
        if (user.role !== 'user') {
            if (!roles[user.role]) {
                roles[user.role] = [];
            }
            roles[user.role].push(user);
        }
    });

    // Find the closest user for each role
    const closestUsers = [];
    Object.keys(roles).forEach(role => {
        let closestUser = null;
        let minDistance = Infinity;

        roles[role].forEach(user => {
            const distance = haversineDistance(currentLatitude, currentLongitude, user.latitude, user.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                closestUser = user;
            }
        });

        if (closestUser) {
            closestUsers.push(closestUser);
        }
    });

    return closestUsers;
};


// Fetch and display all users
function loadUserList() {
    fetch("/get-users")
        .then(res => res.json())
        .then(users => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    currentLatitude = position.coords.latitude;
                    currentLongitude = position.coords.longitude;

                    const closestUsers = getClosestUsers(currentLatitude, currentLongitude, users);
                    let userList = document.getElementById("userList");


                    userList.innerHTML = "";
                    console.log("000000000000000000000000")
                    console.log(users)
                    console.log("000000000000000000000000")
                    console.log(closestUsers)


                    closestUsers.forEach(user => {
                        console.log("hello how are you")
                        console.log(user)
                        if (user.username !== currentUser && user.role != 'user') {


                            let li = document.createElement("li");
                            li.textContent = user.username;
                            li.onclick = () => {
                                selectedUser = user.username;
                                document.getElementById("chatHeader").innerText = `Chat with ${user.username}`;
                                document.getElementById("chatBox").innerHTML = "";
                                loadChatHistory(user.username);
                            };
                            userList.appendChild(li);
                        }
                    });
                })
            }

        });
}

// Load chat history
function loadChatHistory(user) {
    fetch("/get-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1: currentUser, user2: user })
    })
    .then(res => res.json())
    .then(messages => {
        let chatBox = document.getElementById("chatBox");
        chatBox.innerHTML = "";

        messages.forEach(msg => {
            let messageElement = document.createElement("div");

            if (msg.message) {
                // Display text messages
                messageElement.innerHTML = `<b>${msg.sender}:</b> ${msg.message}`;
            } 
            
            // if (msg.image) {
            //     // Display image messages
            //     let imgElement = document.createElement("img");
            //     imgElement.src = msg.image;
            //     imgElement.classList.add("chat-image");
            //     messageElement.appendChild(imgElement);
            // }
            if (msg.image) {
                // Display image messages
                messageElement.innerHTML = `<b>${msg.sender}:</b> <img src="${msg.image}" class="chat-image" />`;
            }

            chatBox.appendChild(messageElement);
        });

        // Scroll to the bottom after loading messages
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => console.error("Error loading chat history:", error));
}


// Receive messages
socket.on("receive-message", ({ sender, receiver, message, image }) => {
    console.log("3 - Received message event on client"); // ✅ Step 1: Ensure event reaches client

    if (receiver === currentUser || sender === currentUser) {
        console.log("3.1 - Valid receiver, updating UI"); // ✅ Step 2: Ensure UI updates only for correct users
        console.log("comming")
        let chatBox = document.getElementById("chatBox");
        
        let messageElement = document.createElement("div");

        let senderElement = document.createElement("b");
        senderElement.textContent = `${sender}: `;
        messageElement.appendChild(senderElement);
        
        if (message) {
            console.log("In messge not image")
            let textElement = document.createElement("span");
            textElement.innerHTML = message;
            messageElement.appendChild(textElement);
        }

        if (image) {
            console.log("In image not message")
            let imgElement = document.createElement("img");
            imgElement.src = image;
            imgElement.classList.add("chat-image");
            messageElement.appendChild(imgElement);
        }

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});




// Send message
function sendMessage() {
    let messageInput = document.getElementById("messageInput");
    let message = messageInput.value.trim();
    if (message && selectedUser) {
        console.log("1")
        socket.emit("send-message", { sender: currentUser, receiver: selectedUser, message });
        messageInput.value = "";
    } else {
        alert("Select a user to chat with!");
    }
}

// Send Image
function sendImage() {
    let imageInput = document.getElementById("imageInput");
    let file = imageInput.files[0];

    if (!file || !selectedUser) {
        alert("Select a user and an image!");
        return;
    }

    let formData = new FormData();
    formData.append("image", file);
    formData.append("sender", currentUser);
    formData.append("receiver", selectedUser);

    fetch("/upload-image", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let chatBox = document.getElementById("chatBox");

            // Append the sent image to the chat UI
            let imgElement = document.createElement("img");
            imgElement.src = data.imageUrl;
            imgElement.classList.add("chat-image");
            // chatBox.appendChild(imgElement);

            // Emit the image message via Socket.IO
            socket.emit("send-message", {
                sender: currentUser,
                receiver: selectedUser,
                image: data.imageUrl
            });

            // Scroll to bottom after sending the image
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            alert("Image upload failed!");
        }
    })
    .catch(error => console.error("Error:", error));

    // Clear file input
    imageInput.value = "";
}


function makeACall(){
    if (!selectedUser) {
        alert("Select a user to send location!");
        return;
    }
    // console.log(selectedUser)
    
    (async () => {
                    
                  
        try {
            let cuser=await fetchUser(selectedUser);
            console.log(cuser)
            console.log(cuser.phone)
            if (cuser.phone) {
                window.location.href = `tel:${cuser.phone}`; // Opens dialer with number
            } else {
                alert('Contact not found');
            }
        } catch (error) {
          console.error("Failed to fetch cuser:", error);
        }
      })();
   
   
}
// Send user's location dynamically
function sendLocation() {
    if (!selectedUser) {
        alert("Select a user to send location!");
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const locationMessage = `📍 <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">My Location</a>`;

            socket.emit("send-message", { sender: currentUser, receiver: selectedUser, message: locationMessage });
        }, () => {
            alert("Failed to get location. Please allow location access.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}



// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const multer = require("multer");

const cloudinary = require("cloudinary").v2;
const path = require("path");
require('dotenv').config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false, // Bypass TLS verification (for debugging)
    },
});

const sendVerificationEmail = async (email) => {
    const token = crypto.randomBytes(32).toString("hex"); // Generate a random token
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
        return token; // Store this in the database
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
    phone:{type:Number,required:true},
    email:{type:String,required:true},
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
});
const User = mongoose.model("User", userSchema);

// Schema for Messages
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, required: false }, // Optional field
    image: { type: String, required: false },   // Optional field
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// Store online users
let onlineUsers = {};

// Register endpoint
app.post("/register", async (req, res) => {
    const { username, password,  latitude, longitude,phone,email } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = await sendVerificationEmail(email);
        console.log(verificationToken)
        const newUser = new User({ username, password: hashedPassword, latitude, longitude,phone,email,verificationToken });
        
         // Send verification email
    
        await newUser.save();
        res.json({ message: "Registration successful || Click on verify the mail" ,user:newUser});
    } catch (error) {
        res.status(400).json({ message: "Username already taken" });
    }
});
app.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

        // Upload to Cloudinary
        cloudinary.uploader.upload_stream({ folder: "chat_images" }, async (error, result) => {
            if (error) return res.status(500).json({ success: false, message: "Upload failed" });

            // Save image message to MongoDB
            // const newMessage = new Message({
            //     sender: req.body.sender,
            //     receiver: req.body.receiver,
            //     image: result.secure_url
            // });

            

            // Emit message once using Socket.IO
            // io.to(req.body.receiver).emit("receive-message", {
            //     sender: req.body.sender,
            //     receiver: req.body.receiver,
            //     image: result.secure_url
            // });

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
             
        console.log("it")
        if (!user.isVerified) {
            console.log("in")
            const verificationToken = await sendVerificationEmail(user.email);
            console.log("verifia",verificationToken)
            user.verificationToken=verificationToken;
            await user.save()
            console.log(user)
            return res.status(400).json({ message: "Please verify your email before logging in. || we have send you an email" });
        }
    
            res.json({ message: "Login successful",user:user });
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
    console.log("token",token)
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = null; // Remove token after verification
    await user.save();

    res.send("Email verified successfully!");
});
// Fetch all users (for displaying user list)
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
        console.log("2 - Received send-message event"); // ✅ Step 1: Check if event is triggered
    
        try {
            let newMessage;
            if (image) {
                console.log("2.2 - Image message detected"); // ✅ Step 2: Check if image is present
                newMessage = new Message({ sender, receiver, image });
                await newMessage.save();
                console.log("2.11 - Message saved in DB"); // ✅ Step 4: Ensure DB save is working
        
                io.emit("receive-message", { sender, receiver, image });
                console.log("2.12 - Event emitted to receiver"); // ✅ Step 5: Ensure event is emitted
            } else {
                console.log("2.1 - Text message detected"); // ✅ Step 3: Check if text is present
                newMessage = new Message({ sender, receiver, message });
                await newMessage.save();
                console.log("2.11 - Message saved in DB"); // ✅ Step 4: Ensure DB save is working
        
                io.emit("receive-message", { sender, receiver, message});
                console.log("2.12 - Event emitted to receiver"); // ✅ Step 5: Ensure event is emitted
            }
    
           
    
        } catch (error) {
            console.error("Error in send-message event:", error); // ❌ Step 6: Catch errors
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
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
