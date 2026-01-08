import { useState } from "react";
import { useCompetitorPriceSurveys, CompetitorPriceSurveyInsert } from "@/hooks/useCompetitorPriceSurveys";
import { useCompetitorRooms } from "@/hooks/useCompetitorRooms";
import { useCompetitorHotels } from "@/hooks/useCompetitorHotels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBTodayString } from "@/utils/wibTimezone";

const PRICE_SOURCES = [
  { value: "manual", label: "Input Manual" },
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

  return (
    <div className="space-y-6">
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
                      {PRICE_SOURCES.find(s => s.value === survey.price_source)?.label || survey.price_source}
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
