"use client";

import { getCustomerById, searchCustomer } from "@/actions/customerActions";
import { CUSTOMER_BRANDS, type CustomerBrandName } from "@/constants/customerBrands";
import { CustomerData } from "@/utils/types";
import { useDebouncedCallback } from "@/utils/debounce";
import { Card, Checkbox, Popover, Select, TextInput } from "flowbite-react";
import { MouseEvent, useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiSearch } from "react-icons/hi";
import { v4 } from "uuid";
import MyButton from "./MyButton";

const SEARCH_DEBOUNCE_MS = 400;

interface CustomerSelectorProps {
  customerId: string | null;
  update: (customerId: string | null) => void;
  readOnly?: boolean;
  brandName?: string;
}

export default function CustomerSelector({
  customerId,
  readOnly,
  update,
  brandName,
}: CustomerSelectorProps) {
  const [searchResults, setSearchResults] = useState<CustomerData[]>([]);
  const [loading, startTransition] = useTransition();
  const [uniqueId] = useState<string>(v4());
  const [searchKey, setSearchKey] = useState<string>("Name");
  const [searchValue, setSearchValue] = useState<string>("");
  const normalizedBrandName: CustomerBrandName | undefined =
    brandName === CUSTOMER_BRANDS.MAGO || brandName === CUSTOMER_BRANDS.INSTAFARMS
      ? brandName
      : undefined;

  const selectedCustomer = searchResults.find((x) => x.id === customerId);

  const runSearch = useCallback(
    (sk: string, sv: string) => {
      if (!sv.trim()) {
        setSearchResults([]);
        return;
      }
      const formData = new FormData();
      formData.set("searchKey", sk);
      formData.set("searchValue", sv);
      startTransition(() => {
        searchCustomer(formData, { brandName: normalizedBrandName })
          .then((res) => {
            if (res.data) {
              if (!res.data.find((x) => x.id === customerId)) {
                update(null);
              }
              setSearchResults(res.data);
            }
          })
          .catch(() => {
            toast.error("Search Failed.");
          });
      });
    },
    [customerId, update, normalizedBrandName]
  );

  const debouncedSearch = useDebouncedCallback(
    (sk: string, sv: string) => runSearch(sk, sv),
    SEARCH_DEBOUNCE_MS
  );

  const handleSearch = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    debouncedSearch.cancel();
    runSearch(searchKey, searchValue);
  };

  const handleSearchValueChange = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      debouncedSearch(searchKey, value);
    } else {
      debouncedSearch.cancel();
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (customerId) {
      getCustomerById(customerId, { brandName: normalizedBrandName }).then(({ data }) => {
        if (data) {
          setSearchResults((prev) => {
            if (prev.some((x) => x.id === customerId)) return prev;
            return [data, ...prev];
          });
        }
      });
    }
  }, [customerId, normalizedBrandName]);

  const customerName =
    selectedCustomer &&
    `${selectedCustomer.firstName} ${selectedCustomer.lastName ? selectedCustomer.lastName : ""}`;

  return (
    <Popover
      content={
        <Card className="m-0 min-w-xl text-black dark:text-white">
          {readOnly ? (
            <h4 className="font-bold">Customer Detail (Readonly)</h4>
          ) : (
            <div>
              <h4 className="mb-2 font-bold">
                Search Customers using Name, Email or Mobile
              </h4>
              <div className="flex flex-row items-center gap-2">
                <Select
                  id={`customer-searchKey-${uniqueId}`}
                  className="min-w-32"
                  value={searchKey}
                  onChange={(e) => {
                    setSearchKey(e.target.value);
                    if (searchValue.trim()) {
                      debouncedSearch.cancel();
                      runSearch(e.target.value, searchValue);
                    }
                  }}
                >
                  <option value="Name">Name</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Email">Email</option>
                </Select>
                <TextInput
                  type="text"
                  id={`customer-searchValue-${uniqueId}`}
                  className="w-full"
                  value={searchValue}
                  onChange={(e) => handleSearchValueChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <MyButton
                  onClick={(e) => handleSearch(e)}
                  loading={loading}
                  type="submit"
                  className="px-2"
                >
                  <HiSearch size={24} />
                </MyButton>
              </div>
            </div>
          )}
          <div>
            {loading ? (
              <div>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div>No customers found.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map((result) => (
                  <label key={result.id} className="flex items-center gap-4">
                    <Checkbox
                      checked={result.id === customerId}
                      onChange={() =>
                        !readOnly &&
                        update(customerId === result.id ? null : result.id)
                      }
                    />
                    <div className="flex w-full cursor-pointer flex-col">
                      <div className="font-bold">
                        {result.firstName} {result.lastName}
                      </div>
                      <div className="flex flex-row gap-3 text-sm">
                        <div>{result.mobileNumber}</div>
                        <div>{result.email}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>
      }
    >
      <TextInput
        value={customerId ? customerName || customerId : ""}
        placeholder="Select Customer"
        readOnly
      ></TextInput>
    </Popover>
  );
}
