import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PatchNoteImage } from '../types/patchnote';

interface PatchNoteMarkdownProps {
  content: string;
  images?: PatchNoteImage[];
  imageClassName: string;
}

const SAFE_DATA_IMAGE_PATTERN =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

function getSafeLinkUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') || url.startsWith('#')) return url;
  if (/^(?:https:\/\/|mailto:)/i.test(url)) return url;
  return undefined;
}

function getSafeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') || /^https:\/\//i.test(url)) return url;
  if (SAFE_DATA_IMAGE_PATTERN.test(url)) return url;
  return undefined;
}

export function PatchNoteMarkdown({
  content,
  images = [],
  imageClassName,
}: PatchNoteMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const safeHref = getSafeLinkUrl(href);
          if (!safeHref) return <span>{children}</span>;

          return (
            <a href={safeHref} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => {
          const storedImage = images.find((image) => image.id === src);
          const safeSrc = getSafeImageUrl(storedImage?.url || src);
          if (!safeSrc) return alt ? <span>{alt}</span> : null;

          return (
            <img
              src={safeSrc}
              alt={alt || storedImage?.alt || ''}
              className={imageClassName}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
