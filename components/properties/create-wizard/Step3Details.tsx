"use client";

interface Step3DetailsProps {
  isResort: boolean;
  resortRoomNames: string[];
  onResortRoomCountChange: (value: number) => void;
  onResortRoomNameChange: (index: number, value: string) => void;
  error: string | null;
  bedroomCount: number;
  bathroomCount: number;
  maxGuestCount: number;
  doubleBedCount: number;
  singleBedCount: number;
  mattressCount: number;
  baseGuestCount: number;
  onBedroomChange: (value: number) => void;
  onBathroomChange: (value: number) => void;
  onMaxGuestChange: (value: number) => void;
  onDoubleBedChange: (value: number) => void;
  onSingleBedChange: (value: number) => void;
  onMattressChange: (value: number) => void;
  onBaseGuestChange: (value: number) => void;
}

interface CounterProps {
  label: string;
  sublabel?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
}

function Counter({ label, sublabel, value, min = 0, max = 99, onChange, icon }: CounterProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span className="w-8 text-center text-lg font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const BedIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V8a2 2 0 012-2h14a2 2 0 012 2v4M3 12v5a2 2 0 002 2h14a2 2 0 002-2v-5M9 10V9a1 1 0 011-1h4a1 1 0 011 1v1" />
  </svg>
);

const BathIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16v2a6 6 0 01-6 6H10a6 6 0 01-6-6v-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v7" />
  </svg>
);

const GuestIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const RoomsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M8 7h4m-4 4h4m-4 4h4m4-6h.01M16 13h.01M16 17h.01" />
  </svg>
);

const DoubleBedIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h18M3 13V9a2 2 0 012-2h5v2m5-2h2a2 2 0 012 2v4M3 13v4a1 1 0 001 1h16a1 1 0 001-1v-4M8 11V9m0 0H6m2 0h2" />
  </svg>
);

const SingleBedIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h18M3 13V9a2 2 0 012-2h14a2 2 0 012 2v4M3 13v4a1 1 0 001 1h16a1 1 0 001-1v-4M10 11V9" />
  </svg>
);

const MattressIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 6a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2M4 6V5a1 1 0 011-1h14a1 1 0 011 1v1" />
  </svg>
);

export default function Step3Details({
  isResort,
  resortRoomNames,
  onResortRoomCountChange,
  onResortRoomNameChange,
  error,
  bedroomCount,
  bathroomCount,
  maxGuestCount,
  doubleBedCount,
  singleBedCount,
  mattressCount,
  baseGuestCount,
  onBedroomChange,
  onBathroomChange,
  onMaxGuestChange,
  onDoubleBedChange,
  onSingleBedChange,
  onMattressChange,
  onBaseGuestChange,
}: Step3DetailsProps) {
  if (isResort) {
    return (
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Room Setup</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add the rooms now. Their capacity, pricing, amenities, and media are configured room by room in the editor.
          </p>
        </div>

        <Counter
          label="Rooms"
          sublabel="Number of rooms at this resort"
          value={resortRoomNames.length}
          min={1}
          max={50}
          onChange={onResortRoomCountChange}
          icon={<RoomsIcon />}
        />

        <div className="mt-4 space-y-3">
          {resortRoomNames.map((roomName, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <label htmlFor={`resort-room-name-${index}`} className="mb-1.5 block text-sm font-semibold text-gray-900 dark:text-white">
                Room {index + 1} name
              </label>
              <input
                id={`resort-room-name-${index}`}
                value={roomName}
                maxLength={200}
                onChange={(event) => onResortRoomNameChange(index, event.target.value)}
                placeholder={`e.g. Garden Suite ${index + 1}`}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Complete the room details next.
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-700 dark:text-blue-300">
            Once the resort is created, the full property editor will open. Set each room&apos;s type,
            beds, bathrooms, guest capacity, day-wise pricing, amenities, photos, and availability there.
            No room metrics will be saved on the parent property.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic Details</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All fields here are optional. You can update these later in the editor.
        </p>
      </div>

      <div className="space-y-4">
        <Counter
          label="Bedrooms"
          sublabel="Number of bedrooms"
          value={bedroomCount}
          onChange={onBedroomChange}
          icon={<BedIcon />}
        />
        <Counter
          label="Bathrooms"
          sublabel="Number of bathrooms"
          value={bathroomCount}
          onChange={onBathroomChange}
          icon={<BathIcon />}
        />
        <Counter
          label="Double Beds"
          sublabel="Number of double beds"
          value={doubleBedCount}
          onChange={onDoubleBedChange}
          icon={<DoubleBedIcon />}
        />
        <Counter
          label="Single Beds"
          sublabel="Number of single beds"
          value={singleBedCount}
          onChange={onSingleBedChange}
          icon={<SingleBedIcon />}
        />
        <Counter
          label="Mattresses"
          sublabel="Number of mattresses"
          value={mattressCount}
          onChange={onMattressChange}
          icon={<MattressIcon />}
        />
        <Counter
          label="Base Guests"
          sublabel="Base guest count (included in base price)"
          value={baseGuestCount}
          max={200}
          onChange={onBaseGuestChange}
          icon={<GuestIcon />}
        />
        <Counter
          label="Max Guests"
          sublabel="Maximum guest capacity"
          value={maxGuestCount}
          max={200}
          onChange={onMaxGuestChange}
          icon={<GuestIcon />}
        />
      </div>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> You can add pricing, gallery, location, amenities, and all other
          details after the property is created — in the full property editor.
        </p>
      </div>
    </div>
  );
}
