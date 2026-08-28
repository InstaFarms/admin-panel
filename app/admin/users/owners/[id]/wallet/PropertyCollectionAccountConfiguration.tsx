"use client";

import {
  getPropertyCollectionAccountConfigAction,
  savePropertyCollectionAccountConfigAction,
  type NewCollectionAccount,
  type PropertyCollectionAccountConfig,
} from "@/actions/ownerBankAccountActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Label, Select, TextInput } from "flowbite-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";

type OwnerProperty = {
  propertyId: string;
  propertyName: string;
  propertyCode?: string | null;
};

const emptyAccount: NewCollectionAccount = {
  label: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  branch: "",
};

export default function PropertyCollectionAccountConfiguration({
  properties,
}: {
  properties: OwnerProperty[];
}) {
  const [propertyId, setPropertyId] = useState("");
  const [data, setData] = useState<PropertyCollectionAccountConfig | null>(null);
  const [receiverType, setReceiverType] = useState<"PLATFORM" | "OWNER">("PLATFORM");
  const [accountId, setAccountId] = useState("");
  const [addNew, setAddNew] = useState(false);
  const [newAccount, setNewAccount] = useState<NewCollectionAccount>(emptyAccount);
  const [loading, setLoading] = useState(false);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    if (!propertyId) {
      setData(null);
      setAccountId("");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void getPropertyCollectionAccountConfigAction(propertyId)
      .then((result) => {
        if (!active) return;
        if (result.error || !result.data) {
          toast.error(result.error || "Could not load the property collection account.");
          return;
        }
        const config = result.data;
        setData(config);
        setReceiverType(config.config?.receiverType || "PLATFORM");
        setAccountId(config.config?.selectedAccount?.id || "");
        setAddNew(false);
        setNewAccount(emptyAccount);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  const accounts = useMemo(
    () => (receiverType === "PLATFORM" ? data?.platformAccounts || [] : data?.ownerAccounts || []),
    [data, receiverType],
  );

  const selectReceiver = (value: "PLATFORM" | "OWNER") => {
    setReceiverType(value);
    const chosen = value === "PLATFORM" ? data?.platformAccounts || [] : data?.ownerAccounts || [];
    const current = data?.config?.receiverType === value ? data.config.selectedAccount?.id || "" : "";
    setAccountId(current || chosen[0]?.id || "");
    setAddNew(false);
    setNewAccount(emptyAccount);
  };

  const updateNewAccount = (key: keyof NewCollectionAccount, value: string) => {
    setNewAccount((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    if (!propertyId) {
      toast.error("Choose a property first.");
      return;
    }
    if (!addNew && !accountId) {
      toast.error("Choose a saved account or enter a new one.");
      return;
    }
    if (addNew && (!newAccount.accountHolderName || !newAccount.accountNumber || !newAccount.ifscCode || !newAccount.bankName)) {
      toast.error("Enter account holder, number, IFSC and bank name.");
      return;
    }

    startTransition(() => {
      const savePromise = parseServerActionResult(
        savePropertyCollectionAccountConfigAction({
          propertyId,
          receiverType,
          ...(addNew ? { newAccount } : { accountId }),
        }),
      );
      toast.promise(
        savePromise,
        {
          loading: "Saving collection account…",
          success: (message) => message,
          error: (error) => (error as Error).message,
        },
      );
      void savePromise.then(() =>
        getPropertyCollectionAccountConfigAction(propertyId).then((result) => {
          if (result.data) {
            setData(result.data);
            setAccountId(result.data.config?.selectedAccount?.id || "");
            setAddNew(false);
            setNewAccount(emptyAccount);
          }
        }),
      );
    });
  };

  if (properties.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Property collection account
        </h6>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Choose who receives future manual guest payments for each property. This is separate from the owner&apos;s withdrawal account.
        </p>
      </div>

      <div>
        <Label htmlFor="collectionProperty">Property</Label>
        <Select id="collectionProperty" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
          <option value="">Choose a property</option>
          {properties.map((property) => (
            <option key={property.propertyId} value={property.propertyId}>
              {property.propertyName}{property.propertyCode ? ` (${property.propertyCode})` : ""}
            </option>
          ))}
        </Select>
      </div>

      {propertyId && data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => selectReceiver("PLATFORM")}
              disabled={loading || saving}
              className={`rounded-lg border p-4 text-left ${receiverType === "PLATFORM" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
            >
              <span className="block font-semibold text-gray-900">Mago collects</span>
              <span className="mt-1 block text-sm text-gray-600">Use one saved Mago collection account. Mago-held money follows the normal owner settlement rules.</span>
            </button>
            <button
              type="button"
              onClick={() => selectReceiver("OWNER")}
              disabled={loading || saving || !data.owner}
              className={`rounded-lg border p-4 text-left ${receiverType === "OWNER" ? "border-blue-500 bg-blue-50" : "border-slate-200"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="block font-semibold text-gray-900">Owner collects directly</span>
              <span className="mt-1 block text-sm text-gray-600">
                {data.owner ? `${data.owner.name}'s saved account receives the guest payment. No duplicate wallet payable is created.` : "Assign an owner to this property before selecting owner collection."}
              </span>
            </button>
          </div>

          {!addNew ? (
            <div>
              <Label htmlFor="collectionAccount">Saved {receiverType === "PLATFORM" ? "Mago" : "owner"} account</Label>
              <Select
                id="collectionAccount"
                value={accountId}
                disabled={loading || saving || accounts.length === 0}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">Choose a saved account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} · {account.maskedAccountNumber} · {account.bankIfsc}{account.isMappedToProperty ? " · mapped to this property" : ""}
                  </option>
                ))}
              </Select>
              {receiverType === "OWNER" && accounts.length > 0 ? (
                <p className="mt-1 text-xs text-gray-500">Accounts already mapped to this property are marked in the saved list.</p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading || saving || (receiverType === "OWNER" && !data.owner)}
            onClick={() => {
              setAddNew((current) => !current);
              setAccountId("");
            }}
            className="w-fit text-sm font-medium text-blue-700 underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addNew ? "Use a saved account" : `Add a new ${receiverType === "PLATFORM" ? "Mago" : "owner"} account`}
          </button>

          {addNew ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
              {receiverType === "PLATFORM" ? (
                <div className="md:col-span-2">
                  <Label htmlFor="collectionLabel">Account label</Label>
                  <TextInput id="collectionLabel" value={newAccount.label || ""} onChange={(event) => updateNewAccount("label", event.target.value)} placeholder="e.g. Mago HDFC Collections" />
                </div>
              ) : null}
              <div>
                <Label htmlFor="collectionHolder">Account holder</Label>
                <TextInput id="collectionHolder" value={newAccount.accountHolderName} onChange={(event) => updateNewAccount("accountHolderName", event.target.value)} />
              </div>
              <div>
                <Label htmlFor="collectionNumber">Account number</Label>
                <TextInput id="collectionNumber" inputMode="numeric" value={newAccount.accountNumber} onChange={(event) => updateNewAccount("accountNumber", event.target.value)} />
              </div>
              <div>
                <Label htmlFor="collectionIfsc">IFSC</Label>
                <TextInput id="collectionIfsc" value={newAccount.ifscCode} onChange={(event) => updateNewAccount("ifscCode", event.target.value.toUpperCase())} />
              </div>
              <div>
                <Label htmlFor="collectionBank">Bank name</Label>
                <TextInput id="collectionBank" value={newAccount.bankName} onChange={(event) => updateNewAccount("bankName", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="collectionBranch">Branch (optional)</Label>
                <TextInput id="collectionBranch" value={newAccount.branch || ""} onChange={(event) => updateNewAccount("branch", event.target.value)} />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <MyButton type="button" loading={saving || loading} onClick={save}>
              Save collection account
            </MyButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
