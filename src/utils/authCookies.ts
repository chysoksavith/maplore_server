import { Response, CookieOptions } from "express";

// ---------------------------------------------------------------------------
// Cookie names
// ---------------------------------------------------------------------------
export const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a JWT-style duration string (e.g. "1m", "15m", "1h") into milliseconds.
 */
const parseTokenTTLtoMs = (ttl: string): number => {
  const match = ttl.match(/^(\d+)([smhdwy])$/);
  if (!match) return 15 * 60 * 1000; // default 15m
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] || 60 * 1000);
};

const isProduction = () => process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Access-token cookie
// ---------------------------------------------------------------------------
const createAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "strict",
  maxAge: parseTokenTTLtoMs(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m"),
  path: "/api",
});

export const setAccessTokenCookie = (res: Response, accessToken: string) => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, createAccessTokenCookieOptions());
};

export const clearAccessTokenCookie = (res: Response) => {
  const { maxAge, ...cookieOptions } = createAccessTokenCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, cookieOptions);
};

// ---------------------------------------------------------------------------
// Refresh-token cookie
// ---------------------------------------------------------------------------
const createRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
});

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, createRefreshTokenCookieOptions());
};

export const clearRefreshTokenCookie = (res: Response) => {
  const { maxAge, ...cookieOptions } = createRefreshTokenCookieOptions();
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
};

// ---------------------------------------------------------------------------
// Clear all auth cookies (logout)
// ---------------------------------------------------------------------------
export const clearAllAuthCookies = (res: Response) => {
  clearAccessTokenCookie(res);
  clearRefreshTokenCookie(res);
};
