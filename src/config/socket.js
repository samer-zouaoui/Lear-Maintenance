import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;


export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: { origin: '*' },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentification requise'));
        }
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return next(new Error('Token invalide ou expiré'));
            }
            socket.user = user;
            next();
        });
    });

    io.on('connection', (socket) => {
        socket.join(`user:${socket.user.idUser}`);
    });

    return io;
}


export function emitToUser(userId, event, payload) {
    if (!io || !userId) return;
    io.to(`user:${userId}`).emit(event, payload);
}