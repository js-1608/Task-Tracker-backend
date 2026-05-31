// src/modules/users/users.service.ts
import { Types } from 'mongoose';
import { User, Role } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import { invalidateOrgTaskCache } from '../../utils/cache';
import { hashPassword } from '../../utils/password';
import { CreateUserInput } from './users.schema';

const USER_PROJECTION = '-passwordHash';

export async function listUsers(orgId: string) {
  return User.find({ orgId: new Types.ObjectId(orgId) }, USER_PROJECTION).sort({ createdAt: 1 }).lean();
}

export async function getUserById(orgId: string, userId: string) {
  if (!Types.ObjectId.isValid(userId)) throw ApiError.notFound(`User ${userId} not found`);
  const user = await User.findOne(
    { _id: userId, orgId: new Types.ObjectId(orgId) },
    USER_PROJECTION,
  ).lean();
  if (!user) throw ApiError.notFound(`User ${userId} not found in your organization`);
  return user;
}

export async function updateUserRole(
  orgId: string,
  targetUserId: string,
  role: Role,
  requesterId: string,
) {
  if (targetUserId === requesterId)
    throw ApiError.badRequest('You cannot change your own role', 'SELF_ROLE_CHANGE');

  if (!Types.ObjectId.isValid(targetUserId)) throw ApiError.notFound(`User ${targetUserId} not found`);

  const user = await User.findOneAndUpdate(
    { _id: targetUserId, orgId: new Types.ObjectId(orgId) },
    { role },
    { new: true, projection: USER_PROJECTION },
  ).lean();

  if (!user) throw ApiError.notFound(`User ${targetUserId} not found in your organization`);
  return user;
}

export async function deleteUser(orgId: string, targetUserId: string, requesterId: string) {
  if (targetUserId === requesterId)
    throw ApiError.badRequest('You cannot remove yourself', 'SELF_DELETE');

  if (!Types.ObjectId.isValid(targetUserId)) throw ApiError.notFound(`User ${targetUserId} not found`);

  const user = await User.findOneAndDelete({
    _id: targetUserId,
    orgId: new Types.ObjectId(orgId),
  });

  if (!user) throw ApiError.notFound(`User ${targetUserId} not found in your organization`);
  await invalidateOrgTaskCache(orgId);
}

export async function createUser(orgId: string, input: CreateUserInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email is already registered', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
    role: input.role,
    orgId: new Types.ObjectId(orgId),
  });

  return user;
}
