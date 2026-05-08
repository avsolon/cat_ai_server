process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// STATE
// ======================
let accessToken = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

// ======================
// GET OAUTH TOKEN
// ======================
async function getAccessToken() {
  const response = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.GIGACHAT_AUTH_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
    }
  );

  const data = await response.json();

  console.log("TOKEN RESPONSE:");
  console.log(data);

  if (!data.access_token) {
    throw new Error(
      "Failed to get access token: " + JSON.stringify(data)
    );
  }

  accessToken = data.access_token;

  // обновляем заранее (buffer 30 sec)
  tokenExpiresAt = Date.now() + 29 * 60 * 1000;

  console.log("NEW TOKEN RECEIVED");

  return accessToken;
}

// ======================
// SAFE TOKEN (mutex)
// ======================
async function getAccessTokenSafe() {
  if (accessToken && Date.now() < tokenExpiresAt - 30000) {
    return accessToken;
  }

  if (!tokenPromise) {
    tokenPromise = getAccessToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

// ======================
// CHAT ROUTE
// ======================
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // ensure token
    await getAccessTokenSafe();

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            {
              role: "system",
              content:
                "Ты AI котик помощник сайта. Отвечай дружелюбно, иногда говори мяу 🐱",
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

    if (!response.ok) {
      return res.status(500).json({
        error: "GigaChat API error",
        details: data,
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.log("INVALID RESPONSE:", data);
    }

    res.json({
      reply: reply || "Мяу 🐱",
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("🐱 GigaCat server running");
});

// ======================
// START SERVER
// ======================
app.listen(3001, () => {
  console.log("🚀 GigaChat server running on 3001");
});