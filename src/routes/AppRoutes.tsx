import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppRoot } from '@/components/portal/AppRoot';
import { LegacyHomesRedirect } from '@/components/routing/LegacyHomesRedirect';
import * as P from './lazyPages';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<AppRoot />} />
    <Route path="/login" element={<Navigate to="/" replace />} />

    <Route path="/forgot-password" element={<P.ForgotPassword />} />
    <Route path="/reset-password" element={<P.ResetPassword />} />
    <Route path="/unauthorized" element={<P.Unauthorized />} />

    <Route path="/notifications" element={<ProtectedRoute><P.Notifications /></ProtectedRoute>} />

    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="/donations" element={<Navigate to="/" replace />} />
    <Route path="/sponsor" element={<Navigate to="/" replace />} />
    <Route path="/register" element={<Navigate to="/" replace />} />
    <Route path="/projects" element={<P.Homes />} />
    <Route path="/projects/:homeId" element={<ProtectedRoute><P.HomeDetail /></ProtectedRoute>} />
    <Route path="/homes" element={<LegacyHomesRedirect />} />
    <Route path="/homes/*" element={<LegacyHomesRedirect />} />

    <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/projects" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.Homes /></ProtectedRoute>} />
    <Route path="/admin/projects" element={<LegacyHomesRedirect />} />
    <Route path="/admin/projects/*" element={<LegacyHomesRedirect />} />
    <Route path="/admin/needs" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}><P.NeedsList /></ProtectedRoute>} />
    <Route path="/admin/needs/new" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}><P.NeedForm /></ProtectedRoute>} />
    <Route path="/admin/needs/:needId/edit" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}><P.NeedForm /></ProtectedRoute>} />
    <Route path="/admin/needs/:needId" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}><P.NeedDetail /></ProtectedRoute>} />
    <Route path="/admin/tasks" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.TasksList /></ProtectedRoute>} />
    <Route path="/admin/tasks/new" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.TaskForm /></ProtectedRoute>} />
    <Route path="/admin/tasks/:taskId/edit" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.TaskForm /></ProtectedRoute>} />

    <Route path="/tasks" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden', 'employee']}><P.MyTasks /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.Reports /></ProtectedRoute>} />
    <Route path="/corpus-fund" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.CorpusFund /></ProtectedRoute>} />
    <Route path="/kind-donations" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}><P.KindDonations /></ProtectedRoute>} />
    <Route path="/finance" element={<ProtectedRoute allowedRoles={['finance', 'super_admin', 'admin']}><P.FinanceDashboard /></ProtectedRoute>} />

    <Route path="/warden" element={<ProtectedRoute allowedRoles={['warden']}><P.WardenDashboard /></ProtectedRoute>} />
    <Route path="/warden/food" element={<ProtectedRoute allowedRoles={['warden']}><P.WardenFoodSponsorships /></ProtectedRoute>} />
    <Route path="/warden/donations" element={<ProtectedRoute allowedRoles={['warden']}><P.WardenActiveDonations /></ProtectedRoute>} />
    <Route path="/warden/updates" element={<ProtectedRoute allowedRoles={['warden']}><P.WardenHomeUpdates /></ProtectedRoute>} />
    <Route path="/warden/tasks" element={<ProtectedRoute allowedRoles={['warden']}><P.WardenTaskBar /></ProtectedRoute>} />
    <Route path="/warden/project" element={<ProtectedRoute allowedRoles={['warden']}><P.HomeProfile /></ProtectedRoute>} />
    <Route path="/warden/residents" element={<Navigate to="/warden/updates?tab=residents" replace />} />
    <Route path="/warden/needs" element={<ProtectedRoute allowedRoles={['warden']}><P.NeedsList /></ProtectedRoute>} />
    <Route path="/warden/needs/new" element={<ProtectedRoute allowedRoles={['warden']}><P.NeedForm /></ProtectedRoute>} />
    <Route path="/warden/needs/:needId/edit" element={<ProtectedRoute allowedRoles={['warden']}><P.NeedForm /></ProtectedRoute>} />
    <Route path="/warden/needs/:needId" element={<ProtectedRoute allowedRoles={['warden']}><P.NeedDetail /></ProtectedRoute>} />

    <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><P.SuperAdminDashboard /></ProtectedRoute>} />
    <Route path="/super-admin/projects" element={<ProtectedRoute allowedRoles={['super_admin']}><P.HomesList /></ProtectedRoute>} />
    <Route path="/super-admin/projects/new" element={<ProtectedRoute allowedRoles={['super_admin']}><P.HomeForm /></ProtectedRoute>} />
    <Route path="/super-admin/projects/:homeId" element={<ProtectedRoute allowedRoles={['super_admin']}><P.AdminHomeProfile /></ProtectedRoute>} />
    <Route path="/super-admin/projects/:homeId/edit" element={<ProtectedRoute allowedRoles={['super_admin']}><P.HomeForm /></ProtectedRoute>} />
    <Route path="/super-admin/projects" element={<LegacyHomesRedirect />} />
    <Route path="/super-admin/projects/*" element={<LegacyHomesRedirect />} />
    <Route path="/super-admin/donors" element={<ProtectedRoute allowedRoles={['super_admin']}><P.DonorsList /></ProtectedRoute>} />
    <Route path="/super-admin/donors/new" element={<ProtectedRoute allowedRoles={['super_admin']}><P.DonorForm /></ProtectedRoute>} />
    <Route path="/super-admin/donors/:donorId" element={<ProtectedRoute allowedRoles={['super_admin']}><P.DonorPreview /></ProtectedRoute>} />
    <Route path="/super-admin/donors/:donorId/edit" element={<ProtectedRoute allowedRoles={['super_admin']}><P.DonorForm /></ProtectedRoute>} />
    <Route path="/super-admin/task-dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><P.TaskDashboard /></ProtectedRoute>} />
    <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><P.Settings /></ProtectedRoute>} />
    <Route path="/super-admin/staff" element={<ProtectedRoute allowedRoles={['super_admin']}><P.StaffList /></ProtectedRoute>} />
    <Route path="/super-admin/staff/new" element={<ProtectedRoute allowedRoles={['super_admin']}><P.StaffForm /></ProtectedRoute>} />
    <Route path="/super-admin/staff/:staffId/edit" element={<ProtectedRoute allowedRoles={['super_admin']}><P.StaffForm /></ProtectedRoute>} />
    <Route path="/super-admin/booking" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><P.BookingPlatform /></ProtectedRoute>} />
    <Route path="/super-admin/trusts" element={<ProtectedRoute allowedRoles={['super_admin']}><P.TrustsList /></ProtectedRoute>} />
    <Route path="/super-admin/trusts/new" element={<ProtectedRoute allowedRoles={['super_admin']}><P.TrustForm /></ProtectedRoute>} />

    <Route path="*" element={<P.NotFound />} />
  </Routes>
);
