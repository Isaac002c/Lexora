import { describe, expect, it } from "vitest";
import type { AuthContext } from "@chronostek/auth";
import { allowedBranches, caseAssignmentFilter, checklistAttorneyFilter, clientAttorneyFilter, deadlineAttorneyFilter, documentAttorneyFilter } from "./tenant.js";

const base: AuthContext = { userId: "user", tenantId: "tenant", roles: ["SECRETARIA"], permissions: [], hasAllBranches: false, branchIds: ["branch-a"] };

describe("branch isolation", () => {
  it("returns only explicitly allowed branches", () => expect(allowedBranches(base)).toEqual(["branch-a"]));
  it("rejects a branch outside the session scope", () => expect(() => allowedBranches(base, "branch-b")).toThrow("filial"));
  it("does not constrain an administrator to a branch list", () => expect(allowedBranches({ ...base, hasAllBranches: true })).toBeUndefined());
});

describe("case assignment policy", () => {
  it("restricts attorneys to assigned cases", () => expect(caseAssignmentFilter({ ...base, roles: ["ADVOGADO"] })).toEqual({ assignments: { some: { userId: "user" } } }));
  it("allows a tenant admin to see the branch scope", () => expect(caseAssignmentFilter({ ...base, roles: ["ADVOGADO", "ADMIN_GERAL"] })).toEqual({}));
});

describe("attorney data scopes", () => {
  const attorney = { ...base, roles: ["ADVOGADO"] as AuthContext["roles"] };
  it("restricts deadlines to responsibility or assigned processes", () => expect(deadlineAttorneyFilter(attorney)).toEqual({ OR: [{ responsibleUserId: "user" }, { case: { assignments: { some: { userId: "user" } } } }] }));
  it("restricts documents to assigned processes", () => expect(documentAttorneyFilter(attorney)).toEqual({ case: { assignments: { some: { userId: "user" } } } }));
  it("restricts checklists to assigned processes", () => expect(checklistAttorneyFilter(attorney)).toEqual({ case: { assignments: { some: { userId: "user" } } } }));
  it("restricts client lookups to clients in assigned processes", () => expect(clientAttorneyFilter(attorney)).toEqual({ caseParties: { some: { case: { assignments: { some: { userId: "user" } } } } } }));
});
