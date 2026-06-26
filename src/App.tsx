import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Sponsor = lazy(() => import("./pages/Sponsor"));
const SponsorDetail = lazy(() => import("./pages/SponsorDetail"));
const Homes = lazy(() => import("./pages/Homes"));
const HomeDetail = lazy(() => import("./pages/HomeDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const WardenDashboard = lazy(() => import("./pages/WardenDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const Residents = lazy(() => import("./pages/warden/Residents"));
const NeedsList = lazy(() => import("./pages/admin/NeedsList"));
const NeedForm = lazy(() => import("./pages/admin/NeedForm"));
const NeedDetail = lazy(() => import("./pages/admin/NeedDetail"));
const TasksList = lazy(() => import("./pages/admin/TasksList"));
const TaskForm = lazy(() => import("./pages/admin/TaskForm"));
const HomesList = lazy(() => import("./pages/super-admin/HomesList"));
const HomeForm = lazy(() => import("./pages/super-admin/HomeForm"));
const DonorsList = lazy(() => import("./pages/super-admin/DonorsList"));
const DonorForm = lazy(() => import("./pages/super-admin/DonorForm"));
const DonorPreview = lazy(() => import("./pages/super-admin/DonorPreview"));
const TaskDashboard = lazy(() => import("./pages/super-admin/TaskDashboard"));
const Settings = lazy(() => import("./pages/super-admin/Settings"));
const StaffList = lazy(() => import("./pages/super-admin/StaffList"));
const StaffForm = lazy(() => import("./pages/super-admin/StaffForm"));
const BookingPlatform = lazy(() => import("./pages/super-admin/BookingPlatform"));
const Reports = lazy(() => import("./pages/Reports"));
const MyTasks = lazy(() => import("./pages/Tasks"));
const About = lazy(() => import("./pages/About"));
const FoodCalendar = lazy(() => import("./pages/FoodCalendar"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyDonations = lazy(() => import("./pages/MyDonations"));
const DonationDetail = lazy(() => import("./pages/DonationDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const CorpusFund = lazy(() => import("./pages/CorpusFund"));
const KindDonations = lazy(() => import("./pages/KindDonations"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const DonorProfile = lazy(() => import("./pages/DonorProfile"));
const TrustsList = lazy(() => import("./pages/super-admin/TrustsList"));
const TrustForm = lazy(() => import("./pages/super-admin/TrustForm"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Pay = lazy(() => import("./pages/Pay"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/sponsor" element={<Sponsor />} />
              <Route path="/sponsor/:needId" element={<SponsorDetail />} />
              <Route path="/homes" element={<Homes />} />
              <Route path="/homes/:homeId" element={<HomeDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/food-calendar" element={<FoodCalendar />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/pay" element={<Pay />} />
              
              {/* Protected: Any authenticated user */}
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              
              {/* Protected: Donor routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/donations" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <MyDonations />
                </ProtectedRoute>
              } />
              <Route path="/donations/:donationId" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <DonationDetail />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <DonorProfile />
                </ProtectedRoute>
              } />
              
              {/* Protected: Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/homes" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <Homes />
                </ProtectedRoute>
              } />
              <Route path="/admin/needs" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}>
                  <NeedsList />
                </ProtectedRoute>
              } />
              <Route path="/admin/needs/new" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}>
                  <NeedForm />
                </ProtectedRoute>
              } />
              <Route path="/admin/needs/:needId/edit" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}>
                  <NeedForm />
                </ProtectedRoute>
              } />
              <Route path="/admin/needs/:needId" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}>
                  <NeedDetail />
                </ProtectedRoute>
              } />
              <Route path="/admin/tasks" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <TasksList />
                </ProtectedRoute>
              } />
              <Route path="/admin/tasks/new" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <TaskForm />
                </ProtectedRoute>
              } />
              <Route path="/admin/tasks/:taskId/edit" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <TaskForm />
                </ProtectedRoute>
              } />
              
              {/* Protected: Staff tasks page */}
              <Route path="/tasks" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden', 'employee']}>
                  <MyTasks />
                </ProtectedRoute>
              } />
              
              {/* Protected: Reports */}
              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <Reports />
                </ProtectedRoute>
              } />
              
              {/* Protected: Corpus Fund */}
              <Route path="/corpus-fund" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <CorpusFund />
                </ProtectedRoute>
              } />
              
              {/* Protected: Kind Donations */}
              <Route path="/kind-donations" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'warden']}>
                  <KindDonations />
                </ProtectedRoute>
              } />
              
              {/* Protected: Finance */}
              <Route path="/finance" element={
                <ProtectedRoute allowedRoles={['finance', 'super_admin', 'admin']}>
                  <FinanceDashboard />
                </ProtectedRoute>
              } />
              
              {/* Protected: Warden routes */}
              <Route path="/warden" element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenDashboard />
                </ProtectedRoute>
              } />
              <Route path="/warden/residents" element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <Residents />
                </ProtectedRoute>
              } />
              <Route path="/warden/needs" element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <NeedsList />
                </ProtectedRoute>
              } />
              <Route path="/warden/needs/new" element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <NeedForm />
                </ProtectedRoute>
              } />
              
              {/* Protected: Super Admin routes */}
              <Route path="/super-admin" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/homes" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <HomesList />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/homes/new" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <HomeForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/homes/:homeId/edit" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <HomeForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/donors" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <DonorsList />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/donors/new" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <DonorForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/donors/:donorId" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <DonorPreview />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/donors/:donorId/edit" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <DonorForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/task-dashboard" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <TaskDashboard />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/settings" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/staff" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <StaffList />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/staff/new" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <StaffForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/staff/:staffId/edit" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <StaffForm />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/booking" element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <BookingPlatform />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/trusts" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <TrustsList />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/trusts/new" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <TrustForm />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
