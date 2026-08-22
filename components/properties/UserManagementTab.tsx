"use client";

import LabelWrapper from "@/components/LabelWrapper";
import { User } from "@/utils/types";
import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";

interface UserManagementTabProps {
  users: User[];
  userType: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: User[];
  searchUsers: (query: string) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
}

export default function UserManagementTab({
  users,
  userType,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchUsers,
  addUser,
  removeUser
}: UserManagementTabProps) {

  // console.log("UserManagementTab rendered with users:", users, "and searchResults:", searchResults);
  
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex flex-col gap-4">
        <LabelWrapper label={`Search and Add ${userType}`}>
          <div className="relative">
            <TextInput
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    onClick={() => addUser(user)}
                  >
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </LabelWrapper>
      </div>

      <div className="rounded-xl overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Name</TableHeadCell>
              <TableHeadCell>Email</TableHeadCell>
              <TableHeadCell>Phone</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} >
                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                <TableCell >{user.email}</TableCell>
                <TableCell >{user.mobileNumber}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    color="red"
                    onClick={() => removeUser(user.id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No {userType.toLowerCase()} added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

