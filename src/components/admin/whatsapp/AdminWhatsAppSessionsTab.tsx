import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useWhatsAppSessions, useWhatsAppStats } from '@/hooks/useWhatsAppSessions';
import { Shield, Search, Users, ShieldCheck, ShieldX, MessageCircle } from 'lucide-react';
import { StatCard, AdminSessionRow } from './components';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 20;

const AdminWhatsAppSessionsTab = () => {
  const { data: sessions, isLoading } = useWhatsAppSessions('admin');
  const { data: stats } = useWhatsAppStats('admin');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session =>
      session.phone_number.toLowerCase().includes(search.toLowerCase())
    );
  }, [sessions, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSessions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSessions, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Admin Sessions" value={stats?.totalSessions || 0} icon={Users} />
        <StatCard title="Aktif" value={stats?.activeSessions || 0} icon={ShieldCheck} variant="success" />
        <StatCard title="Diblokir" value={stats?.blockedSessions || 0} icon={ShieldX} variant="destructive" />
        <StatCard title="Total Pesan" value={stats?.totalMessages || 0} icon={MessageCircle} />
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            WhatsApp Admin Sessions
          </CardTitle>
          <CardDescription>
            Percakapan WhatsApp dari manager yang terdaftar (menggunakan Admin Chatbot)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat sessions...</p>
          ) : paginatedSessions.length > 0 ? (
            <div className="space-y-3">
              {paginatedSessions.map((session) => (
                <AdminSessionRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada session admin WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1">
                Manager yang mengirim pesan WhatsApp akan muncul di sini
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} dari {filteredSessions.length} sessions
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhatsAppSessionsTab;
