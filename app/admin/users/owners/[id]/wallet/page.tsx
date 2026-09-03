import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  Badge,
  Button,
  Label,
  Textarea,
  TextInput,
} from "flowbite-react";
import {
  Table,
  TableHead,
  TableRow,
  TableHeadCell,
  TableBody,
  TableCell,
} from "flowbite-react";
import { formatAdminDateTimeLong } from "@/lib/dateUtils";
import { ServerPageProps } from "@/utils/types";
import {
  getWalletBalance,
  getWalletTransactions,
  getOwnerPayouts,
  getOwnerPendingReleaseSummary,
} from "@/actions/walletActions";
import { getUser } from "@/actions/userManagementActions";
import {
  getOwnerBankAccountsAction,
  getOwnerPropertyPayoutBankAssignmentsAction,
} from "@/actions/ownerBankAccountActions";
import type {
  BankAccountSummary,
  OwnerPropertySummary,
} from "@/actions/ownerBankAccountActions";
import { getOwnerRouteRecipientOptionsAction } from "@/actions/ownerRouteRecipientActions";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";
import ManualTransactionEditor from "./ManualTransactionEditor";
import OwnerBankAccounts from "./OwnerBankAccounts";
import PropertyPayoutBankAssignments from "./PropertyPayoutBankAssignments";
import PropertyCollectionAccountConfiguration from "./PropertyCollectionAccountConfiguration";
import ReleaseOverrideCard from "./ReleaseOverrideCard";
import PayoutProcessingActions from "./PayoutProcessingActions";
import { getAdminPermissionState } from "@/utils/admin-only";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;

  let idString = "";
  if (id === undefined) {
    idString = "";
  } else if (typeof id === "string") {
    idString = id;
  } else {
    idString = id[0];
  }

  const walletPermission = await getAdminPermissionState(
    "WALLET_AND_SETTLEMENTS",
  );
  if (!walletPermission.canView) {
    throw new Error(
      "You do not have permission to access Wallet & Settlements.",
    );
  }

  const result = await getUser(idString);

  if (result.error || !result.data) {
    throw new Error(result.error || "Owner Not Found");
  }

  const owner = result.data;

  let balance;
  let transactions;
  let payouts;
  let pendingRelease;
  let bankAccounts: BankAccountSummary[] = [];
  let ownerProperties: OwnerPropertySummary[] = [];
  let routeRecipientOptions: {
    brands: Array<{ id: string; name: string }>;
    recipients: Array<{
      id: string;
      brandId: string;
      razorpayLinkedAccountId: string;
      status: string;
      bankAccountId: string | null;
      productId: string | null;
      razorpayAccountStatus: string | null;
      productActivationStatus: string | null;
      lastSyncedAt: string | null;
      lastError: string | null;
      requirements: Array<{
        fieldReference: string;
        status: string;
        reasonCode: string | null;
      }>;
      updatedAt: string;
    }>;
  } = { brands: [], recipients: [] };

  // Payouts are created only by the host's withdrawal request. The legacy
  // form below is intentionally disabled until it can be deleted with its
  // historical server action in a separate compatibility cleanup.
  async function recordOwnerPayoutFormAction() {
    "use server";
    throw new Error("Payouts must be initiated by the owner in Mago Host.");
  }

  try {
    balance = await getWalletBalance(idString);
    transactions = await getWalletTransactions(idString, { limit: 50 });
    payouts = await getOwnerPayouts(idString, { limit: 30 });
    pendingRelease = await getOwnerPendingReleaseSummary(idString);
    const bankAccountsRes = await getOwnerBankAccountsAction(idString);
    if (bankAccountsRes.data) bankAccounts = bankAccountsRes.data;
    const ownerPropertiesRes =
      await getOwnerPropertyPayoutBankAssignmentsAction(idString);
    if (ownerPropertiesRes.data) ownerProperties = ownerPropertiesRes.data;
    const routeRecipientsRes =
      await getOwnerRouteRecipientOptionsAction(idString);
    if (routeRecipientsRes.data)
      routeRecipientOptions = routeRecipientsRes.data;
  } catch (err) {
    console.log("Error fetching wallet data: ", err);
    throw new Error("Failed to fetch wallet data");
  }

  const safeNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const formatCurrency = (amount: unknown) => {
    const num = safeNumber(amount, 0);
    return `₹${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return formatAdminDateTimeLong(dateString);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Wallet - {owner.firstName} {owner.lastName}
            </h5>
          </div>

          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/users/owners">Owners</BreadcrumbItem>
            <BreadcrumbItem href={`/admin/users/owners/${idString}`}>
              {owner.firstName}
            </BreadcrumbItem>
            <BreadcrumbItem href="#">Wallet</BreadcrumbItem>
          </Breadcrumb>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Available to withdraw
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(balance?.currentBalance)}
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Frozen until release
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(balance?.pendingBalance)}
              </div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total Debits (ledger)
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(balance?.totalDebits)}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Unreleased (Pending Settlement)
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(pendingRelease?.pendingAmount)}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {safeNumber(pendingRelease?.pendingCount)} booking(s)
              </div>
            </div>
          </div>
        </div>
      </Card>

      <OwnerBankAccounts ownerId={idString} accounts={bankAccounts} />

      <Card className="w-full bg-white">
        <PropertyPayoutBankAssignments
          ownerId={idString}
          accounts={bankAccounts}
          properties={ownerProperties}
        />
      </Card>

      <Card className="w-full bg-white">
        <PropertyCollectionAccountConfiguration properties={ownerProperties} />
      </Card>

      <Card className="w-full bg-white">
        <h6 className="mb-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Razorpay Route recipient
        </h6>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          The host completes this from Mago Host using a saved bank account, PAN
          and business details. The host&apos;s Refresh Razorpay Status action
          updates this cached result; this page cannot manually activate
          payouts.
        </p>

        {routeRecipientOptions.recipients.length > 0 && (
          <div className="mb-5 overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Brand</TableHeadCell>
                  <TableHeadCell>Saved bank ID</TableHeadCell>
                  <TableHeadCell>Route account</TableHeadCell>
                  <TableHeadCell>Razorpay activation</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routeRecipientOptions.recipients.map((recipient) => {
                  const brand = routeRecipientOptions.brands.find(
                    (item) => item.id === recipient.brandId,
                  );
                  return (
                    <TableRow
                      key={recipient.id}
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <TableCell>{brand?.name ?? recipient.brandId}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {recipient.bankAccountId ?? "Not mapped"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {recipient.razorpayLinkedAccountId}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            color={
                              recipient.status === "ACTIVE"
                                ? "success"
                                : recipient.status === "SUSPENDED"
                                  ? "failure"
                                  : "warning"
                            }
                          >
                            {recipient.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {recipient.productActivationStatus ??
                              "No Route product submitted"}
                          </span>
                          {recipient.requirements.length > 0 && (
                            <span className="text-xs text-amber-700">
                              {recipient.requirements
                                .map(
                                  (item) =>
                                    item.fieldReference ||
                                    item.reasonCode ||
                                    "Clarification required",
                                )
                                .join(", ")}
                            </span>
                          )}
                          {recipient.lastError && (
                            <span className="text-xs text-red-700">
                              {recipient.lastError}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {routeRecipientOptions.recipients.length === 0 && (
          <p className="text-sm text-amber-700">
            No Route onboarding is submitted yet. The owner can add a bank
            account and complete this in Mago Host → Withdraw → Set up Razorpay
            Route.
          </p>
        )}

        {/* Manual mapping intentionally retired; host KYC is submitted directly to Razorpay Route. */}
        {/*
        {routeRecipientOptions.brands.length === 0 || bankAccounts.length === 0 ? (
          <p className="text-sm text-amber-700">
            Add a saved bank account and ensure this owner has a brand-mapped property before configuring Route.
          </p>
        ) : (
          <form action={saveRouteRecipientFormAction} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="routeBrand">Brand</Label>
              <select id="routeBrand" name="brandId" required className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900">
                {routeRecipientOptions.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="routeBank">Verified saved bank account</Label>
              <select id="routeBank" name="bankAccountId" required className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900">
                {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankAccountHolderName} · {account.bankName} · {account.bankAccountNumber.slice(-4)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="routeAccount">Razorpay linked account</Label>
              <TextInput id="routeAccount" name="razorpayLinkedAccountId" placeholder="acc_…" required />
            </div>
            <div>
              <Label htmlFor="routeStatus">Verification status</Label>
              <select id="routeStatus" name="status" defaultValue="PENDING" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900">
                <option value="PENDING">PENDING — do not allow Host withdrawal</option>
                <option value="ACTIVE">ACTIVE — KYC verified</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="routeNotes">Verification notes</Label>
              <Textarea id="routeNotes" name="notes" rows={2} placeholder="Razorpay KYC/product confirmation or ticket reference" />
            </div>
            <div>
              <Button type="submit" color="blue">Save Route recipient</Button>
            </div>
          </form>
        )}
        */}
      </Card>

      {walletPermission.canEdit ? (
        <>
          <Card className="w-full bg-white">
            <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Frozen earnings release override
            </h6>
            <ReleaseOverrideCard ownerId={idString} />
          </Card>

          <Card className="w-full bg-white">
            <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Manual Wallet Credit / Debit
            </h6>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Record a finance adjustment with a reason and optional supporting
              attachment.
            </p>
            <ManualTransactionEditor ownerId={idString} />
          </Card>
        </>
      ) : null}

      <Card className="hidden w-full bg-white" aria-hidden="true">
        <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Record payout
        </h6>
        <form
          action={recordOwnerPayoutFormAction}
          className="flex max-w-lg flex-col gap-4"
        >
          <input type="hidden" name="ownerId" value={idString} />
          <div>
            <Label htmlFor="legacyPayoutAmount">Amount (₹)</Label>
            <TextInput
              id="legacyPayoutAmount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <Label htmlFor="payoutDetail">Details (optional)</Label>
            <Textarea
              id="payoutDetail"
              name="payoutDetail"
              rows={3}
              placeholder="Reference, UTR, notes…"
            />
          </div>
          <Button type="submit" color="blue">
            Save payout
          </Button>
        </form>
      </Card>

      <Card className="w-full bg-white">
        <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Wallet ledger
        </h6>
        <div className="w-full overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Type</TableHeadCell>
                <TableHeadCell>Direction</TableHeadCell>
                <TableHeadCell>Amount</TableHeadCell>
                <TableHeadCell>Booking</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {(transactions ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      No ledger entries yet.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                (transactions ?? []).map(
                  (txn: {
                    id: string;
                    type: string;
                    direction: string;
                    amount: number;
                    bookingId: string | null;
                    createdAt: string;
                  }) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={txn.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{txn.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {txn.direction === "CREDIT" ? (
                            <HiArrowUp className="text-green-600" size={16} />
                          ) : (
                            <HiArrowDown className="text-red-600" size={16} />
                          )}
                          <span className="text-sm">{txn.direction}</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`font-semibold ${
                          txn.direction === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {txn.direction === "CREDIT" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {txn.bookingId ?? "—"}
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="w-full bg-white">
        <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Payouts
        </h6>
        <div className="w-full overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Amount</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Details</TableHeadCell>
                <TableHeadCell>Finance processing</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {(payouts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      No payouts recorded.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                (payouts ?? []).map(
                  (p: {
                    id: string;
                    amount: number;
                    status: string;
                    payoutDetail: string | null;
                    createdAt: string;
                  }) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={p.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge color="info">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-sm text-gray-600">
                        {p.payoutDetail || "—"}
                      </TableCell>
                      <TableCell>
                        <PayoutProcessingActions
                          ownerId={idString}
                          payoutId={p.id}
                          status={p.status}
                          canEdit={walletPermission.canEdit}
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
