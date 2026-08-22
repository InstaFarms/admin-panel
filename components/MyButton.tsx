"use client";

import { ButtonProps, Button, Spinner } from "flowbite-react";

interface MyButtonProps extends ButtonProps {
  loading?: boolean;
}

export default function MyButton(props: MyButtonProps) {
  const { loading, ...buttonProps } = props;
  return (
    <Button {...buttonProps} disabled={buttonProps.disabled || loading}>
      {loading && <Spinner size="sm" className="me-3" light />}
      {props.children}
    </Button>
  );
}
