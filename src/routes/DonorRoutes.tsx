import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DonorRoot } from '@/components/portal/DonorRoot';
import * as P from './lazyPages';

const portalTab = (tab: string) => <Navigate to={`/?tab=${tab}`} replace />;

export const DonorRoutes = () => (
  <Routes>
    <Route path="/" element={<DonorRoot />} />
    <Route path="/login" element={<Navigate to="/" replace />} />

    <Route path="/forgot-password" element={<P.ForgotPassword />} />
    <Route path="/reset-password" element={<P.ResetPassword />} />
    <Route path="/register" element={<P.Register />} />
    <Route path="/sponsor" element={portalTab('sponsor')} />
    <Route path="/sponsor/:needId" element={<P.SponsorDetail />} />
    <Route path="/projects/:homeId" element={<P.HomeDetail />} />
    <Route path="/food-calendar" element={portalTab('food')} />
    <Route path="/pay" element={<P.Pay />} />
    <Route path="/unauthorized" element={<P.Unauthorized />} />

    <Route path="/notifications" element={<ProtectedRoute><P.Notifications /></ProtectedRoute>} />
    <Route path="/dashboard" element={portalTab('account')} />
    <Route path="/donations" element={portalTab('donations')} />
    <Route path="/donations/:donationId" element={<ProtectedRoute allowedRoles={['donor']}><P.DonationDetail /></ProtectedRoute>} />
    <Route path="/profile" element={portalTab('account')} />

    <Route path="*" element={<P.NotFound />} />
  </Routes>
);
