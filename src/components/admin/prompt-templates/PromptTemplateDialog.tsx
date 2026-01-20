import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  PromptTemplate, 
  PROMPT_CATEGORIES,
  useAddPromptTemplate,
  useUpdatePromptTemplate 
} from "@/hooks/shared/usePromptTemplates";

const formSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional(),
  prompt_content: z.string().min(1, "Prompt content wajib diisi"),
  category: z.string().default("general"),
  tags: z.string().optional(),
  is_favorite: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface PromptTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PromptTemplate | null;
}

export function PromptTemplateDialog({ 
  open, 
  onOpenChange, 
  template 
}: PromptTemplateDialogProps) {
  const addTemplate = useAddPromptTemplate();
  const updateTemplate = useUpdatePromptTemplate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      prompt_content: "",
      category: "general",
      tags: "",
      is_favorite: false,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        title: template.title,
        description: template.description || "",
        prompt_content: template.prompt_content,
        category: template.category,
        tags: template.tags?.join(", ") || "",
        is_favorite: template.is_favorite,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        prompt_content: "",
        category: "general",
        tags: "",
        is_favorite: false,
      });
    }
  }, [template, form, open]);

  const onSubmit = async (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: values.title,
      description: values.description || null,
      prompt_content: values.prompt_content,
      category: values.category,
      tags,
      is_favorite: values.is_favorite,
    };

    if (template) {
      await updateTemplate.mutateAsync({ id: template.id, ...payload });
    } else {
      await addTemplate.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = addTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Tambah Template Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Tambah Page Baru" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Deskripsi singkat tentang prompt ini" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROMPT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (pisahkan dengan koma)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="react, component, form" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="prompt_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tulis prompt yang akan digunakan di Lovable chat..."
                      className="min-h-[200px] font-mono text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Prompt ini akan di-copy dan paste ke Lovable chat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_favorite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Favorit</FormLabel>
                    <FormDescription>
                      Template favorit akan muncul di bagian atas
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : template ? "Simpan Perubahan" : "Tambah Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}












