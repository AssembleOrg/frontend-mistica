'use client';

import { ClientLabel } from '@/services/client-labels.service';

interface ClientLabelChipsProps {
  labelIds: string[];
  allLabels: ClientLabel[];
  maxVisible?: number;
}

export function ClientLabelChips({ labelIds, allLabels, maxVisible = 2 }: ClientLabelChipsProps) {
  const resolved = labelIds
    .map((id) => allLabels.find((l) => l.id === id))
    .filter((l): l is ClientLabel => l !== undefined);

  if (resolved.length === 0) {
    return <span className='text-[11px] text-[#455a54]/30'>—</span>;
  }

  const visible = resolved.slice(0, maxVisible);
  const overflow = resolved.length - maxVisible;

  return (
    <div className='flex flex-wrap items-center gap-1'>
      {visible.map((label) => (
        <span
          key={label.id}
          className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-winter-solid'
          style={{
            backgroundColor: label.color ? `${label.color}22` : '#455a5422',
            color: label.color ?? '#455a54',
          }}
          title={label.name}
        >
          <span
            className='w-1.5 h-1.5 rounded-full flex-shrink-0'
            style={{ backgroundColor: label.color ?? '#455a54' }}
          />
          <span className='max-w-[80px] truncate'>{label.name}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className='inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-winter-solid bg-[#455a54]/10 text-[#455a54]/60'>
          +{overflow}
        </span>
      )}
    </div>
  );
}
