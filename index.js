const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

   

app.get('/', (req, res) => {
  res.send('AI Prompt Sharing Platform Server Running...');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});