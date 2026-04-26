import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from './RequireAuth';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Budget from '@/pages/Budget';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Tithes from '@/pages/obligations/Tithes';
import Offering from '@/pages/obligations/Offering';
import FirstFruit from '@/pages/obligations/FirstFruit';
import Savings from '@/pages/obligations/Savings';
import Bills from '@/pages/obligations/Bills';
import Loans from '@/pages/obligations/Loans';
import OtherObligations from '@/pages/obligations/Other';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'budget', element: <Budget /> },

      // Obligations group
      { path: 'obligations', element: <Navigate to="/obligations/tithes" replace /> },
      { path: 'obligations/tithes',      element: <Tithes /> },
      { path: 'obligations/offering',    element: <Offering /> },
      { path: 'obligations/first-fruit', element: <FirstFruit /> },
      { path: 'obligations/savings',     element: <Savings /> },
      { path: 'obligations/bills',       element: <Bills /> },
      { path: 'obligations/loans',       element: <Loans /> },
      { path: 'obligations/other',       element: <OtherObligations /> },

      // Backwards-compatible redirects from the old top-level routes
      { path: 'bills', element: <Navigate to="/obligations/bills" replace /> },
      { path: 'loans', element: <Navigate to="/obligations/loans" replace /> },

      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
