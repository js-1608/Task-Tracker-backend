// src/models/User.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  orgId: Types.ObjectId;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['ADMIN', 'MANAGER', 'MEMBER'], default: 'MEMBER' },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserSchema.index({ orgId: 1 });

// Never return passwordHash in JSON responses
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: unknown, ret: unknown) => {
    const obj = ret as Record<string, unknown>;
    delete obj['passwordHash'];
    return obj;
  },
});

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
