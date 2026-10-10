import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';

export function signAccessToken(user) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, role: user.role, pharmacyId: user.pharmacyId ?? null, typ: 'access', jti },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl },
  );
  return { token, jti };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function signRefreshToken(user) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, role: user.role, pharmacyId: user.pharmacyId ?? null, typ: 'refresh', jti },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtl },
  );
  return { token, jti };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

export function ttlToSeconds(ttl) {
  if (typeof ttl === 'number') return ttl;
  const match = /^(\d+)(s|m|h|d|w|y)?$/.exec(ttl);
  if (!match) return 1800;
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const perUnit = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };
  return value * perUnit[unit];
}