import { HandCoins } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function Tithes() {
  return (
    <ObligationPage
      kind="tithes"
      icon={HandCoins}
      description="10% (default) of monthly income — planned vs given."
    />
  );
}
