import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";

interface SearchDatesValueType {
  checkIn: Date | undefined;
  checkOut: Date | undefined;
}

interface SearchDatesDispatchType {
  setCheckIn: (date: Date | undefined) => void;
  setCheckOut: (date: Date | undefined) => void;
}

const SearchDatesValueContext = createContext<SearchDatesValueType | undefined>(undefined);
const SearchDatesDispatchContext = createContext<SearchDatesDispatchType | undefined>(undefined);

export const SearchDatesProvider = ({ children }: { children: ReactNode }) => {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();

  const value = useMemo(() => ({ checkIn, checkOut }), [checkIn, checkOut]);
  const dispatch = useMemo(() => ({ setCheckIn, setCheckOut }), []);

  return (
    <SearchDatesValueContext.Provider value={value}>
      <SearchDatesDispatchContext.Provider value={dispatch}>
        {children}
      </SearchDatesDispatchContext.Provider>
    </SearchDatesValueContext.Provider>
  );
};

/** Read-only access to search dates — does NOT re-render when setters are called */
export const useSearchDatesValue = (): SearchDatesValueType => {
  const context = useContext(SearchDatesValueContext);
  if (!context) {
    throw new Error("useSearchDatesValue must be used within SearchDatesProvider");
  }
  return context;
};

/** Setter-only access — component will NOT re-render when dates change */
export const useSearchDatesDispatch = (): SearchDatesDispatchType => {
  const context = useContext(SearchDatesDispatchContext);
  if (!context) {
    throw new Error("useSearchDatesDispatch must be used within SearchDatesProvider");
  }
  return context;
};

/** Backward-compatible hook — returns both value and dispatch (re-renders on any change) */
export const useSearchDates = () => {
  const value = useSearchDatesValue();
  const dispatch = useSearchDatesDispatch();
  return { ...value, ...dispatch };
};
