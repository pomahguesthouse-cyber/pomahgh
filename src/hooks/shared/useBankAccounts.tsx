import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/shared/useToast";

export interface BankAccount {
  id: string;
  created_at?: string;
  updated_at?: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_active: boolean;
  display_order: number;
}

export const useBankAccounts = () => {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as BankAccount[];
    },
  });

  const createBankAccount = useMutation({
    mutationFn: async (account: Omit<BankAccount, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Success",
        description: "Bank account added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Success",
        description: "Bank account updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Success",
        description: "Bank account deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    bankAccounts,
    isLoading,
    createBankAccount: createBankAccount.mutate,
    updateBankAccount: updateBankAccount.mutate,
    deleteBankAccount: deleteBankAccount.mutate,
    isCreating: createBankAccount.isPending,
    isUpdating: updateBankAccount.isPending,
    isDeleting: deleteBankAccount.isPending,
  };
};












