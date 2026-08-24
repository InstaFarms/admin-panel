import React, { useState, useEffect } from "react";
import { format, addDays, differenceInDays } from "date-fns";

type DaywiseEntry = {
  date: string;
  roomFee: string;
  extraGuestFee: string;
  discount: string;
};

type OfflineBookingGridProps = {
  checkinDate?: Date;
  checkoutDate?: Date;
  /** Values typed in each row are either GST-inclusive receipt amounts or GST-exclusive rates. */
  amountInputType?: "INCLUSIVE" | "EXCLUSIVE";
  totalBookingPrice: number;
  onPayloadChange: (payload: any[]) => void;
};

export default function OfflineBookingGrid({
  checkinDate,
  checkoutDate,
  amountInputType = "INCLUSIVE",
  totalBookingPrice,
  onPayloadChange,
}: OfflineBookingGridProps) {
  const [entries, setEntries] = useState<DaywiseEntry[]>([]);
  const [gstRatePct, setGstRatePct] = useState<number>(18);
  const GST_RATE = gstRatePct / 100;

  useEffect(() => {
    if (checkinDate && checkoutDate && checkinDate < checkoutDate) {
      const nights = differenceInDays(checkoutDate, checkinDate);
      const newEntries: DaywiseEntry[] = [];
      for (let i = 0; i < nights; i++) {
        const currentDate = addDays(checkinDate, i);
        newEntries.push({
          date: format(currentDate, "yyyy-MM-dd"),
          roomFee: "",
          extraGuestFee: "",
          discount: "",
        });
      }
      setEntries(newEntries);
    } else {
      setEntries([]);
    }
  }, [checkinDate, checkoutDate]);

  const handleFieldChange = (index: number, field: keyof DaywiseEntry, val: string) => {
    const updated = [...entries];
    updated[index][field] = val;
    setEntries(updated);
  };

  const calculatedPayload = entries.map((e) => {
    const roomFee = parseFloat(e.roomFee) || 0;
    const extraGuestFee = parseFloat(e.extraGuestFee) || 0;
    const discount = parseFloat(e.discount) || 0;
    
    const inputIsInclusive = amountInputType === "INCLUSIVE";
    const multiplier = 1 + GST_RATE;
    const baseRentalWithoutGst = Math.round(
      (inputIsInclusive ? roomFee / multiplier : roomFee) * 100
    ) / 100;
    const extraAdultGuestChargesWithoutGst = Math.round(
      (inputIsInclusive ? extraGuestFee / multiplier : extraGuestFee) * 100
    ) / 100;
    const discountForTheDay = Math.round(
      (inputIsInclusive ? discount / multiplier : discount) * 100
    ) / 100;
    const bookingAmountWithoutGST = baseRentalWithoutGst + extraAdultGuestChargesWithoutGst - discountForTheDay;
    const gstAmount = Math.round((bookingAmountWithoutGST * GST_RATE) * 100) / 100;
    const totalInclGst = Math.round((bookingAmountWithoutGST + gstAmount) * 100) / 100;

    return {
      stayDate: e.date,
      baseRentalWithoutGst,
      extraAdultGuestChargesWithoutGst,
      discountForTheDay,
      bookingAmountWithoutGST,
      gstAmount,
      bookingAmountWithGST: totalInclGst,
      bookingGstRate: GST_RATE * 100,
      
      // Fallback aliases for other parts of the admin panel
      basePriceExclGst: baseRentalWithoutGst,
      extraGuestChargesExclGst: extraAdultGuestChargesWithoutGst,
      bookingGstAmount: gstAmount,
    };
  });

  useEffect(() => {
    onPayloadChange(calculatedPayload);
  }, [amountInputType, entries, gstRatePct]);

  const currentTotal = calculatedPayload.reduce(
    (acc, curr) => acc + curr.bookingAmountWithGST,
    0
  );
  
  // Floating point comparison buffer
  const isMismatch = Math.abs(currentTotal - totalBookingPrice) > 0.05;

  if (entries.length === 0) {
    return <div className="text-gray-500 text-sm p-4 border rounded bg-gray-50">Please select check-in and check-out dates to generate the pricing grid.</div>;
  }

  const mismatchClass = isMismatch ? "text-red-600" : "text-green-600";

  return (
    <div className="flex flex-col gap-4 border border-gray-200 rounded-lg p-5 bg-white shadow-sm mt-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">OTA / Offline Day-wise Breakup</h3>
          <p className="text-sm text-gray-500 mt-1">
            Enter {amountInputType === "INCLUSIVE" ? "GST-inclusive receipt amounts" : "GST-exclusive rates"} directly from the OTA statement. We retain both the exclusive base and GST for each stay date.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <label className="text-sm font-medium text-gray-700 mb-1">Applicable GST Slab</label>
          <select
            value={gstRatePct}
            onChange={(e) => setGstRatePct(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
          >
            <option value={18}>18%</option>
            <option value={12}>12%</option>
            <option value={5}>5%</option>
            <option value={0}>0%</option>
          </select>
        </div>
      </div>

      {isMismatch && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200 flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <strong>Mismatching Totals:</strong> Your inputted day-wise sum (INR {currentTotal.toFixed(2)}) does not equal the Total Booking Price (INR {totalBookingPrice.toFixed(2)}).
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-700 w-32">Date</th>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Room Fee ({amountInputType === "INCLUSIVE" ? "Incl." : "Excl."})</th>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Extra Guest ({amountInputType === "INCLUSIVE" ? "Incl." : "Excl."})</th>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-700">Discount ({amountInputType === "INCLUSIVE" ? "Incl." : "Excl."})</th>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-500">Net Daily (Incl.)</th>
              <th scope="col" className="px-4 py-3 font-semibold text-gray-500">Auto GST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry, idx) => {
              const payloadRow = calculatedPayload[idx];
              return (
                <tr key={entry.date} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {format(new Date(entry.date), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={entry.roomFee}
                      onChange={(e) => handleFieldChange(idx, "roomFee", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="34000"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={entry.extraGuestFee}
                      onChange={(e) => handleFieldChange(idx, "extraGuestFee", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="9000"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={entry.discount}
                      onChange={(e) => handleFieldChange(idx, "discount", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-red-600"
                      placeholder="3400"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-mono font-medium">₹{payloadRow.bookingAmountWithGST.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">₹{payloadRow.gstAmount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200 mt-2">
        <span className="font-semibold text-gray-700">Total Sum Entered (Net):</span>
        <span className={"text-lg font-bold " + mismatchClass}>
          INR {currentTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
