const fs = require('fs');
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const { ApolloServer } = require('apollo-server-express');

const url = process.env.DB_URL || 'mongodb+srv://omid_azodi:sdsu_password@assignment4cluster-fu0nf.mongodb.net/issuetracker';

let db;

let aboutMessage = 'Product Tracker API v1.0';

async function productList() {
  const productsList = await db.collection('products').find({}).toArray();
  return productsList;
}

function setAboutMessage(_, { message }) {
  aboutMessage = message;
  return aboutMessage;
}

async function getNextSequence(name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { current: 1 } },
    { returnOriginal: false },
  );
  return result.value.current;
}

async function productAdd(_, { product }) {
  const productToInsert = product;
  productToInsert.id = await getNextSequence('products');

  const result = await db.collection('products').insertOne(productToInsert);
  const savedIssue = await db.collection('products')
    .findOne({ _id: result.insertedId });
  return savedIssue;
}

async function connectToDb() {
  const client = new MongoClient(url, { useNewUrlParser: true });
  await client.connect();
  console.log('Connected to MongoDB at', url);
  db = client.db();
}

const resolvers = {
  Query: {
    about: () => aboutMessage,
    productList,
  },
  Mutation: {
    setAboutMessage,
    productAdd,
  },
};


const server = new ApolloServer({
  typeDefs: fs.readFileSync('schema.graphql', 'utf-8'),
  resolvers,
  formatError: (error) => {
    console.log(error);
    return error;
  },
});

const app = express();

server.applyMiddleware({ app, path: '/graphql' });

const port = process.env.API_SERVER_PORT || 3000;

(async function () {
  try {
    await connectToDb();
    app.listen(port, () => {
      console.log(`API server started on port ${port}`);
    });
  } catch (err) {
    console.log('ERROR:', err);
  }
}());
