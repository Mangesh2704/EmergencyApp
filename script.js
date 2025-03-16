const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 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`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch from OpenAI API" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
