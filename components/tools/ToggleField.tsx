'use client';

import { Switch } from '@heroui/react';

type ToggleFieldProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function ToggleField({ checked, label, onChange }: ToggleFieldProps) {
  return (
    <Switch size="sm" isSelected={checked} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {label}
      </Switch.Content>
    </Switch>
  );
}
