import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BarLoader } from "react-spinners";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const schema = z.object({
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Amount must be positive" }),
  note: z.string().optional(),
  paymentType: z.enum(["youPaid", "theyPaid"]),
});

export default function SettlementPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [entityData, setEntityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", note: "", paymentType: "youPaid" },
  });

  const paymentType = watch("paymentType");

  useEffect(() => {
    api.get(`/settlements/data/${type}/${id}`)
      .then((r) => setEntityData(r.data))
      .catch(() => toast.error("Failed to load settlement data"))
      .finally(() => setIsLoading(false));
  }, [type, id]);

  const onSubmit = async (data) => {
    const amount = parseFloat(data.amount);
    try {
      if (type === "user") {
        const paidByUserId = data.paymentType === "youPaid" ? currentUser._id : entityData.counterpart.userId;
        const receivedByUserId = data.paymentType === "youPaid" ? entityData.counterpart.userId : currentUser._id;
        await api.post("/settlements", { amount, note: data.note, paidByUserId, receivedByUserId });
        toast.success("Settlement recorded!");
        navigate(`/person/${id}`);
      } else if (type === "group") {
        if (!selectedGroupMemberId) { toast.error("Please select a group member"); return; }
        const paidByUserId = data.paymentType === "youPaid" ? currentUser._id : selectedGroupMemberId;
        const receivedByUserId = data.paymentType === "youPaid" ? selectedGroupMemberId : currentUser._id;
        await api.post("/settlements", { amount, note: data.note, paidByUserId, receivedByUserId, groupId: id });
        toast.success("Settlement recorded!");
        navigate(`/groups/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record settlement");
    }
  };

  if (isLoading) return <div className="container mx-auto py-12"><BarLoader width="100%" color="#36d7b7" /></div>;

  const title = type === "user" ? `Settling up with ${entityData?.counterpart?.name}` : `Settling up in ${entityData?.group?.name}`;

  return (
    <div className="container mx-auto py-6 max-w-lg">
      <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back
      </Button>

      <div className="mb-6">
        <h1 className="text-5xl gradient-title">Record a settlement</h1>
        <p className="text-muted-foreground mt-1">{title}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {type === "user" ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={entityData?.counterpart?.imageUrl} />
                <AvatarFallback>{entityData?.counterpart?.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="bg-primary/10 p-2 rounded-md">
                <Users className="h-6 w-6 text-primary" />
              </div>
            )}
            <CardTitle>{type === "user" ? entityData?.counterpart?.name : entityData?.group?.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Balance info */}
            {type === "user" && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Current balance</h3>
                {entityData?.netBalance === 0 ? (
                  <p>You are all settled up with {entityData?.counterpart?.name}</p>
                ) : entityData?.netBalance > 0 ? (
                  <div className="flex justify-between items-center">
                    <p><span className="font-medium">{entityData?.counterpart?.name}</span> owes you</p>
                    <span className="text-xl font-bold text-green-600">${entityData.netBalance.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p>You owe <span className="font-medium">{entityData?.counterpart?.name}</span></p>
                    <span className="text-xl font-bold text-red-600">${Math.abs(entityData.netBalance).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Group member selector */}
            {type === "group" && (
              <div className="space-y-2">
                <Label>Who are you settling with?</Label>
                <div className="space-y-2">
                  {entityData?.balances?.map((member) => (
                    <div key={member.userId}
                      className={`border rounded-md p-3 cursor-pointer transition-colors ${selectedGroupMemberId === member.userId ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => setSelectedGroupMemberId(member.userId)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.imageUrl} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                        <div className={`font-medium ${member.netBalance < 0 ? "text-green-600" : member.netBalance > 0 ? "text-red-600" : ""}`}>
                          {member.netBalance < 0 ? `They owe you $${Math.abs(member.netBalance).toFixed(2)}` :
                           member.netBalance > 0 ? `You owe $${member.netBalance.toFixed(2)}` : "Settled up"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment direction */}
            {(type === "user" || selectedGroupMemberId) && (
              <>
                <div className="space-y-2">
                  <Label>Who paid?</Label>
                  <RadioGroup defaultValue="youPaid" onValueChange={(v) => setValue("paymentType", v)} className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="youPaid" id="youPaid" />
                      <Label htmlFor="youPaid" className="flex-grow cursor-pointer">
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={currentUser?.imageUrl} />
                            <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>You paid {type === "user" ? entityData?.counterpart?.name : entityData?.balances?.find((m) => m.userId === selectedGroupMemberId)?.name}</span>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="theyPaid" id="theyPaid" />
                      <Label htmlFor="theyPaid" className="flex-grow cursor-pointer">
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={type === "user" ? entityData?.counterpart?.imageUrl : entityData?.balances?.find((m) => m.userId === selectedGroupMemberId)?.imageUrl} />
                            <AvatarFallback>
                              {(type === "user" ? entityData?.counterpart?.name : entityData?.balances?.find((m) => m.userId === selectedGroupMemberId)?.name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{type === "user" ? entityData?.counterpart?.name : entityData?.balances?.find((m) => m.userId === selectedGroupMemberId)?.name} paid you</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input placeholder="0.00" type="number" step="0.01" min="0.01" className="pl-7" {...register("amount")} />
                  </div>
                  {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea placeholder="Dinner, rent, etc." {...register("note")} />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || (type === "group" && !selectedGroupMemberId)}>
              {isSubmitting ? "Recording..." : "Record settlement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
