"use client";

export interface BrandOption {
  id: string;
  name: string;
}

export type SectionChange = <T>(path: string, value: T | ((prev: T) => T)) => void;

