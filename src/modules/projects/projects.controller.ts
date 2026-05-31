// src/modules/projects/projects.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from './projects.service';
import { sendSuccess, sendCreated } from '../../utils/ApiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await listProjects(req.user!.orgId);
    sendSuccess(res, projects);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await getProjectById(req.user!.orgId, req.params['id'] as string);
    sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await createProject(req.user!.orgId, req.user!.userId, req.body);
    sendCreated(res, project, 'Project created');
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await updateProject(req.user!.orgId, req.params['id'] as string, req.body);
    sendSuccess(res, project, 'Project updated');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteProject(req.user!.orgId, req.params['id'] as string);
    sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
}
