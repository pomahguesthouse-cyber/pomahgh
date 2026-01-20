import { useState } from "react";
import { useCompetitorPriceSurveys, CompetitorPriceSurveyInsert } from "@/hooks/competitor/useCompetitorPriceSurveys";
import { useCompetitorRooms } from "@/hooks/competitor/useCompetitorRooms";
import { useCompetitorHotels } from "@/hooks/competitor/useCompetitorHotels";
import { usePriceScraping } from "@/hooks/shared/usePriceScraping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, TrendingUp, RefreshCw, Loader2, Bot } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBTodayString } from "@/utils/wibTimezone";

const PRICE_SOURCES = [
  { value: "manual", label: "Input Manual" },
  { value: "auto-scrape", label: "Auto Scrape" },
  { value: "traveloka", label: "Traveloka" },
  { value: "agoda", label: "Agoda" },
  { value: "booking", label: "Booking.com" },
  { value: "tiket", label: "Tiket.com" },
  { value: "website", label: "Website Resmi" },
  { value: "walk-in", label: "Walk-in" },
];

export const PriceSurveyTab = () => {
  const { surveys, isLoading, createSurvey, deleteSurvey } = useCompetitorPriceSurveys(30);
  const { rooms } = useCompetitorRooms();
  const { hotels } = useCompetitorHotels();
  const { scrapeLogs, isLoadingLogs, triggerScrape } = usePriceScraping();
  
  const today = getWIBTodayString();
  const [formData, setFormData] = useState<CompetitorPriceSurveyInsert>({
    competitor_room_id: "",
    survey_date: today,
    price: 0,
    price_source: "manual",
    notes: ""
  });
  const [selectedHotel, setSelectedHotel] = useState<string>("");

  const filteredRooms = selectedHotel 
    ? rooms.filter(r => r.competitor_hotel_id === selectedHotel)
    : rooms;

  const enabledHotelsCount = hotels.filter(h => h.scrape_enabled && h.scrape_url).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.competitor_room_id || !formData.price) return;
    
    await createSurvey.mutateAsync(formData);
    
    // Reset form but keep hotel selection
    setFormData({
      competitor_room_id: "",
      survey_date: today,
      price: 0,
      price_source: "manual",
      notes: ""
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus survey ini?")) {
      await deleteSurvey.mutateAsync(id);
    }
  };

  const handleScrapeAll = async () => {
    await triggerScrape.mutateAsync(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Auto Scraping Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Scraping Otomatis
            </CardTitle>
            <CardDescription>
              Scrape harga dari {enabledHotelsCount} hotel kompetitor yang diaktifkan
            </CardDescription>
          </div>
          <Button 
            onClick={handleScrapeAll} 
            disabled={triggerScrape.isPending || enabledHotelsCount === 0}
          >
            {triggerScrape.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scrape Semua
              </>
            )}
          </Button>
        </CardHeader>
        {scrapeLogs.length > 0 && (
          <CardContent>
            <h4 className="text-sm font-medium mb-2">Log Terakhir</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {scrapeLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={log.status === 'success' ? 'default' : log.status === 'partial' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                    <span className="font-medium">{log.competitor_hotels?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{log.rooms_scraped} rooms, {log.prices_added} prices</span>
                    <span>{format(new Date(log.created_at), "dd/MM HH:mm", { locale: idLocale })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Input Survey Harga
          </CardTitle>
          <CardDescription>
            Masukkan harga kompetitor dari hasil survey pagi hari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Hotel</Label>
                <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Kamar *</Label>
                <Select
                  value={formData.competitor_room_id}
                  onValueChange={(value) => setFormData({ ...formData, competitor_room_id: value })}
                  disabled={!selectedHotel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kamar" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Harga (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="Contoh: 500000"
                  required
                />
              </div>
              
              <div>
                <Label>Sumber</Label>
                <Select
                  value={formData.price_source}
                  onValueChange={(value) => setFormData({ ...formData, price_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Survey</Label>
                <Input
                  type="date"
                  value={formData.survey_date}
                  onChange={(e) => setFormData({ ...formData, survey_date: e.target.value })}
                  max={today}
                />
              </div>
              <div>
                <Label>Catatan</Label>
                <Input
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Opsional"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={createSurvey.isPending || !formData.competitor_room_id || !formData.price}>
              <Plus className="h-4 w-4 mr-2" />
              Simpan Survey
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Survey History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Survey (30 Hari Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data survey. Mulai input survey harga kompetitor.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell>
                      {format(new Date(survey.survey_date), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {survey.competitor_rooms?.competitor_hotels?.name || "-"}
                    </TableCell>
                    <TableCell>{survey.competitor_rooms?.room_name || "-"}</TableCell>
                    <TableCell className="font-mono">
                      {formatRupiahID(survey.price)}
                    </TableCell>
                    <TableCell>
                      {survey.price_source === 'auto-scrape' ? (
                        <Badge variant="secondary" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      ) : (
                        PRICE_SOURCES.find(s => s.value === survey.price_source)?.label || survey.price_source
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {survey.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(survey.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};












