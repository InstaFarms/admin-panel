import { Metadata } from "next";

import SupervisorsTable from "@/components/supervisors/SupervisorsTable";

export const metadata: Metadata = {
    title: "Supervisors | Admin",
    description: "Manage supervisors",
};

export default function SupervisorsPage() {
    return <SupervisorsTable />;
}
