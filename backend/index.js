import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.log("MongoDB connection error: ", err);
    });

app.use(cors({
    origin: process.env.FRONTEND_URL || "https://supplylens.vercel.app",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(cookieParser());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // set your key in .env

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

app.post("/api/generate", async (req, res) => {
    try {
        let { prompt, imagePath } = req.body;
        console.log("Prompt received:", prompt);

        // If prompt is a JSON object, add strict instructions and convert to string
        if (typeof prompt !== "string") {
            prompt.instructions = `
Analyze the checkpoints and generate the following details in JSON format ONLY.
Do NOT include any explanations, commentary, or text outside the JSON.
Include:
1. Risk percentage at each checkpoint.
2. Estimated cost of travel/transport for each checkpoint.
3. Possible alternatives or optimizations to reduce risk or cost.
4. Overall recommendations for the supply chain.

Respond STRICTLY in JSON like:
{
  "checkpoints": [
    { "location": "...", "risk": "...", "cost": "...", "alternatives": ["...", "..."] },
    ...
  ],
  "overall_risk": "...",
  "recommendations": "..."
}
`;
            prompt = JSON.stringify(prompt, null, 2);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const contents = [
            { role: "user", parts: [{ text: prompt }] }
        ];

        if (imagePath) {
            const imagePart = fileToGenerativePart(imagePath, "image/jpeg");
            contents[0].parts.push(imagePart);
        }

        const result = await model.generateContent({ contents });

        // AI text response
        const text = result?.response?.text?.() || "No response text.";
        res.json({ text });

    } catch (error) {
        console.error("Error generating AI content:", error);
        res.status(500).json({ error: error.message });
    }
});


app.post("/api/analyze-supply-chain", async (req, res) => {
    try {
        const { message, supplyChainData, role } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Create a comprehensive prompt for supply chain analysis
        const systemPrompt = `You are an expert Supply Chain Analyst AI assistant. Your role is to help users analyze their supply chains, identify potential risks, and provide actionable insights.

    Key Responsibilities:
    1. Analyze supply chain data for vulnerabilities and optimization opportunities
    2. Identify potential risks based on current global events and market conditions
    3. Provide specific, actionable recommendations
    4. Consider geopolitical, economic, and environmental factors
    5. Suggest alternative routes or suppliers when beneficial

    Current Supply Chain Data:
    ${JSON.stringify(supplyChainData, null, 2)}

    User Question: ${message}

    Please provide a comprehensive analysis that includes:
    - Direct answer to the user's question
    - Risk assessment if applicable
    - Specific recommendations
    - Current events that might impact this supply chain
    - Optimization suggestions

    Keep your response professional, actionable, and under 300 words.`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });
    } catch (error) {
        console.error("Error analyzing supply chain:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/weather', async (req, res) => {
    try {
        const city = req.query.city;
        if (!city) {
            return res.status(400).json({ error: 'Please provide a city name' });
        }

        // 1️⃣ Get coordinates from city name
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            return res.status(404).json({ error: 'City not found' });
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2️⃣ Fetch hourly weather data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current_weather=true&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // 3️⃣ Get tomorrow’s date in YYYY-MM-DD
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const tomorrowStr = `${yyyy}-${mm}-${dd}`;

        // 4️⃣ Filter hourly temperatures for tomorrow
        const temps = [];
        weatherData.hourly.time.forEach((time, idx) => {
            if (time.startsWith(tomorrowStr)) {
                temps.push(weatherData.hourly.temperature_2m[idx]);
            }
        });

        if (temps.length === 0) {
            return res.status(404).json({ error: 'No temperature data for tomorrow' });
        }

        // 5️⃣ Calculate min, max, average temperature
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

        res.json({
            city: name,
            country,
            date: tomorrowStr,
            temperature: {
                min: minTemp,
                max: maxTemp,
                average: parseFloat(avgTemp.toFixed(2))
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});



// Import and use auth routes
import authRoutes from "./routes/authRoute.js";
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
