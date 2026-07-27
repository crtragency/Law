export const DEFAULT_PAGE_SIZE = 48;

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getPagination(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
