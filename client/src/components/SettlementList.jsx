import { format } from "date-fns";
import { ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SettlementList({ settlements, isGroupSettlement = false, userLookupMap = {} }) {
  const { user: currentUser } = useAuth();

  if (!settlements?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No settlements found</CardContent>
      </Card>
    );
  }

  const getName = (userId) =>
    userId === currentUser?._id ? "You" : userLookupMap[userId]?.name || "Other User";

  return (
    <div className="flex flex-col gap-4">
      {settlements.map((s) => {
        const isCurrentUserPayer = s.paidByUserId === currentUser?._id;
        const isCurrentUserReceiver = s.receivedByUserId === currentUser?._id;
        const payerName = getName(s.paidByUserId);
        const receiverName = getName(s.receivedByUserId);

        return (
          <Card className="hover:bg-muted/30 transition-colors" key={s._id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {isCurrentUserPayer
                        ? `You paid ${receiverName}`
                        : isCurrentUserReceiver
                        ? `${payerName} paid you`
                        : `${payerName} paid ${receiverName}`}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <span>{format(new Date(s.date), "MMM d, yyyy")}</span>
                      {s.note && <><span>•</span><span>{s.note}</span></>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${s.amount.toFixed(2)}</div>
                  {isGroupSettlement ? (
                    <Badge variant="outline" className="mt-1">Group settlement</Badge>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {isCurrentUserPayer ? (
                        <span className="text-amber-600">You paid</span>
                      ) : isCurrentUserReceiver ? (
                        <span className="text-green-600">You received</span>
                      ) : (
                        <span>Payment</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
