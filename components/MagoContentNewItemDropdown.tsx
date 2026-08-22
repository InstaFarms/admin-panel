"use client";

import { Button, Dropdown, DropdownItem } from "flowbite-react";
import Link from "next/link";
import { HiChevronDown } from "react-icons/hi";

const HUB = "/admin/mago/mago-settings";

export default function MagoContentNewItemDropdown() {
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
      <DropdownItem as={Link} href={`${HUB}/cms/create`}>
        CMS Content
      </DropdownItem>
      <DropdownItem as={Link} href={`${HUB}/carousel/create?type=WEB`}>
        Web Carousel Item
      </DropdownItem>
      <DropdownItem as={Link} href={`${HUB}/carousel/create?type=APP`}>
        App Carousel Item
      </DropdownItem>
      <DropdownItem as={Link} href={`${HUB}/tags/create`}>
        Tag
      </DropdownItem>
    </Dropdown>
  );
}
