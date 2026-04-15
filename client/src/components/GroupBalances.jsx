import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export function GroupBalances({ balances }) {
  const { user: currentUser } = useAuth();

  // BUG FIX: guard all null/undefined cases before any array access
  if (!Array.isArray(balances) || balances.length === 0 || !currentUser) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No balance information available
      </div>
    );
  }

  // BUG FIX: compare as strings — server returns string IDs, currentUser._id is also string
  const me = balances.find((b) => b.id?.toString() === currentUser._id?.toString());

  if (!me) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        You're not part of this group
      </div>
    );
  }

  const userMap = Object.fromEntries(balances.map((b) => [b.id?.toString(), b]));

  const owedByMembers = (me.owedBy || [])
    .map(({ from, amount }) => ({ ...(userMap[from] || {}), amount }))
    .filter((m) => m.id) // skip if user not found in map
    .sort((a, b) => b.amount - a.amount);

  const owingToMembers = (me.owes || [])
    .map(({ to, amount }) => ({ ...(userMap[to] || {}), amount }))
    .filter((m) => m.id)
    .sort((a, b) => b.amount - a.amount);

  const isAllSettled =
    Math.abs(me.totalBalance || 0) < 0.01 &&
    owedByMembers.length === 0 &&
    owingToMembers.length === 0;

  const balance = me.totalBalance || 0;

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b">
        <p className="text-sm text-muted-foreground mb-1">Your balance</p>
        <p
          className={`text-2xl font-bold ${
            balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : ""
          }`}
        >
          {balance > 0
            ? `+$${balance.toFixed(2)}`
            : balance < 0
            ? `-$${Math.abs(balance).toFixed(2)}`
            : "$0.00"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {balance > 0
            ? "You are owed money"
            : balance < 0
            ? "You owe money"
            : "You are all settled up"}
        </p>
      </div>

      {isAllSettled ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Everyone is settled up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {owedByMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium flex items-center mb-3">
                <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
                Owed to you
              </h3>
              <div className="space-y-3">
                {owedByMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.imageUrl} />
                        <AvatarFallback>{m.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.name}</span>
                    </div>
                    <span className="font-medium text-green-600">
                      ${(m.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {owingToMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium flex items-center mb-3">
                <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />
                You owe
              </h3>
              <div className="space-y-3">
                {owingToMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.imageUrl} />
                        <AvatarFallback>{m.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.name}</span>
                    </div>
                    <span className="font-medium text-red-600">
                      ${(m.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
