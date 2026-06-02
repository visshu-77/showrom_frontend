import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Landmark, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

import qrCode from "../assets/qr-code.png";

type PlanKey = "monthly" | "yearly";

interface SubscriptionResponse {
  user: {
    subscriptionStatus?: string;
    subscriptionPlan?: PlanKey | null;
    subscriptionEndsAt?: string | null;
  };
  plans: Record<PlanKey, { amount: number; label: string; durationDays: number }>;
  payment: {
    qrUrl: string;
    upiId: string;
    bankDetails: string;
  };
  latestRequest: {
    id: number;
    status: string;
    plan: PlanKey;
    reference?: string | null;
  } | null;
}

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not active";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
};

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("monthly");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/subscription`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load subscription details");
      return response.json();
    },
  });

  const requestPayment = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/api/subscription/payment-requests`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, reference, note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to submit payment request");
      return payload;
    },
    onSuccess: () => {
      toast({ title: "Payment request submitted" });
      setReference("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (error) => {
      toast({ title: error instanceof Error ? error.message : "Unable to submit payment request", variant: "destructive" });
    },
  });

  const status = data?.user.subscriptionStatus ?? "inactive";
  const isActive = status === "active";
  const pending = data?.latestRequest?.status === "pending";
  const warning = useMemo(() => {
    if (!data?.user.subscriptionEndsAt || !isActive) return null;
    const daysLeft = Math.ceil((new Date(data.user.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Renew soon.` : null;
  }, [data?.user.subscriptionEndsAt, isActive]);

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading pricing...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
          <p className="text-muted-foreground">Choose a plan to unlock products, billing, customers, staff, and orders.</p>
        </div>
        <Badge variant={isActive ? "default" : pending ? "secondary" : "outline"} className="w-fit">
          {isActive ? `Active until ${formatDate(data.user.subscriptionEndsAt)}` : pending ? "Payment pending" : "Subscription required"}
        </Badge>
      </div>

      {warning && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {warning}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(data.plans).map(([key, plan]) => {
          const planKey = key as PlanKey;
          const selected = selectedPlan === planKey;
          return (
            <button
              key={planKey}
              type="button"
              onClick={() => setSelectedPlan(planKey)}
              className={`rounded-lg border bg-card p-5 text-left transition-colors ${selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{plan.label}</p>
                  <p className="text-sm text-muted-foreground">{plan.durationDays} days access</p>
                </div>
                {selected && <Check className="h-5 w-5 text-primary" />}
              </div>
              <div className="mt-4 text-3xl font-bold">₹{plan.amount}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" />
              Pay Manually
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-square max-w-xs items-center justify-center rounded-lg border bg-muted/30">
              {data.payment.qrUrl ? (
                // <img src={data.payment.qrUrl} alt="Payment QR" className="h-full w-full rounded-lg object-contain p-3" />
                <img src={qrCode} alt="Payment QR" className="h-full w-full rounded-lg object-contain p-3" />
              ) : (
                <div className="px-4 text-center text-sm text-muted-foreground">Set PAYMENT_QR_URL in backend .env</div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> UPI</p>
              <p className="rounded-md bg-muted px-3 py-2">{data.payment.upiId || "Set PAYMENT_UPI_ID in backend .env"}</p>
              <p className="flex items-center gap-2 font-medium"><Landmark className="h-4 w-4" /> Account Details</p>
              <p className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2">{data.payment.bankDetails || "Set PAYMENT_BANK_DETAILS in backend .env"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Submit Payment Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                Your {data.latestRequest?.plan} payment request is waiting for admin approval.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reference">Transaction reference</Label>
              <Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UPI ref / bank ref / screenshot note" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional message for admin" />
            </div>
            <Button onClick={() => requestPayment.mutate()} disabled={requestPayment.isPending || pending}>
              {requestPayment.isPending ? "Submitting..." : `Submit ₹${data.plans[selectedPlan].amount} request`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
