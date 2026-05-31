// src/models/Project.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  orgId: Types.ObjectId;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, maxlength: 2000 },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

ProjectSchema.index({ orgId: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project ?? mongoose.model<IProject>('Project', ProjectSchema);
