import { Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createAdminIconFromUrl } from "../admin-display";
import { proxifyUrl } from "../proxy";
import type { ProxySettings } from "../types";

export default function AdminSiteIcon({
  className,
  iconSize = 15,
  proxySettings,
  url
}: {
  className: string;
  iconSize?: number;
  proxySettings: ProxySettings;
  url: string;
}) {
  const iconSrc = proxifyUrl(createAdminIconFromUrl(url), proxySettings, {
    resourceType: "image"
  });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const image = imageRef.current;

    setLoaded(Boolean(image?.complete) && Number(image?.naturalWidth) > 0);
  }, [iconSrc]);

  return (
    <span className={className}>
      <Globe aria-hidden="true" size={iconSize} />
      {iconSrc ? (
        <img
          alt=""
          className={loaded ? "is-loaded" : ""}
          decoding="async"
          loading="lazy"
          ref={imageRef}
          src={iconSrc}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </span>
  );
}
