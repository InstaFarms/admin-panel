"use client";

import {
  getPropertyPayoutBankAccountsAction,
  setPropertyPayoutBankAccountsAction,
} from "@/actions/ownerBankAccountActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Checkbox, Label, Select } from "flowbite-react";
import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";

type BankAccount = {
  id: string;
  bankAccountHolderName: string;
  maskedAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch?: string;
};

type OwnerProperty = {
  propertyId: string;
  propertyName: string;
  propertyCode?: string | null;
};

export default function PropertyPayoutBankAssignments({
  ownerId,
  accounts,
  properties,
}: {
  ownerId: string;
  accounts: BankAccount[];
  properties: OwnerProperty[];
}) {
  const [propertyId, setPropertyId] = useState("");
  const [assignedBankIds, setAssignedBankIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    if (!propertyId) {
      setAssignedBankIds([]);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void getPropertyPayoutBankAccountsAction(ownerId, propertyId)
      .then((result) => {
        if (active) {
          setAssignedBankIds((result.data ?? []).map((account) => account.id));
        }
      })
      .catch(() => {
        if (active) setAssignedBankIds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ownerId, propertyId]);

  const toggleBank = (bankId: string) => {
    setAssignedBankIds((current) =>
      current.includes(bankId)
        ? current.filter((id) => id !== bankId)
        : [...current, bankId],
    );
  };

  const save = () => {
    if (!propertyId) {
      toast.error("Choose a property first.");
      return;
    }
    startTransition(() => {
      toast.promise(
        parseServerActionResult(
          setPropertyPayoutBankAccountsAction({
            ownerId,
            propertyId,
            bankAccountIds: assignedBankIds,
          }),
        ),
        {
          loading: "Saving payout accounts…",
          success: (message) => message,
          error: (error) => (error as Error).message,
        },
      );
    });
  };

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Property payout accounts
        </h6>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Limit a property or booking withdrawal to selected, owner-saved accounts. Saved accounts stay owner-managed and remain masked here.
        </p>
      </div>
      <div>
        <Label htmlFor="payoutProperty">Property</Label>
        <Select
          id="payoutProperty"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
        >
          <option value="">Choose a property</option>
          {properties.map((property) => (
            <option key={property.propertyId} value={property.propertyId}>
              {property.propertyName}
              {property.propertyCode ? ` (${property.propertyCode})` : ""}
            </option>
          ))}
        </Select>
      </div>
      {propertyId ? (
        accounts.length === 0 ? (
          <p className="text-sm text-amber-700">
            This owner has no saved bank account. The owner must add one in Mago Host.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
              <label
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
                key={account.id}
              >
                <Checkbox
                  checked={assignedBankIds.includes(account.id)}
                  disabled={loading || saving}
                  onChange={() => toggleBank(account.id)}
                />
                <span>
                  {account.bankName} · {account.maskedAccountNumber} · {account.bankIfsc}
                </span>
              </label>
            ))}
          </div>
        )
      ) : null}
      {propertyId ? (
        <div className="flex justify-end">
          <MyButton
            type="button"
            disabled={accounts.length === 0}
            loading={saving || loading}
            onClick={save}
          >
            Save property payout accounts
          </MyButton>
        </div>
      ) : null}
    </div>
  );
}
