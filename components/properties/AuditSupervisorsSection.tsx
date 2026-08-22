"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";
import ConfirmModal from "@/components/ConfirmModal";

interface SupervisorLite {
  id: string;
  name: string;
  phone: string;
  email: string;
}

type SupervisorRoleKey = "inspection" | "maintenance" | "guest";

const SUPERVISOR_ROLE_SLOTS: { key: SupervisorRoleKey; label: string }[] = [
  { key: "inspection", label: "Inspection Supervisor" },
  { key: "maintenance", label: "Maintenance Supervisor" },
  { key: "guest", label: "Guest Supervisor" },
];

interface AuditSupervisorsSectionProps {
  supervisorRoster: SupervisorLite[];
  assignedSupervisors: Record<string, SupervisorLite | null>;
  setSupervisorForRole: (roleKey: SupervisorRoleKey, supervisor: SupervisorLite | null) => void;
}

interface PendingReplace {
  roleKey: SupervisorRoleKey;
  roleLabel: string;
  supervisor: SupervisorLite;
  currentName: string;
}

function roleLabel(roleKey: SupervisorRoleKey) {
  return SUPERVISOR_ROLE_SLOTS.find((slot) => slot.key === roleKey)?.label ?? roleKey;
}

export default function AuditSupervisorsSection({
  supervisorRoster,
  assignedSupervisors,
  setSupervisorForRole,
}: AuditSupervisorsSectionProps) {
  const sectionCardClass =
    "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  const [searchQuery, setSearchQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState<SupervisorRoleKey>("inspection");
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);

  const runSearch = useCallback((query: string) => {
    setCommittedQuery(query.trim());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      runSearch(searchQuery);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, runSearch]);

  const searchedSupervisors = useMemo(() => {
    const query = committedQuery.toLowerCase();
    const matches = query
      ? supervisorRoster.filter(
          (supervisor) =>
            supervisor.name.toLowerCase().includes(query) ||
            supervisor.phone.toLowerCase().includes(query) ||
            supervisor.email.toLowerCase().includes(query),
        )
      : [];

    return matches.map((supervisor) => ({
      supervisor,
      isAlreadyAssigned: assignedSupervisors[selectedRoleKey]?.id === supervisor.id,
    }));
  }, [supervisorRoster, committedQuery, assignedSupervisors, selectedRoleKey]);

  const handleAssignClick = (supervisor: SupervisorLite) => {
    const current = assignedSupervisors[selectedRoleKey];
    if (current && current.id !== supervisor.id) {
      setPendingReplace({
        roleKey: selectedRoleKey,
        roleLabel: roleLabel(selectedRoleKey),
        supervisor,
        currentName: current.name,
      });
      return;
    }
    setSupervisorForRole(selectedRoleKey, supervisor);
  };

  const confirmReplace = () => {
    if (!pendingReplace) return;
    setSupervisorForRole(pendingReplace.roleKey, pendingReplace.supervisor);
    setPendingReplace(null);
  };

  return (
    <>
      <section className={sectionCardClass}>
        <SectionHeading
          title="Assign Supervisor"
          description="Search by name, phone, or email, choose a role, and assign. Each role can have at most one supervisor assigned to this property, regardless of which brand tab you're viewing."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <LabelWrapper label="Search Supervisor">
              <TextInput
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </LabelWrapper>
          </div>
          <div className="md:col-span-3">
            <LabelWrapper label="Assign Role">
              <Select
                value={selectedRoleKey}
                onChange={(e) => setSelectedRoleKey(e.target.value as SupervisorRoleKey)}
              >
                {SUPERVISOR_ROLE_SLOTS.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
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
          title="Supervisor Search Results"
          description={`Assign selected person as ${roleLabel(selectedRoleKey)}.`}
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
              {searchedSupervisors.map(({ supervisor, isAlreadyAssigned }) => (
                <TableRow key={supervisor.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/admin/supervisors/${supervisor.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {supervisor.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supervisor.email || "--"}</TableCell>
                  <TableCell>{supervisor.phone || "--"}</TableCell>
                  <TableCell>{roleLabel(selectedRoleKey)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={isAlreadyAssigned}
                      color={isAlreadyAssigned ? "gray" : "blue"}
                      onClick={() => handleAssignClick(supervisor)}
                    >
                      {isAlreadyAssigned ? "Assigned" : "Assign"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {searchedSupervisors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {committedQuery
                      ? "No supervisors found for this search."
                      : "Start typing in search to find supervisors."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Assigned Supervisors"
          description="Remove or replace supervisor assignments as needed."
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
              {SUPERVISOR_ROLE_SLOTS.map((slot) => {
                const supervisor = assignedSupervisors[slot.key];
                return (
                  <TableRow key={slot.key}>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {supervisor ? (
                        <Link
                          href={`/admin/supervisors/${supervisor.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supervisor.name}
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">— Unassigned —</span>
                      )}
                    </TableCell>
                    <TableCell>{supervisor?.email || "--"}</TableCell>
                    <TableCell>{supervisor?.phone || "--"}</TableCell>
                    <TableCell>{slot.label}</TableCell>
                    <TableCell>
                      {supervisor ? (
                        <Button
                          size="sm"
                          color="failure"
                          onClick={() => setSupervisorForRole(slot.key, null)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <ConfirmModal
        showModal={pendingReplace !== null}
        title="Replace supervisor?"
        confirmationText={
          pendingReplace
            ? `This will replace ${pendingReplace.currentName} as ${pendingReplace.roleLabel}. Continue?`
            : ""
        }
        tone="warning"
        confirmLabel="Replace"
        acceptCallback={confirmReplace}
        closeCallback={() => setPendingReplace(null)}
      />
    </>
  );
}
