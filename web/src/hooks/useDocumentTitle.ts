import { useEffect } from "react";

/** Sets document.title to "{page} · TakaTrace" (spec 6.3). */
export function useDocumentTitle(page: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${page} · TakaTrace`;
    return () => {
      document.title = previous;
    };
  }, [page]);
}
