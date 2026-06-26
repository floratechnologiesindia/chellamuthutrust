import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Clock, CheckCircle, AlertCircle, Send, UserCheck } from 'lucide-react';
import { ManualEntryDialog } from '@/components/finance/ManualEntryDialog';
import { BankStatementUpload } from '@/components/finance/BankStatementUpload';
import { AssignPaymentDialog } from '@/components/finance/AssignPaymentDialog';
import { ReconcileConfirmDialog } from '@/components/finance/ReconcileConfirmDialog';
import {
  useBankTransactions,
  useBankTransactionStats,
  useNotifyAdminForAssignment,
  useExpectedPayments,
  BankTransaction,
} from '@/hooks/useBankTransactions';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  unidentified: 'bg-destructive/10 text-destructive',
  awaiting_assignment: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  reconciled: 'bg-green-100 text-green-800',
};

const FinanceDashboard = () => {
  const { user } = useAuth();
  const isFinance = user?.role === 'finance' || user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: stats } = useBankTransactionStats();
  const { data: allTransactions = [] } = useBankTransactions();
  const { data: expectedPayments = [] } = useExpectedPayments();
  const notifyMutation = useNotifyAdminForAssignment();

  const [assignDialog, setAssignDialog] = useState<{ open: boolean; transaction: BankTransaction | null }>({ open: false, transaction: null });
  const [reconcileDialog, setReconcileDialog] = useState<{ open: boolean; transaction: BankTransaction | null }>({ open: false, transaction: null });

  const filterByStatus = (status: string) => allTransactions.filter(t => t.status === status);

  const summaryCards = [
    { label: 'Received Today', value: stats?.totalToday || 0, icon: IndianRupee, color: 'text-primary' },
    { label: 'Awaiting Identification', value: stats?.awaitingIdentification || 0, icon: AlertCircle, color: 'text-destructive' },
    { label: 'Assigned to Donors', value: stats?.assignedToDonors || 0, icon: UserCheck, color: 'text-blue-600' },
    { label: 'Pending Verification', value: stats?.pendingVerification || 0, icon: Clock, color: 'text-yellow-600' },
  ];

  const TransactionTable = ({ data, showActions }: { data: BankTransaction[]; showActions?: string }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Narration</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions found</TableCell></TableRow>
        ) : data.map(t => (
          <TableRow key={t.id}>
            <TableCell>{t.transaction_date}</TableCell>
            <TableCell className="font-medium">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
            <TableCell className="max-w-[120px] truncate">{t.reference_number || '-'}</TableCell>
            <TableCell className="max-w-[180px] truncate">{t.narration || '-'}</TableCell>
            <TableCell>{t.payment_mode}</TableCell>
            <TableCell>
              <Badge variant="outline" className={statusColors[t.status] || ''}>{t.status.replace('_', ' ')}</Badge>
            </TableCell>
            {showActions === 'notify' && (
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => notifyMutation.mutate({ transactionId: t.id, amount: t.amount })}>
                  <Send className="h-3 w-3 mr-1" />Notify Admin
                </Button>
              </TableCell>
            )}
            {showActions === 'assign' && (
              <TableCell>
                <Button size="sm" onClick={() => setAssignDialog({ open: true, transaction: t })}>
                  <UserCheck className="h-3 w-3 mr-1" />Assign
                </Button>
              </TableCell>
            )}
            {showActions === 'reconcile' && (
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setReconcileDialog({ open: true, transaction: t })}>
                  <CheckCircle className="h-3 w-3 mr-1" />Reconcile
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payment Reconciliation</h1>
            <p className="text-muted-foreground">Record, track, and reconcile bank payments</p>
          </div>
          {isFinance && (
            <div className="flex gap-2">
              <ManualEntryDialog />
              <BankStatementUpload />
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold">₹{card.value.toLocaleString('en-IN')}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="unidentified">
          <TabsList className="flex-wrap">
            <TabsTrigger value="unidentified">Unidentified ({filterByStatus('unidentified').length})</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Assignment ({filterByStatus('awaiting_assignment').length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({filterByStatus('assigned').length})</TabsTrigger>
            <TabsTrigger value="reconciled">Reconciled ({filterByStatus('reconciled').length})</TabsTrigger>
            <TabsTrigger value="expected">Expected Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="unidentified">
            <Card>
              <CardHeader><CardTitle>Unidentified Payments</CardTitle></CardHeader>
              <CardContent>
                <TransactionTable data={filterByStatus('unidentified')} showActions={isFinance ? 'notify' : undefined} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="awaiting">
            <Card>
              <CardHeader><CardTitle>Awaiting Admin Assignment</CardTitle></CardHeader>
              <CardContent>
                <TransactionTable data={filterByStatus('awaiting_assignment')} showActions={isAdmin ? 'assign' : undefined} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assigned">
            <Card>
              <CardHeader><CardTitle>Assigned Payments</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Assigned On</TableHead>
                      {isFinance && <TableHead>Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByStatus('assigned').length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No assigned payments</TableCell></TableRow>
                    ) : filterByStatus('assigned').map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.transaction_date}</TableCell>
                        <TableCell className="font-medium">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>{t.donor_name || '-'}</TableCell>
                        <TableCell>{t.category_label || '-'}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{t.reference_number || '-'}</TableCell>
                        <TableCell>{t.assigned_at ? new Date(t.assigned_at).toLocaleDateString() : '-'}</TableCell>
                        {isFinance && (
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => setReconcileDialog({ open: true, transaction: t })}>
                              <CheckCircle className="h-3 w-3 mr-1" />Reconcile
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciled">
            <Card>
              <CardHeader><CardTitle>Reconciled Payments</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Reconciled On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByStatus('reconciled').length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No reconciled payments</TableCell></TableRow>
                    ) : filterByStatus('reconciled').map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.transaction_date}</TableCell>
                        <TableCell className="font-medium">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>{t.donor_name || '-'}</TableCell>
                        <TableCell>{t.category_label || '-'}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{t.reference_number || '-'}</TableCell>
                        <TableCell>{t.reconciled_at ? new Date(t.reconciled_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expected">
            <Card>
              <CardHeader><CardTitle>Expected Payments (from Bookings)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expectedPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expected payments</TableCell></TableRow>
                    ) : expectedPayments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.donor_name}</TableCell>
                        <TableCell className="font-medium">₹{Number(p.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell>{p.purpose}</TableCell>
                        <TableCell>{p.booking_date}</TableCell>
                        <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AssignPaymentDialog
        transaction={assignDialog.transaction}
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ open, transaction: open ? assignDialog.transaction : null })}
      />
      <ReconcileConfirmDialog
        transaction={reconcileDialog.transaction}
        open={reconcileDialog.open}
        onOpenChange={(open) => setReconcileDialog({ open, transaction: open ? reconcileDialog.transaction : null })}
      />
    </MainLayout>
  );
};

export default FinanceDashboard;
