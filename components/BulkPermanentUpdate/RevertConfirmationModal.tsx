"use client";

import { useMemo } from "react";
import { HiExclamation, HiExclamationCircle } from "react-icons/hi";

import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "flowbite-react";

interface RevertConfirmationModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    log: any | null;
    allLogs: any[];
    entities: any[];
    isRefreshing: boolean;
}

export default function RevertConfirmationModal({
    show,
    onClose,
    onConfirm,
    log,
    allLogs,
    entities,
    isRefreshing
}: RevertConfirmationModalProps) {

    // Property-wise dependency check: find newer applied logs that overlap on the same properties
    const dependencies = useMemo(() => {
        if (!log) return [];

        const logIndex = allLogs.findIndex(l => l.id === log.id);
        const logPropertyIds = new Set(Object.keys(log.previousValues || {}));
        const conflicts: { log: any; overlappingIds: string[] }[] = [];

        // Logs are sorted newest-first, so indices < logIndex are newer
        for (let i = 0; i < logIndex; i++) {
            const newerLog = allLogs[i];
            if (newerLog.status !== "applied") continue;

            const newerPropertyIds = Object.keys(newerLog.previousValues || {});
            const overlapping = newerPropertyIds.filter(id => logPropertyIds.has(id));

            if (overlapping.length > 0) {
                conflicts.push({ log: newerLog, overlappingIds: overlapping });
            }
        }

        return conflicts;
    }, [log, allLogs]);

    const hasDependencies = dependencies.length > 0;

    const getEntityName = (id: string) => {
        return entities.find(e => e.id === id)?.entityName || id;
    };

    if (!log) return null;

    return (
        <Modal show={show} onClose={onClose} size="lg">
            <ModalHeader>
                Confirm Price Revert
            </ModalHeader>
            <ModalBody>
                <div className="space-y-4">
                    {/* Dependency Warning — shown only when newer logs overlap */}
                    {hasDependencies && (
                        <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-800">
                            <HiExclamationCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 dark:text-red-200">
                                <p className="font-bold mb-1">Dependency Alert</p>
                                <p className="mb-2">This update cannot be reverted yet because some properties were modified by <strong>newer updates</strong>. Please revert the following dependencies first:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    {dependencies.map(dep => (
                                        <li key={dep.log.id}>
                                            Update on <strong>{new Date(dep.log.createdAt).toLocaleDateString()}</strong> — {dep.overlappingIds.length} overlapping {dep.overlappingIds.length === 1 ? 'property' : 'properties'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <HiExclamation className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-800 dark:text-orange-200">
                            <p className="font-bold mb-1">Warning: Prices will be restored</p>
                            <p>Prices will revert to their values <strong>before this update was applied</strong>.
                                If any changes (manual or bulk) were made <em>after</em> this update, they will also be overwritten for the affected properties and days.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                            <span className="text-sm font-medium">Affected Items:</span>
                            <Badge color="info" size="sm">{Object.keys(log.previousValues || {}).length} Properties</Badge>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Restoration Preview (Sample)</p>
                            <div className="border rounded-lg overflow-hidden border-gray-100 dark:border-gray-700">
                                <Table striped>
                                    <TableHead>
                                      <TableRow>
                                          <TableHeadCell className="text-[10px] py-1">Property</TableHeadCell>
                                          <TableHeadCell className="text-[10px] py-1 text-right">Restored Price</TableHeadCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(log.previousValues || {}).slice(0, 3).map(([id, values]: [string, any]) => {
                                            const restoredPrice = Object.values(values).find(v => v !== null && v !== undefined);
                                            return (
                                                <TableRow key={id}>
                                                    <TableCell className="text-xs py-1.5 font-medium truncate max-w-[150px]">
                                                        {getEntityName(id)}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-1.5 text-right font-mono">
                                                        ₹{typeof restoredPrice === 'number' ? restoredPrice.toLocaleString() : "0"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {Object.keys(log.previousValues || {}).length > 3 && (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center text-[10px] py-1 text-gray-400">
                                                    + {Object.keys(log.previousValues || {}).length - 3} more items...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <div className="flex justify-end gap-3 w-full">
                    <Button color="gray" onClick={onClose}>
                        Keep Current Prices
                    </Button>
                    <Button color="failure" onClick={onConfirm} disabled={isRefreshing || hasDependencies}>
                        {isRefreshing ? "Reverting..." : hasDependencies ? "Revert Dependencies First" : "Yes, Restore Previous Prices"}
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
}
