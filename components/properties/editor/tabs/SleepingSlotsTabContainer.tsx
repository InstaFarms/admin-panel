"use client";

import {
  createSleepingSlotRoom,
  getSleepingSlotConfig,
  getSleepingSlotOccupancy,
  setSleepingSlotEnabled,
  updateSleepingSlot,
  updateSleepingSlotRoom,
  type CreateSleepingSlotRoomInput,
  type OccupancyLayout,
  type SleepingSlot,
  type SleepingSlotConfig,
  type SleepingSlotRoom,
} from "@/actions/sleepingSlotActions";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  propertyId: string;
}

const ic =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
const lc = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Create room form ─────────────────────────────────────────────────────────

interface DraftSlot {
  slotLabel: string;
  basePricePerNight: string;
}
interface DraftBed {
  bedType: "SINGLE" | "DOUBLE";
  slots: DraftSlot[];
}

function newBed(bedType: "SINGLE" | "DOUBLE"): DraftBed {
  // A single bed sleeps one guest; a double bed is sold as two shareable slots.
  return {
    bedType,
    slots:
      bedType === "SINGLE"
        ? [{ slotLabel: "A", basePricePerNight: "" }]
        : [
            { slotLabel: "A", basePricePerNight: "" },
            { slotLabel: "B", basePricePerNight: "" },
          ],
  };
}

function CreateRoomForm({
  existingCount,
  onSave,
  onCancel,
  saving,
}: {
  existingCount: number;
  onSave: (input: CreateSleepingSlotRoomInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [roomName, setRoomName] = useState(`Room ${existingCount + 1}`);
  const [beds, setBeds] = useState<DraftBed[]>([newBed("DOUBLE"), newBed("SINGLE")]);

  const setSlot = (bi: number, si: number, patch: Partial<DraftSlot>) =>
    setBeds((prev) =>
      prev.map((bed, i) =>
        i === bi
          ? { ...bed, slots: bed.slots.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : bed
      )
    );

  const addSlot = (bi: number) =>
    setBeds((prev) =>
      prev.map((bed, i) => {
        if (i !== bi) return bed;
        if (bed.slots.length >= 4) return bed;
        const nextLabel = String.fromCharCode("A".charCodeAt(0) + bed.slots.length);
        return { ...bed, slots: [...bed.slots, { slotLabel: nextLabel, basePricePerNight: "" }] };
      })
    );

  const removeSlot = (bi: number, si: number) =>
    setBeds((prev) =>
      prev.map((bed, i) =>
        i === bi && bed.slots.length > 1
          ? { ...bed, slots: bed.slots.filter((_, j) => j !== si) }
          : bed
      )
    );

  const handleSubmit = async () => {
    if (!roomName.trim()) return void toast.error("Room name is required");
    if (beds.length === 0) return void toast.error("Add at least one bed");
    for (const bed of beds) {
      for (const slot of bed.slots) {
        if (!slot.slotLabel.trim()) return void toast.error("Every slot needs a label");
        const price = Number(slot.basePricePerNight);
        if (!Number.isInteger(price) || price < 1)
          return void toast.error("Every slot needs a whole-rupee price of at least ₹1");
      }
    }
    await onSave({
      roomName: roomName.trim(),
      displayOrder: existingCount + 1,
      beds: beds.map((bed, bi) => ({
        bedType: bed.bedType,
        displayOrder: bi,
        slots: bed.slots.map((slot, si) => ({
          slotLabel: slot.slotLabel.trim(),
          displayOrder: si,
          basePricePerNight: Number(slot.basePricePerNight),
        })),
      })),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add Room</h3>
      <div className="max-w-xs">
        <label className={lc}>Room Name *</label>
        <input className={ic} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Room 1" />
      </div>

      <div className="space-y-3">
        {beds.map((bed, bi) => (
          <div key={bi} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Bed {bi + 1}</span>
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  value={bed.bedType}
                  onChange={(e) =>
                    setBeds((prev) => prev.map((b, i) => (i === bi ? newBed(e.target.value as "SINGLE" | "DOUBLE") : b)))
                  }
                >
                  <option value="SINGLE">Single (1 slot)</option>
                  <option value="DOUBLE">Double (shareable)</option>
                </select>
              </div>
              {beds.length > 1 && (
                <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => setBeds((prev) => prev.filter((_, i) => i !== bi))}>
                  Remove bed
                </button>
              )}
            </div>
            <div className="space-y-2">
              {bed.slots.map((slot, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-14 text-xs text-slate-500 dark:text-slate-400">Slot {si + 1}</span>
                  <input
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    value={slot.slotLabel}
                    maxLength={50}
                    onChange={(e) => setSlot(bi, si, { slotLabel: e.target.value })}
                    placeholder="Label"
                  />
                  <input
                    type="number"
                    min={1}
                    className="w-32 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    value={slot.basePricePerNight}
                    onChange={(e) => setSlot(bi, si, { basePricePerNight: e.target.value })}
                    placeholder="₹ / night"
                  />
                  {bed.slots.length > 1 && (
                    <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => removeSlot(bi, si)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {bed.slots.length < 4 && (
                <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => addSlot(bi)}>
                  + Add slot to this bed
                </button>
              )}
            </div>
          </div>
        ))}
        {beds.length < 10 && (
          <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => setBeds((prev) => [...prev, newBed("SINGLE")])}>
            + Add bed
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => void handleSubmit()} disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : "Create Room"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Slot row (inline edit) ───────────────────────────────────────────────────

function SlotRow({
  slot,
  onSave,
  onToggleActive,
}: {
  slot: SleepingSlot;
  onSave: (patch: { slotLabel: string; basePricePerNight: number }) => Promise<void>;
  onToggleActive: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(slot.slotLabel);
  const [price, setPrice] = useState(String(slot.basePricePerNight));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const priceNum = Number(price);
    if (!label.trim()) return void toast.error("Slot label is required");
    if (!Number.isInteger(priceNum) || priceNum < 1)
      return void toast.error("Price must be a whole rupee amount of at least ₹1");
    setBusy(true);
    await onSave({ slotLabel: label.trim(), basePricePerNight: priceNum });
    setBusy(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <input
          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          value={label}
          maxLength={50}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          type="number"
          min={1}
          className="w-28 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button type="button" className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="text-xs text-slate-500 hover:underline"
          onClick={() => {
            setEditing(false);
            setLabel(slot.slotLabel);
            setPrice(String(slot.basePricePerNight));
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1 text-xs">
      <span className="w-14 font-medium text-slate-700 dark:text-slate-300">Slot {slot.slotLabel}</span>
      <span className="w-28 text-slate-600 dark:text-slate-400">₹{slot.basePricePerNight}/night</span>
      <StatusBadge active={slot.isActive} />
      <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        type="button"
        className={`text-xs font-medium hover:underline ${slot.isActive ? "text-red-500" : "text-green-600"}`}
        onClick={() => void onToggleActive()}
      >
        {slot.isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  propertyId,
  onChanged,
}: {
  room: SleepingSlotRoom;
  propertyId: string;
  onChanged: () => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(room.roomName);
  const [busy, setBusy] = useState(false);

  const patchRoom = async (patch: { roomName?: string; isActive?: boolean }) => {
    setBusy(true);
    const { error } = await updateSleepingSlotRoom(propertyId, room.id, patch);
    setBusy(false);
    if (error) return void toast.error(error);
    toast.success("Room updated");
    setRenaming(false);
    await onChanged();
  };

  const patchSlot = async (slotId: string, patch: Parameters<typeof updateSleepingSlot>[2]) => {
    const { error } = await updateSleepingSlot(propertyId, slotId, patch);
    if (error) return void toast.error(error);
    toast.success("Slot updated");
    await onChanged();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renaming ? (
            <>
              <input
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                disabled={busy || !name.trim()}
                onClick={() => void patchRoom({ roomName: name.trim() })}
              >
                Save
              </button>
              <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => { setRenaming(false); setName(room.roomName); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{room.roomName}</h3>
              <StatusBadge active={room.isActive} />
            </>
          )}
        </div>
        {!renaming && (
          <div className="flex items-center gap-3">
            <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button
              type="button"
              className={`text-xs font-medium hover:underline ${room.isActive ? "text-red-500" : "text-green-600"}`}
              disabled={busy}
              onClick={() => {
                if (
                  room.isActive &&
                  !window.confirm(`Deactivate "${room.roomName}"? Its beds stop being bookable for new stays; existing bookings are unaffected.`)
                )
                  return;
                void patchRoom({ isActive: !room.isActive });
              }}
            >
              {room.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {room.beds.map((bed, i) => (
          <div key={bed.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Bed {i + 1} · {bed.bedType === "DOUBLE" ? "Double (shareable)" : "Single"}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {bed.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  onSave={(patch) => patchSlot(slot.id, patch)}
                  onToggleActive={() => patchSlot(slot.id, { isActive: !slot.isActive })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Occupancy viewer (read-only, date-range) ─────────────────────────────────

function GenderPill({ gender }: { gender: "MALE" | "FEMALE" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        gender === "MALE"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
      }`}
    >
      {gender === "MALE" ? "Male" : "Female"}
    </span>
  );
}

function OccupancyViewer({ propertyId }: { propertyId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [startdate, setStartdate] = useState(today);
  const [enddate, setEnddate] = useState(tomorrow);
  const [layout, setLayout] = useState<OccupancyLayout | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (enddate <= startdate) {
      toast.error("Check-out must be after check-in");
      return;
    }
    setLoading(true);
    const { data, error } = await getSleepingSlotOccupancy(propertyId, startdate, enddate);
    setLoading(false);
    if (error) return void toast.error(error);
    setLayout(data);
  };

  const roomState: Record<string, string> = {
    EMPTY: "Empty",
    MALE_OCCUPIED: "Male occupied",
    FEMALE_PRESENT: "Female present",
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Occupancy</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Who holds which bed for a date range — availability, occupant gender, and each room&apos;s
          gender state. Read-only.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className={lc}>Check-in</label>
          <input type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" value={startdate} onChange={(e) => setStartdate(e.target.value)} />
        </div>
        <div>
          <label className={lc}>Check-out</label>
          <input type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" value={enddate} onChange={(e) => setEnddate(e.target.value)} />
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Loading…" : "View occupancy"}
        </button>
      </div>

      {layout && (
        <div className="space-y-3 pt-1">
          {layout.rooms.length === 0 ? (
            <p className="text-xs text-slate-500">No rooms configured.</p>
          ) : (
            layout.rooms.map((room) => (
              <div key={room.id} className="rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{room.roomName}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{roomState[room.genderState] ?? room.genderState}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {room.beds.flatMap((bed, bi) =>
                    bed.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                        <span className="w-24 text-slate-500 dark:text-slate-400">Bed {bi + 1} · {bed.bedType === "DOUBLE" ? "Double" : "Single"}</span>
                        <span className="w-16 font-medium text-slate-700 dark:text-slate-300">Slot {slot.slotLabel}</span>
                        {slot.available ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Available</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">Booked</span>
                            {slot.occupantGender && <GenderPill gender={slot.occupantGender} />}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main container ───────────────────────────────────────────────────────────

export default function SleepingSlotsTabContainer({ propertyId }: Props) {
  const [config, setConfig] = useState<SleepingSlotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = async () => {
    const { data, error } = await getSleepingSlotConfig(propertyId);
    if (error) toast.error(error);
    setConfig(data);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async () => {
    if (!config) return;
    const next = !config.enabled;
    if (next && config.rooms.length === 0) {
      toast.error("Add at least one room with beds before enabling bed-wise booking");
      return;
    }
    if (
      !window.confirm(
        next
          ? "Enable bed-wise booking? Customers will book individual beds instead of the whole property. Make sure Instant Booking is ON for this property — booking requests are refused for bed-wise properties."
          : "Disable bed-wise booking? The property goes back to whole-property booking."
      )
    )
      return;
    setToggling(true);
    const { error } = await setSleepingSlotEnabled(propertyId, next);
    setToggling(false);
    if (error) return void toast.error(error);
    toast.success(next ? "Bed-wise booking enabled" : "Bed-wise booking disabled");
    await load();
  };

  const handleCreate = async (input: Parameters<typeof createSleepingSlotRoom>[1]) => {
    setSaving(true);
    const { error } = await createSleepingSlotRoom(propertyId, input);
    setSaving(false);
    if (error) return void toast.error(error);
    toast.success("Room created");
    setShowCreateForm(false);
    await load();
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-500">Loading sleeping-slot configuration…</div>;
  if (!config) return <div className="py-8 text-center text-sm text-slate-500">Could not load sleeping-slot configuration.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bed-wise (Sleeping Slot) Booking</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sell individual beds instead of the whole property. A double bed is two shareable slots; a single bed is one.
            Deactivate a room or slot to stop selling it — nothing is ever deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={toggling}
          className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            config.enabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {toggling ? "Saving…" : config.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
        </button>
      </div>

      {config.enabled && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          Bed-wise booking is live for this property. Instant Booking must stay ON (booking requests are refused for
          bed-wise properties), and admin/offline bookings are not supported for it yet — customers book through the
          websites and apps.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rooms & Beds</h3>
        {!showCreateForm && (
          <button type="button" onClick={() => setShowCreateForm(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            + Add Room
          </button>
        )}
      </div>

      {showCreateForm && (
        <CreateRoomForm existingCount={config.rooms.length} onSave={handleCreate} onCancel={() => setShowCreateForm(false)} saving={saving} />
      )}

      {config.rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No rooms yet. Click <strong>+ Add Room</strong> to define the first room with its beds and per-bed nightly prices.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {config.rooms.map((room) => (
            <RoomCard key={room.id} room={room} propertyId={propertyId} onChanged={load} />
          ))}
        </div>
      )}

      {config.rooms.length > 0 && <OccupancyViewer propertyId={propertyId} />}
    </div>
  );
}
