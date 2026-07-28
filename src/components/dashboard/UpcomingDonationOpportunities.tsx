import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarHeart, ChevronDown, ChevronUp, Eye, Phone } from 'lucide-react';
import { useUpcomingDonationOpportunities, type UpcomingOpportunity } from '@/hooks/useUpcomingDonationOpportunities';
import { formatCurrency } from '@/lib/formatters';

const occasionLabels: Record<string, string> = {
  birthday: 'Birthday',
  ancestor_remembrance: 'Ancestor Remembrance',
  festival: 'Festival',
  other: 'Other',
};

const UrgencyBadge = ({ days }: { days: number }) => {
  if (days <= 3) {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">{days}d away</Badge>;
  }
  if (days <= 7) {
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">{days}d away</Badge>;
  }
  return <Badge variant="outline">{days}d away</Badge>;
};

const UpcomingDonationOpportunities = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data: opportunities = [], isLoading } = useUpcomingDonationOpportunities(30);

  

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarHeart className="h-5 w-5 text-primary" />
            Upcoming Donation Opportunities
            {!isLoading && opportunities.length > 0 && (
              <Badge variant="secondary">{opportunities.length}</Badge>
            )}
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : opportunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarHeart className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No donation anniversaries in the next 30 days.</p>
                </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Donors whose donation anniversary falls within the next 30 days — potential repeat sponsors.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor</TableHead>
                        <TableHead className="hidden sm:table-cell">Phone</TableHead>
                        <TableHead>Occasion</TableHead>
                        <TableHead className="hidden md:table-cell">Project</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Anniversary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunities.map((opp) => (
                        <TableRow key={opp.donationId}>
                          <TableCell className="font-medium">{opp.donorName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {opp.donorPhone || '—'}
                          </TableCell>
                          <TableCell>
                            {opp.occasionType ? (
                              <Badge variant="outline" className="capitalize">
                                {occasionLabels[opp.occasionType] || opp.occasionType}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                            {opp.occasionNote && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{opp.occasionNote}</p>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{opp.homeName}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(opp.originalAmount)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-sm">{new Date(opp.anniversaryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              <UrgencyBadge days={opp.daysUntil} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/super-admin/donors/${opp.donorId}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {opp.donorPhone && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={`tel:${opp.donorPhone}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default UpcomingDonationOpportunities;
