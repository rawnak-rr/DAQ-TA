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
      console.log("Failed to parse JSON");
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
    if (testTemp > 80 || testTemp < 20) {
      return false;
    }
  } else if (typeof temp === "number") {
    if (isNaN(temp) || !isFinite(temp)) return false;

    if (temp > 80 || temp < 20) return false;
  } else {
    return false;
  }

  // checking time
  const time = data.timestamp;

  if (typeof time != "number") return false;
  if (isNaN(time) || !isFinite(time)) return false;

  return true;
}
