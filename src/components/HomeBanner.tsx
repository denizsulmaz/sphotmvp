"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Search, Camera, MessageCircle } from "lucide-react";

export default function HomeBanner() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      icon: Search,
      label: "Step 1",
      title: t("step1Label"),
      description: t("homeBannerStep1" as any), // Type cast if keys are populated dynamically
    },
    {
      icon: Camera,
      label: "Step 2",
      title: t("step2Label"),
      description: t("homeBannerStep2" as any),
    },
    {
      icon: MessageCircle,
      label: "Step 3",
      title: t("step3Label"),
      description: t("homeBannerStep3" as any),
    },
  ];

  return (
    <div className="w-screen bg-black text-white px-4 md:px-8 py-16 md:py-24 mb-6 md:mb-8 flex flex-col justify-center h-auto min-h-[400px] md:h-[50vh] md:max-h-[600px] relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden">
      
      {/* Low-opacity background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 z-0 mix-blend-luminosity"
        style={{ backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH || ''}/media/banner-bg.jpg)` }}
      />
      {/* Gradient to seamlessly fade and ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/60 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Banner Headers */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-3 md:mb-4 text-accent tracking-tighter">
            {t("homeBannerTitle" as any)}
          </h1>
          <p className="text-gray-300 text-sm md:text-base max-w-xl mx-auto font-medium">
            {t("homeBannerSubtitle" as any)}
          </p>
        </div>

        {/* 3 steps grid with connecting timeline */}
        <div className="relative flex flex-col sm:flex-row justify-between items-start text-center max-w-3xl mx-auto">
          {/* Connecting line (Desktop) */}
          <div className="hidden sm:block absolute top-[47px] md:top-[51px] left-[16%] right-[16%] h-[2px] bg-gray-800 z-0 overflow-hidden rounded-full">
             {/* Animated fill line */}
             <div 
               className="h-full bg-accent transition-all duration-700 ease-in-out"
               style={{ width: `${(activeStep / 2) * 100}%` }}
             />
          </div>

          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            const isPast = idx < activeStep;
            const isLit = isActive || isPast;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center flex-1 mb-6 sm:mb-0 w-full">
                <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 transition-colors duration-500 ${isLit ? "text-accent" : "text-gray-500"}`}>
                  {step.label}
                </p>
                <div 
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-500 border-2 ${
                    isActive ? "bg-accent border-accent text-black scale-110 shadow-[0_0_20px_rgba(255,250,108,0.4)]" :
                    isPast ? "bg-black border-accent text-accent" :
                    "bg-black border-gray-800 text-gray-600"
                  }`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className={`text-base md:text-lg font-bold mb-1 transition-colors duration-500 ${isLit ? "text-white" : "text-gray-400"}`}>
                  {step.title}
                </h3>
                <p className={`text-xs md:text-sm max-w-[160px] mx-auto leading-snug transition-colors duration-500 ${isLit ? "text-gray-300" : "text-gray-600"}`}>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
