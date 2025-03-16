import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();  // Load environment variables

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;  // Read from Render Env Vars

    if (!apiKey) {
      return res.status(500).json({ error: "API key is missing!" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
