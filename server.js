process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.GIGACHAT_API_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "GigaChat",

          messages: [
            {
              role: "system",
              content:
                "Ты pixel-art AI котик помощник сайта. Иногда говоришь мяу.",
            },

            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    res.json({
      reply: data.choices?.[0]?.message?.content || "Мяу 🐱",
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("🐱 GigaCat server running");
});

app.listen(3001, () => {
  console.log("🚀 GigaChat server running on 3001");
});