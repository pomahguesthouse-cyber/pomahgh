import { createContext, useContext, useState, ReactNode } from "react";

interface SearchDatesContextType {
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  setCheckIn: (date: Date | undefined) => void;
  setCheckOut: (date: Date | undefined) => void;
}

const SearchDatesContext = createContext<SearchDatesContextType | undefined>(undefined);

export const SearchDatesProvider = ({ children }: { children: ReactNode }) => {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();

  return (
    <SearchDatesContext.Provider value={{ checkIn, checkOut, setCheckIn, setCheckOut }}>
      {children}
    </SearchDatesContext.Provider>
  );
};

export const useSearchDates = () => {
  const context = useContext(SearchDatesContext);
  if (!context) {
    throw new Error("useSearchDates must be used within SearchDatesProvider");
  }
  return context;
};
