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
  roleCode?: string,
) {
  return users
    .filter((user) => !roleCode || user.roleCodes?.includes(roleCode))
    .map((user) => ({ value: user.id, label: userOptionLabel(user) }));
}
