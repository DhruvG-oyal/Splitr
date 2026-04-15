import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus } from "lucide-react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function UserSearch({ participants, onParticipantsChange, maxParticipants = Infinity }) {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      // BUG FIX: compare u._id (string from server) with p.id (string stored locally)
      // Both are strings so === works correctly
      setSearchResults(
        res.data.filter((u) => !participants.some((p) => p.id === u._id.toString()))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addParticipant = (user) => {
    // BUG FIX: ensure we use toString() for consistent ID comparison
    const uid = user._id.toString();
    if (participants.some((p) => p.id === uid)) return;
    onParticipantsChange([
      ...participants,
      { id: uid, name: user.name, email: user.email, imageUrl: user.imageUrl },
    ]);
    setOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeParticipant = (userId) => {
    if (userId === currentUser?._id) return;
    onParticipantsChange(participants.filter((p) => p.id !== userId));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <Badge key={p.id} variant="secondary" className="flex items-center gap-2 px-3 py-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={p.imageUrl} />
              <AvatarFallback>{p.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <span>{p.id === currentUser?._id ? "You" : p.name || p.email}</span>
            {p.id !== currentUser?._id && (
              <button
                type="button"
                onClick={() => removeParticipant(p.id)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {participants.length < maxParticipants && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" type="button">
                <UserPlus className="h-3.5 w-3.5" />
                Add person
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchQuery.length < 2 ? (
                      <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                        Type at least 2 characters
                      </p>
                    ) : isSearching ? (
                      <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                        Searching...
                      </p>
                    ) : (
                      <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                        No users found
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Users">
                    {searchResults.map((u) => (
                      <CommandItem
                        key={u._id}
                        value={u.name + u.email}
                        onSelect={() => addParticipant(u)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={u.imageUrl} />
                            <AvatarFallback>{u.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm">{u.name}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
