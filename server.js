process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let accessToken = null;

// получение access token
async function getAccessToken() {

  const response = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",

      headers: {

        Authorization:
          `Basic ${process.env.GIGACHAT_AUTH_KEY}`,

        "Content-Type":
          "application/x-www-form-urlencoded",

        Accept: "application/json",

        RqUID: crypto.randomUUID(),
      },

      body:
        "scope=GIGACHAT_API_PERS",
    }
  );

  const data =
    await response.json();

  console.log(
    "TOKEN RESPONSE:"
  );

  console.log(data);

  accessToken =
    data.access_token;

  return accessToken;
}

app.post("/chat", async (req, res) => {

  try {

    const { message } = req.body;

    // если токена нет → получаем
    if (!accessToken) {
      await getAccessToken();
    }

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: "GigaChat",

          messages: [
            {
              role: "system",
              content:
                "Ты AI котик помощник сайта. Иногда говоришь мяу.",
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

    console.log("CHAT RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    res.json({
      reply:
        data.choices?.[0]?.message?.content
        || "Мяу 🐱",
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
  console.log(
    "🚀 GigaChat server running on 3001"
  );
});