"use client";

import PeopleRolesTab from "@/components/properties/PeopleRolesTab";
import { usePropertyEditorServicesContext } from "@/components/properties/editor/usePropertyEditorServicesContext";
import type { User } from "@/utils/types";
import { useCallback, useEffect, useState } from "react";
import type { SectionChange } from "./types";

interface PeopleRolesTabContainerProps {
  sectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
}

export default function PeopleRolesTabContainer({
  sectionData,
  onSectionChange,
}: PeopleRolesTabContainerProps) {
  const { services } = usePropertyEditorServicesContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const { ensureSupervisorsLoaded } = services;
  useEffect(() => {
    void ensureSupervisorsLoaded();
  }, [ensureSupervisorsLoaded]);

  const supervisorAssignments = (sectionData.supervisors ?? {}) as Record<
    string,
    { id: string; name: string; phone: string; email: string } | null
  >;

  const setSupervisorForRole = (
    roleKey: "inspection" | "maintenance" | "guest",
    supervisor: { id: string; name: string; phone: string; email: string } | null,
  ) => {
    onSectionChange("peopleRoles.supervisors", (prev: Record<string, unknown> | undefined) => ({
      ...(prev ?? {}),
      [roleKey]: supervisor,
    }));
  };

  const updateArrayAtPath = <T,>(path: string, updater: (prev: T[]) => T[]) => {
    onSectionChange(path, (prev: T[] | undefined) => updater(Array.isArray(prev) ? prev : []));
  };

  // Must stay referentially stable across renders: PeopleRolesTab's debounce
  // effect depends on this function's identity, and its own result triggers a
  // re-render here. An inline closure re-created every render was re-arming
  // that debounce on every search result, polling verify-admin + admin/search
  // forever at ~350ms while this tab stayed mounted.
  const handleSearchUsers = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      const result = await services.searchUsers(query);
      if (Array.isArray(result)) setSearchResults(result as User[]);
    },
    [services.searchUsers]
  );

  return (
    <PeopleRolesTab
      owners={(Array.isArray(sectionData.owners) ? sectionData.owners : []) as any[]}
      managers={(Array.isArray(sectionData.managers) ? sectionData.managers : []) as any[]}
      caretakers={(Array.isArray(sectionData.caretakers) ? sectionData.caretakers : []) as any[]}
      supervisorRoster={services.supervisors}
      assignedSupervisors={supervisorAssignments}
      setSupervisorForRole={setSupervisorForRole}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      searchUsers={handleSearchUsers}
      // A property has exactly one owner, so picking one replaces whoever was
      // there rather than adding a second. Co-stakeholders go under managers.
      addOwner={(user) => updateArrayAtPath<User>("peopleRoles.owners", () => [user])}
      removeOwner={(userId) =>
        updateArrayAtPath<User>("peopleRoles.owners", (prev) =>
          prev.filter((item) => item.id !== userId),
        )
      }
      addManager={(user) =>
        updateArrayAtPath<User>("peopleRoles.managers", (prev) =>
          prev.some((item) => item.id === user.id) ? prev : [...prev, user],
        )
      }
      removeManager={(userId) =>
        updateArrayAtPath<User>("peopleRoles.managers", (prev) =>
          prev.filter((item) => item.id !== userId),
        )
      }
      addCaretaker={(user) =>
        updateArrayAtPath<User>("peopleRoles.caretakers", (prev) =>
          prev.some((item) => item.id === user.id) ? prev : [...prev, user],
        )
      }
      removeCaretaker={(userId) =>
        updateArrayAtPath<User>("peopleRoles.caretakers", (prev) =>
          prev.filter((item) => item.id !== userId),
        )
      }
    />
  );
}
