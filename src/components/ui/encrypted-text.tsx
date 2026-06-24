import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface EncryptedTextProps {
  text: string;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealDelayMs?: number;
  className?: string;
}

export function EncryptedText({
  text,
  encryptedClassName = "",
  revealedClassName = "",
  revealDelayMs = 50,
  className = "",
}: EncryptedTextProps) {
  const [revealed, setRevealed] = useState(0);
  const [scrambled, setScrambled] = useState<string[]>(() =>
    text.split("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
  );
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrambleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealedRef = useRef(0);

  useEffect(() => {
    revealedRef.current = 0;
    setRevealed(0);
    setScrambled(text.split("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)]));

    scrambleTimer.current = setInterval(() => {
      setScrambled(text.split("").map((_, i) =>
        i < revealedRef.current
          ? text[i]
          : CHARS[Math.floor(Math.random() * CHARS.length)]
      ));
    }, 60);

    revealTimer.current = setInterval(() => {
      revealedRef.current += 1;
      setRevealed(revealedRef.current);
      if (revealedRef.current >= text.length) {
        clearInterval(revealTimer.current!);
        clearInterval(scrambleTimer.current!);
      }
    }, revealDelayMs);

    return () => {
      clearInterval(revealTimer.current!);
      clearInterval(scrambleTimer.current!);
    };
  }, [text, revealDelayMs]);

  return (
    <span className={className}>
      {text.split("").map((char, i) =>
        char === " " ? (
          <span key={i}>&nbsp;</span>
        ) : (
          <span key={i} className={i < revealed ? revealedClassName : encryptedClassName}>
            {i < revealed ? char : scrambled[i] ?? char}
          </span>
        )
      )}
    </span>
  );
}
