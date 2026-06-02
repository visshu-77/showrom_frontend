import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Check, LogOut, Shield, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api";
import { clearAdminToken, getAdminToken } from "@/lib/admin-auth";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string | null;
  subscriptionEndsAt?: string | null;
  lastLoginAt?: string | null;
  productCount: number;
  categoryCount: number;
  orderCount: number;
  customerCount: number;
  staffCount: number;
}

interface PaymentRequest {
  id: number;
  userId: number;
  plan: "monthly" | "yearly";
  amount: number;
  status: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

interface AdminOverview {
  users: AdminUser[];
  pendingRequests: PaymentRequest[];
  stats: {
    totalUsers: number;
    activeSubscriptions: number;
    pendingPayments: number;
    expiredUsers: number;
  };
}

const formatDate = (value?: string | null) => {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
};

const adminHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/admin/overview`, { headers: adminHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to load admin dashboard");
      return payload;
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const response = await fetch(`${API_BASE}/api/admin/payment-requests/${id}`, {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to update request");
      return payload;
    },
    onSuccess: () => {
      toast({ title: "Payment request updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (mutationError) => {
      toast({ title: mutationError instanceof Error ? mutationError.message : "Unable to update request", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    clearAdminToken();
    setLocation("/admin/signin");
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 px-4">
        <Card className="rounded-lg">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Admin session expired."}</p>
            <Button onClick={handleLogout}>Back to admin login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Loading admin dashboard...</div>;

  const statCards = [
    ["Users", data.stats.totalUsers],
    ["Active", data.stats.activeSubscriptions],
    ["Pending", data.stats.pendingPayments],
    ["Expired", data.stats.expiredUsers],
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Users, feature usage, and renewals</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <Card key={label} className="rounded-lg">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payment requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingRequests.map((request) => {
                      const user = data.users.find((row) => row.id === request.userId);
                      return (
                        <TableRow key={request.id}>
                          <TableCell>#{request.id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{user?.name ?? `User ${request.userId}`}</div>
                            <div className="text-xs text-muted-foreground">{user?.email}</div>
                          </TableCell>
                          <TableCell className="capitalize">{request.plan}</TableCell>
                          <TableCell>₹{request.amount}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.reference || request.note || "No reference"}</TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button size="sm" onClick={() => updateRequest.mutate({ id: request.id, action: "approve" })} disabled={updateRequest.isPending}>
                              <Check className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateRequest.mutate({ id: request.id, action: "reject" })} disabled={updateRequest.isPending}>
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscriptionStatus === "active" ? "default" : "outline"}>
                          {user.subscriptionStatus ?? "inactive"}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(user.subscriptionEndsAt)}</div>
                      </TableCell>
                      <TableCell>{user.productCount}</TableCell>
                      <TableCell>{user.categoryCount}</TableCell>
                      <TableCell>{user.orderCount}</TableCell>
                      <TableCell>{user.customerCount}</TableCell>
                      <TableCell>{user.staffCount}</TableCell>
                      <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
