import prisma from '../config/db';

export const getAllRoles = async () => {
  return await prisma.role.findMany({
    include: {
      permissions: { select: { permission: true } }
    }
  });
};

export const getRoleById = async (id: number) => {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { select: { permission: true } }
    }
  });
};

export const createRole = async (data: { name: string; description?: string; permissionIds?: number[] }) => {
  const { name, description, permissionIds } = data;
  return await prisma.role.create({
    data: {
      name,
      description,
      permissions: {
        create: (permissionIds || []).map((id: number) => ({
           permission: { connect: { id } }
        }))
      }
    },
    include: { permissions: { select: { permission: true } } }
  });
};

export const updateRole = async (id: number, data: { name?: string; description?: string; permissionIds?: number[] }) => {
  const { name, description, permissionIds } = data;
  
  // Reset permissions
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  
  return await prisma.role.update({
    where: { id },
    data: {
      name,
      description,
      permissions: {
        create: (permissionIds || []).map((pid: number) => ({
           permission: { connect: { id: pid } }
        }))
      }
    },
    include: { permissions: { select: { permission: true } } }
  });
};

export const deleteRole = async (id: number) => {
  return await prisma.role.delete({ where: { id } });
};

// --- Permissions ---
export const getAllPermissions = async () => {
  return await prisma.permission.findMany();
};

export const createPermission = async (data: { action: string; subject: string; description?: string }) => {
  return await prisma.permission.create({
    data
  });
};

export const assignRoleToUser = async (userId: number, roleId: number) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { roleId },
    select: { id: true, email: true, name: true, role: true }
  });
};
