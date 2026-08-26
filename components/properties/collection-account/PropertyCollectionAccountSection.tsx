"use client";

import {
  getPropertyCollectionAccountConfigAction,
  savePropertyCollectionAccountConfigAction,
  type NewCollectionAccount,
  type PropertyCollectionAccountConfig,
} from "@/actions/ownerBankAccountActions";
import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";
import { JarvisLoader } from "@/components/JarvisLogo";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Select, TextInput } from "flowbite-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";

const emptyAccount: NewCollectionAccount = {
  label: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  branch: "",
};

/**
 * Property-scoped collection-account configuration.
 *
 * The owner wallet page renders the same underlying config behind an
 * owner-filtered property dropdown, so any property without an
 * `ownersOnProperties` row (Mago-owned / newly onboarded / owner unassigned)
 * could never be configured there. This section binds directly to a single
 * `propertyId`, so every property — owner-linked or not — can pick who
 * receives its manual guest payments. Owner collection stays disabled until an
 * owner is assigned; Mago (PLATFORM) collection is always available.
 *
 * New bank accounts are validated against the same Razorpay IFSC directory the
 * rest of the app uses, auto-filling the bank name and branch.
 */
export default function PropertyCollectionAccountSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [data, setData] = useState<PropertyCollectionAccountConfig | null>(null);
  const [receiverType, setReceiverType] = useState<"PLATFORM" | "OWNER">("PLATFORM");
  const [accountId, setAccountId] = useState("");
  const [addNew, setAddNew] = useState(false);
  const [newAccount, setNewAccount] = useState<NewCollectionAccount>(emptyAccount);
  const [ifscVerifying, setIfscVerifying] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);
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
        setIfscVerified(false);
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
    setIfscVerified(false);
  };

  const updateNewAccount = (key: keyof NewCollectionAccount, value: string) => {
    setNewAccount((current) => ({ ...current, [key]: value }));
  };

  // Same Razorpay IFSC directory the host bank-account form uses: a complete
  // 11-character code resolves the bank name and branch, and only a resolved
  // code counts as verified.
  const verifyIfsc = async (code: string) => {
    if (code.length !== 11) return;
    setIfscVerifying(true);
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (response.ok) {
        const bank = await response.json();
        setNewAccount((current) => ({
          ...current,
          ifscCode: code,
          bankName: bank.BANK ?? current.bankName,
          branch: bank.BRANCH ?? current.branch,
        }));
        setIfscVerified(true);
      } else {
        setIfscVerified(false);
        toast.error("Invalid IFSC code.");
      }
    } catch {
      setIfscVerified(false);
      toast.error("Could not verify IFSC. Check the connection and try again.");
    } finally {
      setIfscVerifying(false);
    }
  };

  const handleIfscChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    updateNewAccount("ifscCode", upper);
    if (upper.length === 11) {
      void verifyIfsc(upper);
    } else {
      setIfscVerified(false);
    }
  };

  const openAddNew = () => {
    setAddNew((current) => {
      const next = !current;
      if (next) {
        setAccountId("");
        setNewAccount(emptyAccount);
        setIfscVerified(false);
      }
      return next;
    });
  };

  const save = () => {
    if (!propertyId) {
      toast.error("Save the property first.");
      return;
    }
    if (!addNew && !accountId) {
      toast.error("Choose a saved account or add a new one.");
      return;
    }
    if (addNew) {
      if (!newAccount.accountHolderName || !newAccount.accountNumber || !newAccount.ifscCode || !newAccount.bankName) {
        toast.error("Enter account holder, number, IFSC and bank name.");
        return;
      }
      if (!ifscVerified) {
        toast.error("Verify the IFSC code before saving.");
        return;
      }
    }

    startTransition(() => {
      const savePromise = parseServerActionResult(
        savePropertyCollectionAccountConfigAction({
          propertyId,
          receiverType,
          ...(addNew ? { newAccount } : { accountId }),
        }),
      );
      toast.promise(savePromise, {
        loading: "Saving collection account…",
        success: (message) => message,
        error: (error) => (error as Error).message,
      });
      void savePromise.then(() =>
        getPropertyCollectionAccountConfigAction(propertyId).then((result) => {
          if (result.data) {
            setData(result.data);
            setReceiverType(result.data.config?.receiverType || "PLATFORM");
            setAccountId(result.data.config?.selectedAccount?.id || "");
            setAddNew(false);
            setNewAccount(emptyAccount);
            setIfscVerified(false);
          }
        }),
      );
    });
  };

  const cardBase =
    "rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50";
  const cardSelected = "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40";
  const cardIdle = "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <SectionHeading
        title="Property collection account"
        description="Choose who receives future manual guest payments for this property. This is separate from the owner's withdrawal account."
      />

      {loading && !data ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
          <JarvisLoader /> Loading collection account…
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => selectReceiver("PLATFORM")}
              disabled={loading || saving}
              className={`${cardBase} ${receiverType === "PLATFORM" ? cardSelected : cardIdle}`}
            >
              <span className="block font-semibold text-gray-900 dark:text-white">Mago collects</span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
                Use one saved Mago collection account. Mago-held money follows the normal owner settlement rules.
              </span>
            </button>
            <button
              type="button"
              onClick={() => selectReceiver("OWNER")}
              disabled={loading || saving || !data.owner}
              className={`${cardBase} ${receiverType === "OWNER" ? cardSelected : cardIdle}`}
            >
              <span className="block font-semibold text-gray-900 dark:text-white">Owner collects directly</span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
                {data.owner
                  ? `${data.owner.name}'s saved account receives the guest payment. No duplicate wallet payable is created.`
                  : "Assign an owner to this property before selecting owner collection."}
              </span>
            </button>
          </div>

          {!addNew ? (
            <LabelWrapper label={`Saved ${receiverType === "PLATFORM" ? "Mago" : "owner"} account`}>
              <Select
                value={accountId}
                disabled={loading || saving || accounts.length === 0}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">{accounts.length === 0 ? "No saved accounts yet" : "Choose a saved account"}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} · {account.maskedAccountNumber} · {account.bankIfsc}
                    {account.isMappedToProperty ? " · mapped to this property" : ""}
                  </option>
                ))}
              </Select>
            </LabelWrapper>
          ) : null}

          <button
            type="button"
            disabled={loading || saving || (receiverType === "OWNER" && !data.owner)}
            onClick={openAddNew}
            className="w-fit text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
          >
            {addNew ? "Use a saved account" : `Add a new ${receiverType === "PLATFORM" ? "Mago" : "owner"} account`}
          </button>

          {addNew ? (
            <div className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2 dark:border-gray-700">
              {receiverType === "PLATFORM" ? (
                <div className="md:col-span-2">
                  <LabelWrapper label="Account label">
                    <TextInput
                      value={newAccount.label || ""}
                      onChange={(event) => updateNewAccount("label", event.target.value)}
                      placeholder="e.g. Mago HDFC Collections"
                    />
                  </LabelWrapper>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <LabelWrapper label="IFSC" required>
                  <TextInput
                    value={newAccount.ifscCode}
                    onChange={(event) => handleIfscChange(event.target.value)}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    color={newAccount.ifscCode.length === 11 && !ifscVerified && !ifscVerifying ? "failure" : undefined}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {ifscVerifying
                      ? "Verifying IFSC…"
                      : ifscVerified
                        ? `✓ Verified · ${newAccount.bankName}${newAccount.branch ? ` — ${newAccount.branch}` : ""}`
                        : "Enter the 11-character IFSC; the bank and branch fill in automatically."}
                  </p>
                </LabelWrapper>
              </div>
              <LabelWrapper label="Account holder" required>
                <TextInput
                  value={newAccount.accountHolderName}
                  onChange={(event) => updateNewAccount("accountHolderName", event.target.value)}
                />
              </LabelWrapper>
              <LabelWrapper label="Account number" required>
                <TextInput
                  inputMode="numeric"
                  value={newAccount.accountNumber}
                  onChange={(event) => updateNewAccount("accountNumber", event.target.value.replace(/[^0-9]/g, ""))}
                />
              </LabelWrapper>
              <LabelWrapper label="Bank name" required>
                <TextInput
                  value={newAccount.bankName}
                  onChange={(event) => updateNewAccount("bankName", event.target.value)}
                  placeholder="Auto-filled from IFSC"
                />
              </LabelWrapper>
              <LabelWrapper label="Branch">
                <TextInput
                  value={newAccount.branch || ""}
                  onChange={(event) => updateNewAccount("branch", event.target.value)}
                  placeholder="Auto-filled from IFSC"
                />
              </LabelWrapper>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button color="blue" isProcessing={saving || loading} onClick={save}>
              Save collection account
            </Button>
          </div>
        </div>
      ) : (
        <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
          Could not load the collection account for this property.
        </p>
      )}
    </div>
  );
}
