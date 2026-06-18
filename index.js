const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const db = client.db("AiPromptDB");
    const organizationCollection = db.collection("organizations");
    const eventsCollection = db.collection("events");
    const usersCollection = db.collection("user");
    const bookingCollection = db.collection("bookings");
    const paymentCollection = db.collection("payments");

    app.get("/api/organization/:email", async (req, res) => {
      const { email } = req.params;
      const result = await organizationCollection.findOne({
        organizerEmail: email,
      });
      res.send(result);
    });

// 
    app.post('/api/organizations', async (req, res) => {
      console.log(req.body);
      const { organizationName, logo, website, description, organizerEmail } = req.body;

      const addData = {
        organizationName,
        logo,
        website,
        description,
        organizerEmail,
        createdAt: new Date(),
        status: 'active',
      };

      const result = await organizationCollection.insertOne(addData);
      // console.log(result);

      res.send(result);
    });



    // 

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
