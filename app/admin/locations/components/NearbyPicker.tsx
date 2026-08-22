"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { LocationOption } from "@/types/locations";
import styles from "../states/create/CreateStateWizard.module.css";

const VISIBLE = 6;

export function NearbyPicker({
  options,
  selected,
  onChange,
  currentSlug,
}: {
  options: LocationOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  currentSlug?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const filtered = currentSlug ? options.filter((o) => o.slug !== currentSlug) : options;

  // selected items bubble to top so they're always visible when collapsed
  const sorted = [
    ...filtered.filter((o) => selected.includes(o.id)),
    ...filtered.filter((o) => !selected.includes(o.id)),
  ];

  const showAll = expanded || sorted.length <= VISIBLE;
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE);
  const hiddenCount = sorted.length - VISIBLE;

  return (
    <div>
      <div className={styles.nearbyGrid}>
        {visible.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.brandPick} ${isSelected ? styles.brandSelected : ""}`}
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id]
                )
              }
            >
              <span
                className={`${styles.avatar} ${styles.avatarSm}`}
                style={{ background: "var(--field)", color: "var(--ink-2)" }}
              >
                {option.locationTag || option.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className={styles.brandName}>{option.name}</div>
                <div className={styles.brandMeta}>/{option.slug}</div>
              </div>
              <span className={styles.brandCheck}>
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && !expanded ? (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonGhost}`}
          style={{ marginTop: 12, height: 34 }}
          onClick={() => setExpanded(true)}
        >
          <ChevronDown size={15} />
          Show {hiddenCount} more
        </button>
      ) : sorted.length > VISIBLE ? (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonGhost}`}
          style={{ marginTop: 12, height: 34 }}
          onClick={() => setExpanded(false)}
        >
          <ChevronUp size={15} />
          Show less
        </button>
      ) : null}
    </div>
  );
}
