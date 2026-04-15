import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/expense-categories";
import { UserSearch } from "@/components/UserSearch";

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Amount must be positive" }),
  category: z.string().optional(),
  paidByUserId: z.string().min(1, "Payer is required"),
  splitType: z.enum(["equal", "percentage", "exact"]),
  groupId: z.string().optional(),
});

function SplitSelector({ type, amount, participants, paidByUserId, onSplitsChange }) {
  const [splits, setSplits] = useState([]);

  useEffect(() => {
    if (!amount || amount <= 0 || !participants.length) return;
    let newSplits = [];
    if (type === "equal") {
      const share = amount / participants.length;
      newSplits = participants.map((p) => ({ userId: p.id, name: p.name, imageUrl: p.imageUrl, amount: share, percentage: 100 / participants.length }));
    } else if (type === "percentage") {
      const pct = 100 / participants.length;
      newSplits = participants.map((p) => ({ userId: p.id, name: p.name, imageUrl: p.imageUrl, amount: (amount * pct) / 100, percentage: pct }));
    } else {
      const share = amount / participants.length;
      newSplits = participants.map((p) => ({ userId: p.id, name: p.name, imageUrl: p.imageUrl, amount: share, percentage: (share / amount) * 100 }));
    }
    setSplits(newSplits);
    onSplitsChange(newSplits);
  }, [type, amount, participants, paidByUserId]);

  const updatePct = (userId, pct) => {
    const updated = splits.map((s) => s.userId === userId ? { ...s, percentage: pct, amount: (amount * pct) / 100 } : s);
    setSplits(updated);
    onSplitsChange(updated);
  };

  const updateAmt = (userId, val) => {
    const parsed = parseFloat(val) || 0;
    const updated = splits.map((s) => s.userId === userId ? { ...s, amount: parsed, percentage: amount > 0 ? (parsed / amount) * 100 : 0 } : s);
    setSplits(updated);
    onSplitsChange(updated);
  };

  const totalAmt = splits.reduce((s, x) => s + x.amount, 0);
  const totalPct = splits.reduce((s, x) => s + x.percentage, 0);

  return (
    <div className="space-y-4 mt-4">
      {splits.map((split) => (
        <div key={split.userId} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-sm">{split.name}</span>
          </div>
          {type === "equal" && (
            <div className="text-right text-sm">${split.amount.toFixed(2)} ({split.percentage.toFixed(1)}%)</div>
          )}
          {type === "percentage" && (
            <div className="flex items-center gap-4 flex-1">
              <Slider value={[split.percentage]} min={0} max={100} step={1}
                onValueChange={([v]) => updatePct(split.userId, v)} className="flex-1" />
              <div className="flex gap-1 items-center min-w-[100px]">
                <Input type="number" min="0" max="100" value={split.percentage.toFixed(1)}
                  onChange={(e) => updatePct(split.userId, parseFloat(e.target.value) || 0)} className="w-16 h-8" />
                <span className="text-sm text-muted-foreground">%</span>
                <span className="text-sm ml-1">${split.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
          {type === "exact" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input type="number" min="0" step="0.01" value={split.amount.toFixed(2)}
                onChange={(e) => updateAmt(split.userId, e.target.value)} className="w-24 h-8" />
              <span className="text-sm text-muted-foreground">({split.percentage.toFixed(1)}%)</span>
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-between border-t pt-3">
        <span className="font-medium">Total</span>
        <span className={`font-medium ${Math.abs(totalAmt - amount) > 0.01 ? "text-amber-600" : ""}`}>
          ${totalAmt.toFixed(2)}
        </span>
      </div>
      {type === "percentage" && Math.abs(totalPct - 100) > 0.01 && (
        <p className="text-sm text-amber-600">Percentages should add up to 100%.</p>
      )}
      {type === "exact" && Math.abs(totalAmt - amount) > 0.01 && (
        <p className="text-sm text-amber-600">Splits (${totalAmt.toFixed(2)}) should equal total (${amount.toFixed(2)}).</p>
      )}
    </div>
  );
}

function ExpenseForm({ type, onSuccess }) {
  const { user: currentUser } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [splits, setSplits] = useState([]);
  const [splitType, setSplitType] = useState("equal");
  const categories = getAllCategories();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { description: "", amount: "", category: "other", paidByUserId: currentUser?._id || "", splitType: "equal" },
  });

  const amountValue = watch("amount");
  const paidByUserId = watch("paidByUserId");

  useEffect(() => {
    if (currentUser && participants.length === 0) {
      setParticipants([{ id: currentUser._id, name: currentUser.name, email: currentUser.email, imageUrl: currentUser.imageUrl }]);
      setValue("paidByUserId", currentUser._id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (type === "group") {
      api.get("/dashboard/groups").then((r) => setGroups(r.data)).catch(() => {});
    }
  }, [type]);

  const handleGroupChange = async (groupId) => {
    setValue("groupId", groupId);
    try {
      const res = await api.get(`/groups/${groupId}`);
      setSelectedGroup(res.data.group);
      const members = res.data.members.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl }));
      setParticipants(members);
    } catch { toast.error("Failed to load group members"); }
  };

  const onSubmit = async (data) => {
    const amount = parseFloat(data.amount);
    const formattedSplits = splits.map((s) => ({ userId: s.userId, amount: s.amount, paid: s.userId === data.paidByUserId }));
    const totalSplit = formattedSplits.reduce((s, x) => s + x.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) { toast.error("Split amounts don't add up to total"); return; }

    try {
      await api.post("/expenses", {
        description: data.description,
        amount,
        category: data.category || "other",
        date: selectedDate.toISOString(),
        paidByUserId: data.paidByUserId,
        splitType: data.splitType,
        splits: formattedSplits,
        groupId: type === "group" ? data.groupId : undefined,
      });
      toast.success("Expense created successfully!");
      reset();
      const other = participants.find((p) => p.id !== currentUser._id);
      if (onSuccess) onSuccess(type === "individual" ? other?.id : data.groupId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create expense");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input placeholder="Lunch, movie tickets, etc." {...register("description")} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input placeholder="0.00" type="number" step="0.01" min="0.01" {...register("amount")} />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select defaultValue="other" onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setValue("date", d); }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {type === "group" && (
          <div className="space-y-2">
            <Label>Group</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded-md">You need to create a group first.</p>
            ) : (
              <Select onValueChange={handleGroupChange}>
                <SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{g.name}</span>
                        <span className="text-xs text-muted-foreground">({g.members?.length || 0} members)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {type === "individual" && (
          <div className="space-y-2">
            <Label>Participants</Label>
            <UserSearch participants={participants} onParticipantsChange={setParticipants} maxParticipants={2} />
            {participants.length <= 1 && <p className="text-xs text-amber-600">Add at least one other participant</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Paid by</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("paidByUserId")}>
            <option value="">Select who paid</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.id === currentUser?._id ? "You" : p.name}</option>
            ))}
          </select>
          {errors.paidByUserId && <p className="text-sm text-red-500">{errors.paidByUserId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Split type</Label>
          <Tabs defaultValue="equal" onValueChange={(v) => { setSplitType(v); setValue("splitType", v); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="percentage">Percentage</TabsTrigger>
              <TabsTrigger value="exact">Exact Amounts</TabsTrigger>
            </TabsList>
            {["equal", "percentage", "exact"].map((t) => (
              <TabsContent key={t} value={t} className="pt-4">
                <SplitSelector type={t} amount={parseFloat(amountValue) || 0} participants={participants}
                  paidByUserId={paidByUserId} onSplitsChange={setSplits} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || participants.length <= 1}>
          {isSubmitting ? "Creating..." : "Create Expense"}
        </Button>
      </div>
    </form>
  );
}

export default function NewExpensePage() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-5xl gradient-title">Add a new expense</h1>
        <p className="text-muted-foreground mt-1">Record a new expense to split with others</p>
      </div>
      <Card>
        <CardContent>
          <Tabs className="pb-3" defaultValue="individual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual Expense</TabsTrigger>
              <TabsTrigger value="group">Group Expense</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-0">
              <ExpenseForm type="individual" onSuccess={(id) => id ? navigate(`/person/${id}`) : navigate("/dashboard")} />
            </TabsContent>
            <TabsContent value="group" className="mt-0">
              <ExpenseForm type="group" onSuccess={(id) => id ? navigate(`/groups/${id}`) : navigate("/dashboard")} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
