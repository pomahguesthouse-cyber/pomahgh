import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";

const channelManagerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["api", "webhook"]),
  auth_type: z.enum(["bearer", "basic", "api_key"]).optional(),
  api_endpoint: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  api_key_secret: z.string().optional(),
  webhook_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  webhook_secret: z.string().optional(),
  is_active: z.boolean().default(true),
  max_retries: z.number().min(0).max(10).default(3),
  retry_delay_seconds: z.number().min(0).max(3600).default(60),
});

type ChannelManagerFormData = z.infer<typeof channelManagerSchema>;

export const ChannelManagerForm = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ChannelManagerFormData>({
    resolver: zodResolver(channelManagerSchema),
    defaultValues: {
      name: "",
      type: "api",
      auth_type: "bearer",
      is_active: true,
      max_retries: 3,
      retry_delay_seconds: 60,
    },
  });

  const createChannelManager = useMutation({
    mutationFn: async (data: ChannelManagerFormData) => {
      const { data: result, error } = await supabase
        .from("channel_managers")
        .insert([{
          name: data.name,
          type: data.type,
          auth_type: data.auth_type || null,
          api_endpoint: data.api_endpoint || null,
          api_key_secret: data.api_key_secret || null,
          webhook_url: data.webhook_url || null,
          webhook_secret: data.webhook_secret || null,
          is_active: data.is_active,
          max_retries: data.max_retries,
          retry_delay_seconds: data.retry_delay_seconds,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Channel manager created successfully");
      queryClient.invalidateQueries({ queryKey: ["channel-managers"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error("Failed to create channel manager", {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ChannelManagerFormData) => {
    createChannelManager.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Channel Manager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Channel Manager</DialogTitle>
          <DialogDescription>
            Configure a new channel manager integration for availability sync
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Booking.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Integration Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="api">API Push</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    API: Push availability to channel manager. Webhook: Receive updates from channel manager.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("type") === "api" && (
              <>
                <FormField
                  control={form.control}
                  name="api_endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://api.channelmanager.com/availability"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auth_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key/Secret</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Your API key or secret"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be stored securely and encrypted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {form.watch("type") === "webhook" && (
              <>
                <FormField
                  control={form.control}
                  name="webhook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://your-domain.com/webhook"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL where you'll receive updates from the channel manager
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhook_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Secret</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Secret for webhook signature verification"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="max_retries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Retries</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of retry attempts for failed syncs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retry_delay_seconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retry Delay (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="3600"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Delay between retry attempts in seconds
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable or disable this channel manager integration
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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createChannelManager.isPending}>
                {createChannelManager.isPending ? "Creating..." : "Create Channel Manager"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
