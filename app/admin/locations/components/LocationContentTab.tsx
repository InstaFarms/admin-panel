"use client";

import React, { useState } from "react";
import { Label, TextInput, Textarea } from "flowbite-react";
import { HiMinus, HiPlus } from "react-icons/hi";
import RichTextEditor from "@/components/RichTextEditor";
import LocationBrandTabWrapper from "./LocationBrandTabWrapper";

interface LocationContentTabProps {
  localIsEditMode: boolean;
  showBrandEditor: boolean;
  selectedBrandName: string;
  onAddBrand: () => void;
  addingBrand: boolean;
  locationName: string;
  pageTitle: string;
  setPageTitle: (value: string) => void;
  pageDescription: string;
  setPageDescription: (value: string) => void;
  mapSearchKey: string;
  setMapSearchKey: (value: string) => void;
  howToReachOpen: boolean;
  setHowToReachOpen: (value: boolean) => void;
  howToReachTitle: string;
  setHowToReachTitle: (value: string) => void;
  howToReachDescription: string;
  setHowToReachDescription: (value: string) => void;
  nearByPlaces: string[];
  addNearByPlace: () => void;
  removeNearByPlace: (index: number) => void;
  updateNearByPlace: (index: number, value: string) => void;
  nearByAttractions: string[];
  addNearByAttraction: () => void;
  removeNearByAttraction: (index: number) => void;
  updateNearByAttraction: (index: number, value: string) => void;
}

export default function LocationContentTab(props: LocationContentTabProps) {
  const [pageDescriptionView, setPageDescriptionView] = useState<"edit" | "preview">(
    "edit"
  );

  return (
    <LocationBrandTabWrapper
      localIsEditMode={props.localIsEditMode}
      showBrandEditor={props.showBrandEditor}
      selectedBrandName={props.selectedBrandName}
      onAddBrand={props.onAddBrand}
      addingBrand={props.addingBrand}
      locationName={props.locationName}
      lockNoticeTitle="Brand Content Locked"
    >
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="pageTitle">Page Title (H1)</Label>
          </div>
          <TextInput
            id="pageTitle"
            name="pageTitle"
            type="text"
            placeholder="Enter page title"
            value={props.pageTitle}
            onChange={(e) => props.setPageTitle(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="block">
              <Label htmlFor="pageDescription">Page Description</Label>
            </div>
            <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setPageDescriptionView("edit")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pageDescriptionView === "edit"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPageDescriptionView("preview")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pageDescriptionView === "preview"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          {pageDescriptionView === "edit" ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <RichTextEditor
                value={props.pageDescription}
                onBlur={(newContent) => props.setPageDescription(newContent)}
                onChange={(newContent) => props.setPageDescription(newContent)}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-white">
              {props.pageDescription.trim() ? (
                <div
                  className="cms-content-preview jodit-wysiwyg prose max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: props.pageDescription }}
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add content in the editor to see the rendered preview here.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="mapSearchKey">Map Search Key</Label>
          </div>
          <TextInput
            id="mapSearchKey"
            name="mapSearchKey"
            type="text"
            placeholder="e.g., Hyderabad, Telangana"
            value={props.mapSearchKey}
            onChange={(e) => props.setMapSearchKey(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h6 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              How to Reach
            </h6>
            <button
              type="button"
              onClick={() => props.setHowToReachOpen(!props.howToReachOpen)}
              className="text-xs text-blue-600 hover:underline"
            >
              {props.howToReachOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          <div className={props.howToReachOpen ? "flex flex-col gap-4" : "hidden"}>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="howToReachTitle">Section Title</Label>
              </div>
              <TextInput
                id="howToReachTitle"
                name="howToReachTitle"
                type="text"
                placeholder="How to reach"
                value={props.howToReachTitle}
                onChange={(e) => props.setHowToReachTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="howToReachDescription">Description</Label>
              </div>
              <Textarea
                id="howToReachDescription"
                name="howToReachDescription"
                placeholder="Explain how to reach this location..."
                rows={4}
                value={props.howToReachDescription}
                onChange={(e) => props.setHowToReachDescription(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Nearby Places</Label>
                <button
                  type="button"
                  onClick={props.addNearByPlace}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <HiPlus /> Add Place
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {props.nearByPlaces.map((place, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <TextInput
                      value={place}
                      onChange={(e) => props.updateNearByPlace(index, e.target.value)}
                      placeholder={`Place #${index + 1}`}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => props.removeNearByPlace(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <HiMinus />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <Label>Nearby Attractions / Things to do</Label>
            <button
              type="button"
              onClick={props.addNearByAttraction}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <HiPlus /> Add Attraction
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {props.nearByAttractions.map((attraction, index) => (
              <div key={index} className="flex items-center gap-2">
                <TextInput
                  value={attraction}
                  onChange={(e) => props.updateNearByAttraction(index, e.target.value)}
                  placeholder={`Attraction #${index + 1}`}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => props.removeNearByAttraction(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <HiMinus />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LocationBrandTabWrapper>
  );
}
