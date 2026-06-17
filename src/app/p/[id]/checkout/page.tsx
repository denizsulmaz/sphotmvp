import CheckoutClient from "./CheckoutClient";
import photographersData from "@/data/photographers.json";

export function generateStaticParams() {
  return photographersData.map((p) => ({
    id: p.ID,
  }));
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return <CheckoutClient id={params.id} />;
}
