import Image from 'next/image';

/** Real product screenshot in a simple device frame. Explicit size avoids layout shift. */
export function ScreenshotFrame({
  src,
  alt,
  width,
  height,
  device = 'laptop',
  priority = false,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  device?: 'laptop' | 'phone';
  priority?: boolean;
  caption?: string;
}) {
  const phone = device === 'phone';
  return (
    <figure className={phone ? 'mx-auto w-full max-w-[260px]' : 'w-full'}>
      <div
        className={
          phone
            ? 'overflow-hidden rounded-[2rem] border-[6px] border-cs-ink bg-cs-ink shadow-[0_18px_40px_-18px_rgba(28,25,23,0.45)]'
            : 'overflow-hidden rounded-xl border border-cs-line bg-cs-card shadow-[0_18px_40px_-18px_rgba(28,25,23,0.35)]'
        }
      >
        {!phone && (
          <div className="flex items-center gap-1.5 border-b border-cs-line bg-cs-sand px-3 py-2" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-cs-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-cs-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-cs-line" />
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={phone ? '260px' : '(min-width: 1024px) 560px, 100vw'}
          className="h-auto w-full"
        />
      </div>
      {caption && <figcaption className="mt-3 text-center text-sm text-cs-muted">{caption}</figcaption>}
    </figure>
  );
}
