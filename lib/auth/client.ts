"use client";

// Browser auth client. Requests go through the app's /api/auth proxy.
import { createAuthClient } from "@neon/auth/next";

export const authClient = createAuthClient();
