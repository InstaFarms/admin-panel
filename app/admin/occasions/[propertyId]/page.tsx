import { ChevronRight } from "lucide-react";
import { Card } from "flowbite-react";
import { getPropertyOccasionScores } from "@/actions/occasionActions";
import type { ServerPageProps } from "@/utils/types";
import OccasionScoreEditor from "./OccasionScoreEditor";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

export default async function Page({ params }: ServerPageProps) {
  const { propertyId } = await params as any;

  let scores: any[] = [];
  let error: string | null = null;

  try {
    scores = await getPropertyOccasionScores(propertyId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load scores.";
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Occasion Scores</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <a href="/admin/occasions" style={{ color: "inherit", textDecoration: "none" }}>Occasions</a>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Edit Scores</span>
          </div>
        </div>
      </div>

      <div className={styles.panel} style={{ maxWidth: 640, padding: 28 }}>
        {error ? (
          <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>
        ) : (
          <OccasionScoreEditor propertyId={propertyId} initialScores={scores} />
        )}
      </div>
    </div>
  );
}
