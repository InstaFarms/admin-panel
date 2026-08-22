import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type BankAccount = {
  id: string;
  bankAccountHolderName: string;
  maskedAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch?: string;
};

/** Finance can reconcile a withdrawal destination, but the owner alone manages it in Mago Host. */
export default function OwnerBankAccounts({
  accounts,
}: {
  ownerId: string;
  accounts: BankAccount[];
}) {
  return (
    <Card className="w-full bg-white">
      <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
        Withdrawal bank accounts
      </h6>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
        Owner-managed in Mago Host. Account numbers are masked and cannot be
        edited from Jarvis Admin.
      </p>

      {accounts.length === 0 ? (
        <p className="text-sm text-amber-700">
          No withdrawal account is saved yet. The owner can add one in Mago
          Host.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHead>
              <TableHeadCell>Account holder</TableHeadCell>
              <TableHeadCell>Bank</TableHeadCell>
              <TableHeadCell>Account number</TableHeadCell>
              <TableHeadCell>IFSC</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.bankAccountHolderName}</TableCell>
                  <TableCell>
                    {account.bankName}
                    {account.bankBranch ? ` - ${account.bankBranch}` : ""}
                  </TableCell>
                  <TableCell className="font-mono">
                    {account.maskedAccountNumber}
                  </TableCell>
                  <TableCell className="font-mono">
                    {account.bankIfsc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
