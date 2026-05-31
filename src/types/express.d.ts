// src/types/express.d.ts
// IMPORTANT: No import or export statements in this file.
// Any import/export turns this into a module and breaks the global namespace augmentation.
// The Role type is intentionally inlined as a string union to avoid needing an import.

declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      orgId: string;
      role: 'ADMIN' | 'MANAGER' | 'MEMBER';
    };
  }
}
