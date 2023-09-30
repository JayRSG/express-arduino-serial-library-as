/* const WebSocket = require('ws');
const http = require('http');
const { SerialPort, ReadlineParser } = require('serialport');

const sp = new SerialPort({ path: "COM3", baudRate: 9600 });
const parser = sp.pipe(new ReadlineParser());

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log(message);
    // Forward the message to the Serial Port
    if (sp.isOpen) {
      sp.write(message, (err) => {
        if (err) {
          console.error('Error writing to COM3:', err);
          ws.send(JSON.stringify({ message: 'Device connection failed' }));
        }
      });
    } else {
      ws.send(JSON.stringify({ message: "Device connection failed" }))
    }
  });

  // Listen for data from the Serial Port
  parser.on('data', (data) => {
    ws.send(JSON.stringify(data));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const HOST = 'sensor.libraryman.com';
const PORT = 80;

server.listen(PORT, HOST, () => {
  console.log(`WebSocket server is running at ws://${HOST}:${PORT}`);
}); */

const WebSocket = require('ws');
const http = require('http');
const { SerialPort, ReadlineParser } = require('serialport');

let sp; // Declare SerialPort outside of the connection handler
let wsServer;
let isDeviceConnected = false; // Flag to track device connection status

const createSerialPort = () => {
  // Create a SerialPort instance for COM3
  sp = new SerialPort({ path: "COM3", baudRate: 9600 });
  const parser = sp.pipe(new ReadlineParser());

  // SerialPort data event handler (assuming you want to receive data from COM3)
  parser.on('data', (data) => {
    if (wsServer && wsServer.clients.size > 0) {
      wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  // Handle SerialPort errors
  sp.on('error', (err) => {
    console.error('COM3 Port Error:', err);
    if (isDeviceConnected) {
      isDeviceConnected = false;
      // Trigger reconnection logic here (e.g., retry connecting to the device).
      // You can implement an exponential backoff retry strategy to avoid flooding
      // the device with connection attempts.
      setTimeout(createSerialPort, 5000); // Retry after 5 seconds (adjust as needed)
    }
  });

  // Handle COM3 port open event
  sp.on('open', () => {
    console.log('COM3 Port opened');
    isDeviceConnected = true;
  });

  // Handle COM3 port close event
  sp.on('close', () => {
    console.log('COM3 Port closed');
    isDeviceConnected = false;
    // Trigger reconnection logic here (e.g., retry connecting to the device).
    // You can implement an exponential backoff retry strategy to avoid flooding
    // the device with connection attempts.
    setTimeout(createSerialPort, 5000); // Retry after 5 seconds (adjust as needed)
  });
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  if (!sp || !sp.isOpen) {
    // If the SerialPort is not open, create a new SerialPort instance
    createSerialPort();
  }

  ws.on('message', (message) => {
    console.log(message);
    if (isDeviceConnected && sp.isOpen) {
      sp.write(message, (err) => {
        if (err) {
          console.error('Error writing to COM3:', err);
          ws.send(JSON.stringify({ message: 'Device connection failed' }));
        }
      });
    } else {
      ws.send(JSON.stringify({ message: 'Device connection failed' }));

      if (!sp || !sp.isOpen) {
        createSerialPort()
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const HOST = 'sensor.libraryman.com';
const PORT = 80;

server.listen(PORT, HOST, () => {
  console.log(`WebSocket server is running at ws://${HOST}:${PORT}`);
  createSerialPort(); // Create the initial SerialPort instance
  wsServer = wss; // Store the WebSocket server instance
});
