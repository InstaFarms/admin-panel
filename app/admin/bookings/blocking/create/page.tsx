import { getAllBrands } from "@/actions/brandActions";
import CreateBlockingEditor from "@/components/bookings/blocking/CreateBlockingEditor";
import Link from "next/link";

export default async function Page() {
  const brandsRaw = await getAllBrands(["id", "name"]);
  const brands = Array.isArray(brandsRaw)
    ? brandsRaw
        .filter((brand: any) => brand?.id && brand?.name)
        .map((brand: any) => ({ id: String(brand.id), name: String(brand.name) }))
    : [];

  return (
    <div
      style={{
        fontFamily: "'Segoe UI','Selawik',system-ui,-apple-system,sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Blocking</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#7d8a99" }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
        <span style={{ color: "#3a4756" }}>›</span>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Admin</Link>
        <span style={{ color: "#3a4756" }}>›</span>
        <Link href="/admin/bookings" style={{ color: "inherit", textDecoration: "none" }}>Bookings</Link>
        <span style={{ color: "#3a4756" }}>›</span>
        <Link href="/admin/bookings/blocking" style={{ color: "inherit", textDecoration: "none" }}>Blocking</Link>
        <span style={{ color: "#3a4756" }}>›</span>
        <span style={{ color: "#cfd8e2" }}>Create</span>
      </div>

      <div style={{ background: "#0e1521", border: "1px solid #1d2735", borderRadius: 14, padding: "26px 30px 32px", marginTop: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Create Blocking</div>
        <div style={{ fontSize: 13.5, color: "#94a0af", marginTop: 6, maxWidth: 640, marginBottom: 24 }}>
          Pick a brand and property, choose dates on the calendar, then classify the block. Reserved dates apply to inventory immediately.
        </div>

        <CreateBlockingEditor brands={brands} />
      </div>
    </div>
  );
}
