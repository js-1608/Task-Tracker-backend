// src/models/Task.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId?: Types.ObjectId;
  projectId: Types.ObjectId;
  orgId: Types.ObjectId;
  dueDate?: Date;
  createdById: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, maxlength: 5000 },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
      default: 'TODO',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    dueDate: { type: Date },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

// Indexes on frequently queried fields (documented in README)
TaskSchema.index({ status: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ orgId: 1, status: 1 });       // composite for org-scoped status filtering
TaskSchema.index({ orgId: 1, assigneeId: 1 });   // composite for cache key structure

export const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>('Task', TaskSchema);
