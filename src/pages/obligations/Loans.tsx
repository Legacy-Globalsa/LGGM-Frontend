import { Landmark } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function Loans() {
  return (
    <ObligationPage
      kind="loan"
      icon={Landmark}
      description="Loans and payables — track monthly repayments and outstanding balances."
    />
  );
}
