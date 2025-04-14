const socket = io();
let currentUser = "";
let selectedUser = "";


window.onload = function () {
    if (localStorage.getItem("isValidUser") === "true") {
        let username = localStorage.getItem("isValidUserName");
        currentUser = username; // Ensure currentUser is set on refresh
        socket.emit("user-online", username);
        
        (async () => {
            try {
                let role = await fetchUserRole(username);
                console.log("Role fetched:", role);
                if (role !== 'user') {
                    console.log("police ka set");
                    loadUserListForService();
                } else {
                    loadUserList();
                }
                console.log("Proceeding with the role:", role);
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
    let phone = document.getElementById("mobileNumber").value;
    let email = document.getElementById("regEmail").value;
    
   
    let latitude = "";
    let longitude = "";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, latitude, longitude, phone, email })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                localStorage.setItem("isValidUser", "true");
                localStorage.setItem("isValidUserName", username);
                loadUserList();
            });
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to get location. Please allow location access.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Function to fetch user details by username
async function fetchUser(username) {
    try {
      const response = await fetch("/get-users");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const users = await response.json();
      const userDetails = users.find((user) => user.username === username);
      console.log(userDetails);
      if (userDetails) {
        return userDetails;
      } else {
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
}

async function fetchUserRole(username) {
    let role = "";
    try {
        const response = await fetch("/get-users");
        const users = await response.json();
        console.log(users);
        const userDetails = getUserByUsername(users, username);
        role = userDetails.role;
        console.log(role);
    } catch (error) {
        console.error("Error fetching users:", error);
    }
    return role;
}

// Login user
function login() {
    let username = document.getElementById("loginUsername").value;
    let password = document.getElementById("loginPassword").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === "Login successful") {
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
                    if (role !== 'user') {
                        console.log("police ka set");
                        loadUserListForService();
                    } else {
                        loadUserList();
                    }
                    console.log("Proceeding with the role:", role);
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
    console.log("In loadUserListForService");
    fetch("/get-users")
        .then(res => res.json())
        .then(users => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    let currentLatitude = position.coords.latitude;
                    let currentLongitude = position.coords.longitude;
                    let userList = document.getElementById("userList");
                    userList.innerHTML = "";
                    console.log('Fetched users:', users);
                    users.forEach(user => {
                        if (user.username !== currentUser && user.role === 'user') {
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
                }, (error) => {
                    console.error("Geolocation error:", error);
                    alert("Unable to get location. Please allow location access.");
                });
            }
        });
}

function getUserByUsername(users, username) {
    return users.find((user) => user.username === username);
}

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
};

const getClosestUsers = (currentLatitude, currentLongitude, users) => {
    const roles = {};
    users.forEach(user => {
        if (user.role !== 'user') {
            if (!roles[user.role]) {
                roles[user.role] = [];
            }
            roles[user.role].push(user);
        }
    });

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

function loadUserList() {
    fetch("/get-users")
        .then(res => res.json())
        .then(users => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    let currentLatitude = position.coords.latitude;
                    let currentLongitude = position.coords.longitude;
                    const closestUsers = getClosestUsers(currentLatitude, currentLongitude, users);
                    let userList = document.getElementById("userList");
                    userList.innerHTML = "";
                    console.log("All users:", users);
                    console.log("Closest users:", closestUsers);
                    closestUsers.forEach(user => {
                        if (user.username !== currentUser && user.role !== 'user') {
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
                }, (error) => {
                    console.error("Geolocation error:", error);
                    alert("Unable to get location. Please allow location access.");
                });
            }
        });
}

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
                messageElement.innerHTML = `<b>${msg.sender}:</b> ${msg.message}`;
            }
            if (msg.image) {
                messageElement.innerHTML = `<b>${msg.sender}:</b> <img src="${msg.image}" class="chat-image" />`;
            }
            chatBox.appendChild(messageElement);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => console.error("Error loading chat history:", error));
}

socket.on("receive-message", ({ sender, receiver, message, image }) => {
    console.log("Received message event on client");
    if (receiver === currentUser || sender === currentUser) {
        let chatBox = document.getElementById("chatBox");
        let messageElement = document.createElement("div");
        let senderElement = document.createElement("b");
        senderElement.textContent = `${sender}: `;
        messageElement.appendChild(senderElement);
        if (message) {
            let textElement = document.createElement("span");
            textElement.innerHTML = message;
            messageElement.appendChild(textElement);
        }
        if (image) {
            let imgElement = document.createElement("img");
            imgElement.src = image;
            imgElement.classList.add("chat-image");
            messageElement.appendChild(imgElement);
        }
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

function sendMessage() {
    let messageInput = document.getElementById("messageInput");
    let message = messageInput.value.trim();
    if (message && selectedUser) {
        socket.emit("send-message", { sender: currentUser, receiver: selectedUser, message });
        messageInput.value = "";
    } else {
        alert("Select a user to chat with!");
    }
}

let cameraStream = null;

document.getElementById('imageInput').addEventListener('change', handleImageUpload);
document.getElementById('sendCameraImageButton').addEventListener('click', sendCameraImage);
document.querySelector('.imageInput').addEventListener('click', toggleImageSource);

function toggleImageSource() {
    const fileInput = document.getElementById('imageInput');
    const cameraPreview = document.getElementById('cameraPreview');
    const sendCameraImageButton = document.getElementById('sendCameraImageButton');

    // Toggle between file input and camera
    if (fileInput.style.display === 'none') {
        fileInput.style.display = 'inline-block';  // Show file input
        cameraPreview.style.display = 'none';      // Hide camera
        sendCameraImageButton.style.display = 'none'; // Hide send camera image button
        openCamera();  // Start the camera interface
    } else {
        fileInput.style.display = 'none';         // Hide file input
        stopCamera();                             // Stop the camera if file input is chosen
    }
}

async function openCamera() {
    try {
        // Access the camera
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoElement = document.getElementById("cameraPreview");
        videoElement.srcObject = cameraStream;

        // Show the camera interface and send button
        document.getElementById("cameraPreview").style.display = "inline-block";
        document.getElementById("sendCameraImageButton").style.display = "inline-block";
    } catch (error) {
        console.error("Error accessing the camera: ", error);
        alert("Unable to access the camera.");
    }
}

function captureImageFromCamera() {
    const canvas = document.getElementById('cameraCanvas');
    const video = document.getElementById('cameraPreview');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame of the video onto the canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image as a data URL (base64-encoded)
    return canvas.toDataURL('image/jpeg');
}

function sendCameraImage() {
    const imageData = captureImageFromCamera();

    // Send the captured image through socket
    if (!selectedUser) {
        alert("Select a user to send the image!");
        return;
    }

    socket.emit("send-message", {
        sender: currentUser,
        receiver: selectedUser,
        image: imageData // Sending the base64 image string
    });

    // Optionally, stop the camera after sending the image
    stopCamera();
}

function stopCamera() {
    if (cameraStream) {
        const tracks = cameraStream.getTracks();
        tracks.forEach(track => track.stop()); // Stop all tracks
        document.getElementById('cameraPreview').srcObject = null;
        cameraStream = null;
        document.getElementById("sendCameraImageButton").style.display = "none";
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("No image selected!");
        return;
    }
////////////////////////////


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

/////////////////////////////





    // const reader = new FileReader();
    // reader.onload = function (e) {
    //     const imageData = e.target.result;

    //     // Send the uploaded image through socket
    //     if (!selectedUser) {
    //         alert("Select a user to send the image!");
    //         return;
    //     }

    //     socket.emit("send-message", {
    //         sender: currentUser,
    //         receiver: selectedUser,
    //         image: imageData // Sending the base64 image string
    //     });
    // };
    // reader.readAsDataURL(file); // Convert the image to base64 string
}


function makeACall(){
    if (!selectedUser) {
        alert("Select a user to call!");
        return;
    }
    (async () => {
        try {
            let cuser = await fetchUser(selectedUser);
            if (cuser.phone) {
                window.location.href = `tel:${cuser.phone}`;
            } else {
                alert('Contact not found');
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
        }
    })();
}

function sendLocation() {
    if (!selectedUser) {
        alert("Select a user to send location!");
        return;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const locationMessage = `📍 <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">My Location</a>`;
            socket.emit("send-message", { sender: currentUser, receiver: selectedUser, message: locationMessage });
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to get location. Please allow location access.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}
