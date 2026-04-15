import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BarLoader } from "react-spinners";
import { Plus, Users, User, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserSearch } from "@/components/UserSearch";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const { user: currentUser } = useAuth();
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = async (data) => {
    try {
      const res = await api.post("/groups", {
        name: data.name,
        description: data.description,
        members: selectedMembers.map((m) => m.id),
      });
      toast.success("Group created!");
      reset();
      setSelectedMembers([]);
      onClose();
      if (onSuccess) onSuccess(res.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  };

  const handleClose = () => { reset(); setSelectedMembers([]); onClose(); };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input placeholder="Enter group name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea placeholder="Enter group description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Members</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {currentUser && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={currentUser.imageUrl} />
                    <AvatarFallback>{currentUser.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span>{currentUser.name} (You)</span>
                </Badge>
              )}
            </div>
            <UserSearch participants={selectedMembers} onParticipantsChange={setSelectedMembers} />
            {selectedMembers.length === 0 && (
              <p className="text-sm text-amber-600">Add at least one other person</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || selectedMembers.length === 0}>
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ users: [], groups: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api.get("/contacts")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load contacts"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("createGroup") === "true") setIsModalOpen(true);
  }, [searchParams]);

  if (isLoading) return <div className="container mx-auto py-12"><BarLoader width="100%" color="#36d7b7" /></div>;

  const { users, groups } = data;

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
        <h1 className="text-5xl gradient-title">Contacts</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <User className="mr-2 h-5 w-5" />People
          </h2>
          {users.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No contacts yet. Add an expense with someone to see them here.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-4">
              {users.map((u) => (
                <Link key={u.id} to={`/person/${u.id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.imageUrl} />
                          <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />Groups
          </h2>
          {groups.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No groups yet. Create a group to start tracking shared expenses.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <Link key={g.id} to={`/groups/${g.id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{g.name}</p>
                          <p className="text-sm text-muted-foreground">{g.memberCount} members</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(groupId) => navigate(`/groups/${groupId}`)}
      />
    </div>
  );
}
