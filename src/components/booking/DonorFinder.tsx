import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Phone, Mail, Building2 } from 'lucide-react';
import { useDonors, type DonorWithStats } from '@/hooks/useDonors';

interface DonorFinderProps {
  onSelectDonor: (donor: DonorWithStats) => void;
  onCreateNew: () => void;
}

const categoryColors: Record<string, string> = {
  monthly: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  yearly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  public: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  csr: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const DonorFinder = ({ onSelectDonor, onCreateNew }: DonorFinderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('existing');
  const { data: donors = [], isLoading, error } = useDonors();

  const filteredDonors = useMemo(() => {
    if (!searchQuery.trim()) return donors;
    const query = searchQuery.toLowerCase();
    return donors.filter(donor => 
      donor.name.toLowerCase().includes(query) ||
      donor.phone?.toLowerCase().includes(query) ||
      donor.email.toLowerCase().includes(query)
    );
  }, [donors, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Donor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="existing">Existing Donor</TabsTrigger>
            <TabsTrigger value="new">New Donor</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading donors...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Unable to load donors: {(error as Error).message || 'Please try again'}
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No donors found matching your search' : 'No donors available'}
              </div>
            ) : (
              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Donations</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonors.map((donor) => (
                      <TableRow key={donor.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{donor.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {donor.phone || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{donor.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {donor.donor_category && (
                            <Badge className={categoryColors[donor.donor_category] || ''}>
                              {donor.donor_category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {donor.total_donations_count || 0} (₹{(donor.total_donations_amount || 0).toLocaleString()})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => onSelectDonor(donor)}>
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Create New Donor</h3>
                <p className="text-muted-foreground text-sm">
                  Register a new donor to book events for them
                </p>
              </div>
              <Button onClick={onCreateNew} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create New Donor
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DonorFinder;
