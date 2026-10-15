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

function ImageCarousel({ images, onZoom }) {
    const [idx, setIdx] = useState(0);
    if (!images?.length) return null;

    if (images.length === 1) {
        return (
            <img
                className="post-image zoomable"
                src={images[0]}
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
                    {images.map((src, i) => (
                        <CarouselItem key={`${src}-${i}`}>
                            <img
                                className="carousel-img zoomable"
                                src={src}
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
    const raw = post.images?.length ? post.images : post.image ? [post.image] : [];
    const images = raw.map(mediaUrl).filter(Boolean);
    const [zoom, setZoom] = useState(false);
    const [zoomIdx, setZoomIdx] = useState(0);

    if (images.length === 0) return null;

    const openZoom = (i) => {
        setZoomIdx(i);
        setZoom(true);
    };

    return (
        <>
            <ImageCarousel images={images} onZoom={openZoom} />
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
