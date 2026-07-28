import { MainLayout } from '@/components/layout/MainLayout';
import { HomeCard } from '@/components/homes/HomeCard';
import { useHomes } from '@/hooks/useHomes';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const Homes = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminManage = location.pathname.startsWith('/admin/projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const { data: homes, isLoading } = useHomes();
  const allHomes = homes || [];

  const cities = [...new Set(allHomes.map(h => h.city))];

  const filteredHomes = allHomes.filter(home => {
    const matchesSearch = home.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (home.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || home.type === selectedType;
    const matchesCity = selectedCity === 'all' || home.city === selectedCity;
    return matchesSearch && matchesType && matchesCity;
  });

  const dashboardPath = user?.role === 'super_admin' ? '/super-admin' : '/admin';

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              {isAdminManage ? 'Manage Projects' : 'Our Projects'}
            </h1>
            <p className="text-muted-foreground">
              {isAdminManage
                ? 'Add, edit, or view projects'
                : 'Browse projects and discover ways to support'}
            </p>
          </div>
          {isAdminManage && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to={dashboardPath}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/needs">
                <Calendar className="h-4 w-4 mr-2" />
                Requirements
              </Link>
            </Button>
          </div>
          )}

        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Project type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="children_home">Children Home</SelectItem>
              <SelectItem value="old_age_home">Old Age Home</SelectItem>
              <SelectItem value="mixed">Mixed Care</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredHomes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHomes.map((home) => (
              <HomeCard key={home.id} home={home} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">No projects found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Homes;
