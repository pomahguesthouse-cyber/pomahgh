import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import useEmblaCarousel from "embla-carousel-react";

interface NewsEventsSliderElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface NewsEventItem {
  id: string;
  type: "news" | "event";
  tag: string;
  title: string;
  summary: string;
  date: string;
  imageUrl: string;
  imageAlt?: string;
  linkUrl?: string;
}

const fallbackItems: NewsEventItem[] = [
  {
    id: "ne-1",
    type: "news",
    tag: "Berita",
    title: "Renovasi Area Lobi Sudah Selesai",
    summary: "Area lobi kini lebih luas dan nyaman untuk tamu yang check-in grup maupun keluarga.",
    date: "2026-03-01",
    imageUrl: "",
    linkUrl: "#",
  },
  {
    id: "ne-2",
    type: "event",
    tag: "Agenda",
    title: "Paket Long Weekend Maret",
    summary: "Promo menginap 3 malam + sarapan gratis untuk 2 orang selama periode long weekend.",
    date: "2026-03-20",
    imageUrl: "",
    linkUrl: "#",
  },
  {
    id: "ne-3",
    type: "event",
    tag: "Event",
    title: "Tur Kota Semarang Tiap Sabtu",
    summary: "Program tur kota dengan titik jemput dari hotel, kuota terbatas setiap akhir pekan.",
    date: "2026-03-27",
    imageUrl: "",
    linkUrl: "#",
  },
];

function formatDateLabel(rawDate: string) {
  if (!rawDate) return "Tanggal menyusul";
  const parsed = parseISO(rawDate);
  if (!isValid(parsed)) return rawDate;
  return format(parsed, "dd MMM yyyy", { locale: localeId });
}

function NewsEventCard({ item, isPreview }: { item: NewsEventItem; isPreview: boolean }) {
  const card = (
    <article className="rounded-2xl border border-border bg-card overflow-hidden h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[16/9] bg-muted">
        <img
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.imageAlt || item.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full",
            item.type === "event" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
          )}>
            {item.tag || (item.type === "event" ? "Event" : "News")}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateLabel(item.date)}
          </span>
        </div>

        <h3 className="font-semibold text-base leading-snug line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
      </div>
    </article>
  );

  if (isPreview && item.linkUrl) {
    return (
      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
        {card}
      </a>
    );
  }

  return card;
}

export function NewsEventsSliderElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: NewsEventsSliderElementProps) {
  const title = element.props.title || "News & Events";
  const subtitle = element.props.subtitle || "Update terbaru dan agenda spesial untuk halaman ini";
  const showSubtitle = element.props.showSubtitle !== false;
  const autoPlay = element.props.autoPlay === true;

  const items: NewsEventItem[] = useMemo(() => {
    if (Array.isArray(element.props.items) && element.props.items.length > 0) {
      return element.props.items;
    }
    return fallbackItems;
  }, [element.props.items]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!autoPlay || !emblaApi || items.length <= 1) return;
    const timer = setInterval(() => emblaApi.scrollNext(), 3500);
    return () => clearInterval(timer);
  }, [autoPlay, emblaApi, items.length]);

  const content = (
    <section className="py-14 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 md:mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
            {showSubtitle && <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">{subtitle}</p>}
          </div>

          <div className="hidden md:flex gap-2">
            <button onClick={scrollPrev} className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={scrollNext} className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {items.map((item) => (
              <div key={item.id} className="px-2 flex-[0_0_100%] sm:flex-[0_0_50%] xl:flex-[0_0_33.333%] min-w-0">
                <NewsEventCard item={item} isPreview={isPreview} />
              </div>
            ))}
          </div>
        </div>

        {items.length > 1 && (
          <div className="mt-5 flex justify-center gap-1.5">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={cn("h-2 rounded-full transition-all", idx === selectedIndex ? "w-8 bg-foreground" : "w-2 bg-muted-foreground/40")}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );

  if (isPreview) return content;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
