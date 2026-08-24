interface UserLookupOption {
  id: string;
  name: string;
  email?: string;
  roleCodes?: string[];
}

export function userOptionLabel(user: UserLookupOption) {
  return user.email ? `${user.name} · ${user.email}` : `${user.name} · usuário`;
}

export function userSelectOptions(
  users: UserLookupOption[],
  roleCodes?: string | string[],
) {
  const allowedRoleCodes = roleCodes
    ? Array.isArray(roleCodes)
      ? roleCodes
      : [roleCodes]
    : undefined;

  return users
    .filter(
      (user) =>
        !allowedRoleCodes ||
        allowedRoleCodes.some((roleCode) => user.roleCodes?.includes(roleCode)),
    )
    .map((user) => ({ value: user.id, label: userOptionLabel(user) }));
}

export function legalProfessionalSelectOptions(users: UserLookupOption[]) {
  return userSelectOptions(users, ["ADVOGADO", "GESTOR_FILIAL"]);
}
