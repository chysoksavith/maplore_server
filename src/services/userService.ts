import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { listUsersQuerySchema } from '../utils/validation';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

const buildUserWhereClause = (query: ListUsersQuery): Prisma.UserWhereInput => {
  const { search, roleId, type, isActive } = query;

  return {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
    ...(roleId ? { roleId } : {}),
    ...(type ? { type } : {}),
    ...(typeof isActive === 'boolean' ? { isActive } : {}),
  };
};

export const listUsers = async (query: ListUsersQuery) => {
  const { page, limit, sortBy, sortOrder } = query;
  const { skip, take } = getPaginationParams({ page, limit });
  const where = buildUserWhereClause(query);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        gender: true,
        type: true,
        isActive: true,
        emailVerified: true,
        avatar: true,
        bannedAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: buildPaginationMeta({ page, limit, total }),
    filters: {
      search: query.search ?? null,
      roleId: query.roleId ?? null,
      type: query.type ?? null,
      isActive: typeof query.isActive === 'boolean' ? query.isActive : null,
      sortBy,
      sortOrder,
    },
  };
};

export const updateUser = async (
  id: number,
  data: {
    name?: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
    type?: 'ADMIN' | 'USER';
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    isActive?: boolean;
    roleId?: number;
    avatar?: string;
  },
) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.roleId !== undefined) updateData.role = { connect: { id: data.roleId } };
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.password) {
    const bcrypt = await import('bcryptjs');
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      phoneNumber: true,
      gender: true,
      avatar: true,
      type: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};
