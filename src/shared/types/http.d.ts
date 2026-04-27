import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      role?: string;
    }

    interface Request {
      id?: string;
    }
  }
}

declare module 'http' {
  interface IncomingMessage {
    id?: string;
    user?: {
      id: string;
      role?: string;
    };
  }
}
