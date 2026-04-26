import { MoreHorizontal } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function OtherObligations() {
  return (
    <ObligationPage
      kind="other"
      icon={MoreHorizontal}
      description="Miscellaneous obligations — family support, ministry funds, anything recurring."
    />
  );
}
