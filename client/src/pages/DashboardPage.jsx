import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Users, ChevronRight, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState(null);
  const [groups, setGroups] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [balRes, grpRes, spentRes, monthRes] = await Promise.all([
          api.get("/dashboard/balances"),
          api.get("/dashboard/groups"),
          api.get("/dashboard/total-spent"),
          api.get("/dashboard/monthly-spending"),
        ]);
        setBalances(balRes.data);
        setGroups(grpRes.data);
        setTotalSpent(spentRes.data.totalSpent);
        setMonthlySpending(monthRes.data);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const chartData = monthlySpending.map((item) => ({
    name: MONTH_NAMES[new Date(item.month).getMonth()],
    amount: item.total,
  }));

  const currentMonth = new Date().getMonth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <BarLoader width="100%" color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="text-5xl gradient-title">Dashboard</h1>
        <Button asChild>
          <Link to="/expenses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add expense
          </Link>
        </Button>
      </div>

      {/* Balance overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balances?.totalBalance > 0 ? (
                <span className="text-green-600">+${balances.totalBalance.toFixed(2)}</span>
              ) : balances?.totalBalance < 0 ? (
                <span className="text-red-600">-${Math.abs(balances.totalBalance).toFixed(2)}</span>
              ) : (
                <span>$0.00</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balances?.totalBalance > 0 ? "You are owed money" : balances?.totalBalance < 0 ? "You owe money" : "All settled up!"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">You are owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(balances?.youAreOwed || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {balances?.oweDetails?.youAreOwedBy?.length || 0} people
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">You owe</CardTitle>
          </CardHeader>
          <CardContent>
            {balances?.oweDetails?.youOwe?.length > 0 ? (
              <>
                <div className="text-2xl font-bold text-red-600">${(balances.youOwe || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">To {balances.oweDetails.youOwe.length} people</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">You don't owe anyone</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total this month</p>
                  <h3 className="text-2xl font-bold mt-1">
                    ${(monthlySpending[currentMonth]?.total || 0).toFixed(2)}
                  </h3>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total this year</p>
                  <h3 className="text-2xl font-bold mt-1">${totalSpent.toFixed(2)}</h3>
                </div>
              </div>
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, "Amount"]} />
                    <Bar dataKey="amount" fill="#36d7b7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Monthly spending for {new Date().getFullYear()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Balance details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Balance Details</CardTitle>
                <Button variant="link" asChild className="p-0">
                  <Link to="/contacts">
                    View all <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!balances?.oweDetails?.youAreOwedBy?.length && !balances?.oweDetails?.youOwe?.length ? (
                  <p className="text-center text-muted-foreground py-4">You're all settled up!</p>
                ) : (
                  <>
                    {balances?.oweDetails?.youAreOwedBy?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center mb-3">
                          <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
                          Owed to you
                        </h3>
                        {balances.oweDetails.youAreOwedBy.map((item) => (
                          <Link to={`/person/${item.userId}`} key={item.userId}
                            className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.imageUrl} />
                                <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="font-medium text-green-600">${item.amount.toFixed(2)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {balances?.oweDetails?.youOwe?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center mb-3">
                          <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />
                          You owe
                        </h3>
                        {balances.oweDetails.youOwe.map((item) => (
                          <Link to={`/person/${item.userId}`} key={item.userId}
                            className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.imageUrl} />
                                <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="font-medium text-red-600">${item.amount.toFixed(2)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Groups */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Your Groups</CardTitle>
                <Button variant="link" asChild className="p-0">
                  <Link to="/contacts">
                    View all <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No groups yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 5).map((group) => (
                    <Link to={`/groups/${group.id}`} key={group.id}
                      className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.members?.length || 0} members</p>
                        </div>
                      </div>
                      {group.balance !== 0 && (
                        <span className={`text-sm font-medium ${group.balance > 0 ? "text-green-600" : "text-red-600"}`}>
                          {group.balance > 0 ? "+" : ""}${group.balance.toFixed(2)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link to="/contacts?createGroup=true">
                  <Users className="mr-2 h-4 w-4" />
                  Create new group
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
