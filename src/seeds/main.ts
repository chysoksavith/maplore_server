import prisma from '../config/db';
import bcrypt from 'bcryptjs';

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'chysavith089@gmail.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const userEmail = (process.env.SEED_USER_EMAIL || 'user@maplore.com').toLowerCase();
  const userPassword = process.env.SEED_USER_PASSWORD || 'User@1234';
  const passwordHashAdmin = await bcrypt.hash(adminPassword, 12);
  const passwordHashUser = await bcrypt.hash(userPassword, 12);

  console.log('Seeding initial roles, permissions, and default accounts...');

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

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator with full access',
    },
  });

  const manageAllId = getPermId('manage', 'all');
  if (manageAllId) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: manageAllId } },
      update: {},
      create: { roleId: adminRole.id, permissionId: manageAllId },
    });
  }

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Standard application user',
    },
  });

  const userPerms = [
    getPermId('read', 'User'),
  ].filter(Boolean) as number[];

  for (const pId of userPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: pId } },
      update: {},
      create: { roleId: userRole.id, permissionId: pId },
    });
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
  console.log('Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
