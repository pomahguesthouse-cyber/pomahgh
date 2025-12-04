import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainingExample {
  id: string;
  question: string;
  ideal_answer: string;
  category: string | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MessageRating {
  id: string;
  message_id: string;
  rating: number | null;
  is_good_example: boolean | null;
  admin_notes: string | null;
  rated_by: string | null;
  created_at: string | null;
}

// Training Examples Hooks
export const useTrainingExamples = () => {
  return useQuery({
    queryKey: ["training-examples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_training_examples")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as TrainingExample[];
    },
  });
};

export const useAddTrainingExample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (example: { question: string; ideal_answer: string; category?: string }) => {
      const { data, error } = await supabase
        .from("chatbot_training_examples")
        .insert([example])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      toast.success("Contoh training berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error("Gagal menambah contoh: " + error.message);
    },
  });
};

export const useUpdateTrainingExample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingExample> & { id: string }) => {
      const { data, error } = await supabase
        .from("chatbot_training_examples")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      toast.success("Contoh training berhasil diperbarui");
    },
    onError: (error) => {
      toast.error("Gagal memperbarui contoh: " + error.message);
    },
  });
};

export const useDeleteTrainingExample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chatbot_training_examples")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      toast.success("Contoh training berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus contoh: " + error.message);
    },
  });
};

// Message Rating Hooks
export const useMessageRatings = () => {
  return useQuery({
    queryKey: ["message-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_message_ratings")
        .select("*");
      
      if (error) throw error;
      return data as MessageRating[];
    },
  });
};

export const useRateMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      messageId, 
      rating, 
      adminNotes 
    }: { 
      messageId: string; 
      rating: number; 
      adminNotes?: string;
    }) => {
      // Check if rating exists
      const { data: existing } = await supabase
        .from("chat_message_ratings")
        .select("id")
        .eq("message_id", messageId)
        .single();
      
      if (existing) {
        // Update existing rating
        const { data, error } = await supabase
          .from("chat_message_ratings")
          .update({ rating, admin_notes: adminNotes })
          .eq("message_id", messageId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new rating
        const { data, error } = await supabase
          .from("chat_message_ratings")
          .insert([{ message_id: messageId, rating, admin_notes: adminNotes }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      toast.success("Rating berhasil disimpan");
    },
    onError: (error) => {
      toast.error("Gagal menyimpan rating: " + error.message);
    },
  });
};

export const usePromoteToExample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      messageId, 
      question, 
      answer, 
      category 
    }: { 
      messageId: string; 
      question: string; 
      answer: string; 
      category?: string;
    }) => {
      // Mark as good example in ratings
      const { data: existing } = await supabase
        .from("chat_message_ratings")
        .select("id")
        .eq("message_id", messageId)
        .single();
      
      if (existing) {
        await supabase
          .from("chat_message_ratings")
          .update({ is_good_example: true })
          .eq("message_id", messageId);
      } else {
        await supabase
          .from("chat_message_ratings")
          .insert([{ message_id: messageId, is_good_example: true, rating: 5 }]);
      }
      
      // Add to training examples
      const { data, error } = await supabase
        .from("chatbot_training_examples")
        .insert([{ question, ideal_answer: answer, category: category || "general" }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      queryClient.invalidateQueries({ queryKey: ["message-ratings"] });
      toast.success("Respons berhasil dijadikan contoh training");
    },
    onError: (error) => {
      toast.error("Gagal mempromosikan respons: " + error.message);
    },
  });
};

// Training Stats
export const useTrainingStats = () => {
  return useQuery({
    queryKey: ["training-stats"],
    queryFn: async () => {
      const [examplesResult, ratingsResult] = await Promise.all([
        supabase.from("chatbot_training_examples").select("id, is_active"),
        supabase.from("chat_message_ratings").select("rating, is_good_example"),
      ]);
      
      const examples = examplesResult.data || [];
      const ratings = ratingsResult.data || [];
      
      const totalExamples = examples.length;
      const activeExamples = examples.filter(e => e.is_active).length;
      const totalRatings = ratings.length;
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length 
        : 0;
      const promotedCount = ratings.filter(r => r.is_good_example).length;
      
      return {
        totalExamples,
        activeExamples,
        totalRatings,
        avgRating: avgRating.toFixed(1),
        promotedCount,
      };
    },
  });
};
