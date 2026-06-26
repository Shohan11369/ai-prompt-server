const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: ["https://ai-prompt-client-zeta.vercel.app"],
    credentials: true,
  }),
);
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
    await client.connect();
    console.log("🧩 Connected successfully to MongoDB!");

    const db = client.db("AiPromptDB");
    const organizationCollection = db.collection("organizations");
    const eventsCollection = db.collection("events");
    const usersCollection = db.collection("user");
    const bookingCollection = db.collection("bookings");
    const paymentCollection = db.collection("payments");

    app.get("/api/user/attendee-stats/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const user = await usersCollection.findOne({ email });

        const stats = await bookingCollection
          .aggregate([
            { $match: { attendeeEmail: email } },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: { $toDouble: "$amount" } },
                ticketsBooked: { $sum: { $toInt: "$quantity" } },
                upcomingEvents: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const finalStats = stats[0] || {
          totalSpent: 0,
          ticketsBooked: 0,
          upcomingEvents: 0,
        };

        res.status(200).send({
          user: user || { name: "", avatar: "", bio: "" },
          stats: {
            totalSpent: finalStats.totalSpent,
            ticketsBooked: finalStats.ticketsBooked,
            upcomingEvents: finalStats.upcomingEvents,
          },
        });
      } catch (error) {
        console.error("Error in attendee-stats API:", error);
        res
          .status(500)
          .send({ message: "Internal Server Error", error: error.message });
      }
    });

    app.put("/api/user/update-profile/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const { name, avatar, bio } = req.body;

        const filter = { email: email };
        const updateDoc = {
          $set: {
            name: name,
            avatar: avatar,
            bio: bio,
            updatedAt: new Date(),
          },
        };

        const result = await usersCollection.updateOne(filter, updateDoc, {
          upsert: true,
        });

        res.status(200).send({
          success: true,
          message: "Profile updated successfully!",
          result,
        });
      } catch (error) {
        console.error("Error updating user profile:", error);
        res
          .status(500)
          .send({ message: "Internal Server Error", error: error.message });
      }
    });

    app.get("/api/organization/:email", async (req, res) => {
      const { email } = req.params;
      const result = await organizationCollection.findOne({
        organizerEmail: email,
      });
      res.send(result);
    });

    app.post("/api/organizations", async (req, res) => {
      console.log(req.body);
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;

      const addData = {
        organizationName,
        logo,
        website,
        description,
        organizerEmail,
        createdAt: new Date(),
        status: "active",
      };

      const result = await organizationCollection.insertOne(addData);
      res.send(result);
    });

    app.patch("/api/organizations/:id", async (req, res) => {
      const { id } = req.params;
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;

      const updateData = {
        organizationName,
        logo,
        website,
        description,
        organizerEmail,
      };

      const result = await organizationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData } },
      );
      res.send(result);
    });

    app.get("/api/single-events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    app.get("/api/events/featured", async (req, res) => {
      try {
        const result = await eventsCollection
          .find({})
          .sort({ rating: -1 })
          .limit(3)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching featured tools:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/api/events/:email", async (req, res) => {
      const { email } = req.params;
      const result = await eventsCollection
        .find({ organizationEmail: email })
        .toArray();
      res.send(result);
    });

    app.get("/api/events", async (req, res) => {
      const search = req.query.search;
      const category = req.query.category;
      const location = req.query.location;
      const query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      if (category) {
        query.category = { $in: category.split(",") };
      }
      if (location) {
        query.location = location;
      }

      const cursor = eventsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/api/events/booking", async (req, res) => {
      const {
        amount,
        evetId,
        eventTitle,
        quantity,
        email,
        paymentType,
        transactionId,
        paymentStatus,
      } = req.body;

      const bookingData = {
        evetId,
        eventTitle,
        attendeeEmail: email,
        quantity,
        amount,
        transactionId,
        paymentStatus,
        bookingDate: new Date(),
      };

      const isBookingExist = await bookingCollection.findOne({ transactionId });
      if (isBookingExist) {
        return res.status(200).send({ message: "Already paid" });
      }
      const bookingRes = await bookingCollection.insertOne(bookingData);

      await eventsCollection.updateOne(
        { _id: new ObjectId(evetId) },
        { $inc: { capacity: -quantity } },
      );

      const paymentData = {
        userEmail: email,
        amount,
        transactionId,
        paymentStatus,
        paymentType,
        paidAt: new Date(),
      };

      await paymentCollection.insertOne(paymentData);
      res.send(bookingRes);
    });

    app.post("/api/events", async (req, res) => {
      const data = req.body;
      const organizer = await usersCollection.findOne({
        email: data?.organizationEmail,
      });
      const organizerEventsCounts = await eventsCollection.countDocuments({
        organizationEmail: data?.organizationEmail,
      });

      if (!organizer?.isPremium && organizerEventsCounts >= 3) {
        return res.status(401).send({
          message: "Your free limit is over",
        });
      }
      const result = await eventsCollection.insertOne({
        ...data,
        status: "pending",
      });
      res.send(result);
    });

    app.patch("/api/admin/enrollments/:id/status", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { approvalStatus: status } },
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Booking not found" });
        }

        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/events/booking/:email", async (req, res) => {
      const { email } = req.params;
      const result = await bookingCollection
        .find({ attendeeEmail: email })
        .toArray();
      res.send(result);
    });

    app.patch("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData } },
      );
      res.send(result);
    });

    app.delete("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.patch("/api/users/upgrade-premium/:email", async (req, res) => {
      const { email } = req.params;
      const { amount, transactionId, paymentStatus, paymentType } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $set: { isPremium: true } },
      );
      const paymentData = {
        userEmail: email,
        amount,
        transactionId,
        paymentStatus,
        paymentType,
        paidAt: new Date(),
      };

      await paymentCollection.insertOne(paymentData);
      res.send(result);
    });

    app.get("/api/payment/:email", async (req, res) => {
      const { email } = req.params;
      const result = await paymentCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.post("/api/auth/sign-in/email", async (req, res) => {
      try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        // Find user, if not found, create (upsert)
        let user = await usersCollection.findOne({ email });
        if (!user) {
          await usersCollection.insertOne({ email, createdAt: new Date() });
          user = await usersCollection.findOne({ email });
        }

        res.status(200).send({ success: true, user });
      } catch (error) {
        res.status(500).send({ message: "Server error", error: error.message });
      }
    });

    app.post("/api/auth/sign-in/social", async (req, res) => {
      try {
        const { email, name, avatar } = req.body;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        // Find user, if not found, create (upsert)
        let user = await usersCollection.findOne({ email });
        if (!user) {
          await usersCollection.insertOne({
            email,
            name,
            avatar,
            createdAt: new Date(),
            isSocial: true,
          });
          user = await usersCollection.findOne({ email });
        } else {
          // Optionally update user info if they exist
          await usersCollection.updateOne(
            { email },
            { $set: { name, avatar } },
          );
        }

        res.status(200).send({ success: true, user });
      } catch (error) {
        res.status(500).send({ message: "Server error", error: error.message });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
