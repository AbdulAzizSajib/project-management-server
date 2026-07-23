import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { envVars } from "../config/env";
import { prisma } from "../lib/prisma";
import { jwtUtils } from "../utils/jwt";

/*
==================================================================
  SOCKET.IO — real-time comment + notification
==================================================================
  Nirbhorota: HTTP endpoint gulo agের moto DB te save kore. Socket
  shudhu "notun kichu hoyeche" broadcast kore. Tai save logic (auth,
  validation) duplicate hoy na.

  Room design:
    - user:<userId>  → protiti logged-in user nijer room e (notification)
    - task:<taskId>  → je TaskDetails page khule ache (comment)

  Auth: handshake er cookie theke better-auth session token niye,
  checkAuth middleware er motoi DB te verify kori. Verify hole
  socket.data.userId set kori.
==================================================================
*/

// cookie header string ("a=1; b=2") theke ekta specific cookie tule ane
const parseCookie = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
};

// Module-level singleton — onno file (comment/notification service) theke
// import kore emit korte parbe.
let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        envVars.FRONTEND_URL,
        envVars.BETTER_AUTH_URL,
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://server.ousadbazar.com",
        "https://project-management-client-sigma.vercel.app",
      ],
      credentials: true,
    },
  });

  // ---- Auth middleware: handshake er cookie verify kore ----
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      const rawSessionToken = parseCookie(
        cookieHeader,
        "better-auth.session_token",
      );

      if (!rawSessionToken) {
        return next(new Error("Unauthorized: no session token"));
      }

      // Better Auth cookie = "{token}.{signature}", DB te shudhu "{token}"
      const sessionToken = rawSessionToken.includes(".")
        ? rawSessionToken.split(".")[0]
        : rawSessionToken;

      const session = await prisma.session.findFirst({
        where: {
          token: sessionToken,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session || !session.user) {
        return next(new Error("Unauthorized: invalid session"));
      }

      if (!session.user.isActive || session.user.isDeleted) {
        return next(new Error("Unauthorized: inactive user"));
      }

      // accessToken (JWT) thakle setao verify kori — checkAuth er motoi
      const accessToken = parseCookie(cookieHeader, "accessToken");
      if (accessToken) {
        const verified = jwtUtils.verifyToken(
          accessToken,
          envVars.ACCESS_TOKEN_SECRET,
        );
        if (!verified.success) {
          return next(new Error("Unauthorized: invalid access token"));
        }
      }

      // Socket er sathe user ke jure di — pore room join korte lagbe
      socket.data.userId = session.user.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  // ---- Connection: user ke nijer notification room e dhukai ----
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Protiti user nijer room e — notification ei room e emit hobe
    socket.join(`user:${userId}`);

    // TaskDetails page khule client ei event pathabe → task room e join
    socket.on("task:join", (taskId: string) => {
      if (typeof taskId === "string" && taskId) {
        socket.join(`task:${taskId}`);
      }
    });

    // Page chere gele task room theke ber hoy
    socket.on("task:leave", (taskId: string) => {
      if (typeof taskId === "string" && taskId) {
        socket.leave(`task:${taskId}`);
      }
    });
  });

  return io;
};

// Onno file theke emit korar age io ready kina nishchit kori
export const getIO = (): SocketIOServer | null => io;

// ---- Emit helpers (service theke ekhane call hobe) ----

// Notun comment → oi task room er sobar kache
export const emitCommentNew = (taskId: string, comment: unknown) => {
  io?.to(`task:${taskId}`).emit("comment:new", comment);
};

// Notun notification → nirdishto user er room e
export const emitNotification = (userId: string, notification: unknown) => {
  io?.to(`user:${userId}`).emit("notification:new", notification);
};
