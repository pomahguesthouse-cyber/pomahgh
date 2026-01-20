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
  CodeSnippet, 
  CODE_LANGUAGES,
  SNIPPET_CATEGORIES,
  useAddCodeSnippet,
  useUpdateCodeSnippet 
} from "@/hooks/shared/useCodeSnippets";

const formSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional(),
  code_content: z.string().min(1, "Code content wajib diisi"),
  language: z.string().default("typescript"),
  category: z.string().default("utility"),
  tags: z.string().optional(),
  is_favorite: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CodeSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: CodeSnippet | null;
}

export function CodeSnippetDialog({ 
  open, 
  onOpenChange, 
  snippet 
}: CodeSnippetDialogProps) {
  const addSnippet = useAddCodeSnippet();
  const updateSnippet = useUpdateCodeSnippet();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      code_content: "",
      language: "typescript",
      category: "utility",
      tags: "",
      is_favorite: false,
    },
  });

  useEffect(() => {
    if (snippet) {
      form.reset({
        title: snippet.title,
        description: snippet.description || "",
        code_content: snippet.code_content,
        language: snippet.language,
        category: snippet.category,
        tags: snippet.tags?.join(", ") || "",
        is_favorite: snippet.is_favorite,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        code_content: "",
        language: "typescript",
        category: "utility",
        tags: "",
        is_favorite: false,
      });
    }
  }, [snippet, form, open]);

  const onSubmit = async (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: values.title,
      description: values.description || null,
      code_content: values.code_content,
      language: values.language,
      category: values.category,
      tags,
      is_favorite: values.is_favorite,
    };

    if (snippet) {
      await updateSnippet.mutateAsync({ id: snippet.id, ...payload });
    } else {
      await addSnippet.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = addSnippet.isPending || updateSnippet.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {snippet ? "Edit Code Snippet" : "Tambah Code Snippet Baru"}
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
                    <Input placeholder="Contoh: useLocalStorage Hook" {...field} />
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
                      placeholder="Deskripsi singkat tentang snippet ini" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bahasa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih bahasa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CODE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
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
                        {SNIPPET_CATEGORIES.map((cat) => (
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
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="react, hook, state" 
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
              name="code_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Paste code snippet di sini..."
                      className="min-h-[250px] font-mono text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Code akan ditampilkan dengan syntax highlighting
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
                      Snippet favorit akan muncul di bagian atas
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
                {isLoading ? "Menyimpan..." : snippet ? "Simpan Perubahan" : "Tambah Snippet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}












