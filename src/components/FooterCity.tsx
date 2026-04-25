"use client";

import { useState, useEffect } from "react";

const CITIES = ["Seoul 🇰🇷", "Istanbul 🇹🇷", "Bangkok 🇹🇭", "London 🇬🇧"];

export default function FooterCity() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % CITIES.length);
        setVisible(true);
      }, 300);
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-1">
      Made with ❤️ in{" "}
      <span
        className="inline-block transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
      >
        {CITIES[index]}
      </span>
    </span>
  );
}
