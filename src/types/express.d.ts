import { IPayload } from "../utils/generateTokens";

declare global {
  namespace Express {
    interface User extends IPayload {}
  }
}

export {};
