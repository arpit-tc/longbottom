const express = require('express');
const http = require('http');
const moniker = require('moniker');
const socketio = require('socket.io');
const socketRedis = require('socket.io-redis');
const gracefulShutdown = require('http-graceful-shutdown');
const getenv = require('getenv');
const os = require('os');

const app = express();
const port = getenv.int('PORT');

const server = http.createServer(app);

// Serve static files for simple UI
app.use(express.static('public'));

// Not really necessary for this example, but this ensures the request IP matches the client and not the load-balancer
app.enable('trust proxy');

// Health check endpoint
app.get('/health', (req, res) => res.send('Healthy'));


const io = socketio(server);

// Handling multiple nodes: https://socket.io/docs/using-multiple-nodes/
io
.adapter(socketRedis({ host: getenv('REDIS_HOST'), port: getenv('REDIS_PORT') }))
.on('connection', (socket) => {
    io.emit('hostname', os.hostname());
    const name = moniker.choose();
    io.emit('chat message', `Welcome, new user ${name}!`);

    socket
      .on('disconnect', () => {
        console.log(`User '${name}' disconnected`)
        io.emit('chat message', `${name} left.`)
      })
      .on('chat message', function (msg) {
        io.emit('chat message', `${name}: ${msg}`)
      })
});



// Start server
server.listen(port, () => console.log(`app listening at http://localhost:${port}`));

// Handle SIGINT or SIGTERM and drain connections
gracefulShutdown(server);
