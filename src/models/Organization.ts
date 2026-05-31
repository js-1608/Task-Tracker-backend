// src/models/Organization.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  { name: { type: String, required: true, trim: true } },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true } },
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ?? mongoose.model<IOrganization>('Organization', OrganizationSchema);
