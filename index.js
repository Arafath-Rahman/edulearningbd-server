const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nfqgm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//middleware to verifyJWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access." });
  }
  const accessToken = authHeader.split(" ")[1];
  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded; //if we add a property to req, then next function will get the info from middleware
    next();
  });
}


async function run() {
  try {
    await client.connect();
    const userCollection = client.db("eduLearnBD").collection("users");
    const courseCollection = client.db("eduLearnBD").collection("courses");


    //get all courses
    app.get('/course', async (req, res) => {
      const courses = await courseCollection.find().toArray();
      res.send(courses);
    })

    //get a course
    app.get('/course/:id', async (req, res) => {
      const id  = req.params.id;
      const query = {_id : ObjectId(id)};
      const course = await courseCollection.findOne(query);
      res.send(course);
    })

    //edit a course
    app.patch('/course/edit/:id', async (req, res) => {
      const id  = req.params.id;
      const {link} = req.query;
      console.log(req.query);
      const filter = {_id : ObjectId(id)};
      const course = await courseCollection.findOne(filter);
      const newContent = [...course.content, link];
      console.log(newContent);
      const updatedDoc = {
        $set: {
          content: newContent,
        }
      }
      const result = await courseCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //get a user
    app.get('/user/:email', async (req, res) => {
      const email  = req.params.email;
      const query = {email : email};
      const user = await userCollection.findOne(query);
      res.send(user);
    })

    //getting an user's admin status
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    })

    app.post('/course', async (req, res) => {
      const course = req.body;
      const result = await courseCollection.insertOne(course);
      res.send(result);
    })

    //put route for users: upsert users
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });


  }
  finally{
    //
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`EduLearnBD is listening on port ${port}`);
})