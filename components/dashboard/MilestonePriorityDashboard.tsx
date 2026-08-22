"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, Select, Button, Dropdown, Checkbox, Label, TextInput } from "flowbite-react";
import { getMilestonePriority, getCitiesOptions } from "@/actions/dashboardActions";
import { getAllBrands } from "@/actions/brandActions";
import { MilestonePriorityTable, DEFAULT_COLUMN_ORDER } from "./MilestonePriorityTable";
import { formatCurrency } from "@/lib/dashboardUtils";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const UI_KEY = "milestone-priority-ui-v1";

export default function MilestonePriorityDashboard() {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [brandId, setBrandId] = useState("all");
  
  const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string}[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Table UI State
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);

  // Filter State
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [filterCityId, setFilterCityId] = useState("all");
  const [propertySearch, setPropertySearch] = useState("");

  useEffect(() => {
    getAllBrands(['id', 'name']).then(setBrands).catch(console.error);
    getCitiesOptions().then((opts) => {
      setCities(opts.map((o: any) => ({ id: o.id, name: o.city })));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(UI_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.sortKey) setSortKey(s.sortKey);
        if (s.sortDir) setSortDir(s.sortDir);
        if (Array.isArray(s.columnOrder) && s.columnOrder.length)
          setColumnOrder(s.columnOrder);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        UI_KEY,
        JSON.stringify({ sortKey, sortDir, columnOrder }),
      );
    } catch { /* ignore */ }
  }, [sortKey, sortDir, columnOrder]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getMilestonePriority(month, brandId);
        setData(res || []);
        
        // Clean up stale selections
        setSelectedPropertyIds(prev => {
          if (prev.length === 0) return prev;
          const currentIds = new Set((res || []).map((d: any) => d.id));
          return prev.filter(id => currentIds.has(id));
        });
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [month, brandId]);

  // Derived filter options
  const filterOptions = useMemo(() => {
    let opts = data.map(d => ({ id: d.id, label: d.property, cityId: d.cityId, city: d.city }));
    if (filterCityId !== "all") {
      opts = opts.filter(o => o.cityId === filterCityId);
    }
    if (propertySearch) {
      const lower = propertySearch.toLowerCase();
      opts = opts.filter(o => o.label.toLowerCase().includes(lower));
    }
    return opts;
  }, [data, filterCityId, propertySearch]);

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      return [...prev, id];
    });
  };

  const toggleAll = () => {
    if (selectedPropertyIds.length === filterOptions.length && filterOptions.length > 0) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(filterOptions.map(o => o.id));
    }
  };

  const visible = useMemo(() => {
    let filtered = data;
    if (filterCityId !== "all") {
      filtered = filtered.filter(d => d.cityId === filterCityId);
    }
    if (selectedPropertyIds.length > 0) {
      filtered = filtered.filter(d => selectedPropertyIds.includes(d.id));
    }
    return filtered;
  }, [data, filterCityId, selectedPropertyIds]);

  const stats = useMemo(() => {
    let pushableCount = 0;
    let reachableUplift = 0;
    
    visible.forEach(item => {
      if (item.flag === 'PUSH' || item.flag === 'STRETCH') {
        pushableCount++;
        reachableUplift += item.uplift;
      }
    });

    return {
      propertiesTracked: visible.length,
      pushableCount,
      reachableUplift
    };
  }, [visible]);

  const handleSort = (key: string) =>
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("desc");
      return key;
    });

  const handleMoveColumn = (key: string, dir: "left" | "right") =>
    setColumnOrder((order) => {
      const i = order.indexOf(key);
      const j = dir === "left" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= order.length) return order;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Milestone Priority</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sales intelligence tool for identifying commission uplift opportunities.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Month</label>
              <input 
                type="month" 
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-[150px] p-2.5"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Brand</label>
              <Select className="w-[150px]" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="all">All Brands</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">City</label>
              <Select className="w-[150px]" value={filterCityId} onChange={(e) => {
                setFilterCityId(e.target.value);
                setSelectedPropertyIds([]); // clear specific property selections on city change
              }}>
                <option value="all">All Cities</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Properties</label>
              <Dropdown 
                label={selectedPropertyIds.length > 0 ? `${selectedPropertyIds.length} Selected` : (filterCityId !== 'all' ? 'All in City' : 'All Properties')}
                color="light" 
                dismissOnClick={false}
              >
                <div className="p-3 bg-white w-64">
                  <TextInput 
                    placeholder="Search..." 
                    value={propertySearch} 
                    onChange={(e) => setPropertySearch(e.target.value)} 
                    sizing="sm"
                    className="mb-3"
                  />
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <Checkbox 
                      id="selectAll" 
                      checked={selectedPropertyIds.length === filterOptions.length && filterOptions.length > 0} 
                      onChange={toggleAll}
                    />
                    <Label htmlFor="selectAll" className="font-semibold cursor-pointer">Select All Visible</Label>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {filterOptions.map(opt => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={`prop-${opt.id}`} 
                          checked={selectedPropertyIds.includes(opt.id)}
                          onChange={() => toggleProperty(opt.id)}
                        />
                        <Label htmlFor={`prop-${opt.id}`} className="truncate w-full cursor-pointer" title={opt.label}>{opt.label}</Label>
                      </div>
                    ))}
                    {filterOptions.length === 0 && (
                      <div className="text-xs text-gray-500">No properties found.</div>
                    )}
                  </div>
                </div>
              </Dropdown>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Properties Tracked</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={stats.propertiesTracked} />
          </h3>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pushable Now (Push/Stretch)</p>
          <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            <AnimatedNumber value={stats.pushableCount} />
          </h3>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Reachable Uplift</p>
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
            +<AnimatedNumber value={stats.reachableUplift} format={formatCurrency} />
          </h3>
        </Card>
      </div>

      <Card className="overflow-hidden milestone-priority-card dark:border-gray-700/40">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ranked Properties</h3>
        </div>
        
        {loading ? (
          <div className="p-4"><SkeletonTable rows={8} cols={columnOrder.length} /></div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Failed to load milestone priority data.</div>
        ) : (
          <MilestonePriorityTable 
            data={visible} 
            columnOrder={columnOrder}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onMoveColumn={handleMoveColumn}
          />
        )}
      </Card>
    </div>
  );
}
