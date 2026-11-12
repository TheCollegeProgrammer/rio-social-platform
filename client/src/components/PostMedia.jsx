import { useState } from "react";
import { mediaUrl } from "../services/api";
import MediaLightbox from "./MediaLightbox";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNavigation,
    CarouselIndicator
} from "@/components/motion-primitives/carousel";

// 7.10: standardized responsive cloudinary variants (browser picks the
// right width); local uploads have no CDN transforms and serve as-is.
const responsiveAttrs = (srcPath) => {
    const url = mediaUrl(srcPath);
    if (!url || !url.includes("res.cloudinary.com")) return {};
    return {
        srcSet: [480, 960, 1600].map((w) => mediaUrl(srcPath, w)).join(", "),
        sizes: "(max-width: 640px) 100vw, 860px"
    };
};

function ImageCarousel({ cards, onZoom }) {
    const [idx, setIdx] = useState(0);
    if (!cards?.length) return null;

    if (cards.length === 1) {
        return (
            <img
                {...cards[0]}
                className="post-image zoomable"
                alt=""
                loading="lazy"
                onClick={() => onZoom?.(0)}
            />
        );
    }

    return (
        <div className="post-carousel">
            <Carousel onIndexChange={setIdx}>
                <CarouselContent>
                    {cards.map((card, i) => (
                        <CarouselItem key={`${card.src}-${i}`}>
                            <img
                                {...card}
                                className="carousel-img zoomable"
                                alt=""
                                loading="lazy"
                                draggable={false}
                                onClick={() => onZoom?.(i)}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselNavigation alwaysShow />
                <CarouselIndicator className="mb-2" />
            </Carousel>
            <span className="carousel-count">{idx + 1}/{images.length}</span>
        </div>
    );
}

function PostMedia({ post }) {
    const raw = (post.images?.length ? post.images : post.image ? [post.image] : []).filter(Boolean);
    const cards = raw.map((srcPath) => ({ src: mediaUrl(srcPath), ...responsiveAttrs(srcPath) }));
    const images = cards.map((c) => c.src);
    const [zoom, setZoom] = useState(false);
    const [zoomIdx, setZoomIdx] = useState(0);

    if (images.length === 0) return null;

    const openZoom = (i) => {
        setZoomIdx(i);
        setZoom(true);
    };

    return (
        <>
            <ImageCarousel cards={cards} onZoom={openZoom} />
            <MediaLightbox
                open={zoom}
                images={images}
                index={zoomIdx}
                onClose={() => setZoom(false)}
                onIndex={setZoomIdx}
            />
        </>
    );
}

export { ImageCarousel };
export default PostMedia;
