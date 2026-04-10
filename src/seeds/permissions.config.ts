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
 * Scan route files and extract permissions from canManage() calls and HTTP methods
 * This makes permissions truly dynamic based on actual API routes
 */
export function scanRoutesForPermissions(routesDir: string): GeneratedPermission[] {
  const permissions: Map<string, GeneratedPermission> = new Map();

  // Get all route files
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('Routes.ts') || f.endsWith('.ts'));

  for (const file of routeFiles) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract subject from canManage('Subject') calls
    const canManageMatches = content.matchAll(/canManage\(['"](\w+)['"]\)/g);
    const subjects = new Set<string>();
    for (const match of canManageMatches) {
      subjects.add(match[1]);
    }

    // If no canManage found, try to infer from filename
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
  permissions: string[]; // Format: "action:subject" or "all" for manage:all
}

export const roleDefinitions: RoleDefinition[] = [
  {
    name: 'ADMIN',
    description: 'System administrator with full access',
    permissions: ['all'],
  },
  {
    name: 'MODERATOR',
    description: 'Can manage users and view reports but cannot manage roles',
    permissions: [
      'create:User',
      'read:User',
      'update:User',
      'ban:User',
      'access:Dashboard',
      'view:Dashboard',
      'read:Report',
      'read:Role',
    ],
  },
  {
    name: 'USER',
    description: 'Standard application user',
    permissions: [
      'read:User',
    ],
  },
  {
    name: 'MANAGER',
    description: 'Can manage reports and view dashboard',
    permissions: [
      'read:User',
      'read:Report',
      'export:Report',
      'access:Dashboard',
      'view:Dashboard',
      'read:Settings',
    ],
  },
];
