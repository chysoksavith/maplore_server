import prisma from '../config/db';

async function main() {
  console.log('Seeding initial roles and permissions...');

  // 1. Create Permissions
  const permissionsData = [
    { action: 'manage', subject: 'all', description: 'Total control' },
    { action: 'manage', subject: 'Role', description: 'Can manage roles and permissions' },
    { action: 'manage', subject: 'Dashboard', description: 'Can manage backend dashboard' },
    { action: 'read', subject: 'User', description: 'Can view user lists' },
    { action: 'update', subject: 'User', description: 'Can update users' },
    { action: 'delete', subject: 'User', description: 'Can delete users' },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: {},
      create: p,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const getPermId = (action: string, subject: string) => 
    allPermissions.find(p => p.action === action && p.subject === subject)?.id;

  // 2. Create Roles
  
  // SUPERADMIN
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: {
      name: 'SUPERADMIN',
      description: 'System administrator with full access',
    },
  });

  const manageAllId = getPermId('manage', 'all');
  if (manageAllId) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: manageAllId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: manageAllId },
    });
  }

  // BACKEND_USER
  const backendUserRole = await prisma.role.upsert({
    where: { name: 'BACKEND_USER' },
    update: {},
    create: {
      name: 'BACKEND_USER',
      description: 'Staff member with dashboard access',
    },
  });

  const backendPerms = [
    getPermId('manage', 'Dashboard'),
    getPermId('read', 'User'),
  ].filter(Boolean) as number[];

  for (const pId of backendPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: backendUserRole.id, permissionId: pId } },
      update: {},
      create: { roleId: backendUserRole.id, permissionId: pId },
    });
  }

  // USER
  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Standard application user',
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
