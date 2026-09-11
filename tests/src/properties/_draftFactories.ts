/**
 * Draft factories for the property-editor tests.
 *
 * `createEmptyPropertyEditorDraft()` now returns the canonical PropertySource
 * casing (INSTAFARMS_EXCLUSIVE / MAGO / ELIVAAS). Several tests were written
 * against the earlier lowercase slugs and did `draft.instafarms.detail = ...`,
 * which after the rename assigned into `undefined` and threw at module load —
 * so those whole files reported "no tests" rather than a failure.
 *
 * Both casings are LIVE, deliberately: buildPropertyUpsertPayload carries an
 * explicit note that the existing-property edit flow (usePropertyBootstrap)
 * still builds drafts keyed by the legacy lowercase slugs, and that matching
 * against the wrong casing silently dropped every dirty path — so edits to
 * owners/managers/amenities/plans "succeeded" without saving. That makes the
 * lowercase shape worth keeping under test rather than migrating away from.
 */
import {
  createEmptyBrandTabBundle,
  createEmptyPropertyEditorDraft,
} from "@/lib/properties/propertyEditorDraft";

/** A draft keyed by the legacy lowercase slugs, as the edit flow still builds. */
export const createLegacyBrandDraft = () =>
  ({
    instafarms: createEmptyBrandTabBundle(),
    mago: createEmptyBrandTabBundle(),
    elivaas: createEmptyBrandTabBundle(),
  }) as unknown as ReturnType<typeof createEmptyPropertyEditorDraft>;

/** A draft keyed by the canonical PropertySource casing. */
export const createCanonicalBrandDraft = createEmptyPropertyEditorDraft;
