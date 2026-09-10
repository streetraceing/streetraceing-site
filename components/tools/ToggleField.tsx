'use client';

type ToggleFieldProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function ToggleField({ checked, label, onChange }: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="size-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}
