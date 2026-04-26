import { Receipt } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function Bills() {
  return (
    <ObligationPage
      kind="fixed_bill"
      icon={Receipt}
      description="Recurring monthly bills (rent, subscriptions, utilities)."
    />
  );
}
