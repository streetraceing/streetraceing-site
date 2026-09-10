'use client';

import { Alert } from '@heroui/react';

type ErrorAlertProps = {
  title: string;
  message: string;
};

export function ErrorAlert({ title, message }: ErrorAlertProps) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
