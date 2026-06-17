import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";
import photographersData from "@/data/photographers.json";

export function generateStaticParams() {
  return photographersData.map((p) => ({
    id: p.ID,
  }));
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutClient id={params.id} />
    </Suspense>
  );
}
