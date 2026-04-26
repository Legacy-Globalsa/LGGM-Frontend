import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useYear } from '@/hooks/useYear';
import { cn } from '@/lib/utils';

interface YearFilterProps {
  className?: string;
  /** Visual size; "sm" for inline use in page headers. */
  size?: 'sm' | 'md';
}

export function YearFilter({ className, size = 'sm' }: YearFilterProps) {
  const { selectedYear, setSelectedYear, availableYears } = useYear();

  return (
    <Select
      value={String(selectedYear)}
      onValueChange={(v) => v && setSelectedYear(parseInt(v, 10))}
    >
      <SelectTrigger
        className={cn(
          size === 'sm' ? 'h-9 w-[130px] text-xs' : 'h-10 w-[160px]',
          className,
        )}
      >
        <Calendar className="mr-2 h-3.5 w-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableYears.length === 0 && (
          <SelectItem value={String(selectedYear)}>{selectedYear}</SelectItem>
        )}
        {availableYears.map((y) => (
          <SelectItem key={y.id} value={String(y.year)}>
            {y.year}
            {y.is_active ? ' • active' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
