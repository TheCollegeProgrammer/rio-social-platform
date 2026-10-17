import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { reducedMotion } from "../lib/utils";

function PageTransition({ children }) {
    const location = useLocation();
    const ref = useRef(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || reducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                el,
                { opacity: 0, y: 10 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.35,
                    ease: "power2.out",
                    clearProps: "opacity,transform"
                }
            );
        }, el);
        return () => ctx.revert();
    }, [location.pathname]);

    return <div ref={ref} className="page-transition">{children}</div>;
}

export default PageTransition;
