import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NeedCard } from '@/components/needs/NeedCard';
import { HomeProfileView } from '@/components/homes/HomeProfileView';
import { WardenHelpSection } from '@/components/homes/WardenHelpSection';
import { useHome } from '@/hooks/useHomes';
import { useNeeds } from '@/hooks/useNeeds';
import { useHomePhotos } from '@/hooks/useHomePhotos';
import { useAuth } from '@/contexts/AuthContext';
import type { HomeWithTrust } from '@/hooks/useAssignedHome';
import { isDonorPortal } from '@/lib/portal';
import { ArrowLeft, Calendar } from 'lucide-react';

const HomeDetail = () => {
  const { homeId } = useParams<{ homeId: string }>();
  const { user } = useAuth();
  const projectsListPath = isDonorPortal() ? '/?tab=food' : '/projects';
  const backLabel = isDonorPortal() ? 'Back to Donate Food' : 'Back to Projects';

  const { data: home, isLoading: homeLoading } = useHome(homeId || null) as {
    data: HomeWithTrust | null;
    isLoading: boolean;
  };
  const { data: allNeeds, isLoading: needsLoading } = useNeeds({ homeId });
  const { data: photos = [] } = useHomePhotos(homeId || null);

  const homeNeeds = allNeeds?.filter((n) => n.status === 'OPEN' || n.status === 'PARTIAL') || [];
  const canManageHelp = user?.role === 'warden' || user?.role === 'admin' || user?.role === 'super_admin';

  if (homeLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="home-image-frame mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!home) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-6">The project you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link to={projectsListPath}>{isDonorPortal() ? 'Back to Donate Food' : 'Browse All Projects'}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to={projectsListPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        <HomeProfileView home={home} photos={photos} />

        <div className="mt-10 space-y-6">
          {canManageHelp && homeId && (
            <WardenHelpSection homeId={homeId} trustId={home.trust_id} />
          )}

          {!canManageHelp &&
            (needsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : homeNeeds.length > 0 ? (
              <div>
                <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  Current Requirements
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {homeNeeds.map((need) => (
                    <NeedCard key={need.id} need={need} showHome={false} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No current requirements for this home</p>
              </div>
            ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default HomeDetail;
