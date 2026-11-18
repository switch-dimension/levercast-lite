"use client";

type Props = {
  label: string;
  value: string;
  over: boolean;
  onChange: (value: string) => void;
};

/** Draft text that reads like the page until hovered or focused, and grows with its content. */
export function DraftTextarea({ label, value, over, onChange }: Props) {
  return (
    <textarea
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className={`-mx-2.5 block w-[calc(100%+20px)] resize-none rounded-sm border border-transparent px-2.5 py-2 font-serif text-[18px] leading-[1.65] [field-sizing:content] transition-colors hover:border-border focus-visible:border-accent-strong focus-visible:bg-surface focus-visible:shadow-[0_0_0_3px_var(--color-tertiary-tint)] focus-visible:outline-none ${
        over ? "bg-[#fbeeed]" : "bg-transparent"
      }`}
    />
  );
}
