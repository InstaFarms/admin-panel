"use client";

import { TextInput } from "flowbite-react";
import { DateTime } from "luxon";
import React, { ChangeEvent, useEffect, useState } from "react";

interface TimeSelectorProps {
  timestamp: string | null;
  update: (timestamp: string | null) => void;
}

export default function TimeSelector(props: TimeSelectorProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  const parseIncomingTime = (timestamp: string): DateTime | null => {
    const directSql = DateTime.fromSQL(timestamp, { setZone: true });
    if (directSql.isValid) return directSql;

    const normalizedZoneSql = DateTime.fromSQL(
      timestamp.replace(/Asia\/Calcutta/gi, "Asia/Kolkata"),
      { setZone: true }
    );
    if (normalizedZoneSql.isValid) return normalizedZoneSql;

    const hhmm = DateTime.fromFormat(timestamp, "HH:mm");
    if (hhmm.isValid) return hhmm;

    const hhmmss = DateTime.fromFormat(timestamp, "HH:mm:ss");
    if (hhmmss.isValid) return hhmmss;

    const iso = DateTime.fromISO(timestamp, { setZone: true });
    if (iso.isValid) return iso;

    return null;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.target.value;
    if (text.length !== 5) {
      setTimeStr(text);
      props.update(null);
    } else {
      const split = text.split(":");
      if (split.length !== 2) {
        setTimeStr(text);
        props.update(null);
      } else {
        const [hourStr, minStr] = split;
        const hour = Number(hourStr);
        const minute = Number(minStr);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
          setTimeStr(text);
          props.update(null);
        } else {
          const time = DateTime.fromObject({ hour, minute });
          if (time.isValid) {
            // Persist as DB-safe SQL TIME string.
            props.update(time.toFormat("HH:mm:ss"));
            setTimeStr(time.toFormat("HH:mm"));
          } else {
            setTimeStr(text);
            props.update(null);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (props.timestamp) {
      const time = parseIncomingTime(props.timestamp);
      if (time && time.isValid) {
        setTimeStr(time.toFormat("HH:mm"));
      } else {
        // Do not mutate parent state during mount/rehydration.
        // Invalid incoming values should be shown as empty locally until user edits.
        setTimeStr("");
      }
    } else {
      setTimeStr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.timestamp]);

  return (
    <TextInput
      value={timeStr}
      onChange={handleChange}
      color="gray"
      placeholder="Optional (HH:MM)"
    />
  );
}
