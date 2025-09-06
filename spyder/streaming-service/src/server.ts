import net from "net";
import { WebSocket, WebSocketServer } from "ws";

interface VehicleData {
  battery_temperature: number | string;
  timestamp: number;
}

const TCP_PORT = 12000;
const WS_PORT = 8080;
const tcpServer = net.createServer();
const websocketServer = new WebSocketServer({ port: WS_PORT });

tcpServer.on("connection", (socket) => {
  console.log("TCP client connected");

  socket.on("data", (msg) => {
    const message: string = msg.toString();
    console.log(`Received: ${message}`);

    try {
      const data = JSON.parse(message);
      if (isValidData(data)) {
        safeTemp(data);
        websocketServer.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
        console.log("good data");
      } else {
        console.log("bad data");
      }
    } catch (error) {
      console.log("failed to parse JSON");
    }
  });

  socket.on("end", () => {
    console.log("Closing connection with the TCP client");
  });

  socket.on("error", (err) => {
    console.log("TCP client error: ", err);
  });
});

websocketServer.on("listening", () =>
  console.log(`Websocket server started on port ${WS_PORT}`)
);

websocketServer.on("connection", async (ws: WebSocket) => {
  console.log("Frontend websocket client connected");
  ws.on("error", console.error);
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
});

function isValidData(data: any): data is VehicleData {
  if (!data || typeof data != "object") return false;

  if (!("battery_temperature" in data) || !("timestamp" in data)) return false;

  // checking temp
  const temp = data.battery_temperature;
  if (typeof temp === "string") {
    const testTemp = parseFloat(temp);
    if (isNaN(testTemp)) return false;
  } else if (typeof temp === "number") {
    if (isNaN(temp) || !isFinite(temp)) return false;
  }

  // checking time
  const time = data.timestamp;

  if (typeof time != "number") return false;
  if (isNaN(time) || !isFinite(time)) return false;

  return true;
}

let unsafeTemp = 0;
let firstUnsafe: number | null = null;

function safeTemp(data: VehicleData): void {
  let temp: number;

  if (typeof data.battery_temperature === "string") {
    temp = parseFloat(data.battery_temperature);
  } else {
    temp = data.battery_temperature;
  }

  const currTime = Date.now();
  if (temp > 80 || temp < 20) {
    if (firstUnsafe == null || currTime - firstUnsafe > 5000) {
      unsafeTemp = 1;
      firstUnsafe = currTime;
    } else {
      unsafeTemp++;
    }

    console.log(`Unsafe temp: ${temp} C  at ${currTime}`);

    if (unsafeTemp >= 3) {
      console.error(`SHUT DOWN THE BATTERY`);
      unsafeTemp = 0;
      firstUnsafe = null;
    }
  } else {
    unsafeTemp = 0;
    firstUnsafe = null;
  }
}
