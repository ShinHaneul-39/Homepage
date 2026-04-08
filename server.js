const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

const rootFiles = new Set([
    "index.html",
    "robots.txt",
]);

// Serve config.js dynamically based on environment variables (Railway support)
app.get("/assets/js/config.js", (req, res, next) => {
    // Only inject GA_ID from environment variables
    // Other public data is served via static assets/js/site-data.js
    if (process.env.GA_ID) {
        res.type("application/javascript");
        res.send(`const CONFIG = { GA_ID: "${process.env.GA_ID}" };`);
    } else {
        next();
    }
});

app.use("/assets", express.static(path.join(rootDir, "assets")));
app.use("/pages", express.static(path.join(rootDir, "pages")));
app.use("/posts", express.static(path.join(rootDir, "posts")));
app.use("/archive", express.static(path.join(rootDir, "archive")));

app.get("/", (req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
});

app.get("/:file", (req, res, next) => {
    const { file } = req.params;
    if (!rootFiles.has(file)) {
        return next();
    }
    return res.sendFile(path.join(rootDir, file));
});

app.use((req, res) => {
    res.status(404).send("Not Found");
});

app.listen(port, () => {
    console.log(`Static site server running on port ${port}`);
});
