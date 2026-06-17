import ProfilePageClient from "./ProfilePageClient";
import photographersData from "@/data/photographers.json";

export function generateStaticParams() {
  return photographersData.map((p) => ({
    id: p.ID,
  }));
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <ProfilePageClient id={params.id} />;
}
