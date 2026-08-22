import AuditDetailClient from "./AuditDetailClient";

export default async function SupervisorAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: auditId } = await params;

    return <AuditDetailClient auditId={auditId} />;
}
