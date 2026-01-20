import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteChannelManagerDialogProps {
  channelManagerId: string;
  channelManagerName: string;
}

export const DeleteChannelManagerDialog = ({ 
  channelManagerId, 
  channelManagerName 
}: DeleteChannelManagerDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteChannelManager = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("channel_managers")
        .delete()
        .eq("id", channelManagerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Channel manager deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["channel-managers"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete channel manager", {
        description: error.message,
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{channelManagerName}</strong> and remove all associated sync logs and queue entries. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteChannelManager.mutate()}
            disabled={deleteChannelManager.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteChannelManager.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};












