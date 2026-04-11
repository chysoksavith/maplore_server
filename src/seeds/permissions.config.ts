// Route-Based Permission Configuration
// Permissions are generated based on actual API routes, not manually defined

import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedPermission {
  action: string;
  subject: string;
  description: string;
}

export interface RoutePermission {
  method: string;
  path: string;
  subject: string;
  action: string;
}

// Map HTTP methods to permission actions
const methodToAction: Record<string, string> = {
  'GET': 'read',
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete',
};

/**
 * Scan route files and extract permissions from authorization helper calls and HTTP methods
 * This makes permissions truly dynamic based on actual API routes
 */
export function scanRoutesForPermissions(routesDir: string): GeneratedPermission[] {
  const permissions: Map<string, GeneratedPermission> = new Map();

  // Get all route files
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('Routes.ts') || f.endsWith('.ts'));

  for (const file of routeFiles) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract subject from permission helper calls like canRead/canCreate/canUpdate/canDelete/canManage
    const permissionMatches = content.matchAll(/can(?:Read|Create|Update|Delete|Manage)\(['"](\w+)['"]\)/g);
    const subjects = new Set<string>();
    for (const match of permissionMatches) {
      subjects.add(match[1]);
    }

    // If no helper subject found, try to infer from filename
    if (subjects.size === 0) {
      const subjectMatch = file.match(/(\w+)Routes?\.ts/);
      if (subjectMatch) {
        subjects.add(subjectMatch[1]);
      }
    }

    // Parse router methods to determine actions
    const routerMethodMatches = content.matchAll(/router\.(get|post|put|patch|delete)\s*\(/gi);
    const methods = new Set<string>();
    for (const match of routerMethodMatches) {
      methods.add(match[1].toUpperCase());
    }

    // Generate permissions for each subject based on HTTP methods
    for (const subject of subjects) {
      for (const method of methods) {
        const action = methodToAction[method] || 'manage';
        const key = `${action}:${subject}`;

        if (!permissions.has(key)) {
          permissions.set(key, {
            action,
            subject,
            description: generateDescription(action, subject),
          });
        }
      }

      // Always ensure 'manage' permission exists for each subject (for super admin)
      const manageKey = `manage:${subject}`;
      if (!permissions.has(manageKey)) {
        permissions.set(manageKey, {
          action: 'manage',
          subject,
          description: `Full control over ${subject.toLowerCase()}`,
        });
      }
    }
  }

  return Array.from(permissions.values());
}

function generateDescription(action: string, subject: string): string {
  const actionDescriptions: Record<string, string> = {
    create: 'Can create new',
    read: 'Can view',
    update: 'Can update',
    delete: 'Can delete',
    manage: 'Full control over',
  };
  return `${actionDescriptions[action] || 'Can'} ${subject.toLowerCase()}`;
}

/**
 * Add a special "manage all" permission for super admins
 */
export function addManageAllPermission(): GeneratedPermission {
  return {
    action: 'manage',
    subject: 'all',
    description: 'Full system access (super admin)',
  };
}

/**
 * Generate all permissions based on routes + any additional manual permissions
 */
export function generateAllPermissions(routesDir: string, additionalPerms: GeneratedPermission[] = []): GeneratedPermission[] {
  const routePermissions = scanRoutesForPermissions(routesDir);
  const allPermissions = [addManageAllPermission(), ...routePermissions, ...additionalPerms];

  // Remove duplicates
  const unique = new Map<string, GeneratedPermission>();
  for (const perm of allPermissions) {
    unique.set(`${perm.action}:${perm.subject}`, perm);
  }

  return Array.from(unique.values());
}

// ============================================
// ROLE DEFINITIONS
// ============================================

export interface RoleDefinition {
  name: string;
  description: string;
  /**
   * Action patterns to match against permissions
   * Use '*' to match all actions, or specific actions like ['read', 'create']
   */
  allowedActions?: string[];
  /**
   * Subject patterns to match against permissions
   * Use '*' to match all subjects, or specific subjects
   */
  allowedSubjects?: string[];
  /**
   * Specific permissions to exclude (exact format: "action:subject")
   * Useful for denying specific permissions even if they match patterns
   */
  excludedPermissions?: string[];
  /**
   * Special permissions like 'manage:all' for super admin
   */
  specialPermissions?: string[];
}

/**
 * Pattern-based role definitions
 * These automatically match against dynamically generated permissions from routes
 * When new routes are added, roles automatically get matching permissions
 */
export const roleDefinitions: RoleDefinition[] = [
  {
    name: 'ADMIN',
    description: 'System administrator with full access',
    specialPermissions: ['all'], // Gets manage:all permission
  },
  {
    name: 'MODERATOR',
    description: 'Can manage most resources but cannot manage roles or system settings',
    allowedActions: ['read', 'create', 'update', 'delete'],
    allowedSubjects: ['*'], // All subjects
    excludedPermissions: [
      'manage:Role',
      'delete:Role',
      'manage:Settings',
      'delete:Settings',
    ],
  },
  {
    name: 'USER',
    description: 'Standard application user with read-only access',
    allowedActions: ['read'],
    allowedSubjects: ['*'], // All subjects
    excludedPermissions: [
      'read:Role',
    ],
  },
  {
    name: 'MANAGER',
    description: 'Can read and create resources, but cannot delete or manage system settings',
    allowedActions: ['read', 'create', 'update'],
    allowedSubjects: ['*'], // All subjects
    excludedPermissions: [
      'delete:*',
      'manage:Role',
      'manage:Settings',
    ],
  },
];
