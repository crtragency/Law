import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";

function pageHref(basePath: string, page: number) {
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}page=${page}`;
}

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(pageCount, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, total);

  return (
    <nav
      className="pagination-bar"
      aria-label="التنقل بين الصفحات"
    >
      <p className="text-xs font-medium text-gray-500">
        عرض {firstItem} - {lastItem} من {total}
      </p>
      <div className="flex items-center gap-1.5">
        {currentPage > 1 ? (
          <Link
            href={pageHref(basePath, currentPage - 1)}
            className="pagination-button"
            aria-label="الصفحة السابقة"
          >
            <IconChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        ) : (
          <span className="pagination-button cursor-not-allowed opacity-40">
            <IconChevronLeft className="h-4 w-4 rotate-180" />
          </span>
        )}

        {pages.map((item) => (
          <Link
            key={item}
            href={pageHref(basePath, item)}
            className={`pagination-button ${item === currentPage ? "pagination-button-active" : ""}`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </Link>
        ))}

        {currentPage < pageCount ? (
          <Link
            href={pageHref(basePath, currentPage + 1)}
            className="pagination-button"
            aria-label="الصفحة التالية"
          >
            <IconChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="pagination-button cursor-not-allowed opacity-40">
            <IconChevronLeft className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
