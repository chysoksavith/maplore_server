import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';

export type AppAbility = MongoAbility<[string, string]>;

export function defineAbilityFor(user: any) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Superadmin bypass
  if (user?.role?.name === 'SUPERADMIN') {
    can('manage', 'all'); // Superadmin can access everything without permission
  } 
  // Dynamic permissions from the database
  else if (user?.role?.permissions) {
    user.role.permissions.forEach((rp: any) => {
      if (rp.permission && rp.permission.action && rp.permission.subject) {
        can(rp.permission.action, rp.permission.subject);
      }
    });
  } 
  
  // Default read ability if no role or no specific permissions
  can('read', 'User'); 

  return build();
}
