import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoGalleryCarousel } from '@/components/homes/PhotoGalleryCarousel';
import { WardenHelpSection } from '@/components/homes/WardenHelpSection';
import { WalkinKindDonationDialog } from '@/components/homes/WalkinKindDonationDialog';
import { 
  Users, 
  ListChecks, 
  Plus,
  AlertCircle,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Baby,
  Heart,
  Gift,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/hooks/useHomes';
import { useNeeds } from '@/hooks/useNeeds';
import { useHomePhotos } from '@/hooks/useHomePhotos';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type HomeType = Database['public']['Enums']['home_type'];

const homeTypeLabels: Record<HomeType, string> = {
  'children_home': 'Children Home',
  'old_age_home': 'Old Age Home',
  'mixed': 'Mixed Care',
  'others': 'Other',
  'special_children': 'Special Children Home',
};

const WardenDashboard = () => {
  const { user } = useAuth();
  const homeId = user?.home_id || null;
  const [showKindDonationDialog, setShowKindDonationDialog] = useState(false);
  
  const { data: home, isLoading: homeLoading } = useHome(homeId);
  const { data: allNeeds, isLoading: needsLoading } = useNeeds({ homeId: homeId || undefined });
  const { data: photos = [] } = useHomePhotos(homeId);

  const trust = (home as any)?.trusts;

  // Not assigned state
  if (!homeId) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not Assigned to Any Home</h1>
            <p className="text-muted-foreground max-w-md">
              You have not been assigned to a home yet. Please contact an administrator.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (homeLoading || needsLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 md:h-96 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!home) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Home Not Found</h1>
            <p className="text-muted-foreground max-w-md">
              The assigned home could not be found. Please contact an administrator.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const childrenTotal = (home.capacity_children_male || 0) + (home.capacity_children_female || 0);
  const elderlyTotal = (home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0);
  const totalCapacity = childrenTotal + elderlyTotal;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Social Worker Header with Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold">{home.name}</h1>
            <p className="text-muted-foreground mt-1">Social Worker Dashboard</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/warden/residents">
                <Users className="h-4 w-4 mr-2" />
                Manage Residents
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/needs">
                <ListChecks className="h-4 w-4 mr-2" />
                View Requirements
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setShowKindDonationDialog(true)}>
              <Gift className="h-4 w-4 mr-2" />
              Accept Kind Donation
            </Button>
            <Button asChild>
              <Link to="/admin/needs/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Requirement
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <PhotoGalleryCarousel 
              photos={photos} 
              fallbackImage={home.image_url}
            />

            {/* Home Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary">{homeTypeLabels[home.type as HomeType]}</Badge>
                {trust && <span className="text-sm text-primary">{trust.name}</span>}
              </div>
              <p className="text-lg text-muted-foreground">{home.description}</p>
            </div>

            {/* Capacity Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalCapacity}</p>
                  <p className="text-sm text-muted-foreground">Total Capacity</p>
                </CardContent>
              </Card>
              {childrenTotal > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Baby className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{childrenTotal}</p>
                    <p className="text-sm text-muted-foreground">
                      Children ({home.capacity_children_male || 0}M / {home.capacity_children_female || 0}F)
                    </p>
                  </CardContent>
                </Card>
              )}
              {elderlyTotal > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{elderlyTotal}</p>
                    <p className="text-sm text-muted-foreground">
                      Elderly ({home.capacity_elderly_male || 0}M / {home.capacity_elderly_female || 0}F)
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Social Worker Help Management Section */}
            <WardenHelpSection homeId={homeId} trustId={home.trust_id} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {home.address}<br />
                      {home.city}, {home.state}<br />
                      {home.country} - {home.pincode}
                    </p>
                  </div>
                </div>
                {trust && (
                  <>
                    {trust.contact_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <a href={`tel:${trust.contact_phone}`} className="text-sm text-primary hover:underline">
                            {trust.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {trust.contact_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email</p>
                          <a href={`mailto:${trust.contact_email}`} className="text-sm text-primary hover:underline">
                            {trust.contact_email}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Support CTA */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <Heart className="h-8 w-8 mb-4 opacity-80" />
                <h3 className="font-display text-xl font-semibold mb-2">Support This Home</h3>
                <p className="text-sm opacity-90 mb-4">
                  Browse available requirements and make a difference in the lives of residents.
                </p>
                <Button variant="secondary" className="w-full" asChild>
                  <Link to={`/sponsor?home=${home.id}`}>
                    View All Requirements
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Trust Info */}
            {trust && (
              <Card>
                <CardHeader>
                  <CardTitle>About the Trust</CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2">{trust.name}</h4>
                  {trust.description && (
                    <p className="text-sm text-muted-foreground mb-3">{trust.description}</p>
                  )}
                  {trust.registration_number && (
                    <p className="text-xs text-muted-foreground">
                      Registration: {trust.registration_number}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {homeId && home && (
        <WalkinKindDonationDialog
          open={showKindDonationDialog}
          onOpenChange={setShowKindDonationDialog}
          homeId={homeId}
          trustId={home.trust_id}
          homeName={home.name}
        />
      )}
    </MainLayout>
  );
};

export default WardenDashboard;
