import type { ProviderStatus } from "./constants";

export type Provider = {
  id: string;
  createdAt: string;
  name: string;
  whatsapp: string;
  category: string;
  city: string;
  /** 0 = "a combinar". */
  price: number;
  description: string;
  /** URLs prontas para <img> (ex: /uploads/prestadores/<id>/1-123.jpg). */
  photos: string[];
  status: ProviderStatus;
};

export type ProviderWithRating = Provider & {
  avgStars: number | null;
  reviewCount: number;
};

export type Review = {
  id: string;
  providerId: string;
  author: string;
  stars: number;
  comment: string | null;
  createdAt: string;
};

export type AdminReview = Review & { providerName: string };

export type Quote = {
  id: string;
  providerId: string;
  providerName: string;
  clientName: string;
  clientPhone: string | null;
  neighborhood: string;
  preferredWhen: string | null;
  details: string;
  createdAt: string;
};

/** Resultado padrão das Server Actions. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
