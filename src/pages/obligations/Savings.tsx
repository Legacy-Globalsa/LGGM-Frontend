import { PiggyBank } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function Savings() {
  return (
    <ObligationPage
      kind="savings"
      icon={PiggyBank}
      description="Planned savings vs amount actually transferred to a bank account. Only transferred entries roll up to the dashboard's savings KPI."
    />
  );
}
