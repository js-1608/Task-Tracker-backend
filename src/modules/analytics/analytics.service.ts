// src/modules/analytics/analytics.service.ts
import { Types } from 'mongoose';
import { Task } from '../../models/Task';

export async function getOverdueStats(orgId: string) {
  const orgObjId = new Types.ObjectId(orgId);

  // Overdue tasks per user (MongoDB aggregation pipeline)
  const overdueByUser = await Task.aggregate([
    {
      $match: {
        orgId: orgObjId,
        status: { $nin: ['DONE'] },
        dueDate: { $lt: new Date(), $ne: null },
      },
    },
    {
      $group: {
        _id: '$assigneeId',
        overdueCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        userName: '$user.name',
        email: '$user.email',
        overdueCount: 1,
      },
    },
    { $sort: { overdueCount: -1 } },
  ]);

  // Average completion time in hours for DONE tasks
  const avgResult = await Task.aggregate([
    {
      $match: {
        orgId: orgObjId,
        status: 'DONE',
        completedAt: { $ne: null },
      },
    },
    {
      $project: {
        durationMs: {
          $subtract: ['$completedAt', '$createdAt'],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgDurationMs: { $avg: '$durationMs' },
      },
    },
    {
      $project: {
        _id: 0,
        avgCompletionHours: {
          $round: [{ $divide: ['$avgDurationMs', 3600000] }, 2],
        },
      },
    },
  ]);

  return {
    overdueByUser,
    avgCompletionHours: avgResult[0]?.avgCompletionHours ?? null,
  };
}
