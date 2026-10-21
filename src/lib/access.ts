/** 判断角色码是否命中任意一个要求；角色未加载或要求为空时返回 false。 */
export function hasAnyRole(
  roles: readonly string[] | undefined,
  requiredRoles: readonly string[],
): boolean {
  return requiredRoles.some((role) => roles?.includes(role) === true);
}
