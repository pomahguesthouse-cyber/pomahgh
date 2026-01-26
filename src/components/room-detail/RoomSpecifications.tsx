import { Card, CardContent } from "@/components/ui/card";
import { Users, Maximize, Bed } from "lucide-react";
import type { RoomSpecificationsProps } from "./types";
export const RoomSpecifications = ({
  maxGuests,
  sizeSqm,
  roomCount
}: RoomSpecificationsProps) => {
  return <div>
      <h2 className="text-2xl font-bold mb-4 font-sans">Spesifikasi Kamar</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Max Tamu</p>
              <p className="font-semibold">{maxGuests} persons</p>
            </div>
          </CardContent>
        </Card>

        {sizeSqm && <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Maximize className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ukuran Kamar </p>
                <p className="font-semibold">{sizeSqm} m²</p>
              </div>
            </CardContent>
          </Card>}

        {roomCount > 1 && <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Bed className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Kamar Tersedia </p>
                <p className="font-semibold">{roomCount} rooms</p>
              </div>
            </CardContent>
          </Card>}
      </div>
    </div>;
};