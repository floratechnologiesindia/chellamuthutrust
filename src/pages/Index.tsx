import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeCard } from '@/components/homes/HomeCard';
import PublicNeedCards from '@/components/needs/PublicNeedCards';
import { useHomes } from '@/hooks/useHomes';
import { useCategories } from '@/hooks/useCategories';
import {
  Heart, Calendar, ArrowRight, Utensils, PiggyBank, Gift,
  GraduationCap, Stethoscope, Shirt, Building, Zap, Gamepad2,
  HelpCircle, Users, HandHeart, Sparkles, Search, CalendarDays, Star,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  food: Utensils, education: GraduationCap, medical: Stethoscope,
  clothing: Shirt, infrastructure: Building, utilities: Zap,
  recreation: Gamepad2, other: HelpCircle,
};

/* ─── Animated Counter ─── */
const AnimatedNumber = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1200;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
};

const Index = () => {
  const { data: allHomes, isLoading: homesLoading } = useHomes();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const featuredHomes = allHomes?.slice(0, 3) || [];
  const totalHomes = allHomes?.length || 0;
  const totalResidents = allHomes?.reduce((sum, h) =>
    sum + (h.capacity_children_male || 0) + (h.capacity_children_female || 0) +
    (h.capacity_elderly_male || 0) + (h.capacity_elderly_female || 0), 0) || 0;

  return (
    <MainLayout>
      {/* ─── Hero ─── */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        {/* Decorative blobs */}
        <div className="absolute top-10 right-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-[5%] w-56 h-56 bg-accent/5 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Making a difference, one act at a time
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6">
                Every Act of{' '}
                <span className="text-gradient">Kindness</span>{' '}
                Creates a Ripple of Hope
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Connect with projects across our network. Sponsor a meal,
                support education, or contribute to their well-being on a date that matters to you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="btn-gradient shadow-lg" asChild>
                  <Link to="/sponsor">
                    <Calendar className="mr-2 h-5 w-5" />
                    Sponsor by Date
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/projects">
                    Explore Projects
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
              {/* Social proof */}
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center">
                      <Users className="h-3 w-3 text-primary" />
                    </div>
                  ))}
                </div>
                <span>Trusted by <strong className="text-foreground">100+</strong> donors</span>
              </div>
            </div>

            {/* Right: Floating stat bubbles */}
            <div className="hidden lg:flex justify-center items-center relative h-[400px]">
              {/* Central decorative ring */}
              <div className="absolute w-64 h-64 rounded-full border-2 border-dashed border-primary/15" />
              <div className="absolute w-80 h-80 rounded-full border border-primary/8" />

              {/* Floating cards */}
              <div className="absolute top-4 right-8 animate-float">
                <Card className="shadow-lg border-primary/10 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-primary">
                        {totalResidents > 0 ? `${totalResidents}+` : '500+'}
                      </div>
                      <div className="text-xs text-muted-foreground">Lives Touched</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute bottom-8 left-4 animate-float-delayed">
                <Card className="shadow-lg border-accent/10 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-accent">
                        {totalHomes || 4}
                      </div>
                      <div className="text-xs text-muted-foreground">Projects</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute top-1/2 left-0 -translate-y-1/2 animate-float-slow">
                <Card className="shadow-lg border-primary/10 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <PiggyBank className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-success">₹25L+</div>
                      <div className="text-xs text-muted-foreground">Donated</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Impact Stats (mobile-visible, animated) ─── */}
      <section className="py-12 border-y border-border bg-muted/30 lg:hidden">
        <div className="container">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Heart, label: 'Lives Touched', value: totalResidents || 500, suffix: '+', color: 'text-primary' },
              { icon: Building, label: 'Projects', value: totalHomes || 4, suffix: '', color: 'text-accent' },
              { icon: PiggyBank, label: 'Donated', value: 25, suffix: 'L+', color: 'text-success', prefix: '₹' },
              { icon: Users, label: 'Active Donors', value: 100, suffix: '+', color: 'text-primary' },
            ].map((stat, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-5 pb-4">
                  <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                  <div className={`text-2xl font-display font-bold ${stat.color}`}>
                    {stat.prefix || ''}<AnimatedNumber target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ways to Help ─── */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Ways to Help</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose how you&apos;d like to make a difference. Every contribution, big or small, helps transform lives.
            </p>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:pb-0">
              {/* Food Distribution */}
              <Link to="/food-calendar" className="min-w-[200px] md:min-w-0">
                <Card className="card-hover h-full group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="pt-6 pb-5 px-5 relative">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Utensils className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-1">Food Distribution</h3>
                    <p className="text-xs text-muted-foreground">Sponsor meals for residents</p>
                  </CardContent>
                </Card>
              </Link>

              {categories?.map((category) => {
                const Icon = categoryIcons[category.key] || Heart;
                return (
                  <Link key={category.id} to={`/sponsor?category=${category.id}`} className="min-w-[200px] md:min-w-0">
                    <Card className="card-hover h-full group overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="pt-6 pb-5 px-5 relative">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="font-display font-semibold mb-1">{category.label}</h3>
                        <p className="text-xs text-muted-foreground">{category.description || 'Support this cause'}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

              {/* Corpus Fund */}
              <Link to="/corpus-fund" className="min-w-[200px] md:min-w-0">
                <Card className="card-hover h-full group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="pt-6 pb-5 px-5 relative">
                    <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <PiggyBank className="h-7 w-7 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold mb-1">Corpus Fund</h3>
                    <p className="text-xs text-muted-foreground">Long-term investment in care</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Kind Donations */}
              <Link to="/kind-donations" className="min-w-[200px] md:min-w-0">
                <Card className="card-hover h-full group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="pt-6 pb-5 px-5 relative">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Gift className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-1">Kind Donations</h3>
                    <p className="text-xs text-muted-foreground">Donate goods & essentials</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-16 lg:py-24 bg-muted/20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to make a lasting impact
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Search, step: '1', title: 'Choose a Need', desc: 'Browse open needs from verified projects across categories.' },
              { icon: CalendarDays, step: '2', title: 'Pick Your Date', desc: 'Sponsor on your birthday, anniversary, or any meaningful date.' },
              { icon: Star, step: '3', title: 'Make an Impact', desc: 'Your contribution directly reaches the project with full transparency.' },
            ].map((item, i) => (
              <div key={i} className={`text-center animate-slide-up-${i + 1}`}>
                <div className="relative mx-auto mb-5 w-20 h-20">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 rotate-6" />
                  <div className="relative h-full w-full rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Urgent Needs ─── */}
      <PublicNeedCards />

      {/* ─── Featured Projects ─── */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">Our Projects</h2>
              <p className="text-muted-foreground">Trusted institutions providing love and care</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/projects">
                View All Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {homesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : featuredHomes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects registered yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredHomes.map((home) => (
                <HomeCard key={home.id} home={home} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto rounded-3xl bg-primary p-10 md:p-16 text-primary-foreground relative overflow-hidden shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

            <div className="relative text-center">
              <HandHeart className="h-12 w-12 mx-auto mb-6 opacity-80" />
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Make Someone&apos;s Special Day Even More Special
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Whether it&apos;s your birthday, an anniversary, or in memory of a loved one —
                sponsor a need and create lasting impact on a date that matters to you.
              </p>
              <Button size="lg" variant="secondary" className="shadow-lg" asChild>
                <Link to="/sponsor">
                  <Calendar className="mr-2 h-5 w-5" />
                  Choose a Date to Sponsor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
