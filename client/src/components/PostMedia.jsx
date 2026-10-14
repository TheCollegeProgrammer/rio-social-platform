import { useState } from "react";
import { Link } from "react-router-dom";
import { mediaUrl } from "../services/api";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNavigation,
    CarouselIndicator
} from "@/components/motion-primitives/carousel";

function ImageCarousel({ images }) {
    const [idx, setIdx] = useState(0);
    if (!images?.length) return null;

    if (images.length === 1) {
        return <img className="post-image" src={images[0]} alt="" loading="lazy" />;
    }

    return (
        <div className="post-carousel">
            <Carousel onIndexChange={setIdx}>
                <CarouselContent>
                    {images.map((src, i) => (
                        <CarouselItem key={`${src}-${i}`}>
                            <img className="carousel-img" src={src} alt="" loading="lazy" draggable={false} />
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

function PostMedia({ post, linked = false }) {
    const raw = post.images?.length ? post.images : post.image ? [post.image] : [];
    const images = raw.map(mediaUrl).filter(Boolean);
    if (images.length === 0) return null;

    if (images.length === 1) {
        const img = <img className="post-image" src={images[0]} alt="" loading="lazy" />;
        return linked ? <Link to={`/posts/${post._id}`}>{img}</Link> : img;
    }

    return <ImageCarousel images={images} />;
}

export { ImageCarousel };
export default PostMedia;
