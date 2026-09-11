"use client";

import React from "react";
import { Label } from "flowbite-react";

interface LabelWrapperProps {
  label: string;
  required?: boolean;
  /** Set when the control already has an id you want the label pointed at. */
  htmlFor?: string;
  children: React.ReactNode;
}

/**
 * Label above a form control.
 *
 * The label used to have no `htmlFor` while the control sat OUTSIDE it as a
 * sibling, so nothing connected the two: across 112 uses, every one of those
 * fields was announced by a screen reader as an unlabelled text box, and
 * getByLabelText could not find any of them either. Flowbite's TextInput and
 * Select forward `id`, so this mints one and points the label at it — unless
 * the control already carries an id, in which case that one is used and
 * nothing is overridden.
 */
export default function LabelWrapper({
  label,
  required,
  htmlFor,
  children,
}: LabelWrapperProps) {
  const generatedId = React.useId();

  // Only a single element child can be given an id; anything else (a fragment,
  // several controls, plain text) is left exactly as it was.
  const onlyChild = React.isValidElement(children) ? children : null;
  const childId = (onlyChild?.props as { id?: string } | undefined)?.id;
  const controlId = htmlFor ?? childId ?? (onlyChild ? generatedId : undefined);

  const labelledChildren =
    onlyChild && !childId && !htmlFor
      ? React.cloneElement(onlyChild as React.ReactElement<{ id?: string }>, {
          id: controlId,
        })
      : children;

  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor={controlId}>
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          )}
        </Label>
      </div>
      {labelledChildren}
    </div>
  );
}
