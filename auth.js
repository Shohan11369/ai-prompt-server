const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("AiPromptDB");

const auth = betterAuth({
  database: mongodbAdapter(db),
  // Add other plugins/config as needed
});

module.exports = { auth };
