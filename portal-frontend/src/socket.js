import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

socket.on('connect', () => {
    console.log('[WS] Connected to portal backend');
});

socket.on('disconnect', () => {
    console.log('[WS] Disconnected from portal backend');
});

export default socket;
