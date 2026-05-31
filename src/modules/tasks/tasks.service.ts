// src/modules/tasks/tasks.service.ts
import { Types } from 'mongoose';
import { Task, TaskStatus } from '../../models/Task';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { ApiError } from '../../utils/ApiError';
import { Role } from '../../models/User';
import {
  cacheGet, cacheSet, cacheDel, CacheKeys,
  invalidateOrgTaskCache, invalidateAssigneeTaskCache,
} from '../../utils/cache';
import { CreateTaskInput, UpdateTaskInput, UpdateStatusInput, ListTasksQuery } from './tasks.schema';

// ─── Status Transition Machine ────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED'],
  IN_REVIEW:   ['DONE', 'BLOCKED'],
  DONE:        [],
  BLOCKED:     ['TODO', 'IN_PROGRESS'],
};

const POPULATE_OPTS = [
  { path: 'assigneeId', select: 'name email', model: 'User' },
  { path: 'projectId', select: 'name', model: 'Project' },
  { path: 'createdById', select: 'name', model: 'User' },
];

// ─── List Tasks ───────────────────────────────────────────────────────────────
export async function listTasks(
  requesterId: string,
  requesterRole: Role,
  orgId: string,
  query: ListTasksQuery,
) {
  const { page, limit, status, priority, assigneeId, projectId } = query;
  const effectiveAssigneeId = requesterRole === 'MEMBER' ? requesterId : assigneeId;

  const cacheKey = CacheKeys.taskList(
    orgId, effectiveAssigneeId, page, limit,
    `${status ?? ''}-${priority ?? ''}-${projectId ?? ''}`,
  );

  const cached = await cacheGet<{ tasks: unknown[]; total: number; page: number; limit: number; totalPages: number }>(cacheKey);
  if (cached) return cached;

  const filter: Record<string, unknown> = { orgId: new Types.ObjectId(orgId) };
  if (effectiveAssigneeId) filter.assigneeId = new Types.ObjectId(effectiveAssigneeId);
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId) filter.projectId = new Types.ObjectId(projectId);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate(POPULATE_OPTS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  const result = { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
  await cacheSet(cacheKey, result, 300);
  return result;
}

// ─── Get Task ─────────────────────────────────────────────────────────────────
export async function getTaskById(taskId: string, orgId: string, requesterId: string, role: Role) {
  if (!Types.ObjectId.isValid(taskId)) throw ApiError.notFound(`Task ${taskId} not found`);

  const cacheKey = CacheKeys.task(taskId);
  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    if (role === 'MEMBER' && cached.assigneeId?._id?.toString() !== requesterId &&
        cached.assigneeId?.toString() !== requesterId) {
      throw ApiError.forbidden('You can only view your own tasks');
    }
    return cached;
  }

  const task = await Task.findOne({ _id: taskId, orgId: new Types.ObjectId(orgId) })
    .populate(POPULATE_OPTS)
    .lean();
  if (!task) throw ApiError.notFound(`Task ${taskId} not found`);

  const assigneeIdStr = (task.assigneeId as any)?._id?.toString() ?? task.assigneeId?.toString();
  if (role === 'MEMBER' && assigneeIdStr !== requesterId) {
    throw ApiError.forbidden('You can only view your own tasks');
  }

  await cacheSet(cacheKey, task, 600);
  return task;
}

// ─── Create Task ──────────────────────────────────────────────────────────────
export async function createTask(orgId: string, userId: string, input: CreateTaskInput) {
  const orgObjId = new Types.ObjectId(orgId);

  if (!Types.ObjectId.isValid(input.projectId))
    throw ApiError.notFound(`Project ${input.projectId} not found`);

  const project = await Project.findOne({ _id: input.projectId, orgId: orgObjId });
  if (!project) throw ApiError.notFound(`Project ${input.projectId} not found in your organization`);

  if (input.assigneeId) {
    if (!Types.ObjectId.isValid(input.assigneeId))
      throw ApiError.notFound(`User ${input.assigneeId} not found`);
    const assignee = await User.findOne({ _id: input.assigneeId, orgId: orgObjId });
    if (!assignee) throw ApiError.notFound(`User ${input.assigneeId} not found in your organization`);
  }

  const task = await Task.create({
    title: input.title,
    description: input.description,
    priority: input.priority,
    assigneeId: input.assigneeId ? new Types.ObjectId(input.assigneeId) : undefined,
    projectId: new Types.ObjectId(input.projectId),
    orgId: orgObjId,
    createdById: new Types.ObjectId(userId),
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
  });

  await invalidateOrgTaskCache(orgId);
  return task.populate(POPULATE_OPTS);
}

// ─── Update Task ──────────────────────────────────────────────────────────────
export async function updateTask(
  taskId: string,
  orgId: string,
  requesterId: string,
  role: Role,
  input: UpdateTaskInput,
) {
  if (!Types.ObjectId.isValid(taskId)) throw ApiError.notFound(`Task ${taskId} not found`);
  const orgObjId = new Types.ObjectId(orgId);

  const task = await Task.findOne({ _id: taskId, orgId: orgObjId });
  if (!task) throw ApiError.notFound(`Task ${taskId} not found`);

  if (role === 'MEMBER' && task.assigneeId?.toString() !== requesterId) {
    throw ApiError.forbidden('You can only update tasks assigned to you');
  }

  if (input.assigneeId) {
    const assignee = await User.findOne({ _id: input.assigneeId, orgId: orgObjId });
    if (!assignee) throw ApiError.notFound(`User ${input.assigneeId} not found in your organization`);
  }

  const updateData: Record<string, unknown> = { ...input };
  if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
  else if (input.dueDate === null) updateData.dueDate = null;
  if (input.assigneeId) updateData.assigneeId = new Types.ObjectId(input.assigneeId);

  const updated = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
    .populate(POPULATE_OPTS)
    .lean();

  await cacheDel(CacheKeys.task(taskId));
  await invalidateOrgTaskCache(orgId);
  if (task.assigneeId) await invalidateAssigneeTaskCache(orgId, task.assigneeId.toString());
  if (input.assigneeId && input.assigneeId !== task.assigneeId?.toString()) {
    await invalidateAssigneeTaskCache(orgId, input.assigneeId);
  }

  return updated;
}

// ─── Update Status ────────────────────────────────────────────────────────────
export async function updateTaskStatus(
  taskId: string,
  orgId: string,
  requesterId: string,
  role: Role,
  input: UpdateStatusInput,
) {
  if (!Types.ObjectId.isValid(taskId)) throw ApiError.notFound(`Task ${taskId} not found`);

  const task = await Task.findOne({ _id: taskId, orgId: new Types.ObjectId(orgId) });
  if (!task) throw ApiError.notFound(`Task ${taskId} not found`);

  const isAssignee = task.assigneeId?.toString() === requesterId;
  const isPrivileged = role === 'MANAGER' || role === 'ADMIN';
  if (!isAssignee && !isPrivileged) {
    throw ApiError.forbidden('Only the assignee, a MANAGER, or ADMIN can change task status');
  }

  const allowed = VALID_TRANSITIONS[task.status];
  if (!allowed.includes(input.status)) {
    throw ApiError.badRequest(
      `Invalid status transition: ${task.status} → ${input.status}. Allowed: [${allowed.join(', ')}]`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updateData: Record<string, unknown> = { status: input.status };
  if (input.status === 'DONE') updateData.completedAt = new Date();

  const updated = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
    .populate(POPULATE_OPTS)
    .lean();

  await cacheDel(CacheKeys.task(taskId));
  await invalidateOrgTaskCache(orgId);
  if (task.assigneeId) await invalidateAssigneeTaskCache(orgId, task.assigneeId.toString());

  return updated;
}

// ─── Delete Task ──────────────────────────────────────────────────────────────
export async function deleteTask(taskId: string, orgId: string) {
  if (!Types.ObjectId.isValid(taskId)) throw ApiError.notFound(`Task ${taskId} not found`);

  const task = await Task.findOneAndDelete({ _id: taskId, orgId: new Types.ObjectId(orgId) });
  if (!task) throw ApiError.notFound(`Task ${taskId} not found`);

  await cacheDel(CacheKeys.task(taskId));
  await invalidateOrgTaskCache(orgId);
  if (task.assigneeId) await invalidateAssigneeTaskCache(orgId, task.assigneeId.toString());
}
