"use client";

import {
  BRAND_SLUGS,
  createEmptyPropertyEditorDraft,
  type PropertyEditorDraft,
} from "@/lib/properties/propertyEditorDraft";
import { useCallback, useEffect, useMemo, useReducer } from "react";

interface EditorState {
  serverSnapshot: PropertyEditorDraft | null;
  draft: PropertyEditorDraft;
}

type EditorAction =
  | { type: "INIT"; snapshot: PropertyEditorDraft | null }
  | { type: "PATCH_PATH"; path: string; value: unknown }
  | { type: "SET_SECTION"; section: string; value: unknown }
  | { type: "RESET" }
  | { type: "COMMIT" };

const createEmptyDraft = (): PropertyEditorDraft => createEmptyPropertyEditorDraft();

const INITIAL_STATE: EditorState = {
  serverSnapshot: null,
  draft: createEmptyDraft(),
};

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const cloneRecord = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const BRAND_SLUG_SET = new Set<string>(BRAND_SLUGS);

const setAtPath = <T extends object>(source: T, path: string, value: unknown): T => {
  if (!path.trim()) return source;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return source;

  const next = { ...source } as Record<string, unknown>;

  if (parts.length === 1 && value === undefined) {
    delete next[parts[0]!];
    return next as T;
  }

  let cursor: Record<string, unknown> = next;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index]!;
    const current = cursor[key];
    cursor[key] = isObjectLike(current) ? { ...current } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[parts[parts.length - 1]!] = value;
  return next as T;
};

const getAtPath = (source: unknown, path: string): unknown => {
  if (!source || !path.trim()) return undefined;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return undefined;

  let cursor: unknown = source;
  for (const key of parts) {
    if (!isObjectLike(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
    if (cursor === undefined) return undefined;
  }
  return cursor;
};

const areDeepEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (left == null || right == null) return left === right;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!areDeepEqual(left[index], right[index])) return false;
    }
    return true;
  }

  if (isObjectLike(left) && isObjectLike(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!areDeepEqual(left[key], right[key])) return false;
    }
    return true;
  }

  return false;
};

const collectDirtyPaths = (
  serverValue: unknown,
  draftValue: unknown,
  basePath = "",
): string[] => {
  if (areDeepEqual(serverValue, draftValue)) return [];

  if (!isObjectLike(serverValue) || !isObjectLike(draftValue)) {
    return basePath ? [basePath] : [];
  }

  const keys = Array.from(new Set([...Object.keys(serverValue), ...Object.keys(draftValue)]));
  const dirty: string[] = [];

  for (const key of keys) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    const childDirty = collectDirtyPaths(
      (serverValue as Record<string, unknown>)[key],
      (draftValue as Record<string, unknown>)[key],
      nextPath,
    );
    dirty.push(...childDirty);
  }

  return dirty;
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case "INIT": {
      const snapshot = action.snapshot ? cloneRecord(action.snapshot) : null;
      return {
        serverSnapshot: snapshot,
        draft: snapshot ? cloneRecord(snapshot) : createEmptyDraft(),
      };
    }
    case "PATCH_PATH":
      return {
        ...state,
        draft: setAtPath(state.draft, action.path, action.value),
      };
    case "SET_SECTION":
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.section]: action.value,
        } as PropertyEditorDraft,
      };
    case "RESET":
      return {
        ...state,
        draft: state.serverSnapshot ? cloneRecord(state.serverSnapshot) : createEmptyDraft(),
      };
    case "COMMIT":
      return {
        ...state,
        serverSnapshot: cloneRecord(state.draft),
      };
    default:
      return state;
  }
};

export function usePropertyEditorState(initialSnapshot: PropertyEditorDraft | null) {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);

  useEffect(() => {
    dispatch({
      type: "INIT",
      snapshot: initialSnapshot ?? null,
    });
  }, [initialSnapshot]);

  const patchAtPath = useCallback(
    <T,>(path: string, value: T | ((prev: T) => T)) => {
      if (typeof value === "function") {
        const current = getAtPath(state.draft, path) as T;
        const next = (value as (prev: T) => T)(current);
        dispatch({ type: "PATCH_PATH", path, value: next });
        return;
      }
      dispatch({ type: "PATCH_PATH", path, value });
    },
    [state.draft],
  );

  const setSection = useCallback((section: string, value: unknown) => {
    dispatch({ type: "SET_SECTION", section, value });
  }, []);

  const resetDraft = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const commitDraft = useCallback(() => {
    dispatch({ type: "COMMIT" });
  }, []);

  const dirtyPaths = useMemo(() => {
    if (!state.serverSnapshot) return [];
    return collectDirtyPaths(state.serverSnapshot, state.draft);
  }, [state.serverSnapshot, state.draft]);

  const dirtySections = useMemo(
    () =>
      Array.from(
        new Set(
          dirtyPaths
            .map((path) => {
              const parts = path.split(".").filter(Boolean);
              if (parts.length >= 2 && BRAND_SLUG_SET.has(parts[0] ?? "")) {
                return parts.slice(0, 2).join(".");
              }
              return parts[0] ?? "";
            })
            .filter(Boolean),
        ),
      ),
    [dirtyPaths],
  );

  return {
    draft: state.draft,
    serverSnapshot: state.serverSnapshot,
    dirtyPaths,
    dirtySections,
    isDirty: dirtyPaths.length > 0,
    patchAtPath,
    setSection,
    resetDraft,
    commitDraft,
  };
}

