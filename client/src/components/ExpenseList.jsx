import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryById, getCategoryIcon } from "@/lib/expense-categories";

export function ExpenseList({
  expenses,
  showOtherPerson = true,
  isGroupExpense = false,
  otherPersonId = null,
  userLookupMap = {},
  onDeleted,
}) {
  const { user: currentUser } = useAuth();

  if (!expenses?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No expenses found</CardContent>
      </Card>
    );
  }

  const getUserDetails = (userId) => {
    const uid = userId?.toString?.() ?? userId;
    return {
      name: uid === currentUser?._id ? "You" : userLookupMap[uid]?.name || "Other User",
      imageUrl: userLookupMap[uid]?.imageUrl || null,
      id: uid,
    };
  };

  // BUG FIX: compare as strings since MongoDB IDs come back as strings from API
  const canDelete = (expense) =>
    currentUser &&
    (expense.createdBy?.toString() === currentUser._id ||
      expense.paidByUserId?.toString() === currentUser._id);

  const handleDelete = async (expense) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await api.delete(`/expenses/${expense._id}`);
      toast.success("Expense deleted");
      if (onDeleted) onDeleted(expense._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete expense");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {expenses.map((expense) => {
        const payerId = expense.paidByUserId?.toString?.() ?? expense.paidByUserId;
        const payer = getUserDetails(payerId);
        const isCurrentUserPayer = payerId === currentUser?._id;

        // BUG FIX: safe fallback if category is missing or unrecognised
        const category = getCategoryById(expense.category) ?? getCategoryById("other");
        const CategoryIcon = getCategoryIcon(category.id);

        return (
          <Card className="hover:bg-muted/30 transition-colors" key={expense._id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{expense.description}</h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      {/* BUG FIX: guard against invalid date */}
                      <span>
                        {expense.date
                          ? format(new Date(expense.date), "MMM d, yyyy")
                          : "Unknown date"}
                      </span>
                      {showOtherPerson && (
                        <>
                          <span>•</span>
                          <span>{isCurrentUserPayer ? "You" : payer.name} paid</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">${(expense.amount || 0).toFixed(2)}</div>
                    {isGroupExpense ? (
                      <Badge variant="outline" className="mt-1">Group expense</Badge>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {isCurrentUserPayer ? (
                          <span className="text-green-600">You paid</span>
                        ) : (
                          <span className="text-red-600">{payer.name} paid</span>
                        )}
                      </div>
                    )}
                  </div>
                  {canDelete(expense) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleDelete(expense)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Splits */}
              <div className="mt-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  {(expense.splits || []).map((split, idx) => {
                    const splitUid = split.userId?.toString?.() ?? split.userId;
                    const splitUser = getUserDetails(splitUid);
                    const isMe = splitUid === currentUser?._id;
                    const shouldShow =
                      showOtherPerson || isMe || splitUid === otherPersonId;
                    if (!shouldShow) return null;
                    return (
                      <Badge
                        key={idx}
                        variant={split.paid ? "outline" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={splitUser.imageUrl} />
                          <AvatarFallback>{splitUser.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <span>
                          {isMe ? "You" : splitUser.name}: ${(split.amount || 0).toFixed(2)}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
