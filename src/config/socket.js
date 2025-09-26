import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SERVER_PORT, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});
