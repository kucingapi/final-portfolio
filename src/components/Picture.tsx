import Image, { getImageProps, type ImageProps } from "next/image";
import { preload as preloadImage } from "react-dom";
import { builtAvif } from "@/lib/images";

/**
 * next/image for the images scripts/images.mjs builds ahead of time. Browsers that read AVIF (every
 * current one) take those static files, which the CDN serves at once and browsers keep for a year,
 * instead of waiting on the image optimizer to encode each size the first time it is asked for. Older
 * browsers, and images without built files, get exactly what next/image gives them.
 *
 * The <picture> is `display: contents`, so the <img> lays out as if it were its parent's own child.
 */
export function Picture(props: Omit<ImageProps, "src" | "priority"> & { src: string }) {
  const avif = builtAvif(props.src);
  if (!avif) return <Image {...props} alt={props.alt} />;

  const { props: img } = getImageProps(props);
  // Without `sizes`, a fixed-size image is drawn at its width; `w` descriptors need the hint.
  const sizes = img.sizes ?? (props.fill ? "100vw" : `${img.width}px`);
  if (props.preload) {
    preloadImage(avif.largest, { as: "image", imageSrcSet: avif.srcSet, imageSizes: sizes, type: "image/avif", fetchPriority: img.fetchPriority });
  }
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={avif.srcSet} sizes={sizes} />
      {/* The <img> next/image would render, with its optimizer srcset as the fallback. */}
      <img {...img} alt={props.alt} />
    </picture>
  );
}
