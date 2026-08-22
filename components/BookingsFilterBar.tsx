"use client";

import { Button, Checkbox, Modal, ModalBody, ModalFooter, ModalHeader, Select, TextInput } from "flowbite-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DatePicker as DateRangePicker } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HiCalendar, HiClipboardList, HiCog, HiHome, HiX } from "react-icons/hi";

interface FilterValues {
  bookingDateFrom?: string;
  bookingDateTo?: string;
  stayDateFrom?: string;
  stayDateTo?: string;
  propertySearch?: string;
  propertySearchType?: "code" | "name";
  bookingType?: string;
  bookingSource?: string;
  presentOnMago?: boolean;
  excludeTest?: boolean;
}

export default function BookingsFilterBar({ hideBookingTypeSource = false }: { hideBookingTypeSource?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [showBookingDatePicker, setShowBookingDatePicker] = useState(false);
  const [showStayDatePicker, setShowStayDatePicker] = useState(false);
  
  const [filters, setFilters] = useState<FilterValues>({
    bookingDateFrom: searchParams.get("bookingDateFrom") || undefined,
    bookingDateTo: searchParams.get("bookingDateTo") || undefined,
    stayDateFrom: searchParams.get("stayDateFrom") || undefined,
    stayDateTo: searchParams.get("stayDateTo") || undefined,
    propertySearch: searchParams.get("propertySearch") || undefined,
    propertySearchType: (searchParams.get("propertySearchType") as "code" | "name") || undefined,
    bookingType: searchParams.get("bookingType") || undefined,
    bookingSource: searchParams.get("bookingSource") || undefined,
    presentOnMago: searchParams.get("presentOnMago") === "true",
    excludeTest: searchParams.get("excludeTest") === "true",
  });
  
  const [bookingDateRange, setBookingDateRange] = useState<[Date | null, Date | null]>([
    filters.bookingDateFrom ? new Date(filters.bookingDateFrom) : null,
    filters.bookingDateTo ? new Date(filters.bookingDateTo) : null,
  ]);
  const [stayDateRange, setStayDateRange] = useState<[Date | null, Date | null]>([
    filters.stayDateFrom ? new Date(filters.stayDateFrom) : null,
    filters.stayDateTo ? new Date(filters.stayDateTo) : null,
  ]);
  
  const [propertySearchType, setPropertySearchType] = useState<"code" | "name">(
    filters.propertySearchType || "code"
  );
  const [propertySearchValue, setPropertySearchValue] = useState(
    filters.propertySearch || ""
  );
  const [bookingTypeValue, setBookingTypeValue] = useState(filters.bookingType || "");
  const [bookingSourceValue, setBookingSourceValue] = useState(filters.bookingSource || "");
  const [presentOnMagoValue, setPresentOnMagoValue] = useState(filters.presentOnMago || false);
  const [excludeTestValue, setExcludeTestValue] = useState(filters.excludeTest || false);

  const updateURL = (newFilters: Partial<FilterValues>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    router.push(`?${params.toString()}`);
  };

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateRange = (from: string | undefined, to: string | undefined) => {
    if (!from && !to) return null;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      return `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (from) return `From ${new Date(from).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    if (to) return `Until ${new Date(to).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    return null;
  };

  const handleBookingDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setBookingDateRange([start, end]);
    
    if (start && end) {
      updateURL({
        bookingDateFrom: getLocalDateString(start),
        bookingDateTo: getLocalDateString(end),
      });
    } else if (!start && !end) {
      updateURL({
        bookingDateFrom: undefined,
        bookingDateTo: undefined,
      });
    }
  };

  const handleStayDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStayDateRange([start, end]);
    
    if (start && end) {
      updateURL({
        stayDateFrom: getLocalDateString(start),
        stayDateTo: getLocalDateString(end),
      });
    } else if (!start && !end) {
      updateURL({
        stayDateFrom: undefined,
        stayDateTo: undefined,
      });
    }
  };

  const handlePropertyApply = () => {
    if (propertySearchValue.trim()) {
      updateURL({
        propertySearch: propertySearchValue.trim(),
        propertySearchType: propertySearchType,
      });
    } else {
      updateURL({
        propertySearch: undefined,
        propertySearchType: undefined,
      });
    }
    setShowPropertyModal(false);
  };

  const handlePropertyClear = () => {
    setPropertySearchValue("");
    updateURL({
      propertySearch: undefined,
      propertySearchType: undefined,
    });
    setShowPropertyModal(false);
  };

  const handleBookingApply = () => {
    updateURL({
      bookingType: bookingTypeValue || undefined,
      bookingSource: bookingSourceValue || undefined,
    });
    setShowBookingModal(false);
  };

  const handleBookingClear = () => {
    setBookingTypeValue("");
    setBookingSourceValue("");
    updateURL({
      bookingType: undefined,
      bookingSource: undefined,
    });
    setShowBookingModal(false);
  };

  const handleAdditionalApply = () => {
    updateURL({
      presentOnMago: presentOnMagoValue || undefined,
      excludeTest: excludeTestValue || undefined,
    });
    setShowAdditionalModal(false);
  };

  const handleAdditionalClear = () => {
    setPresentOnMagoValue(false);
    setExcludeTestValue(false);
    updateURL({
      presentOnMago: undefined,
      excludeTest: undefined,
    });
    setShowAdditionalModal(false);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    if (limit) params.set("limit", limit);
    if (offset) params.set("offset", offset);
    router.push(`?${params.toString()}`);
  };

  const hasActiveFilters = () => {
    return !!(
      filters.bookingDateFrom ||
      filters.bookingDateTo ||
      filters.stayDateFrom ||
      filters.stayDateTo ||
      filters.propertySearch ||
      filters.bookingType ||
      filters.bookingSource ||
      filters.presentOnMago ||
      filters.excludeTest
    );
  };

  const getAdditionalFiltersCount = () => {
    let count = 0;
    if (filters.presentOnMago) count++;
    if (filters.excludeTest) count++;
    return count;
  };

  useEffect(() => {
    setFilters({
      bookingDateFrom: searchParams.get("bookingDateFrom") || undefined,
      bookingDateTo: searchParams.get("bookingDateTo") || undefined,
      stayDateFrom: searchParams.get("stayDateFrom") || undefined,
      stayDateTo: searchParams.get("stayDateTo") || undefined,
      propertySearch: searchParams.get("propertySearch") || undefined,
      propertySearchType: (searchParams.get("propertySearchType") as "code" | "name") || undefined,
      bookingType: searchParams.get("bookingType") || undefined,
      bookingSource: searchParams.get("bookingSource") || undefined,
      presentOnMago: searchParams.get("presentOnMago") === "true",
      excludeTest: searchParams.get("excludeTest") === "true",
    });

    const bookingFrom = searchParams.get("bookingDateFrom");
    const bookingTo = searchParams.get("bookingDateTo");
    setBookingDateRange([
      bookingFrom ? new Date(bookingFrom) : null,
      bookingTo ? new Date(bookingTo) : null,
    ]);

    const stayFrom = searchParams.get("stayDateFrom");
    const stayTo = searchParams.get("stayDateTo");
    setStayDateRange([
      stayFrom ? new Date(stayFrom) : null,
      stayTo ? new Date(stayTo) : null,
    ]);

    setPropertySearchType((searchParams.get("propertySearchType") as "code" | "name") || "code");
    setPropertySearchValue(searchParams.get("propertySearch") || "");
    setBookingTypeValue(searchParams.get("bookingType") || "");
    setBookingSourceValue(searchParams.get("bookingSource") || "");
    setPresentOnMagoValue(searchParams.get("presentOnMago") === "true");
    setExcludeTestValue(searchParams.get("excludeTest") === "true");
  }, [searchParams]);

  const bookingDateRef = useRef<HTMLDivElement>(null);
  const stayDateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bookingDateRef.current && !bookingDateRef.current.contains(event.target as Node)) {
        setShowBookingDatePicker(false);
      }
      if (stayDateRef.current && !stayDateRef.current.contains(event.target as Node)) {
        setShowStayDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full mb-4">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
        <div className="relative" ref={bookingDateRef}>
          <button
            onClick={() => {
              setShowBookingDatePicker(!showBookingDatePicker);
              setShowStayDatePicker(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.bookingDateFrom || filters.bookingDateTo
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <HiCalendar className="w-4 h-4" />
            <span>
              {formatDateRange(filters.bookingDateFrom, filters.bookingDateTo) || "Created Date"}
            </span>
            {(filters.bookingDateFrom || filters.bookingDateTo) && (
              <HiX
                className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900"
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ bookingDateFrom: undefined, bookingDateTo: undefined });
                  setBookingDateRange([null, null]);
                }}
              />
            )}
          </button>
          {showBookingDatePicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3">
              <DateRangePicker
                selected={bookingDateRange[0]}
                onChange={(dates) => {
                  handleBookingDateChange(dates);
                  if (dates[0] && dates[1]) {
                    setShowBookingDatePicker(false);
                  }
                }}
                startDate={bookingDateRange[0]}
                endDate={bookingDateRange[1]}
                selectsRange
                inline
                dateFormat="MMM d, yyyy"
                className="border-0"
                withPortal
                portalId="booking-date-filter-picker"
              />
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        <div className="relative" ref={stayDateRef}>
          <button
            onClick={() => {
              setShowStayDatePicker(!showStayDatePicker);
              setShowBookingDatePicker(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.stayDateFrom || filters.stayDateTo
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <HiCalendar className="w-4 h-4" />
            <span>
              {formatDateRange(filters.stayDateFrom, filters.stayDateTo) || "Check-in/Check-out"}
            </span>
            {(filters.stayDateFrom || filters.stayDateTo) && (
              <HiX
                className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900"
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ stayDateFrom: undefined, stayDateTo: undefined });
                  setStayDateRange([null, null]);
                }}
              />
            )}
          </button>
          {showStayDatePicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3">
              <DateRangePicker
                selected={stayDateRange[0]}
                onChange={(dates) => {
                  handleStayDateChange(dates);
                  if (dates[0] && dates[1]) {
                    setShowStayDatePicker(false);
                  }
                }}
                startDate={stayDateRange[0]}
                endDate={stayDateRange[1]}
                selectsRange
                inline
                dateFormat="MMM d, yyyy"
                className="border-0"
                withPortal
                portalId="stay-date-filter-picker"
              />
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        <button
          onClick={() => setShowPropertyModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filters.propertySearch
              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
              : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          <HiHome className="w-4 h-4" />
          <span>
            {filters.propertySearch ? filters.propertySearch : "Property"}
          </span>
          {filters.propertySearch && (
            <HiX
              className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900"
              onClick={(e) => {
                e.stopPropagation();
                updateURL({ propertySearch: undefined, propertySearchType: undefined });
              }}
            />
          )}
        </button>

        {!hideBookingTypeSource && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            <button
              onClick={() => setShowBookingModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.bookingType || filters.bookingSource
                  ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                  : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              <HiClipboardList className="w-4 h-4" />
              <span>
                {filters.bookingType || filters.bookingSource
                  ? `${filters.bookingType || "All"}/${filters.bookingSource || "All"}`
                  : "Booking"}
              </span>
              {(filters.bookingType || filters.bookingSource) && (
                <HiX
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateURL({ bookingType: undefined, bookingSource: undefined });
                  }}
                />
              )}
            </button>
          </>
        )}

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        <button
          onClick={() => setShowAdditionalModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filters.presentOnMago || filters.excludeTest
              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
              : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          <HiCog className="w-4 h-4" />
          <span>
            Additional
            {getAdditionalFiltersCount() > 0 && ` (${getAdditionalFiltersCount()})`}
          </span>
          {(filters.presentOnMago || filters.excludeTest) && (
            <HiX
              className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900"
              onClick={(e) => {
                e.stopPropagation();
                updateURL({ presentOnMago: undefined, excludeTest: undefined });
              }}
            />
          )}
        </button>

        {hasActiveFilters() && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
            >
              Clear All
            </button>
          </>
        )}
      </div>

      <Modal show={showPropertyModal} onClose={() => setShowPropertyModal(false)} size="md">
        <ModalHeader>Property Filter</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="propertySearchType" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Search by:
              </label>
              <Select
                id="propertySearchType"
                value={propertySearchType}
                onChange={(e) => setPropertySearchType(e.target.value as "code" | "name")}
              >
                <option value="code">Code</option>
                <option value="name">Name</option>
              </Select>
            </div>
            <div>
              <label htmlFor="propertySearch" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                {propertySearchType === "code" ? "Property Code" : "Property Name"}
              </label>
              <TextInput
                id="propertySearch"
                value={propertySearchValue}
                onChange={(e) => setPropertySearchValue(e.target.value)}
                placeholder={`Type property ${propertySearchType}...`}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={handlePropertyClear}>
            Clear
          </Button>
          <Button onClick={handlePropertyApply}>Apply</Button>
        </ModalFooter>
      </Modal>

      <Modal show={showBookingModal} onClose={() => setShowBookingModal(false)} size="md">
        <ModalHeader>Booking Type & Source</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="bookingType" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Booking Type:
              </label>
              <Select
                id="bookingType"
                value={bookingTypeValue}
                onChange={(e) => setBookingTypeValue(e.target.value)}
              >
                <option value="">All</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </Select>
            </div>
            <div>
              <label htmlFor="bookingSource" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Booking Source:
              </label>
              <Select
                id="bookingSource"
                value={bookingSourceValue}
                onChange={(e) => setBookingSourceValue(e.target.value)}
              >
                <option value="">All</option>
                <option value="Instafarms">Instafarms</option>
                <option value="jarvis">jarvis</option>
                <option value="mago">mago</option>
                <option value="others">others</option>
              </Select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={handleBookingClear}>
            Clear
          </Button>
          <Button onClick={handleBookingApply}>Apply</Button>
        </ModalFooter>
      </Modal>

      <Modal show={showAdditionalModal} onClose={() => setShowAdditionalModal(false)} size="md">
        <ModalHeader>Additional Filters</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="presentOnMago"
                checked={presentOnMagoValue}
                onChange={(e) => setPresentOnMagoValue(e.target.checked)}
              />
              <label htmlFor="presentOnMago" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Present on Mago
                <p className="text-xs text-gray-500 mt-1">
                  Shows only bookings from properties present on Mago platform
                </p>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="excludeTest"
                checked={excludeTestValue}
                onChange={(e) => setExcludeTestValue(e.target.checked)}
              />
              <label htmlFor="excludeTest" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Exclude Test Bookings
                <p className="text-xs text-gray-500 mt-1">
                  Excludes test/demo bookings from the results
                </p>
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={handleAdditionalClear}>
            Clear
          </Button>
          <Button onClick={handleAdditionalApply}>Apply</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}