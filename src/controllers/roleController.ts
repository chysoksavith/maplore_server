import { Request, Response, NextFunction } from 'express';
import * as roleService from '../services/roleService';
import * as response from '../utils/response';

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;

    const result = await roleService.getAllRoles({ page, limit, search });
    return response.ok(res, 'Roles retrieved', result);
  } catch (err) { next(err); }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    const role = await roleService.getRoleById(roleId);
    if (!role) return response.notFound(res, 'Role not found');
    return response.ok(res, 'Role retrieved', { role });
  } catch (err) { next(err); }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionIds } = req.body;
    const role = await roleService.createRole({ name, description, permissionIds });
    return response.created(res, 'Role created', { role });
  } catch (err) { next(err); }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    const { name, description, permissionIds } = req.body;
    const role = await roleService.updateRole(roleId, { name, description, permissionIds });
    return response.ok(res, 'Role updated', { role });
  } catch (err) { next(err); }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    await roleService.deleteRole(roleId);
    return response.ok(res, 'Role deleted');
  } catch (err) { next(err); }
};

// --- Permissions ---
export const getPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await roleService.getAllPermissions();
    return response.ok(res, 'Permissions retrieved', { permissions });
  } catch (err) { next(err); }
};

export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, subject, description } = req.body;
    const permission = await roleService.createPermission({ action, subject, description });
    return response.created(res, 'Permission created', { permission });
  } catch (err) { next(err); }
};

export const assignRoleToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    const { roleId } = req.body;
    const user = await roleService.assignRoleToUser(userId, roleId);
    return response.ok(res, 'Role assigned to user', { user });
  } catch (err) { next(err); }
};
