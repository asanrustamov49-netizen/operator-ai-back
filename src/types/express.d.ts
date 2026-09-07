// src/types/express.d.ts
declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      google_id?: number;
    }
  }
}

export {};
