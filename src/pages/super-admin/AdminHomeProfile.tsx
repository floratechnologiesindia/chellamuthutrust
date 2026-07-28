import { Link, useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeProfileView } from '@/components/homes/HomeProfileView';
import { useHome } from '@/hooks/useHomes';
import { useHomePhotos } from '@/hooks/useHomePhotos';
import type { HomeWithTrust } from '@/hooks/useAssignedHome';
import { ArrowLeft, Edit } from 'lucide-react';

const AdminHomeProfile = () => {
  const { homeId } = useParams<{ homeId: string }>();
  const navigate = useNavigate();
  const { data: home, isLoading: homeLoading } = useHome(homeId || null) as {
    data: HomeWithTrust | null | undefined;
    isLoading: boolean;
  };
  const { data: photos = [], isLoading: photosLoading } = useHomePhotos(homeId || null);

  const isLoading = homeLoading || photosLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-5xl">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="home-image-frame mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!home) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button variant="outline" onClick={() => navigate('/super-admin/projects')}>
            Back to Projects
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="home-profile-page">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <Button variant="ghost" asChild className="w-fit px-0 hover:bg-transparent">
              <Link to="/super-admin/projects" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/projects/${home.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </div>

          <HomeProfileView home={home} photos={photos} showSupportCta={false} />
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminHomeProfile;
