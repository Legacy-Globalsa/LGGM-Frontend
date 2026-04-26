import { Heart } from 'lucide-react';
import { ObligationPage } from '@/components/obligations/ObligationPage';

export default function FirstFruit() {
  return (
    <ObligationPage
      kind="first_fruit"
      icon={Heart}
      description="First fruits offering — planned vs given each month."
    />
  );
}
