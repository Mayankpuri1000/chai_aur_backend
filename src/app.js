import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*", 
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send(
      "<body style='background-color: black; color: white'><h1>Welcome to Chai aur backend</h1></body>",
    );
})

// Import routes
import userRouter from "./routes/user.routes.js";


// Routes usage
app.use("/api/v1/users", userRouter);

export default app;