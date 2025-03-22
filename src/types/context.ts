import { Context } from "telegraf";

interface SessionData {
  isTransferProcessActive: boolean;
  loginState?: {
    email?: string;
    sid?: string;
  };
}

export interface MyContext<T = any> extends Context {
  session?: SessionData;
  req?: T;
  res?: T;
}
