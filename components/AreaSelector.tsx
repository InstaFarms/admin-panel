"use client";

import { useEffect, useState } from "react";
import LabelWrapper from "@/components/LabelWrapper";
import LocationSearchSelect from "@/components/LocationSearchSelect";
import type { LocationOption } from "@/components/LocationSearchSelect";

interface AreaSelectorProps {
  stateId?: string;
  stateName?: string;
  cityId?: string;
  cityName?: string;
  areaId?: string;
  areaName?: string;
  onStateChange?: (id: string, name: string) => void;
  onCityChange?: (id: string, name: string) => void;
  onAreaChange?: (id: string, name: string) => void;
}

export default function AreaSelector(props: AreaSelectorProps) {
  const [stateVal, setStateVal] = useState<LocationOption | null>(
    props.stateId ? { value: props.stateId, label: props.stateName || props.stateId } : null
  );
  const [cityVal, setCityVal] = useState<LocationOption | null>(
    props.cityId ? { value: props.cityId, label: props.cityName || props.cityId } : null
  );
  const [areaVal, setAreaVal] = useState<LocationOption | null>(
    props.areaId ? { value: props.areaId, label: props.areaName || props.areaId } : null
  );

  useEffect(() => {
    setStateVal(props.stateId ? { value: props.stateId, label: props.stateName || props.stateId } : null);
  }, [props.stateId, props.stateName]);

  useEffect(() => {
    setCityVal(props.cityId ? { value: props.cityId, label: props.cityName || props.cityId } : null);
  }, [props.cityId, props.cityName]);

  useEffect(() => {
    setAreaVal(props.areaId ? { value: props.areaId, label: props.areaName || props.areaId } : null);
  }, [props.areaId, props.areaName]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <LabelWrapper label="State">
        <LocationSearchSelect
          inputId="stateId"
          types={["state"]}
          placeholder="Search state..."
          value={stateVal}
          onChange={(opt) => {
            setStateVal(opt);
            props.onStateChange?.(opt?.value ?? "", opt?.label ?? "");
          }}
        />
      </LabelWrapper>

      <LabelWrapper label="City">
        <LocationSearchSelect
          inputId="cityId"
          types={["city"]}
          placeholder="Search city..."
          value={cityVal}
          onChange={(opt) => {
            setCityVal(opt);
            props.onCityChange?.(opt?.value ?? "", opt?.label ?? "");
          }}
        />
      </LabelWrapper>

      <LabelWrapper label="Area">
        <LocationSearchSelect
          inputId="areaId"
          types={["area"]}
          placeholder="Search area..."
          value={areaVal}
          onChange={(opt) => {
            setAreaVal(opt);
            props.onAreaChange?.(opt?.value ?? "", opt?.label ?? "");
          }}
        />
      </LabelWrapper>
    </div>
  );
}
