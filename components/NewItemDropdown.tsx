"use client";

import { Button, Dropdown, DropdownItem } from "flowbite-react";
import Link from "next/link";
import { HiChevronDown } from "react-icons/hi";

export default function NewItemDropdown() {
  return (
    <Dropdown
      label="New"
      dismissOnClick={false}
      renderTrigger={() => (
        <Button className="cursor-pointer">
          New <HiChevronDown className="ml-2 h-4 w-4" />
        </Button>
      )}
    >
      <DropdownItem as={Link} href="/admin/instafarm/instafarms-settings/cms/create">
        CMS Content
      </DropdownItem>
      <DropdownItem as={Link} href="/admin/instafarm/instafarms-settings/carousel/create?type=WEB">
        Web Carousel Item
      </DropdownItem>
      <DropdownItem as={Link} href="/admin/instafarm/instafarms-settings/carousel/create?type=APP">
        App Carousel Item
      </DropdownItem>
      <DropdownItem as={Link} href="/admin/instafarm/instafarms-settings/tags/create">
        Tag
      </DropdownItem>
    </Dropdown>
  );
}