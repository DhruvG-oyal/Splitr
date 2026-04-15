import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import { PlusCircle, ArrowLeftRight, ArrowLeft, Users } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExpenseList } from "@/components/ExpenseList";
import { SettlementList } from "@/components/SettlementList";
import { GroupBalances } from "@/components/GroupBalances";

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");

  const fetchGroup = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGroup(); }, [id]);

  if (isLoading) return <div className="container mx-auto py-12"><BarLoader width="100%" color="#36d7b7" /></div>;
  if (!data) return null;

  const { group, members, expenses, settlements, balances, userLookupMap } = data;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-4 rounded-md">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl gradient-title">{group?.name}</h1>
              <p className="text-muted-foreground">{group?.description}</p>
              <p className="text-sm text-muted-foreground mt-1">{members.length} members</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/settlements/group/${id}`}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />Settle up
              </Link>
            </Button>
            <Button asChild>
              <Link to="/expenses/new">
                <PlusCircle className="mr-2 h-4 w-4" />Add expense
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xl">Group Balances</CardTitle></CardHeader>
            <CardContent>
              <GroupBalances balances={balances} />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xl">Members</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.imageUrl} />
                        <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{m.id === currentUser?._id ? "You" : m.name}</span>
                          {m.id === currentUser?._id && <Badge variant="outline" className="text-xs py-0 h-5">You</Badge>}
                        </div>
                        {m.role === "admin" && <span className="text-xs text-muted-foreground">Admin</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="settlements">Settlements ({settlements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-4">
          <ExpenseList expenses={expenses} showOtherPerson isGroupExpense userLookupMap={userLookupMap}
            onDeleted={() => fetchGroup()} />
        </TabsContent>
        <TabsContent value="settlements" className="space-y-4">
          <SettlementList settlements={settlements} isGroupSettlement userLookupMap={userLookupMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
