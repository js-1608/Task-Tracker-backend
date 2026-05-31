// src/models/RefreshToken.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

RefreshTokenSchema.index({ userId: 1 });
// TTL index — MongoDB auto-deletes expired tokens after 1 day grace period
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken ?? mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
