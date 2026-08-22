"use client";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import DeletedPropertiesDrawer from "@/components/properties/DeletedPropertiesDrawer";
import CreatePropertyDrawer from "@/components/properties/create-wizard/CreatePropertyDrawer";
import Searchbar from "@/components/Searchbar";
import { ArchiveRestore, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { PropertiesListItem } from "@/lib/propertiesListUtils";
import styles from "./PropertiesListPage.module.css";

interface BrandOption { id: string; name: string; }
interface PropertyTypeOption { id: string; name: string; }

interface PropertiesPageHeaderProps {
  breadcrumbs: ReadonlyArray<{ href: string; label: string }>;
  searchKeys: readonly string[];
  defaultSearchKey: string;
  deletedProperties: PropertiesListItem[];
  deletedEmptyMessage: string;
  brands: BrandOption[];
  propertyTypes: PropertyTypeOption[];
}

export default function PropertiesPageHeader({
  breadcrumbs,
  searchKeys,
  defaultSearchKey,
  deletedProperties,
  deletedEmptyMessage,
  brands,
  propertyTypes,
}: PropertiesPageHeaderProps) {
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <div>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Properties</h1>
            <div className={styles.breadcrumbs}>
              <PageBreadcrumb
                items={[...breadcrumbs]}
                className="w-full shrink-0 sm:w-auto"
              />
            </div>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Searchbar
              searchKeys={[...searchKeys]}
              defaultSearchKey={defaultSearchKey}
            />
          </div>
          <button
            type="button"
            onClick={() => setDeletedOpen(true)}
            className={styles.secondaryButton}
          >
            <ArchiveRestore size={16} />
            Deleted Properties
            <span className={styles.counter}>{deletedProperties.length}</span>
          </button>
          <div className={styles.addGroup}>
            <Link href="/admin/properties/create" className={styles.addGroupLeft}>
              <ClipboardList size={14} />
              Create with Details
            </Link>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className={styles.addGroupRight}
            >
              <Plus size={15} />
              Quick Create
            </button>
          </div>
        </div>
      </div>
      <DeletedPropertiesDrawer
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        data={deletedProperties}
        emptyMessage={deletedEmptyMessage}
      />
      <CreatePropertyDrawer
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        brands={brands}
        propertyTypes={propertyTypes}
      />
    </>
  );
}

