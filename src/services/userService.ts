import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { listUsersQuerySchema } from '../utils/validation';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';

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
