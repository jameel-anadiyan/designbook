import { createBrowserRouter } from 'react-router';
import { AppShell } from './AppShell';
import { HomeRedirect, PublicOnly, RequireAuth, RequireRole } from './guards';
import { ComingSoon, NotFound } from './placeholders';
import { LoginPage } from '@/features/auth/LoginPage';
import { ChangePasscodePage } from '@/features/auth/ChangePasscodePage';
import { RouteError } from './RouteError';

// Lazy route modules: shop users never download admin screens.
const profile = async () => ({ Component: (await import('@/features/profile/ProfilePage')).ProfilePage });
const users = async () => ({ Component: (await import('@/features/users/UsersPage')).UsersPage });
const outlets = async () => ({ Component: (await import('@/features/admin/OutletsPage')).OutletsPage });
const categories = async () => ({ Component: (await import('@/features/admin/CategoriesPage')).CategoriesPage });
const dashboard = async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage });

const STAFF = ['super_admin', 'head_office'] as const;

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicOnly />,
        children: [{ path: '/login', element: <LoginPage /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/change-passcode', element: <ChangePasscodePage /> },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <HomeRedirect /> },
              { path: '/profile', lazy: profile },

              // Phase 4–5
              { path: '/designs', element: <ComingSoon phase={4} title="All Designs" description="Every outlet's designs in a 1–4 tile grid with filters, lookbook, showcase, slideshow and compare views." /> },
              { path: '/upload', element: <ComingSoon phase={3} title="Upload a design" description="Four-step wizard: identify (SKU + barcode scan), price (double MRP), eight media slots with crop and compression, review." /> },
              { path: '/notifications', element: <ComingSoon phase={9} title="Notifications" description="Requests, decisions, dispatches, image corrections and holds expiring — live." /> },
              { path: '/reports', element: <ComingSoon phase={8} title="Reports" description="Age, holds, rejections, transfers, sold, image clarity and stock summary — with Excel export." /> },

              {
                element: <RequireRole roles={['shop_user']} />,
                children: [
                  { path: '/my-designs', element: <ComingSoon phase={5} title="My Designs" description="Your outlet's pieces: edit, mark sold with invoice, numbered holds, fix images." /> },
                  { path: '/requests', element: <ComingSoon phase={6} title="Requests" description="Incoming and outgoing transfer requests with their live status." /> },
                ],
              },
              {
                element: <RequireRole roles={[...STAFF]} />,
                children: [
                  { path: '/dashboard', lazy: dashboard },
                  { path: '/transfers', element: <ComingSoon phase={6} title="Transfers inbox" description="Sent to HO · At HO · In transit — receive, forward to requester or return to origin." /> },
                  { path: '/image-corrections', element: <ComingSoon phase={7} title="Image corrections" description="Open and resolved correction requests, plus every design with image-not-clear votes." /> },
                  { path: '/admin/categories', lazy: categories },
                ],
              },
              {
                element: <RequireRole roles={['super_admin']} />,
                children: [
                  { path: '/admin/users', lazy: users },
                  { path: '/admin/outlets', lazy: outlets },
                  { path: '/admin/settings', element: <ComingSoon phase={7} title="Settings" description="Age-band thresholds and other business settings." /> },
                  { path: '/admin/audit', element: <ComingSoon phase={8} title="Audit log" description="Every status change across all outlets, from design_events." /> },
                  { path: '/admin/deleted', element: <ComingSoon phase={7} title="Deleted designs" description="Soft-deleted designs with reason — restore when needed." /> },
                ],
              },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
]);
