import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface PageData {
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Props {
  pages: PageData[];
}

export const TopPagesTable = ({ pages }: Props) => {
  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname || "/";
    } catch {
      return url;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Top Pages
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada data halaman
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {formatUrl(page.pageUrl)}
                  </TableCell>
                  <TableCell className="text-right">{page.clicks}</TableCell>
                  <TableCell className="text-right">{page.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">#{page.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
