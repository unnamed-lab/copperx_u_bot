import { Context } from "telegraf";
import { AuthUserDto } from "./user";

interface SessionData {
  isTransferProcessActive: boolean;
  loginState?: {
    email?: string;
    sid?: string;
  };
  profile?: AuthUserDto;
}

export interface MyContext<T = any> extends Context {
  session?: SessionData;
  req?: T;
  res?: T;
}
