"use client";

import {
  createResortRoom,
  deleteResortRoom,
  getResortRoomContent,
  getResortRoomPricing,
  listResortRooms,
  saveResortRoomContent,
  saveResortRoomPricing,
  updateResortRoom,
  type CreateResortRoomInput,
  type ResortRoomAmenity,
  type ResortRoomContent,
  type ResortRoomPhoto,
  type ResortRoom,
  type ResortRoomPricingRule,
  type UpdateResortRoomInput,
} from "@/actions/resortRoomActions";
import { getAllAmenities } from "@/actions/amenityActions";
import { uploadSpacePhotoAction } from "@/actions/imageActions";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

interface Props {
  propertyId: string;
  activeBrandId: string;
}

function emptyPricingRow(day: DayOfWeek): ResortRoomPricingRule {
  return {
    dayOfWeek: day,
    basePrice: null,
    basePriceWithGst: null,
    adultExtraGuestCharge: null,
    adultExtraGuestChargeWithGst: null,
    childExtraGuestCharge: null,
    childExtraGuestChargeWithGst: null,
    infantExtraGuestCharge: null,
    infantExtraGuestChargeWithGst: null,
    baseGuestCount: null,
    discount: null,
    gstSlab: null,
    maxTotal: null,
  };
}

function defaultPricingRows(): ResortRoomPricingRule[] {
  return DAYS_OF_WEEK.map(emptyPricingRow);
}

// ─── Small numeric input ──────────────────────────────────────────────────────
function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      placeholder={placeholder ?? "—"}
      value={value ?? ""}
      min={0}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? null : Number(val));
      }}
    />
  );
}

// ─── Room create / edit form ──────────────────────────────────────────────────
function RoomForm({
  initial,
  onSave,
  onCancel,
  saving,
  activeBrandId,
  isCreate,
}: {
  initial?: Partial<ResortRoom>;
  onSave: (d: CreateResortRoomInput | UpdateResortRoomInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  activeBrandId: string;
  isCreate: boolean;
}) {
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber ?? "");
  const [roomName, setRoomName] = useState(initial?.roomName ?? "");
  const [roomType, setRoomType] = useState(initial?.roomType ?? "Standard");
  const [bedroomCount, setBedroomCount] = useState(initial?.bedroomCount ?? 1);
  const [bathroomCount, setBathroomCount] = useState(initial?.bathroomCount ?? 1);
  const [baseGuestCount, setBaseGuestCount] = useState(initial?.baseGuestCount ?? 2);
  const [maxGuestCount, setMaxGuestCount] = useState(initial?.maxGuestCount ?? 4);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  const ic =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
  const lc = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!roomNumber.trim() || !roomName.trim()) {
      toast.error("Room number and name are required");
      return;
    }
    const payload: any = {
      roomNumber: roomNumber.trim(),
      roomName: roomName.trim(),
      roomType,
      bedroomCount,
      bathroomCount,
      baseGuestCount,
      maxGuestCount,
      description: description.trim() || null,
      sortOrder,
    };
    if (isCreate) payload.brandId = activeBrandId;
    await onSave(payload);
  };

  return (
    <div
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {isCreate ? "Add New Room" : "Edit Room"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Room Number *</label>
          <input className={ic} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 101" required />
        </div>
        <div>
          <label className={lc}>Room Name *</label>
          <input className={ic} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Deluxe Garden View" required />
        </div>
        <div>
          <label className={lc}>Room Type</label>
          <select className={ic} value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            {["Standard", "Deluxe", "Suite", "Presidential", "Villa", "Cottage", "Other"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lc}>Sort Order</label>
          <input type="number" className={ic} value={sortOrder} min={0} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <div>
          <label className={lc}>Bedrooms</label>
          <input type="number" className={ic} value={bedroomCount} min={1} onChange={(e) => setBedroomCount(Number(e.target.value))} />
        </div>
        <div>
          <label className={lc}>Bathrooms</label>
          <input type="number" className={ic} value={bathroomCount} min={1} onChange={(e) => setBathroomCount(Number(e.target.value))} />
        </div>
        <div>
          <label className={lc}>Base Guest Count</label>
          <input type="number" className={ic} value={baseGuestCount} min={1} onChange={(e) => setBaseGuestCount(Number(e.target.value))} />
        </div>
        <div>
          <label className={lc}>Max Guest Count</label>
          <input type="number" className={ic} value={maxGuestCount} min={1} onChange={(e) => setMaxGuestCount(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className={lc}>Description</label>
        <textarea className={ic} value={description} rows={2} onChange={(e) => setDescription(e.target.value)} placeholder="Short description shown to guests" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : isCreate ? "Create Room" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Pricing editor ───────────────────────────────────────────────────────────
function PricingEditor({
  propertyId,
  roomId,
  activeBrandId,
  onClose,
}: {
  propertyId: string;
  roomId: string;
  activeBrandId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ResortRoomPricingRule[]>(defaultPricingRows());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getResortRoomPricing(propertyId, roomId, activeBrandId)
      .then(({ data, error }) => {
        if (error) { toast.error(error); return; }
        if (data && data.length > 0) {
          const merged = defaultPricingRows().map((def) => {
            const loaded = data.find((r) => r.dayOfWeek === def.dayOfWeek);
            return loaded ?? def;
          });
          setRows(merged);
        }
      })
      .finally(() => setLoading(false));
  }, [propertyId, roomId, activeBrandId]);

  const updateRow = (day: string, field: keyof ResortRoomPricingRule, value: number | null) =>
    setRows((prev) => prev.map((r) => (r.dayOfWeek === day ? { ...r, [field]: value } : r)));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveResortRoomPricing(propertyId, roomId, activeBrandId, rows);
    setSaving(false);
    if (error) { toast.error(error); } else { toast.success("Pricing saved"); onClose(); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-500">Loading pricing…</div>;

  const th = "px-3 py-2 font-medium text-slate-600 dark:text-slate-400 text-xs";
  const td = "px-2 py-1";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Day-wise Pricing</h3>
        <button type="button" onClick={onClose} className="text-xs text-blue-500 hover:underline">← Back to rooms</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {["Day", "Base Price", "w/ GST", "Adult Extra", "Child Extra", "Infant Extra", "Base Guests", "Discount %", "GST Slab %", "Max Total"].map(
                (h) => <th key={h} className={th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dayOfWeek} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-3 py-2 font-medium capitalize text-slate-700 dark:text-slate-300 w-24">{row.dayOfWeek.toLowerCase()}</td>
                <td className={td}><NumInput value={row.basePrice} onChange={(v) => updateRow(row.dayOfWeek, "basePrice", v)} /></td>
                <td className={td}><NumInput value={row.basePriceWithGst} onChange={(v) => updateRow(row.dayOfWeek, "basePriceWithGst", v)} /></td>
                <td className={td}><NumInput value={row.adultExtraGuestCharge} onChange={(v) => updateRow(row.dayOfWeek, "adultExtraGuestCharge", v)} /></td>
                <td className={td}><NumInput value={row.childExtraGuestCharge} onChange={(v) => updateRow(row.dayOfWeek, "childExtraGuestCharge", v)} /></td>
                <td className={td}><NumInput value={row.infantExtraGuestCharge} onChange={(v) => updateRow(row.dayOfWeek, "infantExtraGuestCharge", v)} /></td>
                <td className={td}><NumInput value={row.baseGuestCount} onChange={(v) => updateRow(row.dayOfWeek, "baseGuestCount", v)} /></td>
                <td className={td}><NumInput value={row.discount} onChange={(v) => updateRow(row.dayOfWeek, "discount", v)} placeholder="0–100" /></td>
                <td className={td}><NumInput value={row.gstSlab} onChange={(v) => updateRow(row.dayOfWeek, "gstSlab", v)} placeholder="e.g. 18" /></td>
                <td className={td}><NumInput value={row.maxTotal} onChange={(v) => updateRow(row.dayOfWeek, "maxTotal", v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save Pricing"}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main container ───────────────────────────────────────────────────────────
type MasterAmenity = Pick<ResortRoomAmenity, "id" | "name" | "icon" | "isPaid" | "isUSP">;

function RoomContentEditor({ propertyId, room, activeBrandId, onClose }: {
  propertyId: string;
  room: ResortRoom;
  activeBrandId: string;
  onClose: () => void;
}) {
  const [masterAmenities, setMasterAmenities] = useState<MasterAmenity[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ResortRoomPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getResortRoomContent(propertyId, room.id, activeBrandId), getAllAmenities()])
      .then(([contentResult, amenities]) => {
        if (!active) return;
        if (contentResult.error) {
          toast.error(contentResult.error);
          return;
        }
        const content: ResortRoomContent = contentResult.data ?? { amenities: [], photos: [] };
        setSelectedAmenityIds(content.amenities.map((amenity) => amenity.id));
        setPhotos(content.photos);
        setMasterAmenities(Array.isArray(amenities) ? amenities.map((amenity: any) => ({
          id: String(amenity.id),
          name: String(amenity.name ?? amenity.amenity ?? "Amenity"),
          icon: String(amenity.icon ?? ""),
          isPaid: Boolean(amenity.isPaid),
          isUSP: Boolean(amenity.isUSP),
        })) : []);
      })
      .catch(() => { if (active) toast.error("Failed to load room content"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, room.id, activeBrandId]);

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenityIds((current) => current.includes(amenityId)
      ? current.filter((id) => id !== amenityId)
      : [...current, amenityId]);
  };

  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 30) {
      toast.error("A room can have at most 30 photos");
      return;
    }
    setUploading(true);
    try {
      const uploaded: ResortRoomPhoto[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("propertyId", propertyId);
        formData.append("spaceId", "resort-room-" + room.id + "-" + crypto.randomUUID());
        const result = await uploadSpacePhotoAction(formData);
        if (!result.success?.url) throw new Error(result.error || "Could not upload " + file.name);
        uploaded.push({ originalUrl: result.success.url, altText: room.roomName, isFeatured: photos.length === 0 && uploaded.length === 0 });
      }
      setPhotos((current) => [...current, ...uploaded]);
      toast.success("Room photos uploaded");
    } catch (error: any) {
      toast.error(error?.message || "Could not upload room photos");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveResortRoomContent(propertyId, room.id, {
      brandId: activeBrandId,
      amenityIds: selectedAmenityIds,
      photos: photos.map((photo) => ({
        photoId: photo.id ?? photo.photoId,
        originalUrl: photo.id || photo.photoId ? undefined : photo.originalUrl,
        altText: photo.altText ?? null,
        isFeatured: Boolean(photo.isFeatured),
      })),
    });
    setSaving(false);
    if (error) return toast.error(error);
    toast.success("Room amenities and photos saved");
    onClose();
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-500">Loading room content...</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Room amenities and photos</h3><p className="text-xs text-slate-500 dark:text-slate-400">{room.roomNumber} · {room.roomName}. These apply only to this room.</p></div><button type="button" onClick={onClose} className="text-xs text-blue-500 hover:underline">← Back to rooms</button></div>
      <section className="space-y-3"><div><h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">Amenities</h4><p className="text-xs text-slate-500">Select amenities available inside or with this room.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{masterAmenities.map((amenity) => { const selected = selectedAmenityIds.includes(amenity.id); return <label key={amenity.id} className={selected ? "flex cursor-pointer items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 p-2 text-xs dark:bg-blue-950/30" : "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700"}><input type="checkbox" checked={selected} onChange={() => toggleAmenity(amenity.id)} />{amenity.icon && <span aria-hidden>{amenity.icon}</span>}<span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{amenity.name}</span>{amenity.isPaid && <span className="text-amber-600">Paid</span>}</label>; })}</div></section>
      <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">Room gallery</h4><p className="text-xs text-slate-500">The featured photo is shown first to guests.</p></div><label className="cursor-pointer rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400">{uploading ? "Uploading..." : "+ Upload photos"}<input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={uploadPhotos} /></label></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo, index) => <div key={(photo.id ?? photo.originalUrl) + index} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"><img src={photo.originalUrl} alt={photo.altText || room.roomName} className="h-32 w-full object-cover" /><div className="space-y-2 p-2"><input value={photo.altText ?? ""} onChange={(event) => setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, altText: event.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" placeholder="Photo description" /><div className="flex items-center justify-between gap-2 text-xs"><label className="flex items-center gap-1"><input type="radio" name="featured-room-photo" checked={Boolean(photo.isFeatured)} onChange={() => setPhotos((current) => current.map((item, itemIndex) => ({ ...item, isFeatured: itemIndex === index })))} /> Featured</label><button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 hover:text-red-700">Remove</button></div></div></div>)}</div></section>
      <div className="flex gap-2"><button type="button" onClick={handleSave} disabled={saving || uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save room content"}</button><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button></div>
    </div>
  );
}

export default function ResortRoomsTabContainer({ propertyId, activeBrandId }: Props) {
  const [rooms, setRooms] = useState<ResortRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ResortRoom | null>(null);
  const [pricingRoomId, setPricingRoomId] = useState<string | null>(null);
  const [contentRoomId, setContentRoomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRooms = async () => {
    if (!propertyId) return;
    if (!activeBrandId) { toast.error("No brand selected — cannot load rooms"); return; }
    setLoading(true);
    const { data, error } = await listResortRooms(propertyId, activeBrandId);
    setLoading(false);
    if (error) { toast.error(error); } else { setRooms(data ?? []); }
  };

  useEffect(() => { void loadRooms(); }, [propertyId, activeBrandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (input: CreateResortRoomInput | UpdateResortRoomInput) => {
    setSaving(true);
    const { data, error } = await createResortRoom(propertyId, input as CreateResortRoomInput);
    setSaving(false);
    if (error) { toast.error(error); } else { toast.success("Room created"); setShowCreateForm(false); await loadRooms(); }
  };

  const handleUpdate = async (roomId: string, input: CreateResortRoomInput | UpdateResortRoomInput) => {
    setSaving(true);
    const { data, error } = await updateResortRoom(propertyId, roomId, activeBrandId, input as UpdateResortRoomInput);
    setSaving(false);
    if (error) { toast.error(error); } else { toast.success("Room updated"); setEditingRoom(null); await loadRooms(); }
  };

  const handleDelete = async (room: ResortRoom) => {
    if (!window.confirm(`Deactivate room "${room.roomName}" (${room.roomNumber})? Existing bookings are unaffected.`)) return;
    const { error } = await deleteResortRoom(propertyId, room.id, activeBrandId);
    if (error) { toast.error(error); } else { toast.success("Room deactivated"); await loadRooms(); }
  };

  if (pricingRoomId) {
    return <PricingEditor propertyId={propertyId} roomId={pricingRoomId} activeBrandId={activeBrandId} onClose={() => setPricingRoomId(null)} />;
  }

  const contentRoom = rooms.find((room) => room.id === contentRoomId);
  if (contentRoom) {
    return <RoomContentEditor propertyId={propertyId} room={contentRoom} activeBrandId={activeBrandId} onClose={() => setContentRoomId(null)} />;
  }

  if (editingRoom) {
    return <RoomForm initial={editingRoom} onSave={(input) => handleUpdate(editingRoom.id, input)} onCancel={() => setEditingRoom(null)} saving={saving} activeBrandId={activeBrandId} isCreate={false} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Manage Rooms</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Each room is independently bookable. Pricing is set per room per day-of-week.</p>
        </div>
        {!showCreateForm && (
          <button type="button" onClick={() => setShowCreateForm(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            + Add Room
          </button>
        )}
      </div>

      {showCreateForm && (
        <RoomForm onSave={handleCreate} onCancel={() => setShowCreateForm(false)} saving={saving} activeBrandId={activeBrandId} isCreate={true} />
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No rooms yet. Click <strong>+ Add Room</strong> to create the first room.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs dark:bg-slate-800">
              <tr>
                {["#", "Room Name", "Type", "Beds / Baths", "Guests", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{room.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{room.roomName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{room.roomType}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{room.bedroomCount}BR / {room.bathroomCount}BA</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{room.baseGuestCount}–{room.maxGuestCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${room.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {room.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setEditingRoom(room)} className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">Edit</button>
                      <button type="button" onClick={() => setContentRoomId(room.id)} className="text-xs font-medium text-teal-600 hover:text-teal-800 dark:text-teal-400">Amenities & Photos</button>
                      <button type="button" onClick={() => setPricingRoomId(room.id)} className="text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400">Pricing</button>
                      {room.isActive && (
                        <button type="button" onClick={() => handleDelete(room)} className="text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
