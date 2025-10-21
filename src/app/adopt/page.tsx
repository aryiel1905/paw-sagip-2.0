import AdoptionBrowse from "@/components/AdoptionBrowse";
import { Suspense } from "react";

export default function AdoptIndex() {
  return (
    <Suspense fallback={null}>
      <AdoptionBrowse />
    </Suspense>
  );
}
