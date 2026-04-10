import prisma from '../config/db';

// --- Permission Types & Utils ---
export interface TransformedPermission {
  id: number;
  name: string;
  description: string | null;
  group: string;
  action: string;
  subject: string;
}

export const transformPermission = (permission: { id: number; action: string; subject: string; description: string | null }): TransformedPermission => ({
  id: permission.id,
  name: `${permission.action} ${permission.subject}`,
  description: permission.description,
  group: permission.subject,
  action: permission.action,
  subject: permission.subject,
});

// --- Role Functions ---
export const getAllRoles = async (options?: { page?: number; limit?: number; search?: string }) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;

  const where = options?.search
    ? { name: { contains: options.search, mode: 'insensitive' as const } }
    : {};

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limit,
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } }
      }
    }),
    prisma.role.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    roles: roles.map((role: any) => ({
      ...role,
      permissions: role.permissions.map((rp: any) => ({
        ...rp,
        permission: transformPermission(rp.permission)
      })),
      userCount: role._count.users
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};

export const getRoleById = async (id: number) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { select: { permission: true } }
    }
  });

  if (!role) return null;

  return {
    ...role,
    permissions: role.permissions.map((rp: any) => ({
      ...rp,
      permission: transformPermission(rp.permission)
    }))
  };
};

export const createRole = async (data: { name: string; description?: string; permissionIds?: number[] }) => {
  const { name, description, permissionIds } = data;
  const role = await prisma.role.create({
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

  return {
    ...role,
    permissions: role.permissions.map((rp: any) => ({
      ...rp,
      permission: transformPermission(rp.permission)
    }))
  };
};

export const updateRole = async (id: number, data: { name?: string; description?: string; permissionIds?: number[] }) => {
  const { name, description, permissionIds } = data;

  // Reset permissions
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });

  const role = await prisma.role.update({
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

  return {
    ...role,
    permissions: role.permissions.map((rp: any) => ({
      ...rp,
      permission: transformPermission(rp.permission)
    }))
  };
};

export const deleteRole = async (id: number) => {
  return await prisma.role.delete({ where: { id } });
};

// --- Permission Functions ---
export const getAllPermissions = async (): Promise<TransformedPermission[]> => {
  const permissions = await prisma.permission.findMany();
  return permissions.map(transformPermission);
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
