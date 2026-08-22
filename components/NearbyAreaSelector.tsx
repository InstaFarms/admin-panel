"use client";

import { getAreas } from "@/actions/areaActions";
import { getCities } from "@/actions/cityActions";

import { Label } from "flowbite-react";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface State {
  id: string;
  state: string;
}

interface City {
  id: string;
  city: string;
  stateId?: string | null;
}

interface Area {
  id: string;
  area: string;
  cityId?: string | null;
}

interface NearbyAreaSelectorProps {
  label: string;
  name: string;
  states: State[];
  initialStateId?: string;
  initialCityId?: string;
  initialAreaId?: string;
}

export default function NearbyAreaSelector(props: NearbyAreaSelectorProps) {
  const [stateId, setStateId] = useState(props.initialStateId || "");
  const [cityId, setCityId] = useState(props.initialCityId || "");
  const [areaId, setAreaId] = useState(props.initialAreaId || "");

  const [cityData, setCityData] = useState<City[]>([]);
  const [areaData, setAreaData] = useState<Area[]>([]);

  const isInitialized = useRef(false);

  const fetchCities = async (stateId: string, skipClear?: boolean) => {
    if (!stateId) {
      setCityData([]);
      if (!skipClear) {
        setCityId("");
        setAreaId("");
      }
      return;
    }

    // Don't clear immediately to avoid flickering if we are initializing
    if (!skipClear) {
      setCityData([]);
      setAreaData([]);
      setCityId("");
      setAreaId("");
    }

    const res = await getCities(stateId);
    if (res.data) {
      setCityData(res.data.map(c => ({
        id: c.id,
        city: c.city,
        stateId: c.stateId
      })));

      if (skipClear && props.initialCityId) {
        setCityId(props.initialCityId);
      }
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const fetchAreas = async (cityId: string, skipClear?: boolean) => {
    if (!cityId) {
      setAreaData([]);
      if (!skipClear) {
        setAreaId("");
      }
      return;
    }

    if (!skipClear) {
      setAreaData([]);
      setAreaId("");
    }

    const res = await getAreas(cityId);
    if (res.data) {
      setAreaData(res.data.map(a => ({
        id: a.id,
        area: a.area,
        cityId: a.cityId
      })));

      if (skipClear && props.initialAreaId) {
        setAreaId(props.initialAreaId);
      }
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  // Initialize component - set initial values and fetch data
  useEffect(() => {
    // If we have at least partial initial values, initialize them
    if ((props.initialStateId || props.initialCityId || props.initialAreaId) && !isInitialized.current) {

      if (props.initialStateId) setStateId(props.initialStateId);
      if (props.initialCityId) setCityId(props.initialCityId);
      if (props.initialAreaId) setAreaId(props.initialAreaId);

      const initFlow = async () => {
        if (props.initialStateId) {
          await fetchCities(props.initialStateId, true);
          if (props.initialCityId) {
            await fetchAreas(props.initialCityId, true);
          }
        }
        isInitialized.current = true;
      };

      initFlow();

    } else {
      // If no initial values, mark as initialized immediately
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [props.initialStateId, props.initialCityId, props.initialAreaId]);

  // Handle state changes (after initialization)
  useEffect(() => {
    if (!isInitialized.current) return; // Wait for initialization

    if (stateId) {
      // Only fetch if it's a user change (not during init)
      // Logic: if cityId matches initialCityId, we assume it's still init phase? 
      // No, isInitialized handles that.

      // If state matches initial, and city matches initial, we shouldn't wipe city?
      // Actually fetchCities(stateId) clears cityId if skipClear is false.
      // But we call fetchCities(stateId) here without skipClear.
      // So if user changes state, it wipes city. Correct.
      // If code sets state (during init), this effect might fire?
      // No, because we set `isInitialized.current = true` AFTER async calls?
      // Wait. `setStateId` triggers re-render. `useEffect` runs.
      // If `isInitialized.current` is false, it returns.
      // We set `isInitialized.current = true` at END of initFlow.
      // So during initFlow, stateId changes, but effect returns.
      // Correct.

      // Wait, `isInitialized` is a Ref. Changing it doesn't trigger re-render.
      // So if we set it to true, the next render (or next effect run) will see it.

      fetchCities(stateId);
    } else {
      setCityData([]);
      setAreaData([]);
      setCityId("");
      setAreaId("");
    }
  }, [stateId]);

  // Handle city changes (after initialization)
  useEffect(() => {
    if (!isInitialized.current) return; // Wait for initialization

    if (cityId) {
      fetchAreas(cityId);
    } else {
      setAreaData([]);
      setAreaId("");
    }
  }, [cityId]);

  return (
    <div className="space-y-4">
      <div className="mb-2 block">
        <Label>{props.label}</Label>
      </div>

      {/* State */}
      <div>
        <Label htmlFor={`${props.name}_stateId`} className="text-sm">State</Label>
        <select
          id={`${props.name}_stateId`}
          className="w-full mt-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
        >
          <option value="">Select State</option>
          {props.states && Array.isArray(props.states) && props.states.length > 0 ? (
            props.states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.state}
              </option>
            ))
          ) : (
            <option value="" disabled>No states available ({props.states?.length || 0} states)</option>
          )}
        </select>
        {props.states && props.states.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{props.states.length} states available</p>
        )}
      </div>

      {/* City */}
      <div>
        <Label htmlFor={`${props.name}_cityId`} className="text-sm">City</Label>
        <select
          id={`${props.name}_cityId`}
          className="w-full mt-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-900 dark:disabled:bg-gray-700 dark:disabled:text-white"
          value={cityId}
          disabled={cityData.length === 0}
          onChange={(e) => setCityId(e.target.value)}
        >
          <option value="">Select City</option>
          {cityData.map((city) => (
            <option key={city.id} value={city.id}>
              {city.city}
            </option>
          ))}
        </select>
      </div>

      {/* Area */}
      <div>
        <Label htmlFor={props.name} className="text-sm">Area</Label>
        <select
          id={props.name}
          name={props.name}
          className="w-full mt-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-900 dark:disabled:bg-gray-700 dark:disabled:text-white"
          value={areaId}
          disabled={areaData.length === 0}
          onChange={(e) => setAreaId(e.target.value)}
        >
          <option value="">Select Area</option>
          {areaData.map((area) => (
            <option key={area.id} value={area.id}>
              {area.area}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

