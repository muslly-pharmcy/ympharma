export const cacheKey = {
  product: (id: string) => `product:${id}`,
  productList: (orgId: string, hash: string) => `product:list:${orgId}:${hash}`,
  doctor: (id: string) => `doctor:${id}`,
  doctorSearch: (query: string) => `doctor:search:${query}`,
  availability: (resourceId: string, dateISO: string) =>
    `availability:${resourceId}:${dateISO}`,
  medicineImage: (sku: string) => `medicine:image:${sku}`,
};
