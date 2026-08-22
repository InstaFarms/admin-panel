"use client";

/**
 * Catalog tab — the open vocabularies: asset types and space types.
 *
 * This is how a brand-new kind of thing ("cricket pitch") enters the system:
 * as CONFIGURATION, never a migration. Nothing here hard-codes a type list.
 *
 * The API is create-only for catalogs (no PATCH, no DELETE) and there is no DB
 * uniqueness on (organizationId, code), so a typo would be permanent — hence
 * no Edit/Delete buttons and a client-side duplicate guard.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import { HiOutlineCube, HiOutlineTemplate } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  createAssetType,
  createSpaceType,
  getAssetTypes,
  getSpaceTypes,
  type OpsAssetType,
  type OpsSpaceType,
} from "@/actions/opsConfigActions";
import { parseServerActionResult } from "@/utils/utils";

interface CatalogRow {
  id: string;
  code: string;
  name: string;
}

/** Codes are machine identifiers: uppercase, underscore-separated, trimmed. */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

// ---------------------------------------------------------------------------

function CatalogList({
  title,
  blurb,
  icon,
  idPrefix,
  rows,
  loading,
  creating,
  onCreate,
}: {
  title: string;
  blurb: string;
  icon: React.ReactNode;
  idPrefix: string;
  rows: CatalogRow[];
  loading: boolean;
  creating: boolean;
  onCreate: (values: { code: string; name: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const handleCreate = () => {
    const cleanCode = normalizeCode(code);
    const cleanName = name.trim();
    if (!cleanCode) {
      toast.error("A code is required");
      return;
    }
    if (!cleanName) {
      toast.error("A name is required");
      return;
    }
    // No DB uniqueness on (organizationId, code) and no delete endpoint —
    // a duplicate would be permanent, so block it before POSTing.
    if (rows.some((row) => row.code.toUpperCase() === cleanCode)) {
      toast.error(`"${cleanCode}" already exists in this catalog`);
      return;
    }
    onCreate({ code: cleanCode, name: cleanName });
    setCode("");
    setName("");
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          {icon}
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">{blurb}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`${idPrefix}-code`}>Code</Label>
          <TextInput
            id={`${idPrefix}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => setCode(normalizeCode(code))}
            placeholder="CRICKET_PITCH"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <TextInput
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cricket Pitch"
          />
        </div>
        <MyButton loading={creating} onClick={handleCreate}>
          Add
        </MyButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <JarvisLoader size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Nothing in this catalog yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Code</TableHeadCell>
                <TableHeadCell>Name</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell>
                    <Badge color="gray" className="inline-flex w-fit">
                      {row.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {row.name}
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

// ---------------------------------------------------------------------------

export default function CatalogSection({
  organizationId,
}: {
  organizationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [assetTypes, setAssetTypes] = useState<OpsAssetType[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<OpsSpaceType[]>([]);
  const [creatingAsset, startCreateAsset] = useTransition();
  const [creatingSpace, startCreateSpace] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assets, spaces] = await Promise.all([
        getAssetTypes(organizationId),
        getSpaceTypes(organizationId),
      ]);
      setAssetTypes(assets);
      setSpaceTypes(spaces);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load the catalogs",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildFormData = useCallback(
    (values: { code: string; name: string }) => {
      const formData = new FormData();
      formData.append("organizationId", organizationId);
      formData.append("code", values.code);
      formData.append("name", values.name);
      return formData;
    },
    [organizationId],
  );

  const handleCreateAssetType = useCallback(
    (values: { code: string; name: string }) => {
      startCreateAsset(() => {
        toast
          .promise(
            parseServerActionResult(createAssetType(buildFormData(values))),
            {
              loading: "Adding asset type...",
              success: (message) => message || "Asset type added",
              error: (error: Error) =>
                error.message || "Failed to add asset type",
            },
          )
          .then(() => load())
          .catch(() => undefined);
      });
    },
    [buildFormData, load],
  );

  const handleCreateSpaceType = useCallback(
    (values: { code: string; name: string }) => {
      startCreateSpace(() => {
        toast
          .promise(
            parseServerActionResult(createSpaceType(buildFormData(values))),
            {
              loading: "Adding space type...",
              success: (message) => message || "Space type added",
              error: (error: Error) =>
                error.message || "Failed to add space type",
            },
          )
          .then(() => load())
          .catch(() => undefined);
      });
    },
    [buildFormData, load],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        The catalog is <strong>configuration, not a migration</strong>. A new
        kind of thing — a cricket pitch, a gazebo, a second borewell — enters the
        system by adding a type here, then adding one row per real instance on
        the property under <strong>Spaces</strong> / <strong>Assets</strong>.
        <br />
        <br />
        Catalog types cannot be renamed or deleted through the API, so there are
        deliberately no Edit/Delete buttons here — get the code right the first
        time.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CatalogList
          title="Asset types"
          blurb="Things a property owns: POOL, METER, AC, CRICKET_PITCH…"
          icon={<HiOutlineCube className="h-5 w-5" />}
          idPrefix="asset-type"
          rows={assetTypes}
          loading={loading}
          creating={creatingAsset}
          onCreate={handleCreateAssetType}
        />
        <CatalogList
          title="Space types"
          blurb="Places work happens in: BEDROOM, KITCHEN, LAWN…"
          icon={<HiOutlineTemplate className="h-5 w-5" />}
          idPrefix="space-type"
          rows={spaceTypes}
          loading={loading}
          creating={creatingSpace}
          onCreate={handleCreateSpaceType}
        />
      </div>
    </div>
  );
}
