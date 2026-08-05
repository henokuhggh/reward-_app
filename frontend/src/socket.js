import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// One shared socket for the whole app. Connected lazily on first
// use rather than at module load, so the mini app doesn't open a
// socket before the user ever visits a bingo screen.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE, { transports: ['websocket', 'polling'] });
  }
  return socket;
}
