const express = require("express");
// const redis = require("redis");
// const nodeFetch = require("node-fetch");
const Redis = require("ioredis");

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = new Redis({
  host: "127.0.0.1",
  port: REDIS_PORT,
  // Additional configuration options if needed
});

redisClient.on("error", (error) => {
  console.error("Redis Error:", error);
});

redisClient.on("connect", () => {
  console.info("Redis connected successfully");
});

const app = express();

app.listen(PORT, () => {
  console.log(`App running on port: ${PORT} :)`);
});

//cashing middleware
async function cache(req, res, next) {
  try {
    console.time(`getRepos-cached`);
    const userName = req.params.userName;

    const value = await redisClient.get(userName);

    if (!value) {
      next();
    } else {
      res.json({ data: value });
    }
    console.timeEnd(`getRepos-cached`);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
}

async function getRepos(req, res) {
  try {
    console.log("fetching data");
    console.time(`getRepos`);

    const userName = req.params.userName;

    const response = await fetch(`https://api.github.com/users/${userName}`);

    const data = await response.json();

    const repos = data.public_repos;

    //save date to redis
    await redisClient.setex(userName, 3600, repos);

    res.json({ repos });

    console.timeEnd(`getRepos`);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
}

app.get("/repos/:userName", cache, getRepos);
