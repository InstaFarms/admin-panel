"use client";

import { useState, useEffect } from "react";
import { HiPencil, HiTrash, HiOutlineExclamationCircle } from "react-icons/hi";
import toast from "react-hot-toast";

import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell, Dropdown, DropdownItem, Button, Badge, Modal } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import { getSupervisors, deleteSupervisor } from "@/actions/supervisorActions";

import Link from "next/link";

export default function SupervisorsTable() {
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadSupervisors();
    }, []);

    const loadSupervisors = async () => {
        setLoading(true);
        try {
            const res = await getSupervisors();
            if (res.success && res.data) {
                setSupervisors(res.data);
            } else {
                toast.error(res.message || "Failed to load supervisors");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        try {
            const res = await deleteSupervisor(deletingId);
            if (res.success) {
                toast.success("Supervisor deleted successfully");
                await loadSupervisors();
            } else {
                toast.error(res.message || "Failed to delete supervisor");
            }
        } catch (error) {
            toast.error("An error occurred while deleting");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeletingId(null);
        }
    };

    const filteredSupervisors = supervisors.filter((s) => {
        if (filterStatus === "ACTIVE") return s.isActive;
        if (filterStatus === "INACTIVE") return !s.isActive;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Dropdown label={`Status: ${filterStatus}`} inline>
                        <DropdownItem onClick={() => setFilterStatus("ACTIVE")}>Active</DropdownItem>
                        <DropdownItem onClick={() => setFilterStatus("INACTIVE")}>Inactive</DropdownItem>
                    </Dropdown>
                </div>
                <Link href="/admin/supervisors/create">
                    <Button>
                        Add Supervisor
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <JarvisLoader size="lg" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <Table hoverable>
                        <TableHead>
                          <TableRow>
                              <TableHeadCell>Name</TableHeadCell>
                              <TableHeadCell>Phone</TableHeadCell>
                              <TableHeadCell>Status</TableHeadCell>
                              <TableHeadCell>
                                  <span className="sr-only">Actions</span>
                              </TableHeadCell>
                          </TableRow>
                        </TableHead>
                        <TableBody className="divide-y">
                            {filteredSupervisors.length > 0 ? (
                                filteredSupervisors.map((supervisor) => (
                                    <TableRow key={supervisor.id} className="bg-white dark:bg-gray-800 dark:border-gray-700">
                                        <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">
                                            {supervisor.name}
                                            <div className="text-xs text-gray-500 font-normal">{supervisor.email}</div>
                                        </TableCell>
                                        <TableCell className="border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
                                            {supervisor.phone}
                                        </TableCell>
                                        <TableCell className="border-r border-gray-100 dark:border-gray-700">
                                            {supervisor.isActive ? (
                                                <Badge color="success" className="w-max">Active</Badge>
                                            ) : (
                                                <Badge color="failure" className="w-max">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Link href={`/admin/supervisors/${supervisor.id}`}>
                                                    <Button
                                                        size="sm"
                                                        color="light"
                                                    >
                                                        <HiPencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    color="failure"
                                                    onClick={() => handleDeleteClick(supervisor.id)}
                                                >
                                                    <HiTrash className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No supervisors found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}


            <Modal show={showDeleteModal} size="md" onClose={() => setShowDeleteModal(false)} popup>
                <div className="p-6 text-center">
                    <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
                    <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete this supervisor? This action cannot be undone.
                    </h3>
                    <div className="flex justify-center gap-4">
                        <Button color="failure" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Yes, I'm sure"}
                        </Button>
                        <Button color="gray" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                            No, cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
