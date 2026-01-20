import { format } from "date-fns";

export interface IndonesianHoliday {
  date: string; // "yyyy-MM-dd"
  name: string;
  type: 'national' | 'religious' | 'collective_leave';
}

export const indonesianHolidays2024: IndonesianHoliday[] = [
  { date: "2024-01-01", name: "Tahun Baru 2024", type: "national" },
  { date: "2024-02-08", name: "Isra Mi'raj Nabi Muhammad SAW", type: "religious" },
  { date: "2024-02-10", name: "Tahun Baru Imlek 2575", type: "religious" },
  { date: "2024-02-14", name: "Hari Raya Nyepi 1946", type: "religious" },
  { date: "2024-03-11", name: "Hari Suci Nyepi", type: "religious" },
  { date: "2024-03-29", name: "Wafat Isa Al-Masih", type: "religious" },
  { date: "2024-04-08", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2024-04-09", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2024-04-10", name: "Hari Raya Idul Fitri 1445 H", type: "religious" },
  { date: "2024-04-11", name: "Hari Raya Idul Fitri 1445 H", type: "religious" },
  { date: "2024-04-12", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2024-04-15", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2024-05-01", name: "Hari Buruh Internasional", type: "national" },
  { date: "2024-05-09", name: "Kenaikan Isa Al-Masih", type: "religious" },
  { date: "2024-05-10", name: "Cuti Bersama Kenaikan Isa Al-Masih", type: "collective_leave" },
  { date: "2024-05-23", name: "Hari Raya Waisak 2568", type: "religious" },
  { date: "2024-05-24", name: "Cuti Bersama Waisak", type: "collective_leave" },
  { date: "2024-06-01", name: "Hari Lahir Pancasila", type: "national" },
  { date: "2024-06-17", name: "Hari Raya Idul Adha 1445 H", type: "religious" },
  { date: "2024-06-18", name: "Cuti Bersama Idul Adha", type: "collective_leave" },
  { date: "2024-07-07", name: "Tahun Baru Islam 1446 H", type: "religious" },
  { date: "2024-08-17", name: "Hari Kemerdekaan RI", type: "national" },
  { date: "2024-09-16", name: "Maulid Nabi Muhammad SAW", type: "religious" },
  { date: "2024-12-25", name: "Hari Raya Natal", type: "religious" },
  { date: "2024-12-26", name: "Cuti Bersama Natal", type: "collective_leave" },
];

export const indonesianHolidays2025: IndonesianHoliday[] = [
  { date: "2025-01-01", name: "Tahun Baru 2025", type: "national" },
  { date: "2025-01-29", name: "Tahun Baru Imlek 2576", type: "religious" },
  { date: "2025-02-27", name: "Isra Mi'raj Nabi Muhammad SAW", type: "religious" },
  { date: "2025-03-29", name: "Hari Suci Nyepi 1947", type: "religious" },
  { date: "2025-03-30", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2025-03-31", name: "Hari Raya Idul Fitri 1446 H", type: "religious" },
  { date: "2025-04-01", name: "Hari Raya Idul Fitri 1446 H", type: "religious" },
  { date: "2025-04-02", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2025-04-03", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2025-04-04", name: "Cuti Bersama Idul Fitri", type: "collective_leave" },
  { date: "2025-04-18", name: "Wafat Isa Al-Masih", type: "religious" },
  { date: "2025-05-01", name: "Hari Buruh Internasional", type: "national" },
  { date: "2025-05-12", name: "Hari Raya Waisak 2569", type: "religious" },
  { date: "2025-05-29", name: "Kenaikan Isa Al-Masih", type: "religious" },
  { date: "2025-05-30", name: "Cuti Bersama Kenaikan Isa Al-Masih", type: "collective_leave" },
  { date: "2025-06-01", name: "Hari Lahir Pancasila", type: "national" },
  { date: "2025-06-06", name: "Hari Raya Idul Adha 1446 H", type: "religious" },
  { date: "2025-06-26", name: "Tahun Baru Islam 1447 H", type: "religious" },
  { date: "2025-08-17", name: "Hari Kemerdekaan RI", type: "national" },
  { date: "2025-09-05", name: "Maulid Nabi Muhammad SAW", type: "religious" },
  { date: "2025-12-25", name: "Hari Raya Natal", type: "religious" },
  { date: "2025-12-26", name: "Cuti Bersama Natal", type: "collective_leave" },
];

export const indonesianHolidays2026: IndonesianHoliday[] = [
  { date: "2026-01-01", name: "Tahun Baru 2026", type: "national" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577", type: "religious" },
  { date: "2026-02-16", name: "Isra Mi'raj Nabi Muhammad SAW", type: "religious" },
  { date: "2026-03-19", name: "Hari Suci Nyepi 1948", type: "religious" },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri 1447 H", type: "religious" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H", type: "religious" },
  { date: "2026-04-03", name: "Wafat Isa Al-Masih", type: "religious" },
  { date: "2026-05-01", name: "Hari Buruh Internasional", type: "national" },
  { date: "2026-05-02", name: "Hari Raya Waisak 2570", type: "religious" },
  { date: "2026-05-14", name: "Kenaikan Isa Al-Masih", type: "religious" },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", type: "religious" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", type: "national" },
  { date: "2026-06-16", name: "Tahun Baru Islam 1448 H", type: "religious" },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI", type: "national" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW", type: "religious" },
  { date: "2026-12-25", name: "Hari Raya Natal", type: "religious" },
];

const allHolidays = [
  ...indonesianHolidays2024,
  ...indonesianHolidays2025,
  ...indonesianHolidays2026,
];

export const isIndonesianHoliday = (date: Date): IndonesianHoliday | null => {
  const dateStr = format(date, "yyyy-MM-dd");
  return allHolidays.find(holiday => holiday.date === dateStr) || null;
};

export const getAllHolidays = (): IndonesianHoliday[] => {
  return allHolidays;
};
