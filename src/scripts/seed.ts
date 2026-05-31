// src/scripts/seed.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Task } from '../models/Task';

async function seed() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tasktracker';
  await mongoose.connect(uri);
  console.log('🌱 Connected to MongoDB. Seeding...');

  // Clear existing demo data
  await Organization.deleteMany({ name: 'Demo Organization' });

  const org = await Organization.create({ name: 'Demo Organization' });

  const [adminHash, managerHash, memberHash] = await Promise.all([
    bcrypt.hash('Admin123', 12),
    bcrypt.hash('Manager123', 12),
    bcrypt.hash('Member123', 12),
  ]);

  const [admin, manager, member] = await User.insertMany([
    { email: 'admin@demo.com', name: 'Demo Admin', passwordHash: adminHash, role: 'ADMIN', orgId: org._id },
    { email: 'manager@demo.com', name: 'Demo Manager', passwordHash: managerHash, role: 'MANAGER', orgId: org._id },
    { email: 'member@demo.com', name: 'Demo Member', passwordHash: memberHash, role: 'MEMBER', orgId: org._id },
  ]);

  const project = await Project.create({
    name: 'Alpha Project',
    description: 'Demo project for testing',
    orgId: org._id,
    createdById: admin._id,
  });

  await Task.insertMany([
    {
      title: 'Setup CI pipeline',
      description: 'Configure GitHub Actions for automated testing',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: manager._id,
      projectId: project._id,
      orgId: org._id,
      createdById: admin._id,
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
    {
      title: 'Write unit tests',
      description: 'Add tests for auth and task modules',
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: member._id,
      projectId: project._id,
      orgId: org._id,
      createdById: manager._id,
      dueDate: new Date(Date.now() + 14 * 86400000),
    },
    {
      title: 'Design database schema',
      description: 'Draft ERD and index strategy',
      priority: 'HIGH',
      status: 'DONE',
      assigneeId: admin._id,
      projectId: project._id,
      orgId: org._id,
      createdById: admin._id,
      completedAt: new Date(),
    },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('Demo credentials:');
  console.log('  ADMIN   → admin@demo.com   / Admin123');
  console.log('  MANAGER → manager@demo.com / Manager123');
  console.log('  MEMBER  → member@demo.com  / Member123');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
