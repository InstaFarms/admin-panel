"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Select,
  TabItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tabs,
  TextInput,
} from "flowbite-react";
import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";
import AuditSupervisorsSection from "@/components/properties/AuditSupervisorsSection";
import { User } from "@/utils/types";

type Role = "Owner" | "Manager" | "Caretaker";

interface SupervisorLite {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface PeopleRolesTabProps {
  owners: User[];
  managers: User[];
  caretakers: User[];
  supervisorRoster: SupervisorLite[];
  assignedSupervisors: Record<string, SupervisorLite | null>;
  setSupervisorForRole: (
    roleKey: "inspection" | "maintenance" | "guest",
    supervisor: SupervisorLite | null,
  ) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: User[];
  searchUsers: (query: string) => void;
  addOwner: (user: User) => void;
  removeOwner: (userId: string) => void;
  addManager: (user: User) => void;
  removeManager: (userId: string) => void;
  addCaretaker: (user: User) => void;
  removeCaretaker: (userId: string) => void;
}

interface AssignedUserRow {
  key: string;
  user: User;
  role: Role;
}

const ROLE_OPTIONS: Role[] = ["Owner", "Manager", "Caretaker"];

function getUserDetailHref(userId: string, role: Role) {
  if (role === "Owner") return `/admin/users/owners/${userId}`;
  if (role === "Manager") return `/admin/users/managers/${userId}`;
  return `/admin/users/caretakers/${userId}`;
}

export default function PeopleRolesTab({
  owners,
  managers,
  caretakers,
  supervisorRoster,
  assignedSupervisors,
  setSupervisorForRole,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchUsers,
  addOwner,
  removeOwner,
  addManager,
  removeManager,
  addCaretaker,
  removeCaretaker,
}: PeopleRolesTabProps) {
  const [selectedRole, setSelectedRole] = useState<Role>("Owner");
  const sectionCardClass =
    "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  const assignedRows = useMemo<AssignedUserRow[]>(
    () => [
      ...owners.map((user) => ({ key: `${user.id}-Owner`, user, role: "Owner" as const })),
      ...managers.map((user) => ({ key: `${user.id}-Manager`, user, role: "Manager" as const })),
      ...caretakers.map((user) => ({ key: `${user.id}-Caretaker`, user, role: "Caretaker" as const })),
    ],
    [owners, managers, caretakers]
  );

  const assignedRoleKeys = useMemo(
    () => new Set(assignedRows.map((row) => `${row.user.id}-${row.role}`)),
    [assignedRows]
  );

  const searchedPeople = useMemo(
    () =>
      searchResults.map((user) => ({
        user,
        isAlreadyAssigned: assignedRoleKeys.has(`${user.id}-${selectedRole}`),
      })),
    [searchResults, assignedRoleKeys, selectedRole]
  );

  const runSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        searchUsers("");
        return;
      }
      searchUsers(trimmed);
    },
    [searchUsers]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      runSearch(searchQuery);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, runSearch]);

  const addUserByRole = (user: User, role: Role) => {
    if (role === "Owner") addOwner(user);
    if (role === "Manager") addManager(user);
    if (role === "Caretaker") addCaretaker(user);
  };

  const removeUserByRole = (userId: string, role: Role) => {
    if (role === "Owner") removeOwner(userId);
    if (role === "Manager") removeManager(userId);
    if (role === "Caretaker") removeCaretaker(userId);
  };

  const roleCountChips = [
    {
      role: "Owner",
      count: owners.length,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      role: "Manager",
      count: managers.length,
      className:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    },
    {
      role: "Caretaker",
      count: caretakers.length,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <section className={sectionCardClass}>
        <SectionHeading
          title="People & Roles"
          description="Search people and assign property responsibilities by role."
        />
        <div className="flex flex-wrap gap-2">
          {roleCountChips.map((chip) => (
            <span
              key={chip.role}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip.className}`}
            >
              {chip.role}: {chip.count}
            </span>
          ))}
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Total assigned: {assignedRows.length}
          </span>
        </div>
      </section>

      <Tabs variant="underline">
        <TabItem active title="Owner Gang">
          <div className="space-y-6 pt-4">
            <section className={sectionCardClass}>
              <SectionHeading
                title="Assign People"
                description="Search by name/email, choose role, and assign."
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
                <div className="md:col-span-7">
                  <LabelWrapper label="Search Person">
                    <TextInput
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </LabelWrapper>
                </div>
                <div className="md:col-span-3">
                  <LabelWrapper label="Assign Role">
                    <Select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </LabelWrapper>
                </div>
                <div className="md:col-span-2">
                  <Button className="w-full" onClick={() => runSearch(searchQuery)}>
                    Search
                  </Button>
                </div>
              </div>
            </section>

            <section className={sectionCardClass}>
              <SectionHeading
                title="Search Results"
                description={`Assign selected people as ${selectedRole}.`}
              />
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Email</TableHeadCell>
                      <TableHeadCell>Phone</TableHeadCell>
                      <TableHeadCell>Role</TableHeadCell>
                      <TableHeadCell>Action</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {searchedPeople.map(({ user, isAlreadyAssigned }) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <Link
                            href={getUserDetailHref(user.id, selectedRole)}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {user.firstName} {user.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>{user.email || "--"}</TableCell>
                        <TableCell>{user.mobileNumber || "--"}</TableCell>
                        <TableCell>{selectedRole}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={isAlreadyAssigned}
                            color={isAlreadyAssigned ? "gray" : "blue"}
                            onClick={() => addUserByRole(user, selectedRole)}
                          >
                            {isAlreadyAssigned ? "Assigned" : "Assign"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {searchedPeople.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          {searchQuery.trim()
                            ? "No users found for this search."
                            : "Start typing in search to find users."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className={sectionCardClass}>
              <SectionHeading
                title="Assigned People & Roles"
                description="Remove assignments that are no longer needed."
              />
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Email</TableHeadCell>
                      <TableHeadCell>Phone</TableHeadCell>
                      <TableHeadCell>Role</TableHeadCell>
                      <TableHeadCell>Actions</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {assignedRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <Link
                            href={getUserDetailHref(row.user.id, row.role)}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {row.user.firstName} {row.user.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>{row.user.email || "--"}</TableCell>
                        <TableCell>{row.user.mobileNumber || "--"}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="failure"
                            onClick={() => removeUserByRole(row.user.id, row.role)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {assignedRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No users assigned yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </TabItem>

        <TabItem title="Supervisors">
          <div className="space-y-6 pt-4">
            <AuditSupervisorsSection
              supervisorRoster={supervisorRoster}
              assignedSupervisors={assignedSupervisors}
              setSupervisorForRole={setSupervisorForRole}
            />
          </div>
        </TabItem>
      </Tabs>
    </div>
  );
}
