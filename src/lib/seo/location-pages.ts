/**
 * Branch → public /locations/[slug] pages (GRW-01).
 * City is derived when branches.city is absent (schema has address only).
 */
import { eq } from 'drizzle-orm';
import { db, branches } from '@/db';
import { readBusinessProfile } from '@/lib/config/business-settings';
import { LocalSeoEngine, type LocalBranchPageMetadata } from '@/lib/seo/local-seo';

const LK_CITIES = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Matara', 'Kurunegala', 'Anuradhapura'];

const DEMO_BRANCHES = [
  {
    id: 'demo-colombo',
    name: 'Main Flagship Store',
    city: 'Colombo',
    address: '42 Galle Road, Colombo 03',
    phone: '+94 11 234 5678',
  },
  {
    id: 'demo-kandy',
    name: 'City Centre',
    city: 'Kandy',
    address: '18 Dalada Veediya, Kandy',
    phone: '+94 81 222 3344',
  },
  {
    id: 'demo-galle',
    name: 'Fort Branch',
    city: 'Galle',
    address: '5 Church Street, Galle Fort',
    phone: '+94 91 224 5566',
  },
];

export function locationPathSlug(page: LocalBranchPageMetadata): string {
  return page.slug.replace(/^\/locations\//, '');
}

function deriveCity(address: string | null | undefined, name: string, code: string): string {
  const hay = `${address || ''} ${name} ${code}`.toLowerCase();
  for (const city of LK_CITIES) {
    if (hay.includes(city.toLowerCase())) return city;
  }
  if (address) {
    const parts = address
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1].replace(/\d+/g, '').trim();
      if (last.length >= 3) return last;
    }
  }
  return 'Colombo';
}

async function storeName(): Promise<string> {
  try {
    const profile = await readBusinessProfile();
    if (profile?.name) return profile.name;
  } catch {
    /* build / missing DB */
  }
  return 'Grabber';
}

function toPage(
  branch: { id: string; name: string; city: string; address: string; phone: string },
  brand: string,
): LocalBranchPageMetadata {
  return LocalSeoEngine.buildBranchLandingPage({
    ...branch,
    storeName: brand,
  });
}

export async function listLocationPages(): Promise<LocalBranchPageMetadata[]> {
  const brand = await storeName();
  try {
    const rows = await db.select().from(branches).where(eq(branches.active, true));
    if (rows.length > 0) {
      return rows.map((b) =>
        toPage(
          {
            id: b.id,
            name: b.name,
            city: deriveCity(b.address, b.name, b.code),
            address: b.address || `${b.name}, Sri Lanka`,
            phone: b.phone || '+94 11 000 0000',
          },
          brand,
        ),
      );
    }
  } catch {
    /* fall through to demos */
  }
  return DEMO_BRANCHES.map((b) => toPage(b, brand));
}

export async function getLocationBySlug(slug: string): Promise<LocalBranchPageMetadata | null> {
  const pages = await listLocationPages();
  return pages.find((p) => locationPathSlug(p) === slug) ?? null;
}

export async function listLocationSlugs(): Promise<string[]> {
  const pages = await listLocationPages();
  return pages.map(locationPathSlug);
}
