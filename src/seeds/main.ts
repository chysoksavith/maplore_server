import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import {
  generateAllPermissions,
  scanRoutesForPermissions,
  addManageAllPermission,
  GeneratedPermission,
  RoleDefinition,
  roleDefinitions,
} from './permissions.config';
import * as path from 'path';

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'chysavith089@gmail.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const userEmail = (process.env.SEED_USER_EMAIL || 'user@maplore.com').toLowerCase();
  const userPassword = process.env.SEED_USER_PASSWORD || 'User@1234';
  const passwordHashAdmin = await bcrypt.hash(adminPassword, 12);
  const passwordHashUser = await bcrypt.hash(userPassword, 12);

  console.log('Seeding initial roles, permissions, and default accounts...');

  // ============================================
  // ROUTE-BASED PERMISSION GENERATION
  // ============================================
  // Scan actual API routes to generate permissions dynamically
  const routesDir = path.join(__dirname, '..', 'routes');
  const permissionsData = generateAllPermissions(routesDir);

  const routeFiles = require('fs').readdirSync(routesDir).filter((f: string) => f.endsWith('.ts'));
  console.log(`Generated ${permissionsData.length} permissions from ${routeFiles.length} route files`);

  // Upsert all permissions
  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: { description: p.description },
      create: p,
    });
  }

  // Fetch all permissions for role assignment
  const allPermissions = await prisma.permission.findMany();
  const getPermId = (action: string, subject: string) =>
    allPermissions.find(p => p.action === action && p.subject === subject)?.id;

  // ============================================
  // DYNAMIC ROLE GENERATION
  // ============================================
  console.log(`Creating ${roleDefinitions.length} roles...`);

  // Store created roles for user assignment
  const createdRoles: Record<string, { id: number }> = {};

  for (const roleDef of roleDefinitions) {
    const role = await seedRole(roleDef, getPermId, allPermissions as GeneratedPermission[]);
    createdRoles[roleDef.name] = role;
  }

  // ============================================
  // OPTIONAL: Seed default user accounts
  // Set SEED_USERS=true to create admin and user accounts
  // ============================================
  if (process.env.SEED_USERS === 'true') {
    // Get ADMIN and USER roles for default accounts
    const adminRole = createdRoles['ADMIN'];
    const userRole = createdRoles['USER'];

    if (!adminRole || !userRole) {
      throw new Error('ADMIN or USER role not found after seeding');
    }
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Maplore Admin',
        password: passwordHashAdmin,
        type: 'ADMIN',
        isActive: true,
        emailVerified: true,
        roleId: adminRole.id,
        bannedAt: null,
        bannedReason: null,
        lockedUntil: null,
        loginAttempts: 0,
        otpCode: null,
        otpExpires: null,
        otpAttempts: 0,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      create: {
        email: adminEmail,
        name: 'Maplore Admin',
        password: passwordHashAdmin,
        type: 'ADMIN',
        isActive: true,
        emailVerified: true,
        roleId: adminRole.id,
      },
    });

    await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: 'Maplore User',
        password: passwordHashUser,
        type: 'USER',
        isActive: true,
        emailVerified: true,
        roleId: userRole.id,
        bannedAt: null,
        bannedReason: null,
        lockedUntil: null,
        loginAttempts: 0,
        otpCode: null,
        otpExpires: null,
        otpAttempts: 0,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      create: {
        email: userEmail,
        name: 'Maplore User',
        password: passwordHashUser,
        type: 'USER',
        isActive: true,
        emailVerified: true,
        roleId: userRole.id,
      },
    });

    console.log(`Seeded admin account: ${adminEmail}`);
    console.log(`Seeded user account: ${userEmail}`);
  } else {
    console.log('Skipping user account seeding (set SEED_USERS=true to create accounts)');
  }

  console.log('Seeding completed successfully');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Seed a role with its permissions based on role definition
 */
async function seedRole(
  roleDef: RoleDefinition,
  getPermId: (action: string, subject: string) => number | undefined,
  allPermissions: GeneratedPermission[]
) {
  // Create/update role
  const role = await prisma.role.upsert({
    where: { name: roleDef.name },
    update: { description: roleDef.description },
    create: {
      name: roleDef.name,
      description: roleDef.description,
    },
  });

  // Resolve permission IDs
  let permissionIds: number[] = [];

  // Handle special permissions (like 'all' for manage:all)
  if (roleDef.specialPermissions) {
    for (const specialPerm of roleDef.specialPermissions) {
      if (specialPerm === 'all') {
        const allPermId = getPermId('manage', 'all');
        if (allPermId) permissionIds.push(allPermId);
      } else {
        const [action, subject] = specialPerm.split(':');
        const permId = getPermId(action, subject);
        if (permId) permissionIds.push(permId);
      }
    }
  }

  // Handle pattern-based permission matching
  if (roleDef.allowedActions || roleDef.allowedSubjects) {
    for (const perm of allPermissions) {
      // Skip manage:all permission (handled separately)
      if (perm.subject === 'all') continue;

      // Check if action matches pattern
      const actionMatches = roleDef.allowedActions?.includes('*') ||
        roleDef.allowedActions?.includes(perm.action) ||
        !roleDef.allowedActions;

      // Check if subject matches pattern
      const subjectMatches = roleDef.allowedSubjects?.includes('*') ||
        roleDef.allowedSubjects?.includes(perm.subject) ||
        !roleDef.allowedSubjects;

      if (actionMatches && subjectMatches) {
        const permId = getPermId(perm.action, perm.subject);
        if (permId) permissionIds.push(permId);
      }
    }
  }

  // Handle exclusions (remove permissions that match exclusion patterns)
  if (roleDef.excludedPermissions) {
    for (const exclusion of roleDef.excludedPermissions) {
      const [excludedAction, excludedSubject] = exclusion.split(':');

      if (excludedAction === '*') {
        // Exclude all actions for this subject
        permissionIds = permissionIds.filter(id => {
          const perm = allPermissions.find(p => getPermId(p.action, p.subject) === id);
          return perm?.subject !== excludedSubject;
        });
      } else if (excludedSubject === '*') {
        // Exclude this action for all subjects
        permissionIds = permissionIds.filter(id => {
          const perm = allPermissions.find(p => getPermId(p.action, p.subject) === id);
          return perm?.action !== excludedAction;
        });
      } else {
        // Exclude exact permission
        const excludedPermId = getPermId(excludedAction, excludedSubject);
        permissionIds = permissionIds.filter(id => id !== excludedPermId);
      }
    }
  }

  // Remove duplicates and filter out undefined
  permissionIds = [...new Set(permissionIds)].filter(Boolean) as number[];

  // Assign permissions to role
  for (const permId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
      update: {},
      create: { roleId: role.id, permissionId: permId },
    });
  }

  console.log(`  ✓ ${roleDef.name}: ${permissionIds.length} permissions`);

  return role;
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
