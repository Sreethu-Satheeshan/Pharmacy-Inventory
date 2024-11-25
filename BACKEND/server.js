const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');
const url = require('url');
const cors = require('cors');  // Import CORS

// MongoDB Connection URI
const uri = 'mongodb://localhost:27017';
const dbName = 'Pharmacy';  // Database name
let db, medicinesCollection;

MongoClient.connect(uri)
  .then((client) => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    medicinesCollection = db.collection('medicines');  // Collection name
  })
  .catch((err) => console.error('MongoDB Connection Error:', err));

// CORS configuration
const corsMiddleware = cors({
  origin: 'http://localhost:3000', // Allow only React app on this port
  methods: ['GET', 'POST', 'DELETE', 'PUT'], // Allowed methods
  allowedHeaders: ['Content-Type'], // Allowed headers
});
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  // Apply CORS headers
  corsMiddleware(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Fetch medicines
    if (req.method === 'GET' && pathname === '/medicines') {
      try {
        const medicines = await medicinesCollection.find().toArray();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(medicines));
      } catch (err) {
        console.error('Error fetching medicines:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error fetching medicines' }));
      }
    }

    // Add a new medicine
    if (req.method === 'POST' && pathname === '/add-medicine') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        console.log('Received data:', body);  // Log received data
        const newMedicine = JSON.parse(body);

        // Check if name and quantity are provided
        if (!newMedicine.name || !newMedicine.quantity) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Invalid data: name and quantity are required' }));
        }

        try {
          console.log('Inserting Medicine:', newMedicine);  // Log medicine being inserted
          await medicinesCollection.insertOne(newMedicine);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Medicine added successfully' }));
        } catch (err) {
          console.error('Error inserting medicine:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Error adding medicine' }));
        }
      });
    }

    // Update a medicine
    if (req.method === 'PUT' && pathname === '/update-medicine') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        const { _id, ...updatedData } = JSON.parse(body);

        // Validate the request
        if (!_id || !updatedData.name || !updatedData.quantity) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Invalid data: ID, name, and quantity are required' }));
        }

        try {
          await medicinesCollection.updateOne({ _id: new ObjectId(_id) }, { $set: updatedData });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Medicine updated successfully' }));
        } catch (err) {
          console.error('Error updating medicine:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Error updating medicine' }));
        }
      });
    }

    // Delete a medicine
    if (req.method === 'DELETE' && pathname.startsWith('/delete-medicine')) {
      const id = query.id;

      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Invalid data: ID is required' }));
      }

      try {
        await medicinesCollection.deleteOne({ _id: new ObjectId(id) });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Medicine deleted successfully' }));
      } catch (err) {
        console.error('Error deleting medicine:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error deleting medicine' }));
      }
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
