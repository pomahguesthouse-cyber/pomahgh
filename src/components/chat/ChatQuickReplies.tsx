import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Building2, BookOpen, Phone } from "lucide-react";

interface ChatQuickRepliesProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

const quickReplies = [
  { label: "Cek Ketersediaan", message: "Saya ingin cek ketersediaan kamar", icon: Calendar },
  { label: "Lihat Harga", message: "Berapa harga kamar per malam?", icon: DollarSign },
  { label: "Fasilitas", message: "Apa saja fasilitas yang tersedia di hotel?", icon: Building2 },
  { label: "Cara Booking", message: "Bagaimana cara melakukan booking?", icon: BookOpen },
  { label: "Hubungi Admin", message: "Saya ingin berbicara dengan admin/resepsionis", icon: Phone },
];

const ChatQuickReplies = ({ onSelect, disabled }: ChatQuickRepliesProps) => {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-t bg-muted/30">
      {quickReplies.map((reply) => (
        <Button
          key={reply.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply.message)}
          disabled={disabled}
          className="text-xs gap-1.5"
        >
          <reply.icon className="h-3 w-3" />
          {reply.label}
        </Button>
      ))}
    </div>
  );
};

export default ChatQuickReplies;
