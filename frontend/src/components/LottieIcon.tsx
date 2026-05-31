import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieIconProps {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export default function LottieIcon({ src, className = "w-24 h-24", loop = true, autoplay = true }: LottieIconProps) {
  return (
    <div className={className}>
      <DotLottieReact src={src} loop={loop} autoplay={autoplay} />
    </div>
  );
}
