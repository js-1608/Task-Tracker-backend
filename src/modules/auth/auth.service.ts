// src/modules/auth/auth.service.ts
import crypto from 'crypto';
import { Organization } from '../../models/Organization';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.schema';

function parseTTLMs(ttl: string): number {
  const unit = ttl.slice(-1);
  const value = parseInt(ttl.slice(0, -1), 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 1000);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerService(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email is already registered', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);

  // Create org first, then user
  const org = await Organization.create({ name: input.orgName });
  const user = await User.create({
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
    role: 'ADMIN',
    orgId: org._id,
  });

  const { accessToken, refreshToken } = await issueTokens(
    user._id.toString(),
    org._id.toString(),
    user.role,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: org._id,
    },
  };
}

export async function loginService(input: LoginInput) {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const { accessToken, refreshToken } = await issueTokens(
    user._id.toString(),
    user.orgId.toString(),
    user.role,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
    },
  };
}

export async function refreshService(rawRefreshToken: string) {
  let payload: { userId: string; tokenVersion: number };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const hashed = hashToken(rawRefreshToken);
  const stored = await RefreshToken.findOne({ token: hashed });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is invalid or has been revoked', 'INVALID_REFRESH_TOKEN');
  }

  // Rotate: revoke old, issue new
  stored.revoked = true;
  await stored.save();

  const user = await User.findById(payload.userId);
  if (!user) throw ApiError.unauthorized('User not found', 'INVALID_REFRESH_TOKEN');

  const { accessToken, refreshToken } = await issueTokens(
    user._id.toString(),
    user.orgId.toString(),
    user.role,
  );

  return { accessToken, refreshToken };
}

export async function logoutService(rawRefreshToken: string) {
  const hashed = hashToken(rawRefreshToken);
  await RefreshToken.updateMany({ token: hashed }, { revoked: true });
}

async function issueTokens(userId: string, orgId: string, role: string) {
  const accessToken = signAccessToken({ userId, orgId, role });
  const refreshToken = signRefreshToken({ userId, tokenVersion: Date.now() });

  const ttlMs = parseTTLMs(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + ttlMs);
  const hashed = hashToken(refreshToken);

  await RefreshToken.create({ token: hashed, userId, expiresAt });
  return { accessToken, refreshToken };
}
