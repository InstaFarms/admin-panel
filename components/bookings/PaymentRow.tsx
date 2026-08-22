"use client";

import { useEffect } from "react";
import {
  _PaymentData,
} from "@/utils/types";
import { Button, Datepicker, Select, TextInput } from "flowbite-react";
import { HiMinus, HiPlus } from "react-icons/hi";
import BankInput from "@/components/BankInput";

const paymentForOptions = [
  "FULL_PAYMENT",
  "ADVANCE_PAYMENT",
  "BALANCE_PAYMENT",
  "ADJUSTMENT",
] as const;

const paymentMethodOptions = ["CASH", "BANK_TRANSFER", "UPI", "PG"] as const;

const paymentInstrumentOptions = ["UPI", "NET_BANKING", "OTHERS"] as const;

const paymentGatewayOptions = ["RAZORPAY", "CASHFREE", "OTHERS"] as const;
const receiverTypeOptions = ["PLATFORM", "OWNER"] as const;

interface PaymentRowProps {
  payment: _PaymentData;
  update: (payment: _PaymentData) => void;
  showPlusButton: boolean;
  addPayment: () => void;
  removePayment: (id: string) => void;
  suggestedFullPaymentAmount?: number;
  className?: string;
}

export default function PaymentRow({
  payment,
  update,
  showPlusButton,
  addPayment,
  removePayment,
  suggestedFullPaymentAmount = 0,
  className,
}: PaymentRowProps) {
  const dt = payment.paymentDate ? new Date(payment.paymentDate + 'T00:00:00') : null;
  const validDate = dt && !isNaN(dt.getTime()) ? dt : null;
  const isBankTransfer = payment.paymentMethod === "BANK_TRANSFER";
  const isGatewayPayment = payment.paymentMethod === "PG";

  useEffect(() => {
    if (payment.paymentFor !== "FULL_PAYMENT") return;
    if (Number(payment.amount || 0) > 0) return;

    const nextAmount = Math.max(0, Number(suggestedFullPaymentAmount || 0));
    if (nextAmount <= 0) return;

    update({
      ...payment,
      amount: nextAmount,
    });
  }, [payment, suggestedFullPaymentAmount, update]);

  const applyPaymentMethod = (nextMethod: _PaymentData["paymentMethod"]) => {
    update({
      ...payment,
      paymentMethod: nextMethod,
      paymentMode: nextMethod === "CASH" ? "Cash" : "Online",
      paymentInstrument:
        nextMethod === "CASH"
          ? "OTHERS"
          : nextMethod === "UPI" || nextMethod === "PG"
            ? "UPI"
            : payment.paymentInstrument === "OTHERS" || payment.paymentInstrument === "NET_BANKING"
              ? payment.paymentInstrument
              : "NET_BANKING",
      paymentGateway: nextMethod === "PG" ? (payment.paymentGateway ?? "RAZORPAY") : null,
      gatewayFee: nextMethod === "PG" ? payment.gatewayFee ?? 0 : 0,
      gatewayPaymentId: nextMethod === "PG" ? payment.gatewayPaymentId : "",
    });
  };

  const applyReceiverType = (receiverType: "PLATFORM" | "OWNER") => {
    // A gateway payment is always collected by Mago. A manual owner payment
    // may be cash, UPI or bank transfer, but must never be represented as a
    // platform gateway collection.
    update({
      ...payment,
      receiverType,
      paymentMethod: receiverType === "OWNER" && payment.paymentMethod === "PG" ? "CASH" : payment.paymentMethod,
      paymentMode: receiverType === "OWNER" && payment.paymentMethod === "PG" ? "Cash" : payment.paymentMode,
      paymentGateway: receiverType === "OWNER" ? null : payment.paymentGateway,
      gatewayFee: receiverType === "OWNER" ? 0 : payment.gatewayFee,
      gatewayPaymentId: receiverType === "OWNER" ? "" : payment.gatewayPaymentId,
    });
  };

  const applyPaymentFor = (nextPaymentFor: _PaymentData["paymentFor"]) => {
    update({
      ...payment,
      amount:
        nextPaymentFor === "FULL_PAYMENT"
          ? Math.max(0, Number(suggestedFullPaymentAmount || 0))
          : payment.amount,
      paymentFor: nextPaymentFor,
      paymentType: nextPaymentFor === "ADJUSTMENT" ? "Security Deposit" : "Rent",
    });
  };

  return (
    <tr className={className}>
      <td className="">
        <Datepicker
          id={`payment-${payment.id}`}
          name={`payment-${payment.id}`}
          value={validDate}
          onChange={(d) => {
            if (d) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              update({
                ...payment,
                paymentDate: dateStr,
              });
            }
          }}
        />
      </td>
      <td className="">
        <Select
          id={`payment-receiverType-${payment.id}`}
          name={`payment-receiverType-${payment.id}`}
          value={payment.receiverType ?? "PLATFORM"}
          onChange={(e) => applyReceiverType(e.target.value as "PLATFORM" | "OWNER")}
        >
          {receiverTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option === "PLATFORM" ? "Mago collected" : "Owner collected"}
            </option>
          ))}
        </Select>
      </td>
      <td className="">
        <Select
          id={`payment-paymentFor-${payment.id}`}
          name={`payment-paymentFor-${payment.id}`}
          value={payment.paymentFor}
          onChange={(e) => applyPaymentFor(e.target.value as _PaymentData["paymentFor"])}
        >
          {paymentForOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </td>
      <td className="">
        <TextInput
          id={`payment-amount-${payment.id}`}
          name={`payment-amount-${payment.id}`}
          type="number"
          placeholder="Amount"
          value={payment.amount}
          onChange={(e) => update({ ...payment, amount: parseFloat(e.target.value) || 0 })}
          min="0"
          step="0.01"
        />
      </td>
      <td className="">
        <Select
          id={`payment-paymentMethod-${payment.id}`}
          name={`payment-paymentMethod-${payment.id}`}
          value={payment.paymentMethod}
          onChange={(e) => applyPaymentMethod(e.target.value as _PaymentData["paymentMethod"])}
        >
          {paymentMethodOptions
            .filter((option) => payment.receiverType !== "OWNER" || option !== "PG")
            .map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
            ))}
        </Select>
      </td>
      <td className="">
        <Select
          id={`payment-paymentInstrument-${payment.id}`}
          name={`payment-paymentInstrument-${payment.id}`}
          value={payment.paymentInstrument}
          onChange={(e) => update({ ...payment, paymentInstrument: e.target.value as _PaymentData["paymentInstrument"] })}
          disabled={payment.paymentMethod === "CASH" || payment.paymentMethod === "UPI" || payment.paymentMethod === "PG"}
        >
          {paymentInstrumentOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </td>
      <td className="">
        <TextInput
          id={`payment-paymentReference-${payment.id}`}
          name={`payment-paymentReference-${payment.id}`}
          placeholder="Reference"
          value={payment.paymentReference || ""}
          onChange={(e) => update({ ...payment, paymentReference: e.target.value })}
        />
      </td>
      <td className="">
        {isGatewayPayment ? (
          <div className="grid gap-2">
            <Select
              id={`payment-paymentGateway-${payment.id}`}
              name={`payment-paymentGateway-${payment.id}`}
              value={payment.paymentGateway || "RAZORPAY"}
              onChange={(e) => update({ ...payment, paymentGateway: e.target.value as _PaymentData["paymentGateway"] })}
            >
              {paymentGatewayOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <TextInput
              id={`payment-gatewayPaymentId-${payment.id}`}
              name={`payment-gatewayPaymentId-${payment.id}`}
              placeholder="Gateway payment ID"
              value={payment.gatewayPaymentId || ""}
              onChange={(e) => update({ ...payment, gatewayPaymentId: e.target.value })}
            />
            <TextInput
              id={`payment-gatewayFee-${payment.id}`}
              name={`payment-gatewayFee-${payment.id}`}
              type="number"
              min="0"
              step="0.01"
              placeholder="Gateway fee"
              value={payment.gatewayFee ?? 0}
              onChange={(e) => update({ ...payment, gatewayFee: parseFloat(e.target.value) || 0 })}
            />
          </div>
        ) : isBankTransfer ? (
          <BankInput
            data={payment}
            update={(b) => update({ ...payment, ...b })}
          />
        ) : null}
      </td>
      <td className="align-center justify-center">
        <div className="flex flex-row items-center gap-3">
          <Button
            type="button"
            className="bg-red-500 aspect-square p-2"
            onClick={() => removePayment(payment.id)}
            size="sm"
          >
            <HiMinus className="" />
          </Button>
          {showPlusButton && (
            <Button
              type="button"
              className="bg-primary-500 aspect-square p-2"
              onClick={addPayment}
              size="sm"
            >
              <HiPlus />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
