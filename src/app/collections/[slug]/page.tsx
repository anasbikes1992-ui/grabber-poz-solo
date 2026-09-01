import { redirect } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

/** Collections alias — same catalog as /categories/[slug] (STR-02). */
export default async function CollectionSlugPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/categories/${slug}`);
}
