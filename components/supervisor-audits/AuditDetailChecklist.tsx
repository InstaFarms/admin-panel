"use client";

import { HiCheckCircle, HiExclamationCircle, HiPhotograph } from "react-icons/hi";

import { Card, Badge, Accordion, AccordionPanel, AccordionTitle, AccordionContent } from "flowbite-react";

interface AuditDetailChecklistProps {
    passedItems: any[];
    failedItems: any[];
}

export default function AuditDetailChecklist({ passedItems, failedItems }: AuditDetailChecklistProps) {
    const totalItems = passedItems.length + failedItems.length;

    return (
        <Card className="w-full bg-white dark:bg-gray-800">
            <h6 className="text-md font-bold text-gray-900 dark:text-white mb-2">
                Audit Checklist ({totalItems} items)
            </h6>

            {/* Failed Items (Expanded) */}
            {failedItems.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                        <HiExclamationCircle className="h-4 w-4" />
                        Failed Items ({failedItems.length})
                    </p>
                    <Accordion>
                        {failedItems.map((item: any, idx: number) => (
                            <AccordionPanel key={item.id || idx}>
                                <AccordionTitle>
                                    <div className="flex items-center gap-2 w-full">
                                        <Badge color="failure" className="shrink-0 text-xs">FAIL</Badge>
                                        <span className="text-sm font-medium">{item.masterName}</span>
                                        <span className="text-xs text-gray-400">({item.areaName})</span>
                                        <Badge color="gray" className="text-xs ml-auto">{item.section}</Badge>
                                    </div>
                                </AccordionTitle>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-500">Status:</span>
                                            <Badge color="failure">{item.status}</Badge>
                                        </div>
                                        {item.notes && (
                                            <div className="text-sm">
                                                <span className="text-gray-500">Notes: </span>
                                                <span className="text-gray-800 dark:text-gray-200 italic">"{item.notes}"</span>
                                            </div>
                                        )}
                                        {item.media && item.media.length > 0 && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                    <HiPhotograph className="h-3 w-3" /> Media:
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {item.media.map((m: any, mIdx: number) => {
                                                        const url = typeof m === "string" ? m : m.url;
                                                        const type = typeof m === "string" ? "PHOTO" : m.type;
                                                        if (type === "VIDEO") {
                                                            return (
                                                                <button
                                                                    key={mIdx}
                                                                    className="relative h-20 w-20 rounded border border-gray-200 overflow-hidden group bg-black flex items-center justify-center"
                                                                    onClick={() => {
                                                                        const modal = document.createElement("div");
                                                                        modal.className = "fixed inset-0 z-50 bg-black/90 flex items-center justify-center";
                                                                        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                                                                        const video = document.createElement("video");
                                                                        video.src = url;
                                                                        video.controls = true;
                                                                        video.autoplay = true;
                                                                        video.className = "max-h-[90vh] max-w-[90vw] rounded-lg";
                                                                        const closeBtn = document.createElement("button");
                                                                        closeBtn.innerHTML = "✕";
                                                                        closeBtn.className = "absolute top-4 right-4 text-white text-2xl hover:opacity-70";
                                                                        closeBtn.onclick = () => modal.remove();
                                                                        modal.appendChild(video);
                                                                        modal.appendChild(closeBtn);
                                                                        document.body.appendChild(modal);
                                                                    }}
                                                                    title="Play video"
                                                                >
                                                                    <video src={url} className="h-20 w-20 object-cover" muted preload="metadata" />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                                                        <svg className="h-8 w-8 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                                                                            <path d="M8 5v14l11-7z" />
                                                                        </svg>
                                                                    </div>
                                                                </button>
                                                            );
                                                        }
                                                        return (
                                                            <a key={mIdx} href={url} target="_blank" rel="noopener noreferrer">
                                                                <img
                                                                    src={url}
                                                                    alt={`Issue photo ${mIdx + 1}`}
                                                                    className="h-20 w-20 object-cover rounded border border-gray-200 hover:opacity-80 transition"
                                                                />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionPanel>
                        ))}
                    </Accordion>
                </div>
            )}

            {/* Passed Items (Table/List) */}
            {passedItems.length > 0 && (
                <div className="mb-4 mt-4">
                    <p className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                        <HiCheckCircle className="h-4 w-4" />
                        Passed Items ({passedItems.length})
                    </p>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800 max-h-[400px] overflow-y-auto">
                        <ul className="list-disc pl-5 space-y-2">
                            {passedItems.map((item: any, idx: number) => (
                                <li key={item.id || idx} className="text-sm text-green-800 dark:text-green-300">
                                    <div className="inline-flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{item.masterName}</span>
                                        <span className="text-xs opacity-75">({item.areaName})</span>
                                        <Badge color="gray" className="text-[10px] w-fit py-0 px-1">{item.section}</Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Delta Tracking Table (Inventory & Supplies) */}
            {(() => {
                const trackingItems = [...failedItems, ...passedItems].filter((i: any) => i.section === "INVENTORY" || i.section === "SUPPLIES");
                if (trackingItems.length === 0) return null;

                return (
                    <div className="overflow-x-auto mt-6">
                        <p className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
                            </svg>
                            Quantity Tracking ({trackingItems.length})
                        </p>
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Item / Area</th>
                                    <th scope="col" className="px-6 py-3">Section</th>
                                    <th scope="col" className="px-6 py-3">Expected</th>
                                    <th scope="col" className="px-6 py-3">Current Audit</th>
                                    <th scope="col" className="px-6 py-3">Last Audit</th>
                                    <th scope="col" className="px-6 py-3">Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trackingItems.map((item: any, idx: number) => {
                                    let delta: number | null = null;
                                    if (typeof item.observedQuantity === 'number' && typeof item.lastAuditQuantity === 'number') {
                                        delta = item.observedQuantity - item.lastAuditQuantity;
                                    }

                                    return (
                                        <tr key={item.id || idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                <div className="flex flex-col">
                                                    <span>{item.masterName}</span>
                                                    <span className="text-xs text-gray-500">({item.areaName})</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge color="gray" className="w-fit">{item.section}</Badge>
                                            </td>
                                            <td className="px-6 py-4">{item.expectedQuantity ?? '-'}</td>
                                            <td className="px-6 py-4">{item.observedQuantity ?? '-'}</td>
                                            <td className="px-6 py-4">{item.lastAuditQuantity ?? '-'}</td>
                                            <td className="px-6 py-4">
                                                {delta !== null ? (
                                                    <span className={delta < 0 ? 'text-red-500 font-medium' : delta > 0 ? 'text-green-500 font-medium' : 'text-gray-500'}>
                                                        {delta > 0 ? `+${delta}` : delta}
                                                    </span>
                                                ) : 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })()}

            {totalItems === 0 && (
                <p className="text-center text-gray-400 py-8">No checklist items recorded for this audit.</p>
            )}
        </Card>
    );
}
