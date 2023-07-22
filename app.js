const express = require('express');
const { SerialPort, ReadlineParser } = require('serialport');
const cors = require('cors');

// Replace '/dev/ttyUSB0' with the correct serial port name for your fingerprint reader
const sp = new SerialPort({ path: "COM3", baudRate: 9600 });
const parser = sp.pipe(new ReadlineParser())
const app = express();
const port = 80;

// Set up CORS middleware with specific options
const corsOptions = {
  origin: "http://libraryman.com",
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions))

// Start the server
const server = app.listen(port, 'sensor.libraryman.com', () => {
  console.log(`Server running on port ${port}`);
});

// Set up socket.io to enable real-time communication with the frontend
const io = require('socket.io')(server, {
  cors: corsOptions
});


sp.on("error", (error) => {
  console.log(error)
})

sp.on("close", () => {
  console.log("connection closed")
})

// Middleware to read incoming data from the serial port
parser.on('data', (data) => {
  const jsonData = JSON.parse(data)
  console.log(jsonData);
  // Send the data back to the client that made the request
  io.emit('sensors', jsonData);

});


app.get('/server', (req, res) => {
  const { finger } = req.query;
  if (finger === 'true') {
    // Request fingerprint data from the serial port
    res.setHeader("Content-type", "Application/JSON")
    res.status(200).json({ message: 'Fingerprint request sent' });
  } else {
    res.status(400).json({ error: 'Invalid request' });
  }
});