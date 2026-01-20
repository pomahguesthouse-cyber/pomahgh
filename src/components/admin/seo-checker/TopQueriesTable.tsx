import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Props {
  queries: QueryData[];
}

export const TopQueriesTable = ({ queries }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4" />
          Top Queries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada data query
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impr</TableHead>
                <TableHead className="text-right">Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((q, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {q.query}
                  </TableCell>
                  <TableCell className="text-right">{q.clicks}</TableCell>
                  <TableCell className="text-right">{q.impressions}</TableCell>
                  <TableCell className="text-right">#{q.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};












