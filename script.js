const emergencyContacts = {
  'Police': '100',
  'Ambulance': '108',
  'Fire': '101',
  'Women Safety': '1091',
  'Cyber Crime': '155620'
};

function toggleChat() {
  const chatbotSection = document.getElementById('chatbotSection');
  chatbotSection.style.display = chatbotSection.style.display === 'block' ? 'none' : 'block';

  if (chatbotSection.style.display === 'block' && !chatbotSection.dataset.loaded) {
    addChatMessage("🆘 Hello! I'm your emergency assistant. How can I help?", false);
    chatbotSection.dataset.loaded = "true";
  }
}

function addChatMessage(message, isUser = false) {
  const chatBox = document.getElementById('chatBox');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
  messageDiv.innerHTML = `<div>${message}</div><div class="message-time">${new Date().toLocaleTimeString()}</div>`;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function handleUserInput() {
  const userInput = document.getElementById('userInput');
  const message = userInput.value.trim();
  if (message) {
    addChatMessage(message, true);
    userInput.value = '';
    processMessage(message);
  }
}

function triggerEmergency(service) {
  addChatMessage(`🚨 Connecting to ${service}...`);
  addChatMessage(`☎️ Dialing: ${emergencyContacts[service]}`);
}

function searchEmergencyInfo(query) {
  addChatMessage(`🔍 Searching: ${query}`, true);
  processMessage(query);
}

async function processMessage(query) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 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`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: query }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    addChatMessage(data.choices[0].message.content.trim());
  } catch (error) {
    console.error("Error:", error);
    addChatMessage("I'm currently unavailable. Please try again later.");
  }
}