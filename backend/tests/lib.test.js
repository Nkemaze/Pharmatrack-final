import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodes } from '../src/lib/errors.js';
import { signAccessToken, signRefreshToken, ttlToSeconds, verifyAccessToken } from '../src/lib/jwt.js';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

describe('jwt', () => {
  it('round-trips access tokens with role and pharmacy', () => {
    const { token, jti } = signAccessToken({ id: 'u1', role: 'PHARMACY', pharmacyId: 'p1' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('PHARMACY');
    expect(payload.pharmacyId).toBe('p1');
    expect(payload.jti).toBe(jti);
    expect(payload.typ).toBe('access');
  });

  it('does not accept a refresh token as an access token', () => {
    const { token } = signRefreshToken({ id: 'u1', role: 'ADMIN' });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('parses ttl strings to seconds', () => {
    expect(ttlToSeconds('30m')).toBe(1800);
    expect(ttlToSeconds('30d')).toBe(2_592_000);
    expect(ttlToSeconds(120)).toBe(120);
  });
});

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('errors', () => {
  it('maps codes to HTTP statuses', () => {
    expect(new AppError(ErrorCodes.NOT_FOUND).status).toBe(404);
    expect(new AppError(ErrorCodes.RATE_LIMITED).status).toBe(429);
    expect(new AppError(ErrorCodes.AUTH_REQUIRED).status).toBe(401);
    expect(new AppError(ErrorCodes.VALIDATION_ERROR).status).toBe(422);
  });
});