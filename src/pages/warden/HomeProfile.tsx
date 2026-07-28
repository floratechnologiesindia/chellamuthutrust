import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { HomeProfileView } from '@/components/homes/HomeProfileView';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { useAssignedHome } from '@/hooks/useAssignedHome';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const HomeProfile = () => {
  const { homeId, home, photos, isLoading } = useAssignedHome();

  return (
    <AssignedHomeStates homeId={homeId} home={home} isLoading={isLoading}>
      {home && (
        <MainLayout>
          <div className="home-profile-page">
            <div className="container py-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <Button variant="ghost" asChild className="w-fit px-0 hover:bg-transparent">
                  <Link to="/warden" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Operations Dashboard
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Public project profile — share photos, contact details, and trust information
                </p>
              </div>

              <HomeProfileView home={home} photos={photos} showSupportCta={false} />

              <div className="mt-8 flex justify-center">
                <Button variant="outline" asChild>
                  <Link to="/warden">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Operations Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default HomeProfile;
