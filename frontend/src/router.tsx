import { createBrowserRouter } from 'react-router-dom';
import { CustomerLanding } from './pages/CustomerLanding';
import { VoiceAssistant } from './pages/VoiceAssistant';
import { ConversationSummary } from './pages/ConversationSummary';
import { CRMLogin } from './pages/CRMLogin';
import { CRMDashboard } from './pages/CRMDashboard';
import { LeadDetails } from './pages/LeadDetails';
import { ProtectedRoute } from './components/ProtectedRoute';

import { QRGenerator } from './pages/QRGenerator';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CustomerLanding />,
  },
  {
    path: '/showroom/:showroomCode',
    element: <CustomerLanding />,
  },
  {
    path: '/qr-generator',
    element: <QRGenerator />,
  },
  {
    path: '/assistant',
    element: <VoiceAssistant />,
  },
  {
    path: '/summary/:sessionId?',
    element: <ConversationSummary />,
  },
  {
    path: '/crm/login',
    element: <CRMLogin />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/crm/dashboard',
        element: <CRMDashboard />,
      },
      {
        path: '/crm/leads/:leadId',
        element: <LeadDetails />,
      }
    ]
  },
  {
    path: '*',
    element: <CustomerLanding />,
  }
]);
