const express = require("express");
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const ObjectId = require("mongodb").ObjectId;

app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBAE_SERVICE_ACCOUNT);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zajjr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

client.connect((err) => {
	// const collection = client.db("test").collection("devices");
	// // perform actions on the collection object
	// const user = { name: "sohan" };
	// collection.insertOne(user).then(() => {
	// 	console.log("inserted success");
	// });
	// client.close();
});

async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearer ")) {
		const token = req.headers.authorization.split(" ")[1];

		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();
		const database = client.db("allProducts");
		const dataCollection = database.collection("data");
		const orderCollection = database.collection("orders");
		const usersCollection = database.collection("users");
		const reviewsCollection = database.collection("reviews");

		// get all data
		app.get("/data", async (req, res) => {
			const cursor = dataCollection.find({});
			const data = await cursor.toArray();
			res.send(data);
		});

		// post data
		app.post("/data", verifyToken, async (req, res) => {
			const product = req.body;
			const result = await dataCollection.insertOne(product);
			res.json(result);
		});

		// get single data
		app.get("/data/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const dataDetails = await dataCollection.findOne(query);
			res.json(dataDetails);
		});
		// get single data
		app.get("/data/details/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const dataDetails = await dataCollection.findOne(query);
			console.log(dataDetails);
			res.json(dataDetails);
		});

		// get reviews
		app.get("/reviews", async (req, res) => {
			const cursor = reviewsCollection.find({});
			const reviews = await cursor.toArray();
			res.json(reviews);
		});

		// post reviews
		app.post("/reviews", verifyToken, async (req, res) => {
			const review = req.body;
			const result = await reviewsCollection.insertOne(review);
			res.json(result);
		});

		// post orders
		app.post("/orders", async (req, res) => {
			const cart = req.body;
			const result = await orderCollection.insertOne(cart);
			res.json(result);
		});

		// get orders
		app.get("/orders", verifyToken, async (req, res) => {
			const email = req.query.email;
			const query = { email: email };
			const cursor = orderCollection.find(query);
			const orders = await cursor.toArray();
			res.json(orders);
		});

		// get all orders
		app.get("/orders/allOrders", verifyToken, async (req, res) => {
			const items = orderCollection.find({});
			const orders = await items.toArray();
			res.send(orders);
		});

		//manage all products (data)
		app.put("/data/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const updatedProduct = req.body;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					name: updatedProduct.name,
					price: updatedProduct.price,
					launched: updatedProduct.launched,
					img: updatedProduct.img,
					describe: updatedProduct.describe,
				},
			};
			const result = await dataCollection.updateOne(filter, updateDoc, options);
			res.json(result);
		});

		app.delete("/data/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await dataCollection.deleteOne(query);
			res.json(result);
		});

		app.delete("/orders/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await orderCollection.deleteOne(query);
			res.json(result);
		});

		// creat an admin
		app.post("/users", async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.json(result);
		});

		// get admin
		app.get("/users/:email", async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			let isAdmin = false;
			if (user?.role === "admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
		});

		// make admin
		app.put("/users/admin", verifyToken, async (req, res) => {
			const user = req.body;
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.role === "admin") {
					const filter = { email: user.email };
					const updateDoc = { $set: { role: "admin" } };
					const result = await usersCollection.updateOne(filter, updateDoc);
					res.json(result);
				}
			} else {
				res
					.status(401)
					.json({ message: "you do not have access to make an admin!!!" });
			}
		});

		// for google sign in
		app.put("/users", async (req, res) => {
			const user = req.body;
			const filter = { email: user.email };
			const options = { upsert: true };
			const updateDoc = { $set: user };
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.json(result);
		});

		console.log("db connected");
	} finally {
		// await client.close();
	}
}

run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("running db");
});

app.listen(port, () => {
	console.log("local host running", port);
});
