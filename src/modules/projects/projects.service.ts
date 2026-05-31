// src/modules/projects/projects.service.ts
import { Types } from 'mongoose';
import { Project } from '../../models/Project';
import { ApiError } from '../../utils/ApiError';
import { CreateProjectInput, UpdateProjectInput } from './projects.schema';

const POPULATE_CREATOR = { path: 'createdById', select: 'id name email', model: 'User' };

export async function listProjects(orgId: string) {
  return Project.find({ orgId: new Types.ObjectId(orgId) })
    .populate(POPULATE_CREATOR)
    .sort({ createdAt: -1 })
    .lean();
}

export async function getProjectById(orgId: string, projectId: string) {
  if (!Types.ObjectId.isValid(projectId)) throw ApiError.notFound(`Project ${projectId} not found`);
  const project = await Project.findOne({
    _id: projectId,
    orgId: new Types.ObjectId(orgId),
  })
    .populate(POPULATE_CREATOR)
    .lean();
  if (!project) throw ApiError.notFound(`Project ${projectId} not found`);
  return project;
}

export async function createProject(orgId: string, userId: string, input: CreateProjectInput) {
  const project = await Project.create({
    ...input,
    orgId: new Types.ObjectId(orgId),
    createdById: new Types.ObjectId(userId),
  });
  return project.populate(POPULATE_CREATOR);
}

export async function updateProject(orgId: string, projectId: string, input: UpdateProjectInput) {
  if (!Types.ObjectId.isValid(projectId)) throw ApiError.notFound(`Project ${projectId} not found`);
  const project = await Project.findOneAndUpdate(
    { _id: projectId, orgId: new Types.ObjectId(orgId) },
    input,
    { new: true },
  )
    .populate(POPULATE_CREATOR)
    .lean();
  if (!project) throw ApiError.notFound(`Project ${projectId} not found`);
  return project;
}

export async function deleteProject(orgId: string, projectId: string) {
  if (!Types.ObjectId.isValid(projectId)) throw ApiError.notFound(`Project ${projectId} not found`);
  const project = await Project.findOneAndDelete({
    _id: projectId,
    orgId: new Types.ObjectId(orgId),
  });
  if (!project) throw ApiError.notFound(`Project ${projectId} not found`);
}
