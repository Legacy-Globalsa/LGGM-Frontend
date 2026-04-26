import { Sparkles } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function Offering() {
  return (
    <ObligationPage
      kind="offering"
      icon={Sparkles}
      description="Sunday and special offerings — actual amount may differ from the planned %."
    />
  );
}
