import type { User, Session } from '$lib/server/db/schema';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
    interface Error { message: string; code?: string }
  }
}
export {};
