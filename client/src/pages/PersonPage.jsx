import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import { PlusCircle, ArrowLeftRight, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExpenseList } from "@/components/ExpenseList";
import { SettlementList } from "@/components/SettlementList";

export default function PersonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");

  const fetchData = async () => {
    try {
      const res = await api.get(`/expenses/between/${id}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  if (isLoading) return <div className="container mx-auto py-12"><BarLoader width="100%" color="#36d7b7" /></div>;
  if (!data) return null;

  const { otherUser, expenses, settlements, balance } = data;
  const userLookupMap = { [otherUser.id]: otherUser };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={otherUser?.imageUrl} />
              <AvatarFallback>{otherUser?.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl gradient-title">{otherUser?.name}</h1>
              <p className="text-muted-foreground">{otherUser?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/settlements/user/${id}`}>
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

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-xl">Balance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              {balance === 0 ? (
                <p>You are all settled up</p>
              ) : balance > 0 ? (
                <p><span className="font-medium">{otherUser?.name}</span> owes you</p>
              ) : (
                <p>You owe <span className="font-medium">{otherUser?.name}</span></p>
              )}
            </div>
            <div className={`text-2xl font-bold ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : ""}`}>
              ${Math.abs(balance).toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="settlements">Settlements ({settlements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-4">
          <ExpenseList expenses={expenses} showOtherPerson={false} otherPersonId={id}
            userLookupMap={userLookupMap} onDeleted={() => fetchData()} />
        </TabsContent>
        <TabsContent value="settlements" className="space-y-4">
          <SettlementList settlements={settlements} userLookupMap={userLookupMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
